import { Buffer } from "buffer";
globalThis.Buffer = Buffer;
globalThis.global = globalThis;
globalThis.process = { env: {}, versions: undefined };
export { Buffer };