import cache from "memory-cache";
export default class CacheManager {
  constructor({ time = "24", key = "mj-task-store::", debug = false }) {
    this.time = time;
    this.debug = debug;
    this.cache = cache;
    this.key = key;
    this.debugs(debug);
  }
  get = (id) => {
    return this.cache.get(`${this.key}${id}`);
  };
  set = (value) => {
    var t = "",
      time = this.time,
      id = this.generateRandomId();
    if (time != "0" || time !== "undefined") {
      t = time * 1000 * 60 * 60;
    }
    this.cache.put(
      `${this.key}${id}`,
      {
        id,
        ...value,
      },
      t
    );
    return id;
  };
  up = (id, value) => {
    var t = "",
      time = this.time,
      odata = this.cache.get(`${this.key}${id}`);
    if (time != "0" || time !== "undefined") {
      t = time * 1000 * 60 * 60;
    }
    if (!odata) {
      return false;
    }
    this.cache.put(`${this.key}${id}`, { ...odata, ...value }, t);
    return id;
  };
  del = (key) => {
    return this.cache.del(key);
  };
  clear = () => {
    return this.cache.clear();
  };
  size = () => {
    return this.cache.size();
  };
  memsize = () => {
    return this.cache.memsize();
  };
  debugs = (debug) => {
    return this.cache.debug(debug);
  };
  hits = () => {
    if (!this.debug) {
      return false;
    }
    return this.cache.hits();
  };
  misses = () => {
    if (!this.debug) {
      return false;
    }
    return this.cache.misses();
  };
  keys = () => {
    return this.cache.keys();
  };
  allCatch = () => {
    return this.cache.keys().map((key) => {
      return this.cache.get(key);
    });
  };
  exportJson = () => {
    return this.cache.exportJson();
  };
  importJson = (json, options) => {
    return this.cache.importJson(json, options);
  };
  generateRandomId = () => {
    let id = "";
    for (let i = 0; i < 16; i++) {
      let randomNumber = Math.floor(Math.random() * 10);
      id += randomNumber;
    }
    if (this.cache.get(`${this.key}${id}`)) {
      return generateRandomId();
    }
    return id;
  };
}
