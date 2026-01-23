//Imports
const fs = require('fs');
const nodeCanvas = require('canvas');
const { createCanvas, loadImage, ImageData } = nodeCanvas;
const jsQR = require('jsqr');
const Jimp = require('jimp');
const THREE = require('three');
var GLTFLoader = null;
const QRCodeStyling = require("qr-code-styling");
const { JSDOM } = require("jsdom");
const httpsLib = require('https');
const asmCrypto = require("./asmCrypto.js");
const path = require("path");
const createGL = require('gl');
const {
    createCharModel, initCharModelTextures,
    initializeFFL, exitFFL, parseHexOrB64ToUint8Array,
    setIsWebGL1State, getCameraForViewType, ViewType
} = require("./fflWrapper.js");
const ModuleFFL = require("ffl.js/examples/ffl-emscripten-single-file.js");
const FFLShaderMaterial = require("ffl.js/FFLShaderMaterial.js");
const typeCheat = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3];

// Typedefs for intellisence
/** @typedef {import('./types').WiiMii} WiiMii */

//Miscellaneous Tables
const {lookupTables,convTables,defaultInstrs,childGenTables}=require("./data.json");

//Tools
function Uint8Cat() {
    var destLength = 0
    for (var i = 0; i < arguments.length; i++) {
        destLength += arguments[i].length;
    }
    var dest = new Uint8Array(destLength);
    var index = 0;
    for (var i = 0; i < arguments.length; i++) {
        dest.set(arguments[i], index);
        index += arguments[i].length;
    }
    return dest;
}
async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        httpsLib.get(url, (res) => {
            if (res.statusCode === 200) {
                const data = [];
                res.on('data', chunk => data.push(chunk));
                res.on('end', () => resolve(Buffer.concat(data)));
                res.on('error', reject);
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        });
    });
}
function byteToString(int) {
    var str = int.toString(16);
    if (str.length < 2) str = '0' + str;
    return str;
}
function getBinaryFromAddress(addr, bin) {
    let byte = bin.readUInt8(addr);
    let binaryString = '';
    for (let i = 7; i >= 0; i--) {
        binaryString += ((byte >> i) & 1) ? '1' : '0';
    }
    return binaryString;
}
function getKeyByValue(object, value) {
    for (var key in object) {
        if (object[key] === value) {
            return key;
        }
    }
}
function lookupTable(table, value, paginated) {
    if (paginated) {
        for (var i = 0; i < lookupTables[table].values.length; i++) {
            for (var j = 0; j < lookupTables[table].values[i].length; j++) {
                if (lookupTables[table].values[i][j] === value) {
                    return [i, j];
                }
            }
        }
    }
    else {
        for (var i = 0; i < lookupTables[table].values.length; i++) {
            if (lookupTables[table].values[i] === value) {
                return i;
            }
        }
    }
    return undefined;
}
function hexToBytes(hex) {
    const cleaned = hex.replace(/[\s:_-]/g, "").replace(/^0x/i, "");
    if (!/^(?:[0-9a-fA-F]{2})+$/.test(cleaned)) throw new Error("Invalid hex string");
    const out = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) out[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
    return out;
}
function toRawStudioBytes(any) {
    if (typeof any === "string") {
        const looksHex = /^(?:0x)?(?:[\s:_-]*[0-9a-fA-F]{2})+[\s:_-]*$/.test(any);
        if (looksHex) {
            const bytes = hexToBytes(any);
            if (bytes.length > 40 && bytes[0] === 0) return decodeStudio(bytes);
            return bytes;
        }
        return decodeStudio(any);
    }
    if (any instanceof Uint8Array || (typeof Buffer !== "undefined" && Buffer.isBuffer?.(any))) {
        const bytes = any instanceof Uint8Array ? any : new Uint8Array(any);
        if (bytes.length > 40 && bytes[0] === 0) return decodeStudio(bytes);
        return bytes;
    }
    throw new Error("Unsupported input type");
}
const find1D = (arr, value) => {
    const idx = arr.indexOf(value);
    return idx >= 0 ? idx : 0;
};
const findPageType = (table2D, id) => {
    for (let page = 0; page < table2D.length; page++) {
        const type = table2D[page].indexOf(id);
        if (type >= 0) return { page, type };
    }
    return { page: 0, type: 0 };
};

//If FFLResHigh.dat is in the same directory as Node.js is calling the library from, use it by default
let _fflRes;
function getFFLRes() {
    // If we've already tried loading, just return the result
    if (_fflRes !== undefined) return _fflRes;

    const searchPaths = [
        "./FFLResHigh.dat",
        "../FFLResHigh.dat",
        "../../FFLResHigh.dat",
        "./ffl/FFLResHigh.dat",
        "./afl/AFLResHigh.dat",
        "../ffl/FFLResHigh.dat",
        "../afl/AFLResHigh.dat",
        "../../ffl/FFLResHigh.dat",
        "../../afl/AFLResHigh.dat"
    ];

    for (const filePath of searchPaths) {
        try {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                // Make sure it's a file, not a directory
                if (stats.isFile()) {
                    // Convert Buffer to Uint8Array explicitly
                    const buffer = fs.readFileSync(filePath);
                    _fflRes = new Uint8Array(buffer);
                    console.log(`Loaded FFLResHigh.dat from: ${filePath} (${_fflRes.length} bytes)`);
                    return _fflRes;
                }
            }
        } catch (e) {
            // Silently continue to next path
            continue;
        }
    }

    // If no file found, mark as null
    console.warn('FFLResHigh.dat not found. Mii rendering will fall back to Mii Studio.');
    return _fflRes = null;
}

//3DS QR Code (En|De)cryption
var NONCE_OFFSET = 0xC;
var NONCE_LENGTH = 8;
var TAG_LENGTH = 0x10;
var aes_key = new Uint8Array([0x59, 0xFC, 0x81, 0x7E, 0x64, 0x46, 0xEA, 0x61, 0x90, 0x34, 0x7B, 0x20, 0xE9, 0xBD, 0xCE, 0x52]);
var pad = new Uint8Array([0, 0, 0, 0]);
function decodeAesCcm(data) {
    var nonce = Uint8Cat(data.subarray(0, NONCE_LENGTH), pad);
    var ciphertext = data.subarray(NONCE_LENGTH, data.length);
    var plaintext = asmCrypto.AES_CCM.decrypt(ciphertext, aes_key, nonce, undefined, TAG_LENGTH);
    return Uint8Cat(plaintext.subarray(0, NONCE_OFFSET), data.subarray(0, NONCE_LENGTH), plaintext.subarray(NONCE_OFFSET, plaintext.length - 4));
}
function crcCalc(data) {
    var crc = 0;
    for (var byteIndex = 0; byteIndex < data.length; byteIndex++) {
        for (var bitIndex = 7; bitIndex >= 0; bitIndex--) {
            crc = (((crc << 1) | ((data[byteIndex] >> bitIndex) & 0x1)) ^
                (((crc & 0x8000) != 0) ? 0x1021 : 0));
        }
    }
    for (var counter = 16; counter > 0; counter--) {
        crc = ((crc << 1) ^ (((crc & 0x8000) != 0) ? 0x1021 : 0));
    }
    return (crc & 0xFFFF);
}
function encodeAesCcm(data) {
    var nonce = Uint8Cat(data.subarray(NONCE_OFFSET, NONCE_OFFSET + NONCE_LENGTH), pad);
    var crcSrc = Uint8Cat(data, new Uint8Array([0, 0]));
    var crc = crcCalc(crcSrc);
    var cfsd = Uint8Cat(crcSrc, new Uint8Array([crc >>> 8, crc & 0xff]));
    var plaintext = Uint8Cat(cfsd.subarray(0, NONCE_OFFSET), cfsd.subarray(NONCE_OFFSET + NONCE_LENGTH, cfsd.length), pad, pad);
    var ciphertext = asmCrypto.AES_CCM.encrypt(plaintext, aes_key, nonce, undefined, TAG_LENGTH);
    return Uint8Cat(cfsd.subarray(NONCE_OFFSET, NONCE_OFFSET + NONCE_LENGTH), ciphertext.subarray(0, ciphertext.length - 24), ciphertext.subarray(ciphertext.length - TAG_LENGTH, ciphertext.length))
}

//Functions for working with the Miis
function encodeStudio(mii) {
    var n = 0;
    var eo;
    var dest = byteToString(n);
    for (var i = 0; i < mii.length; i++) {
        eo = (7 + (mii[i] ^ n)) & 0xFF;
        n = eo;
        dest += byteToString(eo);
    }
    return dest;
}
function decodeStudio(encoded) {
    let bytes;
    if (encoded instanceof Uint8Array) {
        bytes = Array.from(encoded);
    }
    else if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(encoded)) {
        bytes = Array.from(encoded.values());
    }
    else if (typeof encoded === "string") {
        bytes = new Array(encoded.length);
        for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i) & 0xFF;
    }
    else {
        throw new Error("decodeStudio: unsupported input type");
    }
    if (bytes.length < 2) return new Uint8Array(0);

    let n = 0;
    const out = new Uint8Array(bytes.length - 1);
    for (let i = 1; i < bytes.length; i++) {
        const eo = bytes[i] & 0xFF;
        out[i - 1] = ((((eo - 7) & 0xFF) ^ n) & 0xFF);
        n = eo;
    }
    return out;
}
function convertMii(jsonIn, typeTo) {
    typeFrom = jsonIn.console?.toLowerCase();
    if (typeFrom == null || typeTo === typeFrom) {
        return jsonIn;
    }
    let mii = jsonIn;
    var miiTo = structuredClone(mii);
    if (["wii u", "3ds"].includes(typeFrom)) {
        miiTo.perms.mingle = mii.perms.sharing;
        miiTo.perms.fromCheckMiiOut = false;
        miiTo.face.type = convTables.face3DSToWii[mii.face.type];
        //We prioritize Facial Features here because the Wii supports more of those than they do Makeup types, and is more likely to apply. The 3DS has two separate fields, so you can have makeup and wrinkles applied at the same time. The Wii only has one that covers both.
        if (typeof (convTables.features3DSToWii[mii.face.feature]) === 'string') {
            miiTo.face.feature = convTables.makeup3DSToWii[mii.face.makeup];
        }
        else {
            miiTo.face.feature = convTables.features3DSToWii[mii.face.feature];
        }
        miiTo.nose.type = convTables.nose3DSToWii[mii.nose.page][mii.nose.type];
        miiTo.mouth.type = convTables.mouth3DSToWii[mii.mouth.page][mii.mouth.type];
        miiTo.mouth.color = mii.mouth.color > 2 ? 0 : mii.mouth.color;
        miiTo.hair.type = convTables.hair3DSToWii[mii.hair.page][mii.hair.type];
        miiTo.eyebrows.type = convTables.eyebrows3DSToWii[mii.eyebrows.page][mii.eyebrows.type];
        miiTo.eyes.type = convTables.eyes3DSToWii[mii.eyes.page][mii.eyes.type];
        miiTo.glasses.color = mii.glasses.color;
        if (miiTo.beard.mustache.type === 4) {
            miiTo.beard.mustache.type = 2;
        }
        else if (miiTo.beard.mustache.type === 5) {
            miiTo.beard.mustache.type = 0;
            miiTo.beard.type = 1;
        }
        if (miiTo.beard.type > 3) {
            miiTo.beard.type = 3;
        }

        //System IDs are only 4 bytes on the Wii
        if(miiTo.meta.systemId){
            miiTo.meta.systemId=miiTo.meta.systemId.slice(0,8);
        }

        if (miiTo.meta.miiId) {
            const miiIdInt = parseInt(miiTo.meta.miiId.replaceAll(' ', ''), 16);
            // Extract 28-bit timestamp (bits 0-27), multiply by 2 to get seconds since 2010
            const secsSince2010 = (miiIdInt & 0x0FFFFFFF) * 2;
            // Convert to 4-second intervals since 2006
            const secondsOffset = 126230400; // Seconds between 2006 and 2010
            const intervals = Math.floor((secsSince2010 + secondsOffset) / 4);
            // Combine with type bits
            const typePrefix = miiTo.meta.type === "Special" ? 0b010 : 0b100;
            miiTo.meta.miiId = ((typePrefix << 29) | intervals).toString(16).toUpperCase().padStart(8, '0');
        }

        miiTo.console = "Wii";
    }
    else if (typeFrom === "wii") {
        miiTo.perms.sharing = mii.perms.mingle;
        miiTo.perms.copying = mii.perms.mingle;

        // Convert hair
        const hairConv = convTables.hairWiiTo3DS[mii.hair.page][mii.hair.type];
        miiTo.hair.page = hairConv[0];
        miiTo.hair.type = hairConv[1];

        // Convert face
        miiTo.face.type = convTables.faceWiiTo3DS[mii.face.type];
        miiTo.face.makeup = 0;
        miiTo.face.feature = 0;

        // Handle facial features/makeup
        if (typeof (convTables.featureWiiTo3DS[mii.face.feature]) === 'string') {
            miiTo.face.makeup = +convTables.featureWiiTo3DS[mii.face.feature];
        }
        else {
            miiTo.face.feature = +convTables.featureWiiTo3DS[mii.face.feature];
        }

        miiTo.eyes.squash = 3; // Default for 3DS
        miiTo.eyebrows.squash = 3; // Default for 3DS
        miiTo.nose.page = mii.nose.page || 0;
        miiTo.mouth.squash = 3; // Default for 3DS

        //System IDs are twice as long on 3DS
        if(miiTo.meta.systemId){
            miiTo.meta.systemId=miiTo.meta.systemId.padEnd(16,'0');
        }

        if (miiTo.meta.miiId) {
            const miiIdInt = parseInt(miiTo.meta.miiId.replaceAll(' ', ''), 16);
            // Extract 29-bit timestamp (bits 0-28), multiply by 4 to get seconds since 2006
            const secsSince2006 = (miiIdInt & 0x1FFFFFFF) * 4;
            // Convert to 2-second intervals since 2010
            const secondsOffset = 126230400; // Seconds between 2006 and 2010
            const intervals = Math.floor((secsSince2006 - secondsOffset) / 2);
            // Combine with flag bits
            const flags = miiTo.meta.type === "Special" ? 0b0001 : 0b1001;
            miiTo.meta.miiId = ((intervals & 0x0FFFFFFF) | (flags << 28)).toString(16).toUpperCase().padStart(8, '0');
        }

        miiTo.console = "3DS";
    }
    return miiTo;
}
function convertMiiToStudio(jsonIn) {
    if (!["3ds", "wii u"].includes(jsonIn.console?.toLowerCase())) {
        jsonIn = convertMii(jsonIn);
    }
    var mii = jsonIn;
    var studioMii = new Uint8Array([0x08, 0x00, 0x40, 0x03, 0x08, 0x04, 0x04, 0x02, 0x02, 0x0c, 0x03, 0x01, 0x06, 0x04, 0x06, 0x02, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x04, 0x00, 0x0a, 0x01, 0x00, 0x21, 0x40, 0x04, 0x00, 0x02, 0x14, 0x03, 0x13, 0x04, 0x17, 0x0d, 0x04, 0x00, 0x0a, 0x04, 0x01, 0x09]);
    studioMii[0x16] = mii.general.gender;
    studioMii[0x15] = mii.general.favoriteColor;
    studioMii[0x1E] = mii.general.height;
    studioMii[2] = mii.general.weight;
    studioMii[0x13] = lookupTables.faces.values[mii.face.type];
    studioMii[0x11] = mii.face.color;
    studioMii[0x14] = mii.face.feature;
    studioMii[0x12] = mii.face.makeup;
    studioMii[0x1D] = lookupTables.hairs.values[mii.hair.page][mii.hair.type];
    studioMii[0x1B] = mii.hair.color;
    if (!studioMii[0x1B]) studioMii[0x1B] = 8;
    studioMii[0x1C] = mii.hair.flipped ? 1 : 0;
    studioMii[7] = lookupTables.eyes.values[mii.eyes.page][mii.eyes.type];
    studioMii[4] = mii.eyes.color + 8;
    studioMii[6] = mii.eyes.size;
    studioMii[3] = mii.eyes.squash;
    studioMii[5] = mii.eyes.rotation;
    studioMii[8] = mii.eyes.distanceApart;
    studioMii[9] = mii.eyes.yPosition;
    studioMii[0xE] = lookupTables.eyebrows.values[mii.eyebrows.page][mii.eyebrows.type];
    studioMii[0xB] = mii.eyebrows.color;
    if (!studioMii[0xB]) studioMii[0xB] = 8;
    studioMii[0xD] = mii.eyebrows.size;
    studioMii[0xA] = mii.eyebrows.squash;
    studioMii[0xC] = mii.eyebrows.rotation;
    studioMii[0xF] = mii.eyebrows.distanceApart;
    studioMii[0x10] = mii.eyebrows.yPosition + 3;
    studioMii[0x2C] = lookupTables.noses.values[mii.nose.page][mii.nose.type];
    studioMii[0x2B] = mii.nose.size;
    studioMii[0x2D] = mii.nose.yPosition;
    studioMii[0x26] = lookupTables.mouths.values[mii.mouth.page][mii.mouth.type];
    studioMii[0x24] = mii.mouth.color;
    if (studioMii[0x24] < 4) {
        studioMii[0x24] += 19;
    } else {
        studioMii[0x24] = 0;
    }
    studioMii[0x25] = mii.mouth.size;
    studioMii[0x23] = mii.mouth.squash;
    studioMii[0x27] = mii.mouth.yPosition;
    studioMii[0x29] = mii.beard.mustache.type;
    studioMii[1] = mii.beard.type;
    studioMii[0] = mii.beard.color;
    if (!studioMii[0]) studioMii[0] = 8;
    studioMii[0x28] = mii.beard.mustache.size;
    studioMii[0x2A] = mii.beard.mustache.yPosition;
    studioMii[0x19] = mii.glasses.type;
    studioMii[0x17] = mii.glasses.color;
    if (!studioMii[0x17]) {
        studioMii[0x17] = 8;
    } else if (studioMii[0x17] < 6) {
        studioMii[0x17] += 13;
    } else {
        studioMii[0x17] = 0;
    }
    studioMii[0x18] = mii.glasses.size;
    studioMii[0x1A] = mii.glasses.yPosition;
    studioMii[0x20] = mii.mole.on ? 1 : 0;
    studioMii[0x1F] = mii.mole.size;
    studioMii[0x21] = mii.mole.xPosition;
    studioMii[0x22] = mii.mole.yPosition;
    return encodeStudio(studioMii);
}
function convertStudioToMii(input) {
    const s = toRawStudioBytes(input);
    const mii = {
        general: {
            gender: s[0x16],
            favoriteColor: s[0x15],
            height: s[0x1E],
            weight: s[0x02],

            //The following is not provided by Studio codes and are hardcoded
            birthday: 0,
            birthMonth: 0
        },

        face: {
            type: find1D(lookupTables.faces.values, s[0x13]),
            color: s[0x11],
            feature: s[0x14],
            makeup: s[0x12]
        },

        hair: (() => {
            const { page, type } = findPageType(lookupTables.hairs.values, s[0x1D]);
            const colorStored = s[0x1B];
            return {
                page, type,
                color: (colorStored === 8) ? 0 : colorStored,
                flipped: !!s[0x1C]
            };
        })(),

        eyes: (() => {
            const { page, type } = findPageType(lookupTables.eyes.values, s[0x07]);
            return {
                page, type,
                color: (s[0x04] | 0) - 8,
                size: s[0x06],
                squash: s[0x03],
                rotation: s[0x05],
                distanceApart: s[0x08],
                yPosition: s[0x09]
            };
        })(),

        eyebrows: (() => {
            const { page, type } = findPageType(lookupTables.eyebrows.values, s[0x0E]);
            const colorStored = s[0x0B];
            return {
                page, type,
                color: (colorStored === 8) ? 0 : colorStored,
                size: s[0x0D],
                squash: s[0x0A],
                rotation: s[0x0C],
                distanceApart: s[0x0F],
                yPosition: (s[0x10] | 0) - 3
            };
        })(),

        nose: (() => {
            const { page, type } = findPageType(lookupTables.noses.values, s[0x2C]);
            return { page, type, size: s[0x2B], yPosition: s[0x2D] };
        })(),

        mouth: (() => {
            const { page, type } = findPageType(lookupTables.mouths.values, s[0x26]);
            const stored = s[0x24];
            const color = (stored >= 19 && stored <= 22) ? (stored - 19) : 4;
            return {
                page, type, color,
                size: s[0x25],
                squash: s[0x23],
                yPosition: s[0x27]
            };
        })(),

        beard: (() => {
            const color = (s[0x00] === 8) ? 0 : s[0x00];
            return {
                color,
                type: s[0x01],
                mustache: { type: s[0x29], size: s[0x28], yPosition: s[0x2A] }
            };
        })(),

        glasses: (() => {
            const stored = s[0x17];
            let color;
            if (stored === 8) color = 0;
            else if (stored >= 14 && stored <= 18) color = stored - 13;
            else if (stored === 0) color = 6;
            else color = 0;
            return {
                type: s[0x19],
                color,
                size: s[0x18],
                yPosition: s[0x1A]
            };
        })(),

        mole: {
            on: !!s[0x20],
            size: s[0x1F],
            xPosition: s[0x21],
            yPosition: s[0x22]
        },

        //The rest is unprovided by Studio dumps and is hardcoded
        meta: {
            name: "Studio Mii",
            creatorName: "StudioUser",
            console: "3DS",
            type: "Default"
        },

        perms: {
            sharing: true,
            copying: true
        },

        console: "3DS"
    };

    return mii;
}

async function readWiiBin(binOrPath) {
    let data;
    if (Buffer.isBuffer(binOrPath)) {
        data = binOrPath;
    }
    else if (/[^01]/ig.test(binOrPath)) {
        data = await fs.promises.readFile(binOrPath);
    }
    else {
        data = Buffer.from(binOrPath);
    }
    var thisMii = {
        general: {},
        perms: {},
        meta: {},
        face: {},
        nose: {},
        mouth: {},
        mole: {},
        hair: {},
        eyebrows: {},
        eyes: {},
        glasses: {},
        beard: {
            mustache: {}
        }
    };

    const get = address => getBinaryFromAddress(address, data);

    var name = "";
    for (var i = 0; i < 10; i++) {
        name += data.slice(3 + i * 2, 4 + i * 2) + "";
    }
    thisMii.meta.name = name.replaceAll("\x00", "");
    var cname = "";
    for (var i = 0; i < 10; i++) {
        cname += data.slice(55 + i * 2, 56 + i * 2) + "";
    }
    thisMii.meta.creatorName = cname.replaceAll("\x00", "");
    thisMii.general.gender = +get(0x00)[1];//0 for Male, 1 for Female
    thisMii.meta.miiId = data.readUInt32BE(0x18).toString(16).padStart(8, '0');
    switch (thisMii.meta.miiId.slice(0, 3)) {
        case "010":
            thisMii.meta.type = "Special";
            break;
        case "110":
            thisMii.meta.type = "Foreign";
            break;
        default://100
            thisMii.meta.type = "Default";
            break;
    }
    thisMii.meta.systemId = data.readUInt32BE(0x1C).toString(16).padStart(8, '0').toUpperCase();
    var temp = get(0x20);
    thisMii.face.type = parseInt(temp.slice(0, 3), 2);//0-7
    thisMii.face.color = parseInt(temp.slice(3, 6), 2);//0-5
    temp = get(0x21);
    thisMii.face.feature = parseInt(get(0x20).slice(6, 8) + temp.slice(0, 2), 2);//0-11
    thisMii.perms.mingle = temp[5] === "0";//0 for Mingle, 1 for Don't Mingle
    temp = get(0x2C);
    thisMii.nose.type = +getKeyByValue(lookupTables.wiiNoses, parseInt(temp.slice(0, 4), 2));
    thisMii.nose.size = parseInt(temp.slice(4, 8), 2);
    thisMii.nose.yPosition = parseInt(get(0x2D).slice(0, 5), 2);//From top to bottom, 0-18, default 9
    temp = get(0x2E);
    thisMii.mouth.page = +lookupTables.mouthTable["" + parseInt(temp.slice(0, 5), 2)][0] - 1;
    thisMii.mouth.type = convTables.formatTo[lookupTables.mouthTable["" + parseInt(temp.slice(0, 5), 2)][2] - 1][lookupTables.mouthTable["" + parseInt(temp.slice(0, 5), 2)][1] - 1];//0-23, Needs lookup table
    thisMii.mouth.color = parseInt(temp.slice(5, 7), 2);//0-2, refer to mouthColors array
    temp2 = get(0x2F);
    thisMii.mouth.size = parseInt(temp[7] + temp2.slice(0, 3), 2);//0-8, default 4
    thisMii.mouth.yPosition = parseInt(temp2.slice(3, 8), 2);//0-18, default 9, from top to bottom
    temp = get(0x00);
    var temp2 = get(0x01);
    thisMii.general.birthMonth = parseInt(temp.slice(2, 6), 2);
    thisMii.general.birthday = parseInt(temp.slice(6, 8) + temp2.slice(0, 3), 2);
    thisMii.general.favoriteColor = parseInt(temp2.slice(3, 7), 2);//0-11, refer to cols array
    thisMii.meta.favorited = temp2[7]=="1";
    thisMii.general.height = parseInt(get(0x16), 2);//0-127
    thisMii.general.weight = parseInt(get(0x17), 2);//0-127
    thisMii.perms.fromCheckMiiOut = get(0x21)[7] == "1";
    temp = get(0x34);
    temp2 = get(0x35);
    thisMii.mole.on = temp[0] == "1";//0 for Off, 1 for On
    thisMii.mole.size = parseInt(temp.slice(1, 5), 2);//0-8, default 4
    thisMii.mole.xPosition = parseInt(temp2.slice(2, 7), 2);//0-16, Default 2
    thisMii.mole.yPosition = parseInt(temp.slice(5, 8) + temp2.slice(0, 2), 2);//Top to bottom
    temp = get(0x22);
    temp2 = get(0x23);
    thisMii.hair.page = +lookupTables.hairTable["" + parseInt(temp.slice(0, 7), 2)][0] - 1;
    thisMii.hair.type = +convTables.formatTo[lookupTables.hairTable["" + parseInt(temp.slice(0, 7), 2)][2] - 1][lookupTables.hairTable["" + parseInt(temp.slice(0, 7), 2)][1] - 1];//0-71, Needs lookup table
    thisMii.hair.color = parseInt(temp[7] + temp2.slice(0, 2), 2);//0-7, refer to hairCols array
    thisMii.hair.flipped = temp2[2] == "1";
    temp = get(0x24);
    temp2 = get(0x25);
    thisMii.eyebrows.page = +lookupTables.eyebrowTable["" + parseInt(temp.slice(0, 5), 2)][0] - 1;
    thisMii.eyebrows.type = convTables.formatTo[lookupTables.eyebrowTable["" + parseInt(temp.slice(0, 5), 2)][2] - 1][lookupTables.eyebrowTable["" + parseInt(temp.slice(0, 5), 2)][1] - 1];//0-23, Needs lookup table
    thisMii.eyebrows.rotation = parseInt(temp.slice(6, 8) + temp2.slice(0, 2), 2);//0-11, default varies based on eyebrow type
    temp = get(0x26);
    temp2 = get(0x27);
    thisMii.eyebrows.color = parseInt(temp.slice(0, 3), 2);
    thisMii.eyebrows.size = parseInt(temp.slice(3, 7), 2);//0-8, default 4
    thisMii.eyebrows.yPosition = (parseInt(temp[7] + temp2.slice(0, 4), 2)) - 3;//0-15, default 10
    thisMii.eyebrows.distanceApart = parseInt(temp2.slice(4, 8), 2);//0-12, default 2
    thisMii.eyes.page = +lookupTables.eyeTable[parseInt(get(0x28).slice(0, 6), 2)][0] - 1;//0-47, needs lookup table
    thisMii.eyes.type = convTables.formatTo[lookupTables.eyeTable[parseInt(get(0x28).slice(0, 6), 2)][2] - 1][lookupTables.eyeTable[parseInt(get(0x28).slice(0, 6), 2)][1] - 1];//0-47, needs lookup table
    temp = get(0x29);
    thisMii.eyes.rotation = parseInt(temp.slice(0, 3), 2);//0-7, default varies based on eye type
    thisMii.eyes.yPosition = parseInt(temp.slice(3, 8), 2);//0-18, default 12, top to bottom
    temp = get(0x2A);
    thisMii.eyes.color = parseInt(temp.slice(0, 3), 2);//0-5
    thisMii.eyes.size = parseInt(temp.slice(4, 7), 2);//0-7, default 4
    temp2 = get(0x2B);
    thisMii.eyes.distanceApart = parseInt(temp[7] + temp2.slice(0, 3), 2);//0-12, default 2
    temp = get(0x30);
    thisMii.glasses.type = parseInt(temp.slice(0, 4), 2);//0-8
    thisMii.glasses.color = parseInt(temp.slice(4, 7), 2);//0-5
    temp = get(0x31);
    thisMii.glasses.size = parseInt(temp.slice(0, 3), 2);//0-7, default 4
    thisMii.glasses.yPosition = parseInt(temp.slice(3, 8), 2);//0-20, default 10
    temp = get(0x32);
    temp2 = get(0x33);
    thisMii.beard.mustache.type = parseInt(temp.slice(0, 2), 2);//0-3
    thisMii.beard.type = parseInt(temp.slice(2, 4), 2);//0-3
    thisMii.beard.color = parseInt(temp.slice(4, 7), 2);//0-7
    thisMii.beard.mustache.size = parseInt(temp[7] + temp2.slice(0, 3), 2);//0-30, default 20
    thisMii.beard.mustache.yPosition = parseInt(temp2.slice(3, 8), 2);//0-16, default 2
    thisMii.console = "Wii";
    return thisMii;
}
function decode3DSMii(data) {
    const miiJson = {
        general: {},
        perms: {},
        meta: {},
        face: {},
        nose: {},
        mouth: {},
        mole: {},
        hair: {},
        eyebrows: {},
        eyes: {},
        glasses: {},
        beard: {
            mustache: {}
        }
    };
    const get = address => getBinaryFromAddress(address, data);
    miiJson.perms.copying = get(0x01)[7] === "1" ? true : false;
    const miiIdValue = data.readUInt32BE(0x0C);
    const systemIdHigh = data.readUInt32BE(0x04);
    const systemIdLow = data.readUInt32BE(0x08);

    miiJson.meta.type = (miiIdValue & 0x80000000) === 0 ? "Special" : "Default";
    miiJson.meta.systemId = systemIdHigh.toString(16).padStart(8, '0') + systemIdLow.toString(16).padStart(8, '0');
    miiJson.meta.miiId = miiIdValue.toString(16).padStart(8, '0');
    var temp = get(0x18);
    var temp2 = get(0x19);
    miiJson.general.birthday = parseInt(temp2.slice(6, 8) + temp.slice(0, 3), 2);
    miiJson.general.birthMonth = parseInt(temp.slice(3, 7), 2);
    //Handle UTF-16 Names
    var name = "";
    for (var i = 0x1A; i < 0x2E; i += 2) {
        let lo = data[i];
        let hi = data[i + 1];
        if (lo === 0x00 && hi === 0x00) {
            break;
        }
        let codeUnit = (hi << 8) | lo;
        name += String.fromCharCode(codeUnit);
    }
    miiJson.meta.name = name.replace(/\u0000/g, "");
    var cname = "";
    for (var i = 0x48; i < 0x5C; i += 2) {
        let lo = data[i];
        let hi = data[i + 1];
        if (lo === 0x00 && hi === 0x00) {
            break;
        }
        let codeUnit = (hi << 8) | lo;
        cname += String.fromCharCode(codeUnit);
    }
    miiJson.meta.creatorName = cname.replace(/\u0000/g, "");
    miiJson.general.height = parseInt(get(0x2E), 2);
    miiJson.general.weight = parseInt(get(0x2F), 2);
    miiJson.general.gender = +temp[7];
    temp = get(0x30);
    miiJson.perms.sharing = temp[7] === "1" ? false : true;
    miiJson.general.favoriteColor = parseInt(temp2.slice(2, 6), 2);
    miiJson.hair.page = lookupTable("hairs", parseInt(get(0x32), 2), true)[0];
    miiJson.hair.type = lookupTable("hairs", parseInt(get(0x32), 2), true)[1];
    miiJson.face.type = lookupTable("faces", parseInt(temp.slice(3, 7), 2), false);
    miiJson.face.color = parseInt(temp.slice(0, 3), 2);
    temp = get(0x31);
    miiJson.face.feature = parseInt(temp.slice(4, 8), 2);
    miiJson.face.makeup = parseInt(temp.slice(0, 4), 2);
    temp = get(0x34);
    miiJson.eyes.page = lookupTable("eyes", parseInt(temp.slice(2, 8), 2), true)[0];
    miiJson.eyes.type = lookupTable("eyes", parseInt(temp.slice(2, 8), 2), true)[1];
    temp2 = get(0x33);
    miiJson.hair.color = parseInt(temp2.slice(5, 8), 2);
    miiJson.hair.flipped = temp2[4] === "0" ? false : true;
    miiJson.eyes.color = parseInt(get(0x35)[7] + temp.slice(0, 2), 2);
    temp = get(0x35);
    miiJson.eyes.size = parseInt(temp.slice(3, 7), 2);
    miiJson.eyes.squash = parseInt(temp.slice(0, 3), 2);
    temp = get(0x36);
    temp2 = get(0x37);
    miiJson.eyes.rotation = parseInt(temp.slice(3, 8), 2);
    miiJson.eyes.distanceApart = parseInt(temp2[7] + temp.slice(0, 3), 2);
    miiJson.eyes.yPosition = parseInt(temp2.slice(2, 7), 2);
    temp = get(0x38);
    miiJson.eyebrows.page = lookupTable("eyebrows", parseInt(temp.slice(3, 8), 2), true)[0];
    miiJson.eyebrows.type = lookupTable("eyebrows", parseInt(temp.slice(3, 8), 2), true)[1];
    miiJson.eyebrows.color = parseInt(temp.slice(0, 3), 2);
    temp = get(0x39);
    miiJson.eyebrows.size = parseInt(temp.slice(4, 8), 2);
    miiJson.eyebrows.squash = parseInt(temp.slice(1, 4), 2);
    temp = get(0x3A);
    miiJson.eyebrows.rotation = parseInt(temp.slice(4, 8), 2);
    temp2 = get(0x3B);
    miiJson.eyebrows.distanceApart = parseInt(temp2[7] + temp.slice(0, 3), 2);
    miiJson.eyebrows.yPosition = parseInt(temp2.slice(2, 7), 2) - 3;
    temp = get(0x3C);
    miiJson.nose.page = lookupTable("noses", parseInt(temp.slice(3, 8), 2), true)[0];
    miiJson.nose.type = lookupTable("noses", parseInt(temp.slice(3, 8), 2), true)[1];
    temp2 = get(0x3D);
    miiJson.nose.size = parseInt(temp2[7] + temp.slice(0, 3), 2);
    miiJson.nose.yPosition = parseInt(temp2.slice(2, 7), 2);
    temp = get(0x3E);
    miiJson.mouth.page = lookupTable("mouths", parseInt(temp.slice(2, 8), 2), true)[0];
    miiJson.mouth.type = lookupTable("mouths", parseInt(temp.slice(2, 8), 2), true)[1];
    temp2 = get(0x3F);
    miiJson.mouth.color = parseInt(temp2[7] + temp.slice(0, 2), 2);
    miiJson.mouth.size = parseInt(temp2.slice(3, 7), 2);
    miiJson.mouth.squash = parseInt(temp2.slice(0, 3), 2);
    temp = get(0x40);
    miiJson.mouth.yPosition = parseInt(temp.slice(3, 8), 2);
    miiJson.beard.mustache.type = parseInt(temp.slice(0, 3), 2);
    temp = get(0x42);
    miiJson.beard.type = parseInt(temp.slice(5, 8), 2);
    miiJson.beard.color = parseInt(temp.slice(2, 5), 2);
    temp2 = get(0x43);
    miiJson.beard.mustache.size = parseInt(temp2.slice(6, 8) + temp.slice(0, 2), 2);
    miiJson.beard.mustache.yPosition = parseInt(temp2.slice(1, 6), 2);
    temp = get(0x44);
    miiJson.glasses.type = parseInt(temp.slice(4, 8), 2);
    miiJson.glasses.color = parseInt(temp.slice(1, 4), 2);
    temp2 = get(0x45);
    miiJson.glasses.size = parseInt(temp2.slice(5, 8) + temp[0], 2);
    miiJson.glasses.yPosition = parseInt(temp2.slice(0, 5), 2);
    temp = get(0x46);
    miiJson.mole.on = temp[7] === "0" ? false : true;
    miiJson.mole.size = parseInt(temp.slice(3, 7), 2);
    temp2 = get(0x47);
    miiJson.mole.xPosition = parseInt(temp2.slice(6, 8) + temp.slice(0, 3), 2);
    miiJson.mole.yPosition = parseInt(temp2.slice(1, 6), 2);
    miiJson.console = "3DS";
    return miiJson;
}
async function read3DSQR(binOrPath, returnDecryptedBin, returnEncryptedBin) {
    let qrCode;
    if (Buffer.isBuffer(binOrPath)) {//Buffer
        qrCode = binOrPath;
    }
    else if (/[^01]/ig.test(binOrPath)) {//File path
        var data = await fs.promises.readFile(binOrPath);
        var img = await loadImage(data);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        qrCode = jsQR(imageData.data, imageData.width, imageData.height)?.binaryData;
        if (!qrCode) {
            console.error("Failed to read QR Code.");
            return;
        }
    }
    else {//String of 0s and 1s
        var d = binOrPath.match(/(0|1){1,8}/g);
        qrCode = [];
        d.forEach(byte => {
            qrCode.push(parseInt(byte, 2));
        });
    }
    if (qrCode) {
        if (returnEncryptedBin) {
            return new Uint8Array(qrCode);
        }
        var data;
        data = Buffer.from(decodeAesCcm(new Uint8Array(qrCode)));
        if (returnDecryptedBin) {
            return data;
        }

        var ret;
        try {
            ret = decode3DSMii(data);
        }
        catch (e) {
            ret = decode3DSMii(qrCode);
        }
        return ret;
    }
    else {
        console.error('Failed to read Mii.');
    }
}
async function renderMiiWithStudio(jsonIn) {
    if (!["3ds", "wii u"].includes(jsonIn.console?.toLowerCase())) {
        jsonIn = convertMii(jsonIn);
    }
    var studioMii = convertMiiToStudio(jsonIn);
    return await downloadImage('https://studio.mii.nintendo.com/miis/image.png?data=' + studioMii + "&width=270&type=face");
}


function flipPixelsVertically(src, w, h) {
    const dst = new Uint8Array(src.length);
    const row = w * 4;
    for (let y = 0; y < h; y++) {
        const a = y * row, b = (h - 1 - y) * row;
        dst.set(src.subarray(a, a + row), b);
    }
    return dst;
}
function invLerp(a, b, v) { return (v - a) / (b - a); }
function clamp01(t) { return Math.max(0, Math.min(1, t)); }
function easePow(t, p) { return Math.pow(t, p); }
// ------------------------------
// Small helpers
// ------------------------------
function remap01(v, min = 0, max = 127) {
    const cl = Math.min(max, Math.max(min, +v || 0));
    return (cl - min) / (max - min || 1);
}
function lerp(a, b, t) { return a + (b - a) * t; }

function offsetObjectAlongView(object3D, camera, delta) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);      // forward
    object3D.position.addScaledVector(forward, -delta); // -delta → toward camera
}

// Project a pixel Y offset at a given depth into world Y units
function pixelYToWorldY(camera, depthZ, pixels, viewportHeightPx) {
    // Visible height at depth for a perspective camera:
    const fov = (camera.fov ?? 30) * Math.PI / 180;
    const visibleH = 2 * Math.abs(depthZ) * Math.tan(fov / 2);
    return (pixels / viewportHeightPx) * visibleH;
}

// Render a specific layer to a pixel buffer (optionally flipY)
function renderLayerToPixels(renderer, scene, camera, gl, width, height, layerIndex, flipY) {
    const rt = new THREE.WebGLRenderTarget(width, height, { depthBuffer: true, stencilBuffer: false });
    camera.layers.set(layerIndex);
    renderer.setRenderTarget(rt);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);

    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    renderer.setRenderTarget(null);
    rt.dispose();

    if (!flipY) return pixels;

    // flipVert
    const rowBytes = width * 4;
    const out = new Uint8Array(pixels.length);
    for (let y = 0; y < height; y++) {
        const src = y * rowBytes;
        const dst = (height - 1 - y) * rowBytes;
        out.set(pixels.subarray(src, src + rowBytes), dst);
    }
    return out;
}

// Camera fit (unchanged)
function fitCameraToObject(camera, object3D) {
    const padding = 0.525;
    const box = new THREE.Box3().setFromObject(object3D);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxSize = Math.max(size.y, size.x / camera.aspect);
    const fov = (camera.fov ?? 30) * Math.PI / 180;
    const dist = (maxSize * padding) / Math.tan(fov / 2);

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);            // forward
    dir.normalize().multiplyScalar(-dist);    // back

    camera.position.copy(center).add(dir);
    camera.near = Math.max(0.1, dist - maxSize * 3.0);
    camera.far = dist + maxSize * 3.0;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
}
async function createFFLMiiIcon(data, options, shirtColor, fflRes) {
    options ||= {};
    const isFullBody = !!options.fullBody;

    const width = 450;
    const height = 900;
    const BODY_SCALE_Y_RANGE = [0.55, 1.35];
    const FULLBODY_CROP_BOTTOM_PX_RANGE = [220, 40]; // [at minYScale, at maxYScale]

    const gl = createGL(width, height);
    if (!gl) throw new Error("Failed to create WebGL 1 context");

    // Normalize potential gender inputs; And the body files for females and males have different mesh names for some reason, so adjust for that too
    let shirtMesh = "mesh_1_";
    if (typeof options.gender === "string") {
        options.gender = options.gender.toLowerCase() === "female" ? "Female" : "Male";
    }
    else if (typeof options.gender === "number") {
        options.gender = options.gender === 1 ? "Female" : "Male";
    }
    else {
        options.gender = "Male";
    }
    if (options.gender === "Female") shirtMesh = "mesh_0_";

    // Fake canvas
    const canvas = {
        width, height, style: {},
        addEventListener() { }, removeEventListener() { },
        getContext: (t) => (t === "webgl" ? gl : null),
    };
    globalThis.self ??= { cancelAnimationFrame: () => { } };

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true });
    renderer.setSize(width, height, false);
    setIsWebGL1State(!renderer.capabilities.isWebGL2);

    // Color mgmt + silence warnings
    THREE.ColorManagement.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const _warn = console.warn;
    console.warn = function (...args) {
        const s = String(args[0] ?? "");
        if (s.includes("ImageUtils.sRGBToLinear(): Unsupported image type")) return;
        if (s.includes("Texture is not power of two")) return;
        return _warn.apply(this, args);
    };

    const scene = new THREE.Scene();
    scene.background = null;

    let ffl, currentCharModel;
    const _realDebug = console.debug;
    console.debug = () => { };

    try {
        // Head (FFL)
        ffl = await initializeFFL(fflRes, ModuleFFL);
        const studioRaw = parseHexOrB64ToUint8Array(data);
        const studioBuffer = Buffer.from(studioRaw);
        currentCharModel = createCharModel(studioBuffer, null, FFLShaderMaterial, ffl.module);
        initCharModelTextures(currentCharModel, renderer);

        // Body GLTF (for baking)
        if (typeof GLTFLoader === "undefined" || !GLTFLoader) {
            const mod = await import("three/examples/jsm/loaders/GLTFLoader.js");
            GLTFLoader = mod.GLTFLoader;
        }
        const absPath = path.resolve(__dirname, `./mii${options.gender}Body.glb`);
        const buf = fs.readFileSync(absPath);
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        const loader = new GLTFLoader();
        const gltf = await new Promise((res, rej) =>
            loader.parse(ab, path.dirname(absPath) + path.sep, res, rej)
        );
        const body = gltf.scene;
        body.position.y -= 110;
        body.userData.isMiiBody = true;

        // Recolor body (bakes into texture)
        var pantsColor = [0x808080, 0xFFC000, 0x89CFF0, 0x913831, 0x913831][["default", "special", "foreign", "favorite", "favorited"].indexOf(options.pantsType?.toLowerCase() || "default")];
        body.traverse((o) => {
            if (o.isMesh) {
                if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
                const isShirt = o.name === shirtMesh;
                o.material?.dispose?.();
                o.material = new THREE.MeshLambertMaterial({
                    color: isShirt
                        ? [
                            0xff2400, 0xf08000, 0xffd700, 0xaaff00, 0x008000, 0x0000ff,
                            0x00d7ff, 0xff69b4, 0x7f00ff, 0x6f4e37, 0xffffff, 0x303030,
                        ][shirtColor]
                        : pantsColor,
                    emissive: isShirt ? 0x330000 : 0x222222,
                    emissiveIntensity: 0.0,
                    side: THREE.DoubleSide,
                });
                o.material.needsUpdate = true;
            }
        });

        // Graph (only used for framing / body bbox)
        const wholeMii = new THREE.Group();
        wholeMii.add(body);
        wholeMii.add(currentCharModel.meshes);
        scene.add(wholeMii);

        // Layers for baking head/body
        body.traverse(obj => obj.layers?.set(1));
        currentCharModel.meshes.traverse(obj => obj.layers?.set(2)); // head only on 2

        // Camera
        const camera = getCameraForViewType(ViewType.MakeIcon);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        fitCameraToObject(camera, wholeMii);

        // --- Body world bounds (for plane sizing/placement)
        const bodyBox = new THREE.Box3().setFromObject(body);
        const bodySize = new THREE.Vector3();
        const bodyCenter = new THREE.Vector3();
        bodyBox.getSize(bodySize);
        bodyBox.getCenter(bodyCenter);

        // --- BODY BAKE (lights for body only, depend on mode)
        const bakeAmbient = new THREE.AmbientLight(0xffffff, 0.15);
        const bakeRim = new THREE.DirectionalLight(
            0xffffff,
            3
        );
        bakeRim.position.set(-3, 7, 1.0);
        bakeAmbient.layers.enable(1);
        bakeRim.layers.enable(1);
        scene.add(bakeAmbient, bakeRim);

        // Pass: body layer → pixels (no CPU flip; we'll let Three flip on texture)
        const bodyPixels = renderLayerToPixels(renderer, scene, camera, gl, width, height, /*layer*/1, /*flipY*/false);
        const bodyCanvas = createCanvas(width, height);
        bodyCanvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(bodyPixels), width, height), 0, 0);

        // Remove bake lights & 3D body; we’ll insert a plane instead
        scene.remove(bakeAmbient, bakeRim);
        wholeMii.remove(body);
        bakeAmbient.dispose?.(); bakeRim.dispose?.();

        // --- BODY PLANE (unlit; texture carries shading)
        const bodyTex = new THREE.CanvasTexture(bodyCanvas);
        bodyTex.colorSpace = THREE.SRGBColorSpace;
        bodyTex.generateMipmaps = false;
        bodyTex.minFilter = THREE.LinearFilter;
        bodyTex.magFilter = THREE.LinearFilter;
        bodyTex.wrapS = THREE.ClampToEdgeWrapping;
        bodyTex.wrapT = THREE.ClampToEdgeWrapping;
        bodyTex.flipY = true;   // let Three handle UV-space flip
        bodyTex.premultiplyAlpha = true;
        bodyTex.needsUpdate = true;
        bodyTex.flipY = false;

        const planeW = Math.max(1e-4, bodySize.x);
        const planeH = Math.max(1e-4, bodySize.y);
        const planeGeo = new THREE.PlaneGeometry(planeW, planeH);
        const planeMat = new THREE.MeshBasicMaterial({ map: bodyTex, transparent: true, depthWrite: true, depthTest: true });
        const bodyPlane = new THREE.Mesh(planeGeo, planeMat);
        bodyPlane.userData.isBodyPlane = true;

        // Place plane at body world center so the neck peg aligns into head
        bodyPlane.position.copy(bodyCenter);
        bodyPlane.layers.set(2); // render with head

        // === Apply height/weight scaling in BOTH modes ===
        const w01 = remap01(options.weight ?? 64);
        const h01 = remap01(options.height ?? 64);
        const scaleX = lerp(0.55, 1.50, w01);
        const scaleY = lerp(0.55, 1.35, h01);
        bodyPlane.scale.set(scaleX, scaleY, 1);

        // --- Auto vertical offset (per-mode) + manual per-mode knob ---
        var tYraw = invLerp(BODY_SCALE_Y_RANGE[0], BODY_SCALE_Y_RANGE[1], scaleY);
        var tY = clamp01(easePow(tYraw, 1));

        const autoRange = [150, 125];

        const autoOffsetYPx = autoRange[0] + (autoRange[1] - autoRange[0]) * tY;

        // Manual knobs (mode-specific; falls back to legacy bodyOffsetYPx)
        const manualPx = (options.bodyOffsetYPxFull ?? options.bodyOffsetYPx ?? 0);

        const combinedOffsetYPx = Math.round(manualPx + autoOffsetYPx);

        // Convert screen-px → world-Y at the plane depth & apply
        if (combinedOffsetYPx) {
            const planeDepthFromCam = bodyPlane.position.clone().sub(camera.position).length();
            const worldYOffset = pixelYToWorldY(camera, planeDepthFromCam, combinedOffsetYPx, height);
            bodyPlane.position.y += worldYOffset;
        }


        // Optional depth nudge
        const bodyDepthOffset = Number(options.bodyDepthOffset ?? 0);
        if (bodyDepthOffset) offsetObjectAlongView(bodyPlane, camera, bodyDepthOffset);

        scene.add(bodyPlane);

        // Ensure head renders with the plane on the same layer and with NO head lights
        currentCharModel.meshes.traverse(o => o.layers?.set(2));

        // Final pass: render layer 2 (head + body plane), then flip pixels for PNG
        camera.layers.set(2);
        renderer.setRenderTarget(null);
        renderer.clear(true, true, true);
        renderer.render(scene, camera);

        // Read back & flip to top-left
        const finalPixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, finalPixels);
        const upright = flipPixelsVertically(finalPixels, width, height);

        // Stage onto a canvas
        const stage = createCanvas(width, height);
        stage.getContext("2d").putImageData(
            new ImageData(new Uint8ClampedArray(upright), width, height),
            0, 0
        );

        // === FullBody-only: crop from the BOTTOM based on scaleY ===
        let cropBottom = 0;
        tYraw = invLerp(BODY_SCALE_Y_RANGE[0], BODY_SCALE_Y_RANGE[1], scaleY);
        tY = clamp01(easePow(tYraw, 1));

        // Interpolate bottom crop across the configured range
        const bottomPx = Math.round(
            FULLBODY_CROP_BOTTOM_PX_RANGE[0] +
            (FULLBODY_CROP_BOTTOM_PX_RANGE[1] - FULLBODY_CROP_BOTTOM_PX_RANGE[0]) * tY
        );

        cropBottom = Math.max(0, Math.min(height - 1, bottomPx + (options.fullBodyCropExtraBottomPx ?? 0)));

        // Output with bottom crop applied (no top crop)
        const outH = Math.max(1, isFullBody ? height - cropBottom : 450);
        const outCanvas = createCanvas(width, outH);
        const ctxOut = outCanvas.getContext("2d");

        // Source: take the top `outH` rows (i.e., drop `cropBottom` pixels at the bottom)
        ctxOut.drawImage(
            stage,
            0, 0,            // sx, sy
            width, outH,     // sw, sh
            0, 0,            // dx, dy
            width, outH      // dw, dh
        );

        return outCanvas.toBuffer("image/png");

    } catch (err) {
        console.error("Error rendering Mii:", err);
        throw err;
    } finally {
        try {
            currentCharModel?.dispose?.();
            exitFFL(ffl?.module, ffl?.resourceDesc);
            renderer.dispose();
            gl.finish();
        } catch { }
        console.debug = _realDebug;
    }
}

async function renderMii(jsonIn, options = {}, fflRes = getFFLRes()) {
    if (!["3ds", "wii u"].includes(jsonIn.console?.toLowerCase())) {
        jsonIn = convertMii(jsonIn);
    }
    const studioMii = convertMiiToStudio(jsonIn);
    options = Object.assign(options, {
        gender: jsonIn.general.gender,
        height: jsonIn.general.height,
        weight: jsonIn.general.weight,
        pantsType: jsonIn.meta?.type || "Default"
    });

    return createFFLMiiIcon(studioMii, options, jsonIn.general.favoriteColor, fflRes);
}
async function writeWiiBin(jsonIn, outPath) {
    if (jsonIn.console?.toLowerCase() !== "wii") {
        convertMii(jsonIn);
    }
    var mii = jsonIn;
    var miiBin = "0";
    miiBin += mii.general.gender;
    miiBin += mii.general.birthMonth.toString(2).padStart(4, "0");
    miiBin += mii.general.birthday.toString(2).padStart(5, "0");
    miiBin += mii.general.favoriteColor.toString(2).padStart(4, "0");
    miiBin += mii.perms.favorited?'1':'0';
    for (var i = 0; i < 10; i++) {
        if (i < mii.meta.name.length) {
            miiBin += mii.meta.name.charCodeAt(i).toString(2).padStart(16, "0");
        }
        else {
            miiBin += "0000000000000000";
        }
    }
    miiBin += mii.general.height.toString(2).padStart(8, "0");
    miiBin += mii.general.weight.toString(2).padStart(8, "0");
    let miiTypeIdentifier = "";
    switch (mii.meta.type) {
        case "Special":
            miiTypeIdentifier = "010";
            break;
        case "Foreign":
            miiTypeIdentifier = "110";
            break;
        default:
            miiTypeIdentifier = "100";
            break;
    }
    if (mii.meta.miiId) {
        let temp = mii.meta.miiId.replaceAll(' ', '').match(/.{1,2}/g).map(b => parseInt(b, 16).toString(2).padStart(8, '0')).join('');
        miiBin += `${miiTypeIdentifier}${temp.padStart(32, '0').slice(-29)}`; // Take rightmost 29 bits
    }
    else {
        // Calculate the number of 4-second intervals since Jan 1, 2006
        const miiIdBase = Math.floor((Date.now() - Date.UTC(2006, 0, 1)) / 4000).toString(2).padStart(29, '0');
        miiBin += `${miiTypeIdentifier}${miiIdBase}`;
    }
    if(mii.meta.systemId){
        miiBin += mii.meta.systemId.replaceAll(' ','').match(/.{1,2}/g).map(b=>parseInt(b,16).toString(2).padStart(8,'0')).join('').padStart(32,'0').slice(-32); // Use slice(-32)
    }
    else{
        miiBin += "11111111".repeat(4);//FF FF FF FF, completely nonsense System ID if none is set
    }
    miiBin += mii.face.type.toString(2).padStart(3, "0");
    miiBin += mii.face.color.toString(2).padStart(3, "0");
    miiBin += mii.face.feature.toString(2).padStart(4, "0");
    miiBin += "000";
    if (mii.perms.mingle && mii.meta.type.toLowerCase() === "special") {
        mii.perms.mingle = false;
        console.warn("A Special Mii cannot have Mingle on and still render on the Wii. Turned Mingle off in the output.");
    }
    miiBin += mii.perms.mingle ? "0" : "1";
    miiBin += "0";
    miiBin += mii.perms.fromCheckMiiOut ? "1" : "0";
    miiBin += (+getKeyByValue(lookupTables.hairTable, `${mii.hair.page + 1}${convTables.formatFrom[mii.hair.type]}`)).toString(2).padStart(7, "0");
    miiBin += mii.hair.color.toString(2).padStart(3, "0");
    miiBin += mii.hair.flipped ? "1" : "0";
    miiBin += "00000";
    miiBin += (+getKeyByValue(lookupTables.eyebrowTable, `${mii.eyebrows.page + 1}${convTables.formatFrom[mii.eyebrows.type]}`)).toString(2).padStart(5, "0");
    miiBin += "0";
    miiBin += mii.eyebrows.rotation.toString(2).padStart(4, "0");
    miiBin += "000000";
    miiBin += mii.eyebrows.color.toString(2).padStart(3, "0");
    miiBin += mii.eyebrows.size.toString(2).padStart(4, "0");
    miiBin += (mii.eyebrows.yPosition + 3).toString(2).padStart(5, "0");
    miiBin += mii.eyebrows.distanceApart.toString(2).padStart(4, "0");
    miiBin += (+getKeyByValue(lookupTables.eyeTable, `${mii.eyes.page + 1}${convTables.formatFrom[mii.eyes.type]}`)).toString(2).padStart(6, "0");
    miiBin += "00";
    miiBin += mii.eyes.rotation.toString(2).padStart(3, "0");
    miiBin += mii.eyes.yPosition.toString(2).padStart(5, "0");
    miiBin += mii.eyes.color.toString(2).padStart(3, "0");
    miiBin += "0";
    miiBin += mii.eyes.size.toString(2).padStart(3, "0");
    miiBin += mii.eyes.distanceApart.toString(2).padStart(4, "0");
    miiBin += "00000";
    miiBin += lookupTables.wiiNoses[mii.nose.type].toString(2).padStart(4, "0");
    miiBin += mii.nose.size.toString(2).padStart(4, "0");
    miiBin += mii.nose.yPosition.toString(2).padStart(5, "0");
    miiBin += "000";
    miiBin += (+getKeyByValue(lookupTables.mouthTable, `${mii.mouth.page + 1}${convTables.formatFrom[mii.mouth.type]}`)).toString(2).padStart(5, "0");
    miiBin += mii.mouth.color.toString(2).padStart(2, "0");
    miiBin += mii.mouth.size.toString(2).padStart(4, "0");
    miiBin += mii.mouth.yPosition.toString(2).padStart(5, "0");
    miiBin += mii.glasses.type.toString(2).padStart(4, "0");
    miiBin += mii.glasses.color.toString(2).padStart(3, "0");
    miiBin += "0";//Invalidates Mii when set to 1
    miiBin += mii.glasses.size.toString(2).padStart(3, "0");
    miiBin += mii.glasses.yPosition.toString(2).padStart(5, "0");
    miiBin += mii.beard.mustache.type.toString(2).padStart(2, "0");
    miiBin += mii.beard.type.toString(2).padStart(2, "0");
    miiBin += mii.beard.color.toString(2).padStart(3, "0");
    miiBin += mii.beard.mustache.size.toString(2).padStart(4, "0");
    miiBin += mii.beard.mustache.yPosition.toString(2).padStart(5, "0");
    miiBin += mii.mole.on ? "1" : "0";
    miiBin += mii.mole.size.toString(2).padStart(4, "0");
    miiBin += mii.mole.yPosition.toString(2).padStart(5, "0");
    miiBin += mii.mole.xPosition.toString(2).padStart(5, "0");
    miiBin += "0";
    for (var i = 0; i < 10; i++) {
        if (i < mii.meta.creatorName.length) {
            miiBin += mii.meta.creatorName.charCodeAt(i).toString(2).padStart(16, "0");
        }
        else {
            miiBin += "0000000000000000";
        }
    }

    //Writing based on miiBin
    var toWrite = miiBin.match(/.{1,8}/g);
    var buffers = [];
    for (var i = 0; i < toWrite.length; i++) {
        buffers.push(parseInt(toWrite[i], 2));
    }
    toWrite = Buffer.from(buffers);
    if (outPath) {
        await fs.promises.writeFile(outPath, toWrite);
    }
    else {
        return toWrite;
    }
}
async function write3DSQR(miiJson, outPath, returnBin, fflRes = getFFLRes()) {
    //Convert the Mii if it isn't in 3DS format
    if (!["3ds", "wii u"].includes(miiJson.console?.toLowerCase())) {
        miiJson = convertMii(miiJson);
    }

    //Make the binary
    var mii = miiJson;
    var miiBin = "00000011";//Mii version, which for 3DS is 3
    //If Special Miis are being used improperly, fix it and warn the user
    if (mii.meta.type.toLowerCase() === "special" && (mii.console.toLowerCase() === "wii u" || mii.console.toLowerCase() === "wiiu")) {
        mii.meta.type = "Default";
        console.warn("Wii Us do not work with Special Miis. Reverted output to Default Mii.");
    }
    if (mii.perms.sharing && mii.meta.type === "Special") {
        mii.perms.sharing = false;
        console.warn("Cannot have Sharing enabled for Special Miis. Disabled Sharing in the output.");
    }
    //Revisit this if translating MiiJS out of English ever, for now this is fine
    miiBin += "0000000";//00 JPN/US/EUR, 01 CHN, 10 KOR, 11 TWN Character Set | Region Lock Off 00 | Profanity Flag 0/1
    miiBin += mii.perms.copying ? "1" : "0";
    miiBin += "00000000";
    miiBin += "00110000";
    if(mii.meta.systemId){
        miiBin += mii.meta.systemId.replaceAll(' ','').match(/.{1,2}/g).map(b=>parseInt(b,16).toString(2).padStart(8,'0')).join('').padStart(64,'0').slice(-64); // Use slice(-64)
    }
    else{
        //Donor System ID
        miiBin += "1000101011010010000001101000011100011000110001100100011001100110010101100111111110111100000001110101110001000101011101100000001110100100010000000000000000000000";
    }
    miiBin += mii.meta.type === "Special" ? "0" : "1";
    miiBin += "001";
    let temp = '';
    if (mii.meta.miiId) {
        // Convert Mii ID to binary
        temp += mii.meta.miiId.replaceAll(' ', '').match(/.{1,2}/g).map(b => parseInt(b, 16).toString(2).padStart(8, '0')).join('');
    } else {
        // Number of 2-second intervals since Jan 1, 2010
        temp += Math.floor((Date.now() - Date.UTC(2010, 0, 1)) / 2000).toString(2);
    }
    miiBin += temp.padStart(32, '0').slice(-27); // Take rightmost 27 bits
    miiBin += "0000000001000101011101100000001110100100010000000000000000000000";
    miiBin += mii.general.birthday.toString(2).padStart(5, "0").slice(2, 5);
    miiBin += mii.general.birthMonth.toString(2).padStart(4, "0");
    miiBin += mii.general.gender;
    miiBin += "00";
    miiBin += mii.general.favoriteColor.toString(2).padStart(4, "0");
    miiBin += mii.general.birthday.toString(2).padStart(5, "0").slice(0, 2);
    for (var i = 0; i < 10; i++) {
        if (i < mii.meta.name.length) {
            let code = mii.meta.name.charCodeAt(i);
            miiBin += (code & 0xFF).toString(2).padStart(8, "0");
            miiBin += ((code >> 8) & 0xFF).toString(2).padStart(8, "0");
        }
        else {
            miiBin += "0000000000000000";
        }
    }
    miiBin += mii.general.height.toString(2).padStart(8, "0");
    miiBin += mii.general.weight.toString(2).padStart(8, "0");
    miiBin += mii.face.color.toString(2).padStart(3, "0");
    miiBin += lookupTables.faces.values[mii.face.type].toString(2).padStart(4, "0");
    miiBin += mii.perms.sharing ? "0" : "1";
    miiBin += mii.face.makeup.toString(2).padStart(4, "0");
    miiBin += mii.face.feature.toString(2).padStart(4, "0");
    miiBin += lookupTables.hairs.values[mii.hair.page][mii.hair.type].toString(2).padStart(8, "0");
    miiBin += "0000";
    miiBin += mii.hair.flipped ? "1" : "0";
    miiBin += mii.hair.color.toString(2).padStart(3, "0");
    miiBin += mii.eyes.color.toString(2).padStart(3, "0").slice(1, 3);
    miiBin += lookupTables.eyes.values[mii.eyes.page][mii.eyes.type].toString(2).padStart(6, "0");
    miiBin += mii.eyes.squash.toString(2).padStart(3, "0");
    miiBin += mii.eyes.size.toString(2).padStart(4, "0");
    miiBin += mii.eyes.color.toString(2).padStart(3, "0")[0];
    miiBin += mii.eyes.distanceApart.toString(2).padStart(4, "0").slice(1, 4);
    miiBin += mii.eyes.rotation.toString(2).padStart(5, "0");
    miiBin += "00";
    miiBin += mii.eyes.yPosition.toString(2).padStart(5, "0");
    miiBin += mii.eyes.distanceApart.toString(2).padStart(4, "0")[0];
    miiBin += mii.eyebrows.color.toString(2).padStart(3, "0");
    miiBin += lookupTables.eyebrows.values[mii.eyebrows.page][mii.eyebrows.type].toString(2).padStart(5, "0");
    miiBin += "0";
    miiBin += mii.eyebrows.squash.toString(2).padStart(3, "0");
    miiBin += mii.eyebrows.size.toString(2).padStart(4, "0");
    miiBin += mii.eyebrows.distanceApart.toString(2).padStart(4, "0").slice(1, 4);
    miiBin += "0";
    miiBin += mii.eyebrows.rotation.toString(2).padStart(4, "0");
    miiBin += "00";
    miiBin += (mii.eyebrows.yPosition + 3).toString(2).padStart(5, "0");
    miiBin += mii.eyebrows.distanceApart.toString(2).padStart(4, "0")[0];
    miiBin += mii.nose.size.toString(2).padStart(4, "0").slice(1, 4);
    miiBin += lookupTables.noses.values[mii.nose.page][mii.nose.type].toString(2).padStart(5, "0");
    miiBin += "00";
    miiBin += mii.nose.yPosition.toString(2).padStart(5, "0");
    miiBin += mii.nose.size.toString(2).padStart(4, "0")[0];
    miiBin += mii.mouth.color.toString(2).padStart(3, "0").slice(1, 3);
    miiBin += lookupTables.mouths.values[mii.mouth.page][mii.mouth.type].toString(2).padStart(6, "0");
    miiBin += mii.mouth.squash.toString(2).padStart(3, "0");
    miiBin += mii.mouth.size.toString(2).padStart(4, "0");
    miiBin += mii.mouth.color.toString(2).padStart(3, "0")[0];
    miiBin += mii.beard.mustache.type.toString(2).padStart(3, "0");
    miiBin += mii.mouth.yPosition.toString(2).padStart(5, "0");
    miiBin += "00000000";
    miiBin += mii.beard.mustache.size.toString(2).padStart(4, "0").slice(2, 4);
    miiBin += mii.beard.color.toString(2).padStart(3, "0");
    miiBin += mii.beard.type.toString(2).padStart(3, "0");
    miiBin += "0";
    miiBin += mii.beard.mustache.yPosition.toString(2).padStart(5, "0");
    miiBin += mii.beard.mustache.size.toString(2).padStart(4, "0").slice(0, 2);
    miiBin += mii.glasses.size.toString(2).padStart(4, "0")[3];
    miiBin += mii.glasses.color.toString(2).padStart(3, "0");
    miiBin += mii.glasses.type.toString(2).padStart(4, "0");
    miiBin += "0";
    miiBin += mii.glasses.yPosition.toString(2).padStart(4, "0");
    miiBin += mii.glasses.size.toString(2).padStart(4, "0").slice(0, 3);
    miiBin += mii.mole.xPosition.toString(2).padStart(5, "0").slice(2, 5);
    miiBin += mii.mole.size.toString(2).padStart(4, "0");
    miiBin += mii.mole.on ? "1" : "0";
    miiBin += "0";
    miiBin += mii.mole.yPosition.toString(2).padStart(5, "0");
    miiBin += mii.mole.xPosition.toString(2).padStart(5, "0").slice(0, 2);
    for (var i = 0; i < 10; i++) {
        if (i < mii.meta.creatorName.length) {
            let code = mii.meta.creatorName.charCodeAt(i);
            miiBin += (code & 0xFF).toString(2).padStart(8, "0");
            miiBin += ((code >> 8) & 0xFF).toString(2).padStart(8, "0");
        }
        else {
            miiBin += "0000000000000000";
        }
    }
    //Writing based on the binary
    var toWrite = miiBin.match(/.{1,8}/g);
    var buffers = [];
    for (var i = 0; i < toWrite.length; i++) {
        buffers.push(parseInt(toWrite[i], 2));
    }
    const buffer = Buffer.from(buffers);
    var encryptedData = Buffer.from(encodeAesCcm(new Uint8Array(buffer)));
    if (returnBin) {
        return encryptedData;
    }
    //Prepare a QR code
    const options = {
        width: 300,
        height: 300,
        data: encryptedData.toString("latin1"),
        image: "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", // 1x1 gif
        dotsOptions: {
            color: "#000000",
            type: "square"
        },
        backgroundOptions: {
            color: "#ffffff",
        },
        imageOptions: {
            crossOrigin: "anonymous",
            imageSize: 0.4 // Changes how large center area is
        },
        qrOptions: {
            errorCorrectionLevel: 'H'
        }
    }
    const qrCodeImage = new QRCodeStyling({
        jsdom: JSDOM,
        nodeCanvas,
        ...options
    });
    const qrBuffer = Buffer.from(await qrCodeImage.getRawData("png"))

    let miiPNGBuf = null;
    let renderedWithStudio = fflRes === null || fflRes === undefined;
    if (renderedWithStudio) {
        miiPNGBuf = await renderMiiWithStudio(miiJson);
    }
    else {
        miiPNGBuf = await renderMii(miiJson, fflRes);
    }
    const main_img = await Jimp.read(qrBuffer);
    main_img.resize(424, 424, Jimp.RESIZE_NEAREST_NEIGHBOR); // Don't anti-alias the QR code

    let miiSize, miiZoomFactor, miiYOffset;
    if (renderedWithStudio) {
        miiSize = 100;
        miiZoomFactor = 1;
        miiYOffset = -15;

    } else {
        miiSize = 100;
        miiZoomFactor = 1.25;
        miiYOffset = -5;
    }
    const mii_img = await Jimp.read(miiPNGBuf);
    mii_img.resize(miiSize * miiZoomFactor, miiSize * miiZoomFactor, Jimp.RESIZE_BICUBIC);
    mii_img.crop(
        (miiSize * miiZoomFactor - 100) / 2,
        (miiSize * miiZoomFactor - 100) / 2,
        miiSize,
        miiSize
    );

    const canvas = new Jimp(mii_img.bitmap.width, mii_img.bitmap.height, 0xFFFFFFFF);
    canvas.composite(mii_img, 0, miiYOffset);
    main_img.blit(canvas, 212 - 100 / 2, 212 - 100 / 2);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)

    main_img.print(font, 0, 70, {
        text: miiJson.meta.name,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    }, 424, 395);

    if (miiJson.meta.type === "Special") {
        const crown_img = await Jimp.read(path.join(__dirname, 'crown.jpg'));
        crown_img.resize(40, 20);
        main_img.blit(crown_img, 225, 160);
    }

    // Get the buffer
    const imageBuffer = await main_img.getBufferAsync(Jimp.MIME_PNG);

    // Optionally write to file if outPath is provided
    if (outPath) {
        await main_img.writeAsync(outPath);
    }

    return imageBuffer;
}
function makeChild(parent0, parent1, options) {
    if(parent0.console.toLowerCase()==="wii") parent0=convertMii(parent0,"3DS");
    if(parent1.console.toLowerCase()==="wii") parent1=convertMii(parent1,"3DS");

    if(parent0.general.gender!==0){
        let tempHolder=structuredClone(parent0);
        parent0=structuredClone(parent1);
        parent1=structuredClone(tempHolder);
    }

    var randomBytes = [];
    for (var i = 0; i < 8; i++) {
        //randomBytes[1] is never used, kept here purely for an interesting detail from research
        randomBytes.push(Math.floor(Math.random() * 2));
    }

    var mainParent = randomBytes[0] === 1 ? parent1 : parent0;
    var child = structuredClone(mainParent);//We have to clear some defaults doing it this way, but so much of the Mii gen is from this parent it's just quicker to gen this way.

    //Clear some things children don't have or process
    child.beard.type=0;
    child.beard.mustache.type=0;
    child.face.feature=0;
    child.face.makeup=0;
    child.glasses.type=0;//For parity with the original, I can find no evidence of child Miis with glasses nor did I find anything referencing glasses processing in research
    child.hair.flipped=false;//Just for full parity with the original
    child.console="3DS";
    child.perms.sharing=parent0.perms.sharing&&parent1.perms.sharing;//Why not?
    child.perms.copying=parent0.perms.copying&&parent1.perms.copying;//Why not?

    var birthday=new Date();
    child.general.birthday=birthday.getDate();
    child.general.birthMonth=birthday.getMonth()+1;
    child.meta.creatorName=options?.hasOwnProperty("creatorName")?options.creatorName:"";
    child.meta.type="Default";

    var gender = options?.hasOwnProperty("gender") ? options.gender : Math.floor(Math.random() * 2);
    child.general.gender = gender;
    child.meta.name = options?.hasOwnProperty("name")? options.name : childGenTables.names[child.general.gender][Math.floor(Math.random() * childGenTables.names[child.general.gender].length)];

    var matchingParent = parent0.general.gender === gender ? parent0 : parent1;

    //Skin color mixing. Intuitively you'd think they'd order them by similarity and pick an average, but no they have an entire table of what skin colors product what child skin color
    var validValues = childGenTables.skinColorMixing[Math.min(parent0.face.color, parent1.face.color)][Math.max(parent0.face.color, parent1.face.color)].filter(v => v !== -1);
    child.face.color = validValues[Math.floor(Math.random() * validValues.length)];

    //Each child is sorted into groups of potential hairstyles based on the hairstyle of the parent of the same gender of the child, and then a random hair is selected from that pool at each stage of life
    var hairGroupIndex = childGenTables.hairStyleGroupMappings[lookupTables.hairs.values[matchingParent.hair.page][matchingParent.hair.type]][gender];
    child.hair.color = randomBytes[2] === 0 ? parent0.hair.color : parent1.hair.color;

    child.eyes.page = randomBytes[3] === 0 ? parent0.eyes.page : parent1.eyes.page;
    child.eyes.type = randomBytes[3] === 0 ? parent0.eyes.type : parent1.eyes.type;
    child.eyes.color = randomBytes[4] === 0 ? parent0.eyes.color : parent1.eyes.color;

    child.eyebrows.page = matchingParent.eyebrows.page;
    child.eyebrows.type = matchingParent.eyebrows.type;

    child.eyebrows.color = child.hair.color;

    child.nose.page = randomBytes[5] === 0 ? parent0.nose.page : parent1.nose.page;
    child.nose.type = randomBytes[5] === 0 ? parent0.nose.type : parent1.nose.type;

    child.mouth.page = randomBytes[6] === 0 ? parent0.mouth.page : parent1.mouth.page;
    child.mouth.type = randomBytes[6] === 0 ? parent0.mouth.type : parent1.mouth.type;
    child.mouth.color = randomBytes[7] === 0 ? parent0.mouth.color : parent1.mouth.color;

    child.mole.on = Math.floor(Math.random() * 2) === 0 ? parent0.mole.on : parent1.mole.on;

    //Child Miis generate the last stage, then build offsets backwards through the younger stages of life starting at the older stages
    var eyeBase = Math.min(Math.max(child.eyes.yPosition + 2, 0), 18);
    let browBase = child.eyebrows.yPosition + 2;
    if (browBase >= 18) {
        browBase = 18;
    }
    else if (browBase < 4) {
        browBase = 3;
    }

    var mouthBase = Math.min(Math.max(child.mouth.yPosition - 2, 0), 18);

    var eyeYDelta = child.eyes.yPosition - eyeBase;
    var browYDelta = child.eyebrows.yPosition - browBase;
    var mouthYDelta = child.mouth.yPosition - mouthBase;
    var noseSizeDelta = child.nose.size;

    //This should be a 1:1 of final stage height and weight generation
    var heightParent = Math.floor(Math.random() * 2) === 0 ? parent0 : parent1;
    var height = (heightParent.general.height >> 3) * 1.4;
    height *= 1.4 * 1.4;
    height *= 1.4 * 1.4;
    child.general.height = Math.round(Math.min(Math.max(height, 0), 127));

    var weightParent = Math.floor(Math.random() * 2) === 0 ? parent0 : parent1;
    let weight = Math.trunc((weightParent.general.weight + 1) / 4) + 48;
    for (var iAdj = 0; iAdj < 5; iAdj++) {
        weight += (weight - 64.0) * 0.2;
    }
    child.general.weight = Math.round(Math.min(Math.max(weight, 0), 127));

    child.general.favoriteColor=options?.favoriteColor?options.favoriteColor:(child.general.gender==0?[2,3,5,6]:[0,1,7,8])[Math.floor(Math.random()*4)];//We're not running personality generation here, so we're just making a random color of the personality groups the child had available so as to add some variety to the colors

    //Now we take the baselines above and translate them into the younger years
    child.stages = [];
    for (var iStage = 0; iStage < 6; iStage++) {
        child.stages.push(structuredClone(child));

        child.stages[iStage].eyes.yPosition=Math.floor((eyeYDelta * iStage)/5) + eyeBase;
        child.stages[iStage].eyebrows.yPosition=Math.floor((browYDelta * iStage)/5) + browBase;
        child.stages[iStage].mouth.yPosition=Math.floor((mouthYDelta * iStage)/5) + mouthBase;
        child.stages[iStage].nose.size=Math.floor((noseSizeDelta * iStage)/5);

        if(iStage<4){
            child.stages[iStage].face.type=5;//Extra technically, I'm fairly certain this still happens just in a different part than I directly researched
        }

        child.stages[iStage].general.height=Math.floor((child.stages[iStage].general.height/5)*iStage);//Extra, Tomodachi Life just uses alternate models and therefore no official height growth is in-game yet one is displayed, so I mocked up a basic growing up height. Newborn will always be the shortest, stage 5 will always be the actual height, and the values in between are just a range in between. We don't do the same for weight since Mii weights appear to be more of a representative of underweight or overweight for the height.

        delete child.stages[iStage].stages;//Because we're just cloning the baseline object repeatedly to make the stages a little bit cleaner, we need to clear this on subsequent clones
    }

    //Basically there's a random chance for a hairstyle to not advance throughout the years, so it's possible to end up with a hairstyle from a younger stage. This is slightly more likely for boys than girls.
    let ageGroup = 0;
    for (let iHairStage = 0; iHairStage < 4; iHairStage++) {
        const subgroup = childGenTables.hairStyleGroups[hairGroupIndex][ageGroup];
        const style = subgroup[Math.floor(Math.random() * subgroup.length)];
        const hairLookup = lookupTable("hairs", style, true);
        if (!hairLookup) continue;
        const [hairPage, hairType] = hairLookup;
        switch(iHairStage){
            case 0:
                child.stages[0].hair.page = hairPage;
                child.stages[0].hair.type = hairType;
            break;
            case 1:
                child.stages[1].hair.page = hairPage;
                child.stages[1].hair.type = hairType;
                child.stages[2].hair.page = hairPage;
                child.stages[2].hair.type = hairType;
            break;
            case 2:
                child.stages[3].hair.page = hairPage;
                child.stages[3].hair.type = hairType;
                child.stages[4].hair.page = hairPage;
                child.stages[4].hair.type = hairType;
            break;
            case 3:
                child.stages[5].hair.page = hairPage;
                child.stages[5].hair.type = hairType;
            break;
        }
        if (iHairStage === 0 || Math.floor(Math.random() * (child.stages[0].general.gender === 0 ? 3 : 4)) !== 0) {//For each stage of life there is a 33% chance for boys, and a 25% chance for girls, of staying on the same hairstyle as they had already. However, they are guaranteed to never have the same hairstyle stage as their newborn stage.
            ageGroup = Math.min(ageGroup + 1, 3);
        }
    }
    return child.stages;
}
function generateInstructions(mii, full) {
    let type = mii.console?.toLowerCase();
    if (type.toLowerCase() === "wii") {
        var instrs = {
            "base": `Select "${mii.general.gender}", and then "Start from Scratch".`,
            "col": `On the info page (first tab), set the Favorite Color to ${lookupTables.favCols[mii.general.favoriteColor]} (${mii.general.favoriteColor <= 5 ? mii.general.favoriteColor + 1 : mii.general.favoriteColor - 5} from the left, ${mii.general.favoriteColor > 5 ? "bottom" : "top"} row).`,
            "heightWeight": `On the build page (second tab), set the height to ${Math.round((100 / 128) * mii.general.height)}%, and the weight to ${Math.round((100 / 128) * mii.general.weight)}%.`,
            "faceShape": `On the face page (third tab), set the shape to the one ${Math.floor(mii.face.type / 2) + 1} from the top, in the ${mii.face.type % 2 === 0 ? "left" : "right"} column.`,
            "skinCol": `On the face page (third tab), set the color to the one ${mii.face.color + mii.face.color > 2 ? -2 : 1} from the left, on the ${mii.face.color > 2 ? `bottom` : `top`} row.`,
            "makeup": `On the face page's makeup tab, set the makeup to the one ${Math.ceil((mii.face.feature + 1) / 3)} from the top, and ${typeCheat[mii.face.feature]} from the left.`,
            "hairStyle": `On the hair page (fourth tab), set the hair style to the one ${typeCheat[mii.hair.type]} from the left, ${Math.ceil((mii.hair.type + 1) / 3)} from the top, on page ${mii.hair.page}.`,
            "hairFlipped": `${mii.hair.flipped ? `On the hair page (fourth tab), press the button to flip the hair.` : ``}`,
            "hairColor": `On the hair page (fourth tab), set the hair color to the one ${mii.hair.color + (mii.hair.color > 3 ? -3 : 1)} from the left, on the ${mii.hair.color > 3 ? `bottom` : `top`} row.`,
            "eyebrowStyle": `On the eyebrow page (fifth tab), set the eyebrow style to the one ${typeCheat[mii.eyebrows.type]} from the left, ${Math.ceil((mii.eyebrows.type + 1) / 3)} from the top, on page ${mii.eyebrows.page}.`,
            "eyebrowColor": `On the eyebrow page (fifth tab), set the eyebrow color to the one ${mii.eyebrows.color + (mii.eyebrows.color > 3 ? -3 : 1)} from the left, on the ${mii.eyebrows.color > 3 ? `bottom` : `top`} row.`,
            "eyebrowY": `${mii.eyebrows.yPos !== 7 ? `On the eyebrow page (fifth tab), ` : ``}${mii.eyebrows.yPosition < 7 ? `press the up button ${7 - mii.eyebrows.yPosition} times.` : mii.eyebrows.yPosition > 7 ? `press the down button ${mii.eyebrows.yPosition - 7} times.` : ``}`,
            "eyebrowSize": `${mii.eyebrows.size !== 4 ? `On the eyebrow page (fifth tab), ` : ``}${mii.eyebrows.size < 4 ? `press the shrink button ${4 - mii.eyebrows.size} times.` : mii.eyebrows.size > 4 ? `press the enlarge button ${mii.eyebrows.size - 4} times.` : ``}`,
            "eyebrowRot": `${mii.eyebrows.rotation !== 6 ? `On the eyebrow page (fifth tab), ` : ``}${mii.eyebrows.rotation < 6 ? `press the rotate clockwise button ${6 - mii.eyebrows.rotation} times.` : mii.eyebrows.rotation > 6 ? `press the rotate counter-clockwise button ${mii.eyebrows.rotation - 6} times.` : ``}`,
            "eyebrowDist": `${mii.eyebrows.distApart !== 2 ? `On the eyebrow page (fifth tab), ` : ``}${mii.eyebrows.distanceApart < 2 ? `press the closer-together button ${2 - mii.eyebrows.distanceApart} times.` : mii.eyebrows.distanceApart > 2 ? `press the further-apart button ${mii.eyebrows.distanceApart - 2} times.` : ``}`,
            "eyeType": `On the eye page (sixth tab), set the eye type to the one ${typeCheat[mii.eyes.type]} from the left, ${Math.ceil((mii.eyes.type + 1) / 3)} from the top, on page ${mii.eyes.page}.`,
            "eyeColor": `On the eye page (sixth tab), set the color to the one ${mii.eyes.color + (mii.eyes.color > 2 ? -2 : 1)} from the left, on the ${mii.eyes.color > 2 ? `bottom` : `top`} row.`,
            "eyeY": `${mii.eyes.yPos !== 12 ? `On the eye page (sixth tab), ` : ``}${mii.eyes.yPosition < 12 ? `press the up button ${12 - mii.eyes.yPosition} times.` : mii.eyes.yPosition > 12 ? `press the down button ${mii.eyes.yPosition - 12} times.` : ``}`,
            "eyeSize": `${mii.eyes.size !== 4 ? `On the eye page (sixth tab), ` : ``}${mii.eyes.size < 4 ? `press the shrink button ${4 - mii.eyes.size} times.` : mii.eyes.size > 4 ? `press the enlarge button ${mii.eyes.size - 4} times.` : ``}`,
            "eyeRot": `${mii.eyes.rotation !== (mii.general.gender === "Female" ? 3 : 4) ? `On the eye page (sixth tab), ` : ``}${mii.eyes.rotation < (mii.general.gender === "Female" ? 3 : 4) ? `press the rotate clockwise button ${(mii.general.gender === "Female" ? 3 : 4) - mii.eyes.rotation} times.` : mii.eyes.rotation > (mii.general.gender === "Female" ? 3 : 4) ? `press the rotate counter-clockwise button ${mii.eyes.rotation - (mii.general.gender === "Female" ? 3 : 4)} times.` : ``}`,
            "eyeDist": `${mii.eyes.distanceApart !== 2 ? `On the eye page (sixth tab), ` : ``}${mii.eyes.distanceApart < 2 ? `press the closer-together button ${2 - mii.eyes.distanceApart} times.` : mii.eyes.distanceApart > 2 ? `press the further-apart button ${mii.eyes.distanceApart - 2} times.` : ``}`,
            "noseType": `On the nose page (seventh tab), set the nose to the one ${Math.ceil((mii.nose.type + 1) / 3)} from the top, and ${typeCheat[mii.nose.type]} from the left.`,
            "noseY": `${mii.nose.yPosition !== 9 ? `On the nose page (seventh tab), ` : ``}${mii.nose.yPosition < 9 ? `press the up button ${9 - mii.nose.yPosition} times.` : mii.nose.yPosition > 9 ? `press the down button ${mii.nose.yPosition - 9} times.` : ``}`,
            "noseSize": `${mii.nose.size !== 4 ? `On the nose page (seventh tab), ` : ``}${mii.nose.size < 4 ? `press the shrink button ${4 - mii.nose.size} times.` : mii.nose.size > 4 ? `press the enlarge button ${mii.nose.size - 4} times.` : ``}`,
            "mouthType": `On the mouth page (eighth tab), set the mouth type to the one ${typeCheat[mii.mouth.type]} from the left, ${Math.ceil((mii.mouth.type + 1) / 3)} from the top, on page ${mii.mouth.page}.`,
            "mouthCol": `On the mouth page (eighth tab), set the color to the one ${mii.mouth.color + 1} from the left.`,
            "mouthY": `${mii.mouth.yPosition !== 13 ? `On the mouth page (eighth tab), ` : ``}${mii.mouth.yPosition < 13 ? `press the up button ${13 - mii.mouth.yPosition} times.` : mii.mouth.yPosition > 13 ? `press the down button ${mii.mouth.yPosition - 13} times.` : ``}`,
            "mouthSize": `${mii.mouth.size !== 4 ? `On the mouth page (eighth tab), ` : ``}${mii.mouth.size < 4 ? `press the shrink button ${4 - mii.mouth.size} times.` : mii.mouth.size > 4 ? `press the enlarge button ${mii.mouth.size - 4} times.` : ``}`,
            "glasses": `On the glasses page (within the ninth tab), set the glasses to the one ${Math.ceil((mii.glasses.type + 1) / 3)} from the top, and ${typeCheat[mii.glasses.type]} from the left.`,
            "glassesCol": `On the glasses page (within the ninth tab), set the color to the one ${mii.glasses.color + (mii.glasses.color > 2 ? -2 : 1)} from the left, on the ${mii.glasses.color > 2 ? `bottom` : `top`} row.`,
            "glassesY": `${mii.glasses.yPosition !== 10 ? `On the glasses page (within the ninth tab), ` : ``}${mii.glasses.yPosition < 10 ? `press the up button ${10 - mii.glasses.yPosition} times.` : mii.glasses.yPosition > 10 ? `press the down button ${mii.glasses.yPosition - 10} times.` : ``}`,
            "glassesSize": `${mii.glasses.size !== 4 ? `On the glasses page (within the ninth tab), ` : ``}${mii.glasses.size < 4 ? `press the shrink button ${4 - mii.glasses.size} times.` : mii.glasses.size > 4 ? `press the enlarge button ${mii.glasses.size - 4} times.` : ``}`,
            "stache": `On the mustache page (within the ninth tab), set the mustache to the one on the ${[0, 1].includes(mii.beard.mustache.type) ? `top` : `bottom`}-${[0, 2].includes(mii.beard.mustache.type) ? `left` : `right`}.`,
            "stacheY": `${mii.beard.mustache.yPosition !== 10 ? `On the mustache page (within the ninth tab), press the ` : ``}${mii.beard.mustache.yPos > 10 ? `down button ${mii.beard.mustache.yPos - 10} times.` : mii.beard.mustache.yPos < 10 ? `up button ${10 - mii.beard.mustache.yPos} times.` : ``}`,
            "stacheSize": `${mii.beard.mustache.size !== 4 ? `On the mustache page (within the ninth tab), ` : ``}${mii.beard.mustache.size < 4 ? `press the shrink button ${4 - mii.beard.mustache.size} times.` : mii.beard.mustache.size > 4 ? `press the enlarge button ${mii.beard.mustache.size - 4} times.` : ``}`,
            "mole": `${mii.mole.on ? `On the mole page (within the ninth tab), turn the mole on.` : ``}`,
            "moleX": `${mii.mole.xPosition !== 2 ? `On the mole page (within the ninth tab), press the ` : ``}${mii.mole.xPosition > 2 ? `right button ${mii.mole.xPosition - 2} times.` : mii.mole.xPosition < 2 ? `left button ${2 - mii.mole.xPosition} times.` : ``}`,
            "moleY": `${mii.mole.yPosition !== 20 ? `On the mole page (within the ninth tab), press the ` : ``}${mii.mole.yPosition > 20 ? `down button ${mii.mole.yPosition - 20} times.` : mii.mole.yPosition < 20 ? `up button ${20 - mii.mole.yPosition} times.` : ``}`,
            "moleSize": `${mii.mole.size !== 4 ? `On the mole page (within the ninth tab), ` : ``}${mii.mole.size < 4 ? `press the shrink button ${4 - mii.mole.size} times.` : mii.mole.size > 4 ? `press the enlarge button ${mii.mole.size - 4} times.` : ``}`,
            "beard": `On the beard page (within the ninth tab), set the beard to the one on the ${[0, 1].includes(mii.beard.type) ? `top` : `bottom`}-${[0, 2].includes(mii.beard.type) ? `left` : `right`}.`,
            "beardCol": `On the mustache OR beard pages (within the ninth tab), set the color to the one ${mii.beard.color + (mii.beard.color > 3 ? -3 : 1)} from the left, on the ${mii.facialHair.color > 3 ? `bottom` : `top`} row.`,
            "other": `The Nickname of this Mii is ${mii.info.name}.${mii.info.creatorName ? ` The creator was ${mii.info.creatorName}.` : ``} Mingle was turned ${mii.info.mingle ? `on` : `off`}.${mii.info.birthday !== 0 ? ` Its birthday is ${["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][mii.info.birthMonth]} ${mii.info.birthday}.` : ``}`
        };
        if (!full) {
            var defaultMiiInstrs = structuredClone(mii.general.gender === "Male" ? defaultInstrs.wii.male : defaultInstrs.wii.female);
            Object.keys(instrs).forEach(instr => {
                if (instrs[instr] === defaultMiiInstrs[instr]) {
                    delete instrs[instr];
                }
            });
        }
        return instrs;
    }
    else {
        var instrs = {
            "base": `Select "Start from Scratch", and then "${mii.general.gender}".`,
            "faceShape": `On the face page (first tab), set the face shape to the one ${Math.ceil((mii.face.type + 1) / 3)} from the top, and ${typeCheat[mii.face.type]} from the left.`,
            "skinCol": `On the face page (first tab), set the color to the one ${mii.face.color + 1} from the top.`,
            "makeup": `On the face page's makeup tab, set the makeup to the one ${Math.ceil((mii.face.makeup + 1) / 3)} from the top, and ${typeCheat[mii.face.makeup]} from the left.`,
            "feature": `On the face page's wrinkles tab, set the facial feature to the one ${Math.ceil((mii.face.feature + 1) / 3) + 1} from the top, and ${typeCheat[mii.face.makeup]} from the left.`,
            "hairStyle": `On the hair page (second tab), set the hair style to the one ${Math.ceil((mii.hair.type + 1) / 3)} from the top, and ${typeCheat[mii.hair.type]} from the left, on page ${mii.hair.page + 1}.`,
            "hairFlipped": `${mii.hair.flipped ? `On the hair page (second tab), press the button to flip the hair.` : ``}`,
            "hairColor": `On the hair page (second tab), set the hair color to the one ${mii.hair.color + 1} from the top.`,
            "eyebrowStyle": `On the eyebrow page (third tab), set the eyebrow style to the one ${typeCheat[mii.eyebrows.type]} from the left, ${Math.ceil((mii.eyebrows.type + 1) / 3)} from the top, on page ${mii.eyebrows.page + 1}.`,
            "eyebrowColor": `On the eyebrow page (third tab), set the eyebrow color to the one ${mii.eyebrows.color + 1} from the top.`,
            "eyebrowY": `${mii.eyebrows.yPosition !== 7 ? `On the eyebrow page (third tab), ` : ``}${mii.eyebrows.yPosition < 7 ? `press the up button ${7 - mii.eyebrows.yPosition} times.` : mii.eyebrows.yPosition > 7 ? `press the down button ${mii.eyebrows.yPosition - 7} times.` : ``}`,
            "eyebrowSize": `${mii.eyebrows.size !== 4 ? `On the eyebrow page (third tab), ` : ``}${mii.eyebrows.size < 4 ? `press the shrink button ${4 - mii.eyebrows.size} times.` : mii.eyebrows.size > 4 ? `press the enlarge button ${mii.eyebrows.size - 4} times.` : ``}`,
            "eyebrowRot": `${mii.eyebrows.rotation !== 6 ? `On the eyebrow page (third tab), ` : ``}${mii.eyebrows.rotation < 6 ? `press the rotate clockwise button ${6 - mii.eyebrows.rotation} times.` : mii.eyebrows.rotation > 6 ? `press the rotate counter-clockwise button ${mii.eyebrows.rotation - 6} times.` : ``}`,
            "eyebrowDist": `${mii.eyebrows.distanceApart !== 2 ? `On the eyebrow page (third tab), ` : ``}${mii.eyebrows.distanceApart < 2 ? `press the closer-together button ${2 - mii.eyebrows.distanceApart} times.` : mii.eyebrows.distanceApart > 2 ? `press the further-apart button ${mii.eyebrows.distanceApart - 2} times.` : ``}`,
            "eyebrowSquash": `${mii.eyebrows.squash !== 3 ? `On the eyebrow page (third tab), ` : ``}${mii.eyebrows.squash < 3 ? `press the squish button ${3 - mii.eyebrows.squash} times.` : mii.eyebrows.squash > 3 ? `press the un-squish button ${mii.eyebrows.squash - 3} times.` : ``}`,
            "eyeType": `On the eye page (fourth tab), set the eye type to the one ${typeCheat[mii.eyes.type]} from the left, ${Math.ceil((mii.eyes.type + 1) / 3)} from the top, on page ${mii.eyes.page + 1}.`,
            "eyeColor": `On the eye page (fourth tab), set the color to the one ${mii.eyes.color + 1} from the top.`,
            "eyeY": `${mii.eyes.yPosition !== 12 ? `On the eye page (fourth tab), ` : ``}${mii.eyes.yPosition < 12 ? `press the up button ${12 - mii.eyes.yPosition} times.` : mii.eyes.yPosition > 12 ? `press the down button ${mii.eyes.yPosition - 12} times.` : ``}`,
            "eyeSize": `${mii.eyes.size !== 4 ? `On the eye page (fourth tab), ` : ``}${mii.eyes.size < 4 ? `press the shrink button ${4 - mii.eyes.size} times.` : mii.eyes.size > 4 ? `press the enlarge button ${mii.eyes.size - 4} times.` : ``}`,
            "eyeRot": `${mii.eyes.rotation !== (mii.general.gender === "Female" ? 3 : 4) ? `On the eye page (fourth tab), ` : ``}${mii.eyes.rotation < (mii.general.gender === "Female" ? 3 : 4) ? `press the rotate clockwise button ${(mii.general.gender === "Female" ? 3 : 4) - mii.eyes.rotation} times.` : mii.eyes.rotation > (mii.general.gender === "Female" ? 3 : 4) ? `press the rotate counter-clockwise button ${mii.eyes.rotation - (mii.general.gender === "Female" ? 3 : 4)} times.` : ``}`,
            "eyeDist": `${mii.eyes.distanceApart !== 2 ? `On the eye page (fourth tab), ` : ``}${mii.eyes.distanceApart < 2 ? `press the closer-together button ${2 - mii.eyes.distanceApart} times.` : mii.eyes.distanceApart > 2 ? `press the further-apart button ${mii.eyes.distanceApart - 2} times.` : ``}`,
            "eyeSquash": `${mii.eyes.squash !== 3 ? `On the eye page (fourth tab), ` : ``}${mii.eyes.squash < 3 ? `press the squish button ${3 - mii.eyes.squash} times.` : mii.eyes.squash > 3 ? `press the un-squish button ${mii.eyes.squash - 3} times.` : ``}`,
            "noseType": `On the nose page (fifth tab), set the nose to the one ${Math.ceil((mii.nose.type + 1) / 3)} from the top, and ${typeCheat[mii.nose.type]} from the left, on page ${mii.nose.page}.`,
            "noseY": `${mii.nose.yPosition !== 9 ? `On the nose page (fifth tab), ` : ``}${mii.nose.yPosition < 9 ? `press the up button ${9 - mii.nose.yPosition} times.` : mii.nose.yPosition > 9 ? `press the down button ${mii.nose.yPosition - 9} times.` : ``}`,
            "noseSize": `${mii.nose.size !== 4 ? `On the nose page (fifth tab), ` : ``}${mii.nose.size < 4 ? `press the shrink button ${4 - mii.nose.size} times.` : mii.nose.size > 4 ? `press the enlarge button ${mii.nose.size - 4} times.` : ``}`,
            "mouthType": `On the mouth page (sixth tab), set the mouth type to the one ${typeCheat[mii.mouth.type]} from the left, ${Math.ceil((mii.mouth.type + 1) / 3)} from the top, on page ${mii.mouth.page + 1}.`,
            "mouthCol": `On the mouth page (sixth tab), set the color to the one ${mii.mouth.color + 1} from the top.`,
            "mouthY": `${mii.mouth.yPosition !== 13 ? `On the mouth page (sixth tab), ` : ``}${mii.mouth.yPosition < 13 ? `press the up button ${13 - mii.mouth.yPosition} times.` : mii.mouth.yPosition > 13 ? `press the down button ${mii.mouth.yPosition - 13} times.` : ``}`,
            "mouthSize": `${mii.mouth.size !== 4 ? `On the mouth page (sixth tab), ` : ``}${mii.mouth.size < 4 ? `press the shrink button ${4 - mii.mouth.size} times.` : mii.mouth.size > 4 ? `press the enlarge button ${mii.mouth.size - 4} times.` : ``}`,
            "mouthSquash": `${mii.mouth.squash !== 3 ? `On the mouth page (sixth tab), ` : ``}${mii.mouth.squash < 3 ? `press the squish button ${3 - mii.mouth.squash} times.` : mii.mouth.squash > 3 ? `press the un-squish button ${mii.mouth.squash - 3} times.` : ``}`,
            "glasses": `On the glasses page (within the seventh tab), set the glasses to the one ${Math.ceil((mii.glasses.type + 1) / 3)} from the top, and ${typeCheat[mii.glasses.type]} from the left.`,
            "glassesCol": `On the glasses page (within the seventh tab), set the color to the one ${mii.glasses.color + 1} from the top.`,
            "glassesY": `${mii.glasses.yPosition !== 10 ? `On the glasses page (within the seventh tab), ` : ``}${mii.glasses.yPosition < 10 ? `press the up button ${10 - mii.glasses.yPosition} times.` : mii.glasses.yPosition > 10 ? `press the down button ${mii.glasses.yPosition - 10} times.` : ``}`,
            "glassesSize": `${mii.glasses.size !== 4 ? `On the glasses page (within the seventh tab), ` : ``}${mii.glasses.size < 4 ? `press the shrink button ${4 - mii.glasses.size} times.` : mii.glasses.size > 4 ? `press the enlarge button ${mii.glasses.size - 4} times.` : ``}`,
            "stache": `On the mustache page (within the seventh tab), set the mustache to the one on the ${[0, 1].includes(mii.beard.mustache.type) ? `top` : [2, 3].includes(mii.beard.mustache.type) ? `middle` : `bottom`}-${[0, 2, 4].includes(mii.beard.mustache.type) ? `left` : `right`}.`,
            "stacheY": `${mii.beard.mustache.yPosition !== 10 ? `On the mustache page (within the seventh tab), press the ` : ``}${mii.beard.mustache.yPosition > 10 ? `down button ${mii.beard.mustache.yPosition - 10} times.` : mii.beard.mustache.yPosition < 10 ? `up button ${10 - mii.beard.mustache.yPosition} times.` : ``}`,
            "stacheSize": `${mii.beard.mustache.size !== 4 ? `On the mustache page (within the seventh tab), ` : ``}${mii.beard.mustache.size < 4 ? `press the shrink button ${4 - mii.beard.mustache.size} times.` : mii.beard.mustache.size > 4 ? `press the enlarge button ${mii.beard.mustache.size - 4} times.` : ``}`,
            "mole": `${mii.mole.on ? `On the mole page (within the seventh tab), turn the mole on.` : ``}`,
            "moleX": `${mii.mole.xPosition !== 2 ? `On the mole page (within the seventh tab), press the ` : ``}${mii.mole.xPosition > 2 ? `right button ${mii.mole.xPosition - 2} times.` : mii.mole.xPosition < 2 ? `left button ${2 - mii.mole.xPosition} times.` : ``}`,
            "moleY": `${mii.mole.yPosition !== 20 ? `On the mole page (within the seventh tab), press the ` : ``}${mii.mole.yPosition > 20 ? `down button ${mii.mole.yPosition - 20} times.` : mii.mole.yPosition < 20 ? `up button ${20 - mii.mole.yPosition} times.` : ``}`,
            "moleSize": `${mii.mole.size !== 4 ? `On the mole page (within the seventh tab), ` : ``}${mii.mole.size < 4 ? `press the shrink button ${4 - mii.mole.size} times.` : mii.mole.size > 4 ? `press the enlarge button ${mii.mole.size - 4} times.` : ``}`,
            "beard": `On the beard page (within the seventh tab), set the beard to the one on the ${[0, 1].includes(mii.beard.type) ? `top` : [2, 3].includes(mii.beard.type) ? `middle` : `bottom`}-${[0, 2].includes(mii.beard.type) ? `left` : `right`}.`,
            "beardCol": `On the mustache OR beard pages (within the seventh tab), set the color to the one ${mii.beard.color + 1} from the top.`,
            "heightWeight": `On the build page (eighth tab), set the height to ${Math.round((100 / 128) * mii.general.height)}%, and the weight to ${Math.round((100 / 128) * mii.general.weight)}%.`,
            "col": `On the info page (after pressing "Next"), set the Favorite Color to ${mii.general.favoriteColor} (${mii.general.favoriteColor <= 5 ? mii.general.favoriteColor + 1 : mii.general.favoriteColor - 5} from the left, ${mii.general.favoriteColor > 5 ? "bottom" : "top"} row).`,
            "other": `The Nickname of this Mii is ${mii.meta.name}.${mii.meta.creatorName ? ` The creator was ${mii.meta.creatorName}.` : ``} ${mii.general.birthday !== 0 ? ` Its birthday is ${["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][mii.general.birthMonth]} ${mii.general.birthday}.` : ``}`
        };
        if (!full) {
            var defaultMiiInstrs = structuredClone(mii.general.gender === "Male" ? defaultInstrs["3ds"].male : defaultInstrs["3ds"].female);
            Object.keys(instrs).forEach(instr => {
                if (instrs[instr] === defaultMiiInstrs[instr]) {
                    delete instrs[instr];
                }
            });
        }
        return instrs;
    }
}

function miiHeightToMeasurements(value) {
    // h in [0, 127]
    const totalInches = 36 + (48 / 127) * value; // 3' to 7'
    return {
        feet: Math.floor(totalInches / 12),
        inches: Math.round(totalInches % 12),
        totalInches,

        centimeters: Math.round(totalInches * 2.54)
    };
}
function inchesToMiiHeight(totalInches) {
    return ((totalInches - 36) * 127) / 48;
}
function centimetersToMiiHeight(totalCentimeters) {
    return ((Math.round(totalCentimeters / 2.54) - 36) * 127) / 48;
}

// ---- Tunable anchors (BMI breakpoints) ----
const BMI_MIN = 16;
const BMI_MID = 22;
const BMI_MAX = 35;
function bmiFromWeightSlider(w) {
    // w in [0, 127]
    if (w <= 64) {
        return BMI_MID - (64 - w) * (BMI_MID - BMI_MIN) / 64;
    } else {
        return BMI_MID + (w - 64) * (BMI_MAX - BMI_MID) / 63;
    }
}
function miiWeightToRealWeight(heightInches, miiWeight) {
    /*
    Take the height, map it to a reasonable height 0-127 === 3'-7'.
    Get the average weight for that height.
    Take the slider 0-127 for weight, assume 64 is the average midpoint.
    If less than 64, make the Mii's weight more underweight than the average.
    If higher, make the Mii's weight more overweight than the average.
    The shorter the height, the less drastic the weight changes.

    This is approximate, not guaranteed accurate nor intended to be taken that way. This is for entertainment value only.
    */
    const H = miiHeightToMeasurements(heightInches).totalInches;
    const BMI = bmiFromWeightSlider(miiWeight);
    return {
        pounds: BMI * (H * H) / 703,
        kilograms: Math.round((BMI * (H * H) / 703) * 0.4535924)
    };
}
function imperialHeightWeightToMiiWeight(heightInches, weightLbs) {
    const H = miiHeightToMeasurements(heightInches).totalInches;
    const BMI = weightLbs * 703 / (H * H);

    if (BMI <= BMI_MID) {
        return 64 - 64 * (BMI_MID - BMI) / (BMI_MID - BMI_MIN);
    }
    else {
        return 64 + 63 * (BMI - BMI_MID) / (BMI_MAX - BMI_MID);
    }
}
function metricHeightWeightToMiiWeight(heightCentimeters, weightKilograms) {
    const heightInches = Math.round(heightCentimeters / 2.54);
    const weightLbs = Math.round(weightKilograms / 0.4535924);
    const H = miiHeightToMeasurements(heightInches).totalInches;
    const BMI = weightLbs * 703 / (H * H);

    if (BMI <= BMI_MID) {
        return 64 - 64 * (BMI_MID - BMI) / (BMI_MID - BMI_MIN);
    }
    else {
        return 64 + 63 * (BMI - BMI_MID) / (BMI_MAX - BMI_MID);
    }
}

function miiIdToTimestamp(miiId, mode){
    miiId = miiId.replaceAll(' ', '');
    const idBigInt = BigInt('0x' + miiId);
    
    switch(mode.toLowerCase().replaceAll(' ', '')){
        case "3ds":
        case "wiiu":
            const seconds3ds = (idBigInt & 0x0FFFFFFFn) * 2n;
            return new Date(Number(BigInt(Date.UTC(2010, 0, 1)) + seconds3ds * 1000n));
        
        case "wii":
            // Extract bits 0-27 (28 bits), multiply by 4 for seconds
            const secondsWii = (idBigInt & 0x0FFFFFFFn) * 4n;
            return new Date(Number(BigInt(Date.UTC(2006, 0, 1)) + secondsWii * 1000n));
        
        default:
            return "No valid mode specified";
    }
}


module.exports = {
    // Data
    Enums: require("./Enums"),

    //Convert
    convertMii,
    convertMiiToStudio,
    convertStudioToMii,

    //Read
    readWiiBin,
    read3DSQR,

    //Render
    renderMiiWithStudio,
    renderMii,

    //Write
    writeWiiBin,
    write3DSQR,

    makeChild,

    //Instructions
    generateInstructions,

    //Normalize Height and Weight 0-127 to human measurements
    miiHeightToMeasurements,
    inchesToMiiHeight,
    centimetersToMiiHeight,

    miiWeightToRealWeight,
    imperialHeightWeightToMiiWeight,
    metricHeightWeightToMiiWeight,

    miiIdToTimestamp,

    /*
    Handle Amiibo Functions
    insertMiiIntoAmiibo(amiiboDump, decrypted3DSMiiBuffer),
    extractMiiFromAmiibo(amiiboDump)
    */
    ...require("./amiiboHandler.js")
}
