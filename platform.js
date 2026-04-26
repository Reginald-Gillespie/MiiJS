// platform.js (Node runtime)
//
// Browser bundles should alias `./platform.js` -> `./platform.browser.js`
// so the rest of the codebase always imports from "./platform.js".

import { Buffer } from "buffer";
import { Buffer as NodeBuffer } from "node:buffer";
import * as nodeCrypto from "node:crypto";
import fs from "fs";
import util from "node:util";

const isNode=true;
const isBrowser=false;

const {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  createHash,
  timingSafeEqual,
} = nodeCrypto;
export {
  // Buffers
  Buffer,
  NodeBuffer,

  // Crypto
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  createHash,
  timingSafeEqual,

  // FS / util
  fs,
  util,

  isNode,
  isBrowser
};
