// Auto-generated JSDoc type definitions for Mii data structures
// Generated: 2026-01-28T21:19:10.408Z

// Nested type definitions
/**
 * @typedef {Object} MiiBeardMustache
 * @property {number} size - Max: 8
 * @property {number} type - Max: 3; Max: 5
 * @property {number} yPosition - Max: 16
 */
/**
 * @typedef {Object} MiiBeard
 * @property {number} color - Max: 7; Max: 99
 * @property {MiiBeardMustache} mustache
 * @property {number} type - Max: 3; Max: 5
 */
/**
 * @typedef {Object} MiiEyebrows
 * @property {number} color - Max: 7; Max: 99
 * @property {number} distanceApart - Max: 12
 * @property {number} rotation - Max: 11
 * @property {number} size - Max: 8
 * @property {number} squash? - Max: 6
 * @property {number} type - Max: 23; Max: 24 (ffcd, ffsd)
 * @property {(*|number)} yPosition - Range: 3-18
 */
/**
 * @typedef {Object} MiiEyes
 * @property {number} color - Max: 5; Max: 99
 * @property {number} distanceApart - Max: 12
 * @property {number} rotation - Max: 7
 * @property {number} size - Max: 7
 * @property {number} squash? - Max: 6
 * @property {number} type - Max: 47; Max: 59
 * @property {number} yPosition - Max: 18
 */
/**
 * @typedef {Object} MiiFace
 * @property {number} color - Max: 5; Max: 9
 * @property {number} feature - Max: 11
 * @property {number} makeup? - Max: 11
 * @property {number} type - Max: 7; Max: 11
 */
/**
 * @typedef {Object} MiiGeneral
 * @property {number} birthMonth? - Max: 12
 * @property {number} birthday? - Max: 31
 * @property {number} favoriteColor - Max: 11
 * @property {number} gender - Max: 1
 * @property {number} height - Max: 127
 * @property {number} weight - Max: 127
 */
/**
 * @typedef {Object} MiiGlasses
 * @property {number} color - Max: 5; Max: 99
 * @property {number} size - Max: 7
 * @property {number} type - Max: 8; Max: 19
 * @property {number} yPosition - Max: 20
 */
/**
 * @typedef {Object} MiiHair
 * @property {number} color - Max: 7; Max: 99
 * @property {boolean} flipped - Max: 1; Boolean value
 * @property {number} type - Max: 71; Max: 131
 */
/**
 * @typedef {Object} MiiMeta
 * @property {number} charset? - Max: 3
 * @property {string} creatorName? - Text field (true encoding)
 * @property {(string|number)} miiId? - Hex string
 * @property {string} name? - Text field (true encoding)
 * @property {number} originalDevice? - Max: 4
 * @property {number} region? - Max: 3
 * @property {string} systemId? - Hex string
 * @property {boolean} type? - Max: 1; Boolean value
 */
/**
 * @typedef {Object} MiiMole
 * @property {boolean} on - Max: 1; Boolean value
 * @property {number} size - Max: 8
 * @property {number} xPosition - Max: 16
 * @property {number} yPosition - Max: 30
 */
/**
 * @typedef {Object} MiiMouth
 * @property {number} color - Max: 2; Max: 4 (ffcd, ffsd); Max: 99
 * @property {number} size - Max: 8
 * @property {number} squash? - Max: 6
 * @property {number} type - Max: 23; Max: 35
 * @property {number} yPosition - Max: 18
 */
/**
 * @typedef {Object} MiiNose
 * @property {number} size - Max: 8
 * @property {(*|number)} type - Max: 11; Max: 17
 * @property {number} yPosition - Max: 18
 */
/**
 * @typedef {Object} MiiPerms
 * @property {number} copying?
 * @property {boolean} favorited? - Boolean value
 * @property {boolean} fromCheckMiiOut? - Boolean value
 * @property {*} mingle?
 * @property {boolean} profaneNames? - Boolean value
 * @property {*} sharing?
 */

// Main Mii type
/**
 * @typedef {Object} Mii
 * @property {MiiBeard} beard
 * @property {MiiEyebrows} eyebrows?
 * @property {MiiEyes} eyes?
 * @property {MiiFace} face?
 * @property {MiiGeneral} general?
 * @property {MiiGlasses} glasses
 * @property {MiiHair} hair
 * @property {MiiMeta} meta?
 * @property {MiiMole} mole
 * @property {MiiMouth} mouth?
 * @property {MiiNose} nose
 * @property {MiiPerms} perms?
 */

module.exports = {};