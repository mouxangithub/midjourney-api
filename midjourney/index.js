import {
  MidjourneyApi,
  MidjourneyMessage,
  DefaultMJConfig,
  WsMessage,
} from "midjourney";
import {
  toRemixCustom,
  nextNonce,
  random,
  base64ToBlob,
} from "midjourney/libs/utils/index.js";
import "dotenv/config";
import CacheManager from "./cache-manager.js";

const custom2Type = (custom) => {
  if (custom.includes("upsample")) {
    return "upscale";
  } else if (custom.includes("low_variation")) {
    return "vary";
  } else if (custom.includes("pan")) {
    return "pan";
  } else if (custom.includes("variation")) {
    return "variation";
  } else if (custom.includes("reroll")) {
    return "reroll";
  } else if (custom.includes("CustomZoom")) {
    return "customZoom";
  } else if (custom.includes("remaster")) {
    return "reroll";
  }
  return null;
};

export class Midjourney extends MidjourneyMessage {
  constructor() {
    const env = process.env;
    const defaults = {
      ServerId: env.guild_id || "",
      ChannelId: env.channel_id || "",
      SessionId: env.session_id || "",
      SalaiToken: env.user_token || "",
      ImageProxy: env.image_proxy || "",
      Debug: env.debug || false,
      Ws: env.user_wss || true,
    };
    super(defaults);
    this.config = {
      ...DefaultMJConfig,
      ...defaults,
    };
    this.MJApi = new MidjourneyApi(this.config);
    this.cache = new CacheManager({
      time: env.timeout || 24,
      key: env.cache_key || "mj-task-store::",
      debug: env.debug || false,
    });
    this.init();
  }
  async Connect() {
    if (!this.config.Ws) {
      return this;
    }
    if (this.config.ServerId) {
      await this.MJApi.getCommand("settings");
    } else {
      await this.MJApi.allCommand();
    }
    if (this.wsClient) return this;
    this.wsClient = new WsMessage(this.config, this.MJApi);
    await this.wsClient.onceReady();
    return this;
  }
  async init() {
    await this.Connect();
    const settings = await this.Settings();
    if (settings) {
      const remix = settings.options.find((o) => o.label === "Remix mode");
      if (remix?.style == 3) {
        this.config.Remix = true;
      }
    }
    return this;
  }
  Imagine(prompt, base64 = "") {
    return new Promise(async (resolve, reject) => {
      try {
        prompt = prompt.trim();
        if (!this.config.Ws) {
          const seed = random(1000000000, 9999999999);
          prompt = `[${seed}] ${prompt}`;
        } else {
          await this.getWsClient();
        }
        const nonce = nextNonce();
        // if (base64) {
        //   const blob = await base64ToBlob(base64);
        //   var DcImage = await this.MJApi.UploadImageByBole(blob);
        // }
        const code = await this.MJApi.ImagineApi(prompt, nonce);
        if (code !== 204) {
          return reject({
            code,
            msg: "提交失败",
          });
        }
        const taskId = this.cache.set({
          action: "IMAGINE",
          prompt,
          submitTime: Date.now(),
          origin: {
            nonce,
          },
        });
        resolve(taskId);
        this.waitImageMessage(taskId, nonce, prompt);
      } catch (error) {}
    });
  }
  Upscale(taskId, index) {
    return new Promise(async (resolve, reject) => {
      try {
        if (index < 1 || index > 4) {
          return reject({
            code: 400,
            msg: "index must be 1-4",
          });
        }
        const cache = this.cache.get(taskId);
        if (!cache && !cache.origin && !cache.origin.hash) {
          return reject({
            code: 404,
            msg: "关联任务不存在",
          });
        }
        const customId = `MJ::JOB::upsample::${index}::${cache.origin.hash}`;
        var data = await this.Custom(customId, cache.prompt, cache.origin, "UPSCALE");
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
  Variation(taskId, index, prompt = "") {
    return new Promise(async (resolve, reject) => {
      try {
        if (index < 1 || index > 4) {
          return reject({
            code: 400,
            msg: "index must be 1-4",
          });
        }
        const cache = this.cache.get(taskId);
        if (!cache && !cache.origin && !cache.origin.hash) {
          return reject({
            code: 404,
            msg: "关联任务不存在",
          });
        }
        if (!prompt) prompt = cache.prompt;
        const customId = `MJ::JOB::variation::${index}::${cache.origin.hash}`;
        var data = await this.Custom(
          customId,
          prompt,
          cache.origin,
          "VARIATION"
        );
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
  Integrity(taskId, level, prompt = "") {
    return new Promise(async (resolve, reject) => {
      try {
        const cache = this.cache.get(taskId);
        if (!cache) {
          return reject({
            code: 404,
            msg: "关联任务不存在",
          });
        }
        const origin = cache.origin;
        const hash = origin.hash;
        if (!prompt) prompt = cache.prompt;
        let customId, action;
        level = level.toLowerCase();
        if (level.startsWith("zoom")) {
          customId = `MJ::CustomZoom::${hash}`;
          action = "ZOOMOUT";
        } else {
          switch (level) {
            case "strong":
            case "high":
              customId = `MJ::JOB::high_variation::1::${hash}::SOLO`;
              action = "VARY";
              break;
            case "subtle":
            case "low":
              customId = `MJ::JOB::low_variation::1::${hash}::SOLO`;
              action = "VARY";
              break;
            case "2x":
              customId = `MJ::Outpaint::50::1::${hash}::SOLO`;
              action = "ZOOMOUT";
              break;
            case "1.5x":
              customId = `MJ::Outpaint::75::1::${hash}::SOLO`;
              action = "ZOOMOUT";
              break;
            case "left":
              customId = `MJ::JOB::pan_left::1::${hash}::SOLO`;
              action = "PAN";
              break;
            case "right":
              customId = `MJ::JOB::pan_right::1::${hash}::SOLO`;
              action = "PAN";
              break;
            case "up":
              customId = `MJ::JOB::pan_up::1::${hash}::SOLO`;
              action = "PAN";
              break;
            case "down":
              customId = `MJ::JOB::pan_down::1::${hash}::SOLO`;
              action = "PAN";
              break;
          }
        }
        var data = await this.Custom(customId, prompt, origin, action);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
  Describe(img) {
    return new Promise(async (resolve, reject) => {
      const wsClient = await this.getWsClient();
      const nonce = nextNonce();
      const blob = await base64ToBlob(img);
      var DcImage = await this.MJApi.UploadImageByBole(blob);
      const httpStatus = await this.MJApi.DescribeApi(DcImage, nonce);
      if (httpStatus !== 204) {
        return reject({
          code: httpStatus,
          msg: "DescribeApi failed",
        });
      }
      return reject(wsClient.waitDescribe(nonce));
    });
  }
  Reroll(taskId, prompt = "") {
    return new Promise(async (resolve, reject) => {
      try {
        const cache = this.cache.get(taskId);
        if (!cache && !cache.origin && !cache.origin.hash) {
          return reject({
            code: 404,
            msg: "关联任务不存在",
          });
        }
        if (!prompt) prompt = cache.prompt;
        const customId = `MJ::JOB::reroll::0::${cache.origin.hash}::SOLO`;
        var data = await this.Custom(customId, prompt, cache.origin, "REROLL");
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
  Shorten(prompt) {
    return new Promise(async (resolve, reject) => {
      const wsClient = await this.getWsClient();
      const nonce = nextNonce();
      const httpStatus = await this.MJApi.ShortenApi(prompt, nonce);
      if (httpStatus !== 204) {
        return reject({
          code: httpStatus,
          msg: "Shorten failed",
        });
      }
      return resolve(wsClient.waitShorten(nonce));
    });
  }
  Fetch(id) {
    return this.cache.get(id);
  }
  Settings() {
    return new Promise(async (resolve, reject) => {
      try {
        const wsClient = await this.getWsClient();
        const nonce = nextNonce();
        const httpStatus = await this.MJApi.SettingsApi(nonce);
        if (httpStatus !== 204) {
          return reject({
            code: httpStatus,
            msg: "Settings failed",
          });
        }
        return resolve(wsClient.waitSettings());
      } catch (error) {
        reject(error);
      }
    });
  }
  Reset() {
    return new Promise(async (resolve, reject) => {
      try {
        const settings = await this.Settings();
        const reset = settings.options.find(
          (o) => o.label === "Reset Settings"
        );
        if (!reset) {
          return reject({
            code: 404,
            msg: "Reset Settings not found",
          });
        }
        const httpstatus = await this.MJApi.CustomApi({
          msgId: settings.id,
          customId: reset.custom,
          flags: settings.flags,
        });
        if (httpstatus !== 204) {
          return reject({
            code: httpstatus,
            msg: "Reset failed",
          });
        }
        return resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }
  Info() {
    return new Promise(async (resolve, reject) => {
      try {
        const wsClient = await this.getWsClient();
        const nonce = nextNonce();
        const httpStatus = await this.MJApi.InfoApi(nonce);
        if (httpStatus !== 204) {
          return reject({
            code: httpStatus,
            msg: "Info failed",
          });
        }
        return resolve(wsClient.waitInfo());
      } catch (error) {
        reject(error);
      }
    });
  }
  Fast() {
    return new Promise(async (resolve, reject) => {
      const nonce = nextNonce();
      const httpStatus = await this.MJApi.FastApi(nonce);
      if (httpStatus !== 204) {
        return reject({
          code: httpStatus,
          msg: "FastApi failed",
        });
      }
      return resolve(true);
    });
  }
  Relax() {
    return new Promise(async (resolve, reject) => {
      const nonce = nextNonce();
      const httpStatus = await this.MJApi.RelaxApi(nonce);
      if (httpStatus !== 204) {
        return reject({
          code: httpStatus,
          msg: "Relax failed",
        });
      }
      return resolve(true);
    });
  }
  SwitchRemix() {
    return new Promise(async (resolve, reject) => {
      const wsClient = await this.getWsClient();
      const nonce = nextNonce();
      const httpStatus = await this.MJApi.SwitchRemixApi(nonce);
      if (httpStatus !== 204) {
        return reject({
          code: httpStatus,
          msg: "Relax failed",
        });
      }
      return resolve(wsClient.waitContent("prefer-remix"));
    });
  }
  getWsClient() {
    return new Promise(async (resolve, reject) => {
      if (!this.config.Ws) {
        reject({
          code: 400,
          msg: "ws not enabled",
        });
      }
      if (!this.wsClient) {
        await this.Connect();
      }
      if (!this.wsClient) {
        reject({
          code: 400,
          msg: "ws not connected",
        });
      }
      return resolve(this.wsClient);
    });
  }
  Close() {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = undefined;
    }
  }
  Custom(customId, prompt, origin, action) {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.config.Ws) {
          await this.getWsClient();
        }
        const nonce = nextNonce();
        const httpStatus = await this.MJApi.CustomApi({
          msgId: origin?.id,
          customId,
          flags: origin?.flags,
          nonce,
        });
        if (httpStatus !== 204) {
          return reject({
            code: httpStatus,
            msg: "任务提交失败",
          });
        }
        const taskId = this.cache.set({
          action,
          prompt,
          submitTime: Date.now(),
          origin: {
            nonce,
          },
        });
        resolve(taskId);
        this.waitImageMessage(taskId, nonce, prompt, origin, customId);
      } catch (error) {
        reject(error);
      }
    });
  }
  waitImageMessage(taskId, nonce, prompt, origins, customId = "") {
    return new Promise(async (resolve, reject) => {
      let origin;
      const loading = (uri, progress) => {
        this.cache.up(taskId, {
          imageUrl: uri,
          progress,
        });
      };
      if (this.wsClient) {
        origin = await this.wsClient.waitImageMessage({
          nonce,
          prompt,
          loading,
          messageId: origins?.id,
          onmodal: async (nonde, id) => {
            const parts = customId.split("::");
            if (prompt === undefined || prompt === "") {
              return "";
            }
            const newNonce = nextNonce();
            switch (custom2Type(customId)) {
              case "variation":
                if (this.config.Remix !== true) {
                  return "";
                }
                customId = toRemixCustom(customId);
                const remixHttpStatus = await this.MJApi.RemixApi({
                  msgId: id,
                  customId,
                  prompt,
                  nonce: newNonce,
                });
                if (remixHttpStatus !== 204) {
                  return reject({
                    code: remixHttpStatus,
                    msg: "Variation failed",
                  });
                }
                return newNonce;
              case "vary":
                if (this.config.Remix !== true) {
                  return "";
                }
                const varyHttpStatus = await this.MJApi.RemixApi({
                  nonce: newNonce,
                  msgId: id,
                  customId: `MJ::RemixModal::${parts[4]}::${parts[3]}::0`,
                  prompt,
                });
                if (varyHttpStatus !== 204) {
                  return reject({
                    code: varyHttpStatus,
                    msg: "Pan failed",
                  });
                }
                return newNonce;
              case "pan":
                if (this.config.Remix !== true) {
                  return "";
                }
                const panHttpStatus = await this.MJApi.ModalSubmitApi({
                  nonce: newNonce,
                  msgId: id,
                  customId: `MJ::PanModal::${parts[2].replace("pan_", "")}::${parts[4]}`,
                  prompt,
                  submitCustomId: "MJ::PanModal::prompt",
                });
                if (panHttpStatus !== 204) {
                  return reject({
                    code: panHttpStatus,
                    msg: "Pan failed",
                  });
                }
                return newNonce;
              case "reroll":
                if (this.config.Remix !== true) {
                  return "";
                }
                const rerollHttpStatus = await this.MJApi.ModalSubmitApi({
                  nonce: newNonce,
                  msgId: id,
                  customId: `MJ::ImagineModal::${origins?.id}`,
                  prompt,
                  submitCustomId: "MJ::ImagineModal::new_prompt",
                });
                if (rerollHttpStatus !== 204) {
                  return reject({
                    code: rerollHttpStatus,
                    msg: "Reroll failed",
                  });
                }
                return newNonce;
              case "customZoom":
                const httpStatus = await this.MJApi.CustomZoomImagineApi({
                  msgId: id,
                  customId,
                  prompt,
                  nonce: newNonce,
                });
                if (httpStatus !== 204) {
                  return reject({
                    code: httpStatus,
                    msg: "Zoom failed",
                  });
                }
                return newNonce;
              default:
                return "";
            }
          },
        });
      } else {
        origin = await this.WaitMessage(prompt, loading);
      }
      if (!origin) {
        return reject(new Error("提交失败"));
      }
      const imageUrl = origin?.uri;
      const options = origin?.options;
      delete origin.options;
      origin.nonce = nonce;
      const data = {
        imageUrl,
        progress: "100%",
        options,
        origin,
        finishTime: Date.now(),
      };
      this.cache.up(taskId, data);
      resolve(data);
    });
  }
}
