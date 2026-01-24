const { Buffer } = require('buffer');

const isBrowser = typeof window !== 'undefined' && typeof window.crypto !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

const nodeCrypto = isNode ? require('crypto') : null;
const subtleCrypto = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle)
    ? globalThis.crypto.subtle
    : (nodeCrypto && nodeCrypto.webcrypto ? nodeCrypto.webcrypto.subtle : null);

/*This constant is provided SOLELY because I cannot find a guide online to retrieve this file from a console or Amiibo on your own that doesn't just tell you to download it from somewhere anyway.
If someone can find, or make, a guide for this, I will wipe all commits of this key from the repo and instead point to how to get this key for yourself.*/
const MASTER_KEY_BUFFER = Buffer.from('1D164B375B72A55728B91D64B6A3C205756E666978656420696E666F7300000EDB4B9E3F45278F397EFF9B4FB9930000044917DC76B49640D6F83939960FAED4EF392FAAB21428AA21FB54E5450547667F752D2873A20017FEF85C0575904B6D6C6F636B656420736563726574000010FDC8A07694B89E4C47D37DE8CE5C74C1044917DC76B49640D6F83939960FAED4EF392FAAB21428AA21FB54E545054766', 'hex');

const DATA_HMAC_KEY = MASTER_KEY_BUFFER.slice(0, 16);
const DATA_TYPE_STRING = MASTER_KEY_BUFFER.slice(16, 30);
const DATA_MAGIC_BYTES_SIZE = MASTER_KEY_BUFFER[31];
const DATA_MAGIC_BYTES = MASTER_KEY_BUFFER.slice(32, 48);
const DATA_XOR_PAD = MASTER_KEY_BUFFER.slice(48, 80);

const TAG_HMAC_KEY = MASTER_KEY_BUFFER.slice(80, 96);
const TAG_TYPE_STRING = MASTER_KEY_BUFFER.slice(96, 110);
const TAG_MAGIC_BYTES_SIZE = MASTER_KEY_BUFFER[111];
const TAG_MAGIC_BYTES = MASTER_KEY_BUFFER.slice(112, 128);
const TAG_XOR_PAD = MASTER_KEY_BUFFER.slice(128, 160);

const NFC3D_AMIIBO_SIZE = 520;
const NTAG215_SIZE = 540;
const NTAG215_SIZE_ALT = 532;

const MII_OFFSET_DECRYPTED = 0x4C;
const MII_SIZE = 96;

//Calculate CRC16 checksum for Mii data (for Amiibo format)
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

//Validate and fix Mii checksum - for 96-byte Amiibo format
function validateAndFixMiiChecksum(miiData) {
    if (miiData.length !== 92 && miiData.length !== MII_SIZE) {
        throw new Error(`Invalid Mii data size: expected 92 or ${MII_SIZE} bytes, got ${miiData.length}`);
    }
    const fullMii = Buffer.alloc(MII_SIZE);
    miiData.slice(0, Math.min(94, miiData.length)).copy(fullMii, 0);
    const newChecksum = calculateMiiChecksum(fullMii);
    fullMii[94] = (newChecksum >> 8) & 0xFF;
    fullMii[95] = newChecksum & 0xFF;
    return fullMii;
}
function calcSeed(dump) {
    const seed = Buffer.alloc(64);
    dump.slice(0x029, 0x02B).copy(seed, 0x00);
    seed.fill(0x00, 0x02, 0x10);
    dump.slice(0x1D4, 0x1DC).copy(seed, 0x10);
    dump.slice(0x1D4, 0x1DC).copy(seed, 0x18);
    dump.slice(0x1E8, 0x208).copy(seed, 0x20);
    return seed;
}
function prepareSeed(typeString, magicBytes, magicBytesSize, xorPad, baseSeed) {
    const output = Buffer.alloc(480);
    let offset = 0;
    const typeStringEnd = typeString.indexOf(0);
    const typeLen = typeStringEnd >= 0 ? typeStringEnd + 1 : 14;
    typeString.slice(0, typeLen).copy(output, offset);
    offset += typeLen;
    const leadingSeedBytes = 16 - magicBytesSize;
    baseSeed.slice(0, leadingSeedBytes).copy(output, offset);
    offset += leadingSeedBytes;
    magicBytes.slice(0, magicBytesSize).copy(output, offset);
    offset += magicBytesSize;
    baseSeed.slice(0x10, 0x20).copy(output, offset);
    offset += 16;
    for (let i = 0; i < 32; i++) {
        output[offset + i] = baseSeed[0x20 + i] ^ xorPad[i];
    }
    offset += 32;
    return output.slice(0, offset);
}
function drbgGenerateBytes(hmacKey, seed, outputSize) {
    const result = Buffer.alloc(outputSize);
    let offset = 0;
    let iteration = 0;
    while (offset < outputSize) {
        const iterBuffer = Buffer.alloc(2 + seed.length);
        iterBuffer[0] = (iteration >> 8) & 0xFF;
        iterBuffer[1] = iteration & 0xFF;
        seed.copy(iterBuffer, 2);
        const hmac = nodeCrypto.createHmac('sha256', hmacKey);
        hmac.update(iterBuffer);
        const output = hmac.digest();
        const toCopy = Math.min(32, outputSize - offset);
        output.copy(result, offset, 0, toCopy);
        offset += toCopy;
        iteration++;
    }
    return result;
}

async function drbgGenerateBytesAsync(hmacKey, seed, outputSize) {
    const result = Buffer.alloc(outputSize);
    let offset = 0;
    let iteration = 0;
    while (offset < outputSize) {
        const iterBuffer = Buffer.alloc(2 + seed.length);
        iterBuffer[0] = (iteration >> 8) & 0xFF;
        iterBuffer[1] = iteration & 0xFF;
        seed.copy(iterBuffer, 2);
        const output = await hmacSha256Async(hmacKey, iterBuffer);
        const toCopy = Math.min(32, outputSize - offset);
        output.copy(result, offset, 0, toCopy);
        offset += toCopy;
        iteration++;
    }
    return result;
}

function deriveKeys(typeString, magicBytes, magicBytesSize, xorPad, hmacKey, baseSeed) {
    const preparedSeed = prepareSeed(typeString, magicBytes, magicBytesSize, xorPad, baseSeed);
    const derived = drbgGenerateBytes(hmacKey, preparedSeed, 48);
    return {
        aesKey: derived.slice(0, 16),
        aesIV: derived.slice(16, 32),
        hmacKey: derived.slice(32, 48)
    };
}

async function deriveKeysAsync(typeString, magicBytes, magicBytesSize, xorPad, hmacKey, baseSeed) {
    const preparedSeed = prepareSeed(typeString, magicBytes, magicBytesSize, xorPad, baseSeed);
    const derived = await drbgGenerateBytesAsync(hmacKey, preparedSeed, 48);
    return {
        aesKey: derived.slice(0, 16),
        aesIV: derived.slice(16, 32),
        hmacKey: derived.slice(32, 48)
    };
}

function ensureBuffer(input, name) {
    if (Buffer.isBuffer(input)) {
        return input;
    }
    if (input instanceof Uint8Array) {
        return Buffer.from(input);
    }
    if (input instanceof ArrayBuffer) {
        return Buffer.from(new Uint8Array(input));
    }
    throw new Error(`${name} must be a Buffer or Uint8Array`);
}

async function hmacSha256Async(key, data) {
    if (!subtleCrypto) {
        throw new Error('Web Crypto API is not available');
    }
    const cryptoKey = await subtleCrypto.importKey(
        'raw',
        ensureBuffer(key, 'HMAC key'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await subtleCrypto.sign('HMAC', cryptoKey, ensureBuffer(data, 'HMAC data'));
    return Buffer.from(new Uint8Array(signature));
}

async function aesCtrCryptAsync(key, iv, data, encrypt) {
    if (!subtleCrypto) {
        throw new Error('Web Crypto API is not available');
    }
    const cryptoKey = await subtleCrypto.importKey(
        'raw',
        ensureBuffer(key, 'AES key'),
        { name: 'AES-CTR' },
        false,
        encrypt ? ['encrypt'] : ['decrypt']
    );
    const algorithm = {
        name: 'AES-CTR',
        counter: ensureBuffer(iv, 'AES IV'),
        length: 128,
    };
    const result = encrypt
        ? await subtleCrypto.encrypt(algorithm, cryptoKey, ensureBuffer(data, 'AES data'))
        : await subtleCrypto.decrypt(algorithm, cryptoKey, ensureBuffer(data, 'AES data'));
    return Buffer.from(new Uint8Array(result));
}

function tagToInternal(tag) {
    const internal = Buffer.alloc(NFC3D_AMIIBO_SIZE);
    tag.slice(0x008, 0x010).copy(internal, 0x000);
    tag.slice(0x080, 0x0A0).copy(internal, 0x008);
    tag.slice(0x010, 0x034).copy(internal, 0x028);
    tag.slice(0x0A0, 0x208).copy(internal, 0x04C);
    tag.slice(0x034, 0x054).copy(internal, 0x1B4);
    tag.slice(0x000, 0x008).copy(internal, 0x1D4);
    tag.slice(0x054, 0x080).copy(internal, 0x1DC);
    return internal;
}

function internalToTag(internal) {
    const tag = Buffer.alloc(NFC3D_AMIIBO_SIZE);
    internal.slice(0x000, 0x008).copy(tag, 0x008);
    internal.slice(0x008, 0x028).copy(tag, 0x080);
    internal.slice(0x028, 0x04C).copy(tag, 0x010);
    internal.slice(0x04C, 0x1B4).copy(tag, 0x0A0);
    internal.slice(0x1B4, 0x1D4).copy(tag, 0x034);
    internal.slice(0x1D4, 0x1DC).copy(tag, 0x000);
    internal.slice(0x1DC, 0x208).copy(tag, 0x054);
    return tag;
}

function decryptAmiibo(tag) {
    const internal = tagToInternal(tag);
    const seed = calcSeed(internal);
    const dataKeys = deriveKeys(DATA_TYPE_STRING, DATA_MAGIC_BYTES, DATA_MAGIC_BYTES_SIZE, DATA_XOR_PAD, DATA_HMAC_KEY, seed);
    const tagKeys = deriveKeys(TAG_TYPE_STRING, TAG_MAGIC_BYTES, TAG_MAGIC_BYTES_SIZE, TAG_XOR_PAD, TAG_HMAC_KEY, seed);
    const plain = Buffer.alloc(NFC3D_AMIIBO_SIZE);
    const cipher = nodeCrypto.createDecipheriv('aes-128-ctr', dataKeys.aesKey, dataKeys.aesIV);
    cipher.setAutoPadding(false);
    const decrypted = cipher.update(internal.slice(0x02C, 0x1B4));
    decrypted.copy(plain, 0x02C);
    internal.slice(0x000, 0x008).copy(plain, 0x000);
    internal.slice(0x028, 0x02C).copy(plain, 0x028);
    internal.slice(0x1D4, 0x208).copy(plain, 0x1D4);
    const tagHmac = nodeCrypto.createHmac('sha256', tagKeys.hmacKey);
    tagHmac.update(plain.slice(0x1D4, 0x208));
    const computedTagHmac = tagHmac.digest();
    computedTagHmac.copy(plain, 0x1B4);
    const dataHmac = nodeCrypto.createHmac('sha256', dataKeys.hmacKey);
    dataHmac.update(plain.slice(0x029, 0x208));
    const computedDataHmac = dataHmac.digest();
    computedDataHmac.copy(plain, 0x008);
    return plain;
}

async function decryptAmiiboAsync(tag) {
    const internal = tagToInternal(tag);
    const seed = calcSeed(internal);
    const dataKeys = await deriveKeysAsync(DATA_TYPE_STRING, DATA_MAGIC_BYTES, DATA_MAGIC_BYTES_SIZE, DATA_XOR_PAD, DATA_HMAC_KEY, seed);
    const tagKeys = await deriveKeysAsync(TAG_TYPE_STRING, TAG_MAGIC_BYTES, TAG_MAGIC_BYTES_SIZE, TAG_XOR_PAD, TAG_HMAC_KEY, seed);
    const plain = Buffer.alloc(NFC3D_AMIIBO_SIZE);
    const decrypted = await aesCtrCryptAsync(dataKeys.aesKey, dataKeys.aesIV, internal.slice(0x02C, 0x1B4), false);
    decrypted.copy(plain, 0x02C);
    internal.slice(0x000, 0x008).copy(plain, 0x000);
    internal.slice(0x028, 0x02C).copy(plain, 0x028);
    internal.slice(0x1D4, 0x208).copy(plain, 0x1D4);
    const tagHmac = await hmacSha256Async(tagKeys.hmacKey, plain.slice(0x1D4, 0x208));
    tagHmac.copy(plain, 0x1B4);
    const dataHmac = await hmacSha256Async(dataKeys.hmacKey, plain.slice(0x029, 0x208));
    dataHmac.copy(plain, 0x008);
    return plain;
}

function encryptAmiibo(plain) {
    const seed = calcSeed(plain);
    const dataKeys = deriveKeys(DATA_TYPE_STRING, DATA_MAGIC_BYTES, DATA_MAGIC_BYTES_SIZE, DATA_XOR_PAD, DATA_HMAC_KEY, seed);
    const tagKeys = deriveKeys(TAG_TYPE_STRING, TAG_MAGIC_BYTES, TAG_MAGIC_BYTES_SIZE, TAG_XOR_PAD, TAG_HMAC_KEY, seed);
    const cipher_internal = Buffer.alloc(NFC3D_AMIIBO_SIZE);
    const tagHmac = nodeCrypto.createHmac('sha256', tagKeys.hmacKey);
    tagHmac.update(plain.slice(0x1D4, 0x208));
    tagHmac.digest().copy(cipher_internal, 0x1B4);
    const dataHmac = nodeCrypto.createHmac('sha256', dataKeys.hmacKey);
    dataHmac.update(plain.slice(0x029, 0x1B4));
    dataHmac.update(cipher_internal.slice(0x1B4, 0x1D4));
    dataHmac.update(plain.slice(0x1D4, 0x208));
    dataHmac.digest().copy(cipher_internal, 0x008);
    const aesCipher = nodeCrypto.createCipheriv('aes-128-ctr', dataKeys.aesKey, dataKeys.aesIV);
    aesCipher.setAutoPadding(false);
    const encrypted = aesCipher.update(plain.slice(0x02C, 0x1B4));
    encrypted.copy(cipher_internal, 0x02C);
    plain.slice(0x000, 0x008).copy(cipher_internal, 0x000);
    plain.slice(0x028, 0x02C).copy(cipher_internal, 0x028);
    plain.slice(0x1D4, 0x208).copy(cipher_internal, 0x1D4);
    return internalToTag(cipher_internal);
}

async function encryptAmiiboAsync(plain) {
    const seed = calcSeed(plain);
    const dataKeys = await deriveKeysAsync(DATA_TYPE_STRING, DATA_MAGIC_BYTES, DATA_MAGIC_BYTES_SIZE, DATA_XOR_PAD, DATA_HMAC_KEY, seed);
    const tagKeys = await deriveKeysAsync(TAG_TYPE_STRING, TAG_MAGIC_BYTES, TAG_MAGIC_BYTES_SIZE, TAG_XOR_PAD, TAG_HMAC_KEY, seed);
    const cipher_internal = Buffer.alloc(NFC3D_AMIIBO_SIZE);
    const tagHmac = await hmacSha256Async(tagKeys.hmacKey, plain.slice(0x1D4, 0x208));
    tagHmac.copy(cipher_internal, 0x1B4);
    const dataHmac = await hmacSha256Async(dataKeys.hmacKey, Buffer.concat([
        plain.slice(0x029, 0x1B4),
        cipher_internal.slice(0x1B4, 0x1D4),
        plain.slice(0x1D4, 0x208)
    ]));
    dataHmac.copy(cipher_internal, 0x008);
    const encrypted = await aesCtrCryptAsync(dataKeys.aesKey, dataKeys.aesIV, plain.slice(0x02C, 0x1B4), true);
    encrypted.copy(cipher_internal, 0x02C);
    plain.slice(0x000, 0x008).copy(cipher_internal, 0x000);
    plain.slice(0x028, 0x02C).copy(cipher_internal, 0x028);
    plain.slice(0x1D4, 0x208).copy(cipher_internal, 0x1D4);
    return internalToTag(cipher_internal);
}

//Extract Mii data from an Amiibo dump
function extractMiiFromAmiibo(amiiboDump) {
    const dump = ensureBuffer(amiiboDump, 'Amiibo dump');
    const size = dump.length;
    if (size !== NFC3D_AMIIBO_SIZE && size !== NTAG215_SIZE && size !== NTAG215_SIZE_ALT) {
        throw new Error(`Invalid Amiibo dump size: ${size} (expected ${NFC3D_AMIIBO_SIZE}, ${NTAG215_SIZE_ALT}, or ${NTAG215_SIZE})`);
    }
    const tag = dump.slice(0, NFC3D_AMIIBO_SIZE);
    if (!isNode) {
        return extractMiiFromAmiiboAsync(tag, dump.length);
    }
    const decrypted = decryptAmiibo(tag);

    // Extract only the first 92 bytes (the actual Mii data, without checksum)
    const miiData = decrypted.slice(MII_OFFSET_DECRYPTED, MII_OFFSET_DECRYPTED + 92);

    return Buffer.from(miiData);
}

async function extractMiiFromAmiiboAsync(tag, dumpSize) {
    const decrypted = await decryptAmiiboAsync(tag);
    const miiData = decrypted.slice(MII_OFFSET_DECRYPTED, MII_OFFSET_DECRYPTED + 92);
    return Buffer.from(miiData);
}

//Insert Mii data into an Amiibo dump
function insertMiiIntoAmiibo(amiiboDump, miiData) {
    const dump = ensureBuffer(amiiboDump, 'Amiibo dump');
    const miiBuf = ensureBuffer(miiData, 'Mii data');
    const size = dump.length;
    if (size !== NFC3D_AMIIBO_SIZE && size !== NTAG215_SIZE && size !== NTAG215_SIZE_ALT) {
        throw new Error(`Invalid Amiibo dump size: ${size}`);
    }
    if (miiBuf.length !== 92 && miiBuf.length !== MII_SIZE) {
        throw new Error(`Mii data must be 92 or ${MII_SIZE} bytes, got ${miiBuf.length}`);
    }
    const tag = dump.slice(0, NFC3D_AMIIBO_SIZE);
    if (!isNode) {
        return insertMiiIntoAmiiboAsync(tag, dump, miiBuf);
    }
    const decrypted = decryptAmiibo(tag);

    // Validate and fix Mii checksum, ensuring it's 96 bytes with correct checksum
    const miiWithChecksum = validateAndFixMiiChecksum(miiBuf);

    // Insert Mii data (96 bytes)
    miiWithChecksum.copy(decrypted, MII_OFFSET_DECRYPTED);

    const encrypted = encryptAmiibo(decrypted);
    const result = Buffer.alloc(size);
    encrypted.copy(result, 0);
    if (size > NFC3D_AMIIBO_SIZE) {
        dump.slice(NFC3D_AMIIBO_SIZE).copy(result, NFC3D_AMIIBO_SIZE);
    }

    return result;
}

async function insertMiiIntoAmiiboAsync(tag, dump, miiBuf) {
    const decrypted = await decryptAmiiboAsync(tag);
    const miiWithChecksum = validateAndFixMiiChecksum(miiBuf);
    miiWithChecksum.copy(decrypted, MII_OFFSET_DECRYPTED);
    const encrypted = await encryptAmiiboAsync(decrypted);
    const result = Buffer.alloc(dump.length);
    encrypted.copy(result, 0);
    if (dump.length > NFC3D_AMIIBO_SIZE) {
        dump.slice(NFC3D_AMIIBO_SIZE).copy(result, NFC3D_AMIIBO_SIZE);
    }
    return result;
}

module.exports = {
    insertMiiIntoAmiibo,
    extractMiiFromAmiibo
};