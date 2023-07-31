import express from "express";
import multer from "multer";
import { Midjourney } from "../midjourney/index.js";
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

var router = express.Router();

var mj = new Midjourney();

router.post("/imagine", upload.any(), async (req, res) => {
  try {
    var q = getQuery(req),
      prompt = q.prompt || "",
      base64 = q.base64 || "";
    if (prompt === "") {
      return res.json({
        code: 400,
        msg: "缺少prompt",
        data: null,
      });
    }
    var data = await mj.Imagine(prompt, base64);
    res.json({
      code: 200,
      msg: "提交成功",
      data,
    });
  } catch (error) {
    res.json(error);
  }
});

router.post("/upsample", async (req, res) => {
  try {
    var q = getQuery(req),
      id = q.id || "",
      index = q.index || "";
    if (!id) {
      return res.json({
        code: 400,
        msg: "缺少任务id",
        data: null,
      });
    }
    if (!index) {
      return res.json({
        code: 400,
        msg: "缺少index",
        data: null,
      });
    }
    var data = await mj.Upscale(id, index);
    res.json({
      code: 200,
      msg: "提交成功",
      data,
    });
  } catch (error) {
    res.json(error);
  }
});

router.post("/variation", async (req, res) => {
  try {
    var q = getQuery(req),
      id = q.id || "",
      index = q.index || "",
      prompt = q.prompt || "";
    if (!id) {
      return res.json({
        code: 400,
        msg: "缺少任务id",
        data: null,
      });
    }
    if (!index) {
      return res.json({
        code: 400,
        msg: "缺少index",
        data: null,
      });
    }
    var data = await mj.Variation(id, index, prompt);
    res.json({
      code: 200,
      msg: "提交成功",
      data,
    });
  } catch (error) {
    res.json(error);
  }
});

router.post("/integrity", async (req, res) => {
  try {
    var q = getQuery(req),
      id = q.id || "",
      level = q.level || "",
      prompt = q.prompt || "";
    if (!id) {
      return res.json({
        code: 400,
        msg: "缺少任务id",
        data: null,
      });
    }
    var i = integrityAction.indexOf(level);
    if (i < 0) {
      return res.json({
        code: 400,
        msg: "level参数错误",
        data: null,
      });
    }
    var data = await mj.Integrity(id, level, prompt);
    res.json({
      code: 200,
      msg: "提交成功",
      data,
    });
  } catch (error) {
    console.log(error);
    res.json(error);
  }
});

router.post("/describe", async (req, res) => {
  try {
    var q = getQuery(req),
      base64 = q.base64 || "";
    if (!base64) {
      return res.json({
        code: 400,
        msg: "缺少base64",
        data: null,
      });
    }
    var data = await mj.Describe(base64);
    res.json({
      code: 200,
      msg: "提交成功",
      data,
    });
  } catch (error) {
    res.json(error);
  }
});

router.post("/reroll", async (req, res) => {
  try {
    var q = getQuery(req),
      id = q.id || "",
      prompt = q.prompt || "";
    if (!id) {
      return res.json({
        code: 400,
        msg: "缺少任务id",
        data: null,
      });
    }
    var data = await mj.Reroll(id, prompt);
    res.json({
      code: 200,
      msg: "提交成功",
      data,
    });
  } catch (error) {
    res.json(error);
  }
});

router.post("/shorten", async (req, res) => {
  try {
    var q = getQuery(req),
      prompt = q.prompt || "";
    if (!prompt) {
      return res.json({
        code: 400,
        msg: "缺少prompt",
        data: null,
      });
    }
    var data = await mj.Shorten(prompt);
    res.json({
      code: 200,
      msg: "提交成功",
      data,
    });
  } catch (error) {
    res.json(error);
  }
});

router.get("/info", async (req, res) => {
  try {
    var data = await mj.Info();
    res.json({
      code: 200,
      msg: "查询成功",
      data,
    });
  } catch (error) {
    res.json(error);
  }
});

router.get("/settings", async (req, res) => {
  try {
    var data = await mj.Settings();
    res.json({
      code: 200,
      msg: "查询成功",
      data,
    });
  } catch (error) {
    res.json(error);
  }
});

router.post("/fast", async (req, res) => {
  try {
    await mj.Fast();
    res.json({
      code: 200,
      msg: "切换成功",
    });
  } catch (error) {
    res.json(error);
  }
});

router.post("/relax", async (req, res) => {
  try {
    await mj.Fast();
    res.json({
      code: 200,
      msg: "切换成功",
    });
  } catch (error) {
    res.json(error);
  }
});

router.post("/remix", async (req, res) => {
  try {
    var data = await mj.SwitchRemix();
    res.json({
      code: 200,
      msg: "切换成功",
      data,
    });
  } catch (error) {
    res.json(error);
  }
});

router.post("/reset", async (req, res) => {
  try {
    await mj.Reset();
    res.json({
      code: 200,
      msg: "重置成功",
    });
  } catch (error) {
    res.json(error);
  }
});

router.get("/fetch", (req, res) => {
  var q = getQuery(req),
    id = q.id || "";
  if (!id) {
    return res.json({
      code: 400,
      msg: "缺少任务id",
      data: null,
    });
  }
  var data = mj.Fetch(id);
  if (!data) {
    return res.json({
      code: 404,
      msg: "任务不存在",
      data: null,
    });
  }
  res.json({
    code: 200,
    msg: "查询成功",
    data,
  });
});

const getQuery = (req) => {
  if (req.query && JSON.stringify(req.query) !== "{}") {
    return req.query;
  } else if (req.body && JSON.stringify(req.body) !== "{}") {
    return req.body;
  } else if (req.params && JSON.stringify(req.params) !== "{}") {
    return req.params;
  } else {
    return {};
  }
};

const integrityAction = [
  "strong",
  "high",
  "subtle",
  "low",
  "2x",
  "1.5x",
  "left",
  "right",
  "up",
  "down"
]

export default router;
