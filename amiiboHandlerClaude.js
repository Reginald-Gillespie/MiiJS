// Cross-platform Amiibo Handler
// Works in both Node.js and Browser environments

// Environment detection
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Node.js crypto (only load in Node.js)
let nodeCrypto = null;
if (isNode) {
    nodeCrypto = require('crypto');
}

// Master key (SOLELY provided because there's no official way to get it yourself)
const MASTER_KEY_HEX = '1D164B375B72A55728B91D64B6A3C205756E666978656420696E666F7300000EDB4B9E3F45278F397EFF9B4FB9930000044917DC76B49640D6F83939960FAED4EF392FAAB21428AA21FB54E5450547667F752D2873A20017FEF85C0575904B6D6C6F636B656420736563726574000010FDC8A07694B89E4C47D37DE8CE5C74C1044917DC76B49640D6F83939960FAED4EF392FAAB21428AA21FB54E545054766';

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

const MASTER_KEY_BYTES = hexToBytes(MASTER_KEY_HEX);

const DATA_HMAC_KEY = MASTER_KEY_BYTES.slice(0, 16);
const DATA_TYPE_STRING = MASTER_KEY_BYTES.slice(16, 30);
const DATA_MAGIC_BYTES_SIZE = MASTER_KEY_BYTES[31];
const DATA_MAGIC_BYTES = MASTER_KEY_BYTES.slice(32, 48);
const DATA_XOR_PAD = MASTER_KEY_BYTES.slice(48, 80);

const TAG_HMAC_KEY = MASTER_KEY_BYTES.slice(80, 96);
const TAG_TYPE_STRING = MASTER_KEY_BYTES.slice(96, 110);
const TAG_MAGIC_BYTES_SIZE = MASTER_KEY_BYTES[111];
const TAG_MAGIC_BYTES = MASTER_KEY_BYTES.slice(112, 128);
const TAG_XOR_PAD = MASTER_KEY_BYTES.slice(128, 160);

const NFC3D_AMIIBO_SIZE = 520;
const NTAG215_SIZE = 540;
const NTAG215_SIZE_ALT = 532;
const MII_OFFSET_DECRYPTED = 0x4C;
const MII_SIZE = 96;

// Cross-platform HMAC-SHA256
async function hmacSha256(key, data) {
    if (isNode && nodeCrypto) {
        const hmac = nodeCrypto.createHmac('sha256', Buffer.from(key));
        hmac.update(Buffer.from(data));
        return new Uint8Array(hmac.digest());
    } else {
        // Browser Web Crypto API
        const cryptoKey = await crypto.subtle.importKey(
            'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', cryptoKey, data);
        return new Uint8Array(sig);
    }
}

// Cross-platform AES-128-CTR
async function aesCtr(key, iv, data, encrypt) {
    if (isNode && nodeCrypto) {
        const fn = encrypt ? 'createCipheriv' : 'createDecipheriv';
        const cipher = nodeCrypto[fn]('aes-128-ctr', Buffer.from(key), Buffer.from(iv));
        cipher.setAutoPadding(false);
        return new Uint8Array(cipher.update(Buffer.from(data)));
    } else {
        // Browser Web Crypto API
        const cryptoKey = await crypto.subtle.importKey(
            'raw', key, { name: 'AES-CTR' }, false, ['encrypt', 'decrypt']
        );
        const result = await crypto.subtle[encrypt ? 'encrypt' : 'decrypt'](
            { name: 'AES-CTR', counter: iv, length: 128 }, cryptoKey, data
        );
        return new Uint8Array(result);
    }
}

// CRC16 checksum
function calculateMiiChecksum(data) {
    const checksumData = data.slice(0, 94);
    let crc = 0;
    for (let byteIndex = 0; byteIndex < checksumData.length; byteIndex++) {
        for (let bitIndex = 7; bitIndex >= 0; bitIndex--) {
            crc = (((crc << 1) | ((checksumData[byteIndex] >> bitIndex) & 0x1)) ^
                (((crc & 0x8000) !== 0) ? 0x1021 : 0)) & 0xFFFF;
        }
    }
    for (let counter = 16; counter > 0; counter--) {
        crc = ((crc << 1) ^ (((crc & 0x8000) !== 0) ? 0x1021 : 0)) & 0xFFFF;
    }
    return crc & 0xFFFF;
}

function validateAndFixMiiChecksum(miiData) {
    if (miiData.length !== 92 && miiData.length !== MII_SIZE) {
        throw new Error(`Invalid Mii data size: expected 92 or ${MII_SIZE} bytes, got ${miiData.length}`);
    }
    const fullMii = new Uint8Array(MII_SIZE);
    fullMii.set(miiData.slice(0, Math.min(94, miiData.length)), 0);
    const newChecksum = calculateMiiChecksum(fullMii);
    fullMii[94] = (newChecksum >> 8) & 0xFF;
    fullMii[95] = newChecksum & 0xFF;
    return fullMii;
}

function calcSeed(dump) {
    const seed = new Uint8Array(64);
    seed.set(dump.slice(0x029, 0x02B), 0x00);
    // seed[0x02:0x10] already zero
    seed.set(dump.slice(0x1D4, 0x1DC), 0x10);
    seed.set(dump.slice(0x1D4, 0x1DC), 0x18);
    seed.set(dump.slice(0x1E8, 0x208), 0x20);
    return seed;
}

function prepareSeed(typeString, magicBytes, magicBytesSize, xorPad, baseSeed) {
    const output = new Uint8Array(480);
    let offset = 0;
    let typeLen = 14;
    for (let i = 0; i < typeString.length; i++) {
        if (typeString[i] === 0) { typeLen = i + 1; break; }
    }
    output.set(typeString.slice(0, typeLen), offset);
    offset += typeLen;
    const leadingSeedBytes = 16 - magicBytesSize;
    output.set(baseSeed.slice(0, leadingSeedBytes), offset);
    offset += leadingSeedBytes;
    output.set(magicBytes.slice(0, magicBytesSize), offset);
    offset += magicBytesSize;
    output.set(baseSeed.slice(0x10, 0x20), offset);
    offset += 16;
    for (let i = 0; i < 32; i++) {
        output[offset + i] = baseSeed[0x20 + i] ^ xorPad[i];
    }
    offset += 32;
    return output.slice(0, offset);
}

async function drbgGenerateBytes(hmacKey, seed, outputSize) {
    const result = new Uint8Array(outputSize);
    let offset = 0;
    let iteration = 0;
    while (offset < outputSize) {
        const iterBuffer = new Uint8Array(2 + seed.length);
        iterBuffer[0] = (iteration >> 8) & 0xFF;
        iterBuffer[1] = iteration & 0xFF;
        iterBuffer.set(seed, 2);
        const output = await hmacSha256(hmacKey, iterBuffer);
        const toCopy = Math.min(32, outputSize - offset);
        result.set(output.slice(0, toCopy), offset);
        offset += toCopy;
        iteration++;
    }
    return result;
}

async function deriveKeys(typeString, magicBytes, magicBytesSize, xorPad, hmacKey, baseSeed) {
    const preparedSeed = prepareSeed(typeString, magicBytes, magicBytesSize, xorPad, baseSeed);
    const derived = await drbgGenerateBytes(hmacKey, preparedSeed, 48);
    return {
        aesKey: derived.slice(0, 16),
        aesIV: derived.slice(16, 32),
        hmacKey: derived.slice(32, 48)
    };
}

function tagToInternal(tag) {
    const internal = new Uint8Array(NFC3D_AMIIBO_SIZE);
    internal.set(tag.slice(0x008, 0x010), 0x000);
    internal.set(tag.slice(0x080, 0x0A0), 0x008);
    internal.set(tag.slice(0x010, 0x034), 0x028);
    internal.set(tag.slice(0x0A0, 0x208), 0x04C);
    internal.set(tag.slice(0x034, 0x054), 0x1B4);
    internal.set(tag.slice(0x000, 0x008), 0x1D4);
    internal.set(tag.slice(0x054, 0x080), 0x1DC);
    return internal;
}

function internalToTag(internal) {
    const tag = new Uint8Array(NFC3D_AMIIBO_SIZE);
    tag.set(internal.slice(0x000, 0x008), 0x008);
    tag.set(internal.slice(0x008, 0x028), 0x080);
    tag.set(internal.slice(0x028, 0x04C), 0x010);
    tag.set(internal.slice(0x04C, 0x1B4), 0x0A0);
    tag.set(internal.slice(0x1B4, 0x1D4), 0x034);
    tag.set(internal.slice(0x1D4, 0x1DC), 0x000);
    tag.set(internal.slice(0x1DC, 0x208), 0x054);
    return tag;
}

async function decryptAmiibo(tag) {
    const internal = tagToInternal(tag);
    const seed = calcSeed(internal);
    const dataKeys = await deriveKeys(DATA_TYPE_STRING, DATA_MAGIC_BYTES, DATA_MAGIC_BYTES_SIZE, DATA_XOR_PAD, DATA_HMAC_KEY, seed);
    const tagKeys = await deriveKeys(TAG_TYPE_STRING, TAG_MAGIC_BYTES, TAG_MAGIC_BYTES_SIZE, TAG_XOR_PAD, TAG_HMAC_KEY, seed);
    
    const plain = new Uint8Array(NFC3D_AMIIBO_SIZE);
    const decrypted = await aesCtr(dataKeys.aesKey, dataKeys.aesIV, internal.slice(0x02C, 0x1B4), false);
    plain.set(decrypted, 0x02C);
    plain.set(internal.slice(0x000, 0x008), 0x000);
    plain.set(internal.slice(0x028, 0x02C), 0x028);
    plain.set(internal.slice(0x1D4, 0x208), 0x1D4);
    
    const computedTagHmac = await hmacSha256(tagKeys.hmacKey, plain.slice(0x1D4, 0x208));
    plain.set(computedTagHmac, 0x1B4);
    
    const computedDataHmac = await hmacSha256(dataKeys.hmacKey, plain.slice(0x029, 0x208));
    plain.set(computedDataHmac, 0x008);
    
    return plain;
}

async function encryptAmiibo(plain) {
    const seed = calcSeed(plain);
    const dataKeys = await deriveKeys(DATA_TYPE_STRING, DATA_MAGIC_BYTES, DATA_MAGIC_BYTES_SIZE, DATA_XOR_PAD, DATA_HMAC_KEY, seed);
    const tagKeys = await deriveKeys(TAG_TYPE_STRING, TAG_MAGIC_BYTES, TAG_MAGIC_BYTES_SIZE, TAG_XOR_PAD, TAG_HMAC_KEY, seed);
    
    const cipher_internal = new Uint8Array(NFC3D_AMIIBO_SIZE);
    
    const tagHmac = await hmacSha256(tagKeys.hmacKey, plain.slice(0x1D4, 0x208));
    cipher_internal.set(tagHmac, 0x1B4);
    
    // Concatenate data for data HMAC
    const dataToHmac = new Uint8Array((0x1B4 - 0x029) + (0x1D4 - 0x1B4) + (0x208 - 0x1D4));
    dataToHmac.set(plain.slice(0x029, 0x1B4), 0);
    dataToHmac.set(cipher_internal.slice(0x1B4, 0x1D4), 0x1B4 - 0x029);
    dataToHmac.set(plain.slice(0x1D4, 0x208), (0x1B4 - 0x029) + (0x1D4 - 0x1B4));
    const dataHmac = await hmacSha256(dataKeys.hmacKey, dataToHmac);
    cipher_internal.set(dataHmac, 0x008);
    
    const encrypted = await aesCtr(dataKeys.aesKey, dataKeys.aesIV, plain.slice(0x02C, 0x1B4), true);
    cipher_internal.set(encrypted, 0x02C);
    cipher_internal.set(plain.slice(0x000, 0x008), 0x000);
    cipher_internal.set(plain.slice(0x028, 0x02C), 0x028);
    cipher_internal.set(plain.slice(0x1D4, 0x208), 0x1D4);
    
    return internalToTag(cipher_internal);
}

// Extract Mii data from an Amiibo dump
async function extractMiiFromAmiibo(amiiboDump) {
    const data = amiiboDump instanceof Uint8Array ? amiiboDump : new Uint8Array(amiiboDump);
    const size = data.length;
    if (size !== NFC3D_AMIIBO_SIZE && size !== NTAG215_SIZE && size !== NTAG215_SIZE_ALT) {
        throw new Error(`Invalid Amiibo dump size: ${size} (expected ${NFC3D_AMIIBO_SIZE}, ${NTAG215_SIZE_ALT}, or ${NTAG215_SIZE})`);
    }
    const tag = data.slice(0, NFC3D_AMIIBO_SIZE);
    const decrypted = await decryptAmiibo(tag);
    const miiData = decrypted.slice(MII_OFFSET_DECRYPTED, MII_OFFSET_DECRYPTED + 92);
    return miiData;
}

// Insert Mii data into an Amiibo dump
async function insertMiiIntoAmiibo(amiiboDump, miiData) {
    const dumpData = amiiboDump instanceof Uint8Array ? amiiboDump : new Uint8Array(amiiboDump);
    const miiBytes = miiData instanceof Uint8Array ? miiData : new Uint8Array(miiData);
    
    const size = dumpData.length;
    if (size !== NFC3D_AMIIBO_SIZE && size !== NTAG215_SIZE && size !== NTAG215_SIZE_ALT) {
        throw new Error(`Invalid Amiibo dump size: ${size}`);
    }
    if (miiBytes.length !== 92 && miiBytes.length !== MII_SIZE) {
        throw new Error(`Mii data must be 92 or ${MII_SIZE} bytes, got ${miiBytes.length}`);
    }
    
    const tag = dumpData.slice(0, NFC3D_AMIIBO_SIZE);
    const decrypted = await decryptAmiibo(tag);
    
    const miiWithChecksum = validateAndFixMiiChecksum(miiBytes);
    decrypted.set(miiWithChecksum, MII_OFFSET_DECRYPTED);
    
    const encrypted = await encryptAmiibo(decrypted);
    const result = new Uint8Array(size);
    result.set(encrypted, 0);
    if (size > NFC3D_AMIIBO_SIZE) {
        result.set(dumpData.slice(NFC3D_AMIIBO_SIZE), NFC3D_AMIIBO_SIZE);
    }
    
    return result;
}

module.exports = {
    insertMiiIntoAmiibo,
    extractMiiFromAmiibo
};
