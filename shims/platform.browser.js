// shims/platform.browser.js
import { Buffer } from "buffer";
import util from "util";
import fs from "./fs.browser.js";

// Pull sync crypto primitives from your local asmCrypto build
import { AES_CTR, SHA256, HMAC_SHA256 } from "../asmCrypto.js";

// --- randomBytes (sync) ---
function randomBytes(len) {
  const out = new Uint8Array(len);
  const c = globalThis.crypto;
  if (!c || !c.getRandomValues) {
    throw new Error("crypto.getRandomValues unavailable in this environment");
  }
  c.getRandomValues(out);
  return Buffer.from(out);
}

// --- createCipheriv/createDecipheriv: only implement what your code uses (aes-128-ctr) ---
function makeCtrCipher(isEncrypt, key, iv) {
  const k = Buffer.from(key);
  const v = Buffer.from(iv);

  if (k.length !== 16) throw new Error("aes-128-ctr requires 16-byte key");
  if (v.length !== 16) throw new Error("aes-128-ctr requires 16-byte IV");

  let chunks = [];

  return {
    setAutoPadding() {
      // No-op for CTR
      return this;
    },
    update(data) {
      const inBuf = Buffer.from(data);
      const out = isEncrypt
        ? AES_CTR.encrypt(inBuf, k, v)
        : AES_CTR.decrypt(inBuf, k, v);
      const outBuf = Buffer.from(out);
      chunks.push(outBuf);
      return outBuf;
    },
    final() {
      // CTR has no padding/final block semantics
      return Buffer.alloc(0);
    }
  };
}

function createCipheriv(alg, key, iv) {
  if (alg !== "aes-128-ctr") throw new Error(`Unsupported algorithm in browser shim: ${alg}`);
  return makeCtrCipher(true, key, iv);
}

function createDecipheriv(alg, key, iv) {
  if (alg !== "aes-128-ctr") throw new Error(`Unsupported algorithm in browser shim: ${alg}`);
  return makeCtrCipher(false, key, iv);
}

// --- createHash('sha256') ---
function createHash(name) {
  if (name !== "sha256") throw new Error(`Unsupported hash in browser shim: ${name}`);
  let data = Buffer.alloc(0);
  return {
    update(chunk) {
      data = Buffer.concat([data, Buffer.from(chunk)]);
      return this;
    },
    digest(enc) {
      const out = Buffer.from(SHA256.bytes(data));
      return enc ? out.toString(enc) : out;
    }
  };
}

// --- createHmac('sha256', key) ---
function createHmac(name, key) {
  if (name !== "sha256") throw new Error(`Unsupported hmac in browser shim: ${name}`);
  const k = Buffer.from(key);
  let data = Buffer.alloc(0);
  return {
    update(chunk) {
      data = Buffer.concat([data, Buffer.from(chunk)]);
      return this;
    },
    digest(enc) {
      const out = Buffer.from(HMAC_SHA256.bytes(data, k));
      return enc ? out.toString(enc) : out;
    }
  };
}

// timingSafeEqual (optional; implement if you need it)
function timingSafeEqual(a, b) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  let diff = 0;
  for (let i = 0; i < A.length; i++) diff |= (A[i] ^ B[i]);
  return diff === 0;
}

const NodeBuffer = Buffer;
const isBrowser=true;
const isNode=false;
export {
  Buffer,
  NodeBuffer,
  util,
  fs,

  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  timingSafeEqual,

  isNode,
  isBrowser
};
