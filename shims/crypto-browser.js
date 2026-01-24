// Browser crypto shim
// The amiiboHandler detects browser environment and uses crypto.subtle directly
// This shim exports nothing since amiiboHandler checks isNode before using nodeCrypto
module.exports = null;
