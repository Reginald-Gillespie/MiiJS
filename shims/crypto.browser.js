import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "./platform.browser.js";

const webcrypto = globalThis.crypto;
const subtle = webcrypto?.subtle;

export {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  subtle,
  timingSafeEqual,
  webcrypto
};

export default {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  subtle,
  timingSafeEqual,
  webcrypto
};
