module.exports={
    'rcd': {//Wii Miis
        length: 0x4a,
        aliases: ['mii', 'miigx', 'mae'],
        struct: [
            //0x0
            {
                name: "unknown",
                length: 1
            },
            {
                name: "gender",//0 Male, 1 Female
                length: 1
            },
            {
                name: "birthMonth",
                length: 4,
                max: 12//0=Not Set
            },
            //Last two bits of 0x0 - 0x1
            {
                name: "birthday",
                length: 5,
                max: 31
            },
            {
                name: "favoriteColor",
                length: 4,
                max: 11
            },
            {
                name: "favorited",
                length: 1
            },
            //0x2
            {
                name: "name",
                text: true,
                length: 160//Could check if this is valid text in future
            },
            //0x16
            {
                name: "height",
                length: 8,
                max: 127
            },
            //0x17
            {
                name: "weight",
                length: 8,
                max: 127
            },
            //0x18
            {
                name: "miiId",
                length: 32
            },
            //x01C
            {
                name: "systemId",
                length: 32
            },
            //0x2
            {
                name: "faceType",
                length: 3,
                max: 7
            },
            {
                name: "faceColor",
                length: 3,
                max: 5
            },
            //Last two bits of 0x2 - 0x21
            {
                name: "faceFeature",
                length: 4,
                max: 11
            },
            {
                name: "unknown",
                length: 3,
            },
            {
                name: "mingle",
                length: 1
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "fromCheckMiiOut",
                length: 1
            },
            //0x22
            {
                name: "hairType",
                length: 7,
                max: 71
            },
            //Last bit of 0x22 - 0x23
            {
                name: "hairColor",
                length: 3,
                max: 7
            },
            {
                name: "hairFlipped",
                length: 1,
            },
            {
                name: "unknown",
                length: 5
            },
            //0x24
            {
                name: "eyebrowType",
                length: 5,
                max: 23
            },
            {
                name: "unknown",
                length: 1
            },
            //Last two bits of 0x24 - 0x25
            {
                name: "eyebrowRotation",
                length: 4,
                max: 11
            },
            {
                name: "unknown",
                length: 6
            },
            //0x26
            {
                name: "eyebrowColor",
                length: 3,
                max: 7
            },
            {
                name: "eyebrowSize",
                length: 4,
                max: 8
            },
            //Last bit of 0x26 - 0x27
            {
                name: "eyebrowYPosition",
                length: 5,
                min: 3,
                max: 18
            },
            {
                name: "eyebrowDistanceApart",
                length: 4,
                max: 12
            },
            //0x28
            {
                name: "eyeType",
                length: 6,
                max: 47
            },
            {
                name: "unknown",
                length: 2
            },
            //0x29
            {
                name: "eyeRotation",
                length: 3,
                max: 7
            },
            {
                name: "eyeYPosition",
                length: 5,
                max: 18
            },
            //0x2A
            {
                name: "eyeColor",
                length: 3,
                max: 5
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyeSize",
                length: 3,
                max: 7
            },
            //Last bit of 0x2A - 0x2B
            {
                name: "eyeDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "unknown",
                length: 5
            },
            //0x2C
            {
                name: "noseType",
                length: 4,
                max: 11
            },
            {
                name: "noseSize",
                length: 4,
                max: 8
            },
            //0x2D
            {
                name: "noseYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 3
            },
            //0x2E
            {
                name: "mouthType",
                length: 5,
                max: 23
            },
            {
                name: "mouthColor",
                length: 2,
                max: 2
            },
            //Last bit of 0x2E - 0x2F
            {
                name: "mouthSize",
                length: 4,
                max: 8
            },
            {
                name: "mouthYPosition",
                length: 5,
                max: 18
            },
            //0x30
            {
                name: "glassesType",
                length: 4,
                max: 8
            },
            {
                name: "glassesColor",
                length: 3,
                max: 5
            },
            {
                name: "disablesMii",
                length: 1,
                max: 0
            },
            //0x31
            {
                name: "glassesSize",
                length: 3,
                max: 7
            },
            {
                name: "glassesYPosition",
                length: 5,
                max: 20
            },
            //0x32
            {
                name: "mustacheType",
                length: 2,
                max: 3
            },
            {
                name: "beardType",
                length: 2,
                max: 3
            },
            {
                name: "beardColor",
                length: 3,
                max: 7
            },
            //Last bit of 0x32 - 0x33
            {
                name: "mustacheSize",
                length: 4,
                max: 8
            },
            {
                name: "mustacheYPosition",
                length: 5,
                max: 16
            },
            //0x34
            {
                name: "moleActive",
                length: 1
            },
            {
                name: "moleSize",
                length: 4,
                max: 8
            },
            //Last three bits of 0x34 - 0x35
            {
                name: "moleYPosition",
                length: 5,
                max: 30
            },
            {
                name: "moleXPosition",
                length: 5,
                max: 16
            },
            {
                name: "unknown",
                length: 1
            },
            //0x36
            {
                name: "creatorName",
                text: true,
                length: 160
            }//0x49
        ]
    },
    'rsd': {//Wii Miis with 2 Byte Checksum appended
        length: 0x4c,
        struct: [
            //0x0
            {
                name: "unknown",
                length: 1
            },
            {
                name: "gender",//0 Male, 1 Female
                length: 1
            },
            {
                name: "birthMonth",
                length: 4,
                max: 12//0=Not Set
            },
            //Last two bits of 0x0 - 0x1
            {
                name: "birthday",
                length: 5,
                max: 31
            },
            {
                name: "favoriteColor",
                length: 4,
                max: 11
            },
            {
                name: "favorited",
                length: 1
            },
            //0x2
            {
                name: "name",
                text: true,
                length: 160//Could check if this is valid text in future
            },
            //0x16
            {
                name: "height",
                length: 8,
                max: 127
            },
            //0x17
            {
                name: "weight",
                length: 8,
                max: 127
            },
            //0x18
            {
                name: "miiId",
                length: 32
            },
            //x01C
            {
                name: "systemId",
                length: 32
            },
            //0x2
            {
                name: "faceType",
                length: 3,
                max: 7
            },
            {
                name: "faceColor",
                length: 3,
                max: 5
            },
            //Last two bits of 0x2 - 0x21
            {
                name: "faceFeature",
                length: 4,
                max: 11
            },
            {
                name: "unknown",
                length: 3,
            },
            {
                name: "mingle",
                length: 1
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "fromCheckMiiOut",
                length: 1
            },
            //0x22
            {
                name: "hairType",
                length: 7,
                max: 71
            },
            //Last bit of 0x22 - 0x23
            {
                name: "hairColor",
                length: 3,
                max: 7
            },
            {
                name: "hairFlipped",
                length: 1,
            },
            {
                name: "unknown",
                length: 5
            },
            //0x24
            {
                name: "eyebrowType",
                length: 5,
                max: 23
            },
            {
                name: "unknown",
                length: 1
            },
            //Last two bits of 0x24 - 0x25
            {
                name: "eyebrowRotation",
                length: 4,
                max: 11
            },
            {
                name: "unknown",
                length: 6
            },
            //0x26
            {
                name: "eyebrowColor",
                length: 3,
                max: 7
            },
            {
                name: "eyebrowSize",
                length: 4,
                max: 8
            },
            //Last bit of 0x26 - 0x27
            {
                name: "eyebrowYPosition",
                length: 5,
                min: 3,
                max: 18
            },
            {
                name: "eyebrowDistanceApart",
                length: 4,
                max: 12
            },
            //0x28
            {
                name: "eyeType",
                length: 6,
                max: 47
            },
            {
                name: "unknown",
                length: 2
            },
            //0x29
            {
                name: "eyeRotation",
                length: 3,
                max: 7
            },
            {
                name: "eyeYPosition",
                length: 5,
                max: 18
            },
            //0x2A
            {
                name: "eyeColor",
                length: 3,
                max: 5
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyeSize",
                length: 3,
                max: 7
            },
            //Last bit of 0x2A - 0x2B
            {
                name: "eyeDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "unknown",
                length: 5
            },
            //0x2C
            {
                name: "noseType",
                length: 4,
                max: 11
            },
            {
                name: "noseSize",
                length: 4,
                max: 8
            },
            //0x2D
            {
                name: "noseYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 3
            },
            //0x2E
            {
                name: "mouthType",
                length: 5,
                max: 23
            },
            {
                name: "mouthColor",
                length: 2,
                max: 2
            },
            //Last bit of 0x2E - 0x2F
            {
                name: "mouthSize",
                length: 4,
                max: 8
            },
            {
                name: "mouthYPosition",
                length: 5,
                max: 18
            },
            //0x30
            {
                name: "glassesType",
                length: 4,
                max: 8
            },
            {
                name: "glassesColor",
                length: 3,
                max: 5
            },
            {
                name: "disablesMii",
                length: 1,
                max: 0
            },
            //0x31
            {
                name: "glasesSize",
                length: 3,
                max: 7
            },
            {
                name: "glassesYPosition",
                length: 5,
                max: 20
            },
            //0x32
            {
                name: "mustacheType",
                length: 2,
                max: 3
            },
            {
                name: "beardType",
                length: 2,
                max: 3
            },
            {
                name: "beardColor",
                length: 3,
                max: 7
            },
            //Last bit of 0x32 - 0x33
            {
                name: "mustacheSize",
                length: 4,
                max: 8
            },
            {
                name: "mustacheYPosition",
                length: 5,
                max: 16
            },
            //0x34
            {
                name: "moleActive",
                length: 1
            },
            {
                name: "moleSize",
                length: 4,
                max: 8
            },
            //Last three bits of 0x34 - 0x35
            {
                name: "moleYPosition",
                length: 5,
                max: 30
            },
            {
                name: "moleXPosition",
                length: 5,
                max: 16
            },
            {
                name: "unknown",
                length: 1
            },
            //0x36
            {
                name: "creatorName",
                text: true,
                length: 160
            },
            //0x49
            {
                name: "checksum",
                length: 16
            }
        ]
    },

    'cfcd': {//CFSD without buffer or checksum
        length: 0x5C,
        struct: [
            //0x0
            {
                name: "version",
                length: 8,
                min: 3,
                max: 3
            },
            //0x1
            {
                name: "unknown",
                length: 2
            },
            {
                name: "charset",
                length: 2,
                max: 3
            },
            {
                name: "region",
                length: 2,
                max: 3
            },
            {
                name: "profaneNames",
                length: 1
            },
            {
                name: "copying",
                length: 1
            },
            //0x2
            {
                name: "selectionSlotIndex",
                length: 4
            },
            {
                name: "selectionPageIndex",
                length: 4
            },
            //0x3
            {
                name: "unknown",
                length: 1
            },
            {
                name: "originalDevice",
                length: 3,
                min: 3,
                max: 3
            },
            {
                name: "unknown",
                length: 4
            },
            //0x4
            {
                name: "systemId",
                length: 64
            },
            //0xC
            {
                name: "miiId",
                length: 32
            },
            //0x10
            {
                name: "creatorMac",
                length: 48
            },
            //0x16
            {
                name: "padding",
                length: 16,
                max: 0
            },

            //0x18
            {
                word: true,
                length: 16
            },
            {
                name: "gender",
                length: 1//0 Male, 1 Female
            },
            {
                name: "birthMonth",
                length: 4,
                max: 12//0 if not set
            },
            {
                name: "birthday",
                length: 5,
                max: 31
            },
            {
                name: "favoriteColor",
                length: 4,
                max: 11
            },
            {
                name: "favorited",
                length: 1
            },
            {
                name: "unknown",
                length: 1
            },

            //0x1A
            {
                name: "name",
                text: true,
                length: 160
            },
            //0x2E
            {
                name: "height",
                length: 8,
                max: 127
            },
            //0x2F
            {
                name: "weight",
                length: 8,
                max: 127
            },
            //0x30
            {
                name: "faceColor",
                length: 3,
                max: 5
            },
            {
                name: "faceType",
                length: 4,
                max: 11
            },
            {
                name: "sharing",
                length: 1//0 True, 1 False
            },
            //0x31
            {
                name: "makeup",
                length: 4,
                max: 11
            },
            {
                name: "faceFeature",
                length: 4,
                max: 11
            },
            //0x32
            {
                name: "hairStyle",
                length: 8,
                max: 131
            },
            //0x33
            {
                name: "unknown",
                length: 4
            },
            {
                name: "hairFlipped",
                length: 1
            },
            {
                name: "hairColor",
                length: 3,
                max: 7
            },

            //0x34
            {
                word: true,
                length: 32
            },
            {
                name: "eyeType",
                length: 6,
                max: 59
            },
            {
                name: "eyeColor",
                length: 3,
                max: 5
            },
            {
                name: "eyeSize",
                length: 4,
                max: 7//flip
            },
            {
                name: "eyeSquash",
                length: 3,
                max: 6//flip
            },
            {
                name: "eyeRotation",
                length: 5,
                max: 7
            },
            {
                name: "eyeDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "eyeYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x38
            {
                word: true,
                length: 32
            },
            {
                name: "eyebrowType",
                length: 5,
                max: 24
            },
            {
                name: "eyebrowColor",
                length: 3,
                max: 7
            },
            {
                name: "eyebrowSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "eyebrowSquash",
                length: 3,
                max: 6//flip
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyebrowRotation",
                length: 4,
                max: 11
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyebrowDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "eyebrowYPosition",
                length: 5,
                min: 3,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x3C
            {
                word: true,
                length: 16
            },
            {
                name: "noseType",
                length: 5,
                max: 17
            },
            {
                name: "noseSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "noseYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x3E
            {
                word: true,
                length: 16
            },
            {
                name: "mouthType",
                length: 6,
                max: 35
            },
            {
                name: "mouthColor",
                length: 3,
                max: 4
            },
            {
                name: "mouthSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "mouthSquash",
                length: 3,
                max: 6//flip
            },

            //0x40
            {
                name: "unknown",
                length: 8
            },

            //0x41
            {
                name: "mouthYPosition",
                length: 5,
                max: 18
            },
            {
                name: "mustacheType",
                length: 3,
                max: 5
            },

            //0x42
            {
                word: true,
                length: 16
            },
            {
                name: "beardType",
                length: 3,
                max: 5
            },
            {
                name: "beardColor",
                length: 3,
                max: 7
            },
            {
                name: "mustacheSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "mustacheYPosition",
                length: 5,
                max: 16
            },
            {
                name: "unknown",
                length: 1
            },

            //0x44
            {
                word: true,
                length: 16
            },
            {
                name: "glassesType",
                length: 4,
                max: 8
            },
            {
                name: "glassesColor",
                length: 3,
                max: 5
            },
            {
                name: "glassesSize",
                length: 4,
                max: 7//flip
            },
            {
                name: "glassesYPosition",
                length: 5,
                max: 20
            },

            //0x46
            {
                word: true,
                length: 16
            },
            {
                name: "moleActive",
                length: 1
            },
            {
                name: "moleSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "moleXPosition",
                length: 5,
                max: 16
            },
            {
                name: "moleYPosition",
                length: 5,
                max: 30
            },
            {
                name: "unknown",
                length: 1
            },

            //0x48
            {
                name: "creatorName",
                text: true,
                length: 160
            }
        ]
    },
    'ffcd': {//FFSD without buffer or checksum
        length: 0x5C,
        be: false,
        struct: [
            //0x0
            {
                name: "version",
                length: 8,
                min: 3,
                max: 3
            },
            //0x1
            {
                name: "unknown",
                length: 2
            },
            {
                name: "charset",
                length: 2,
                max: 3
            },
            {
                name: "region",
                length: 2,
                max: 3
            },
            {
                name: "profaneNames",
                length: 1
            },
            {
                name: "copying",
                length: 1
            },
            //0x2
            {
                name: "selectionSlotIndex",
                length: 4
            },
            {
                name: "selectionPageIndex",
                length: 4
            },
            //0x3
            {
                name: "unknown",
                length: 1
            },
            {
                name: "originalDevice",
                length: 3,
                min: 4,
                max: 4
            },
            {
                name: "unknown",
                length: 4
            },
            //0x4
            {
                name: "systemId",
                length: 64
            },
            //0xC
            {
                name: "miiId",
                length: 32
            },
            //0x10
            {
                name: "creatorMac",
                length: 48
            },
            //0x16
            {
                name: "padding",
                length: 16,
                max: 0
            },

            //0x18
            {
                word: true,
                length: 16
            },
            {
                name: "gender",
                length: 1//0 Male, 1 Female
            },
            {
                name: "birthMonth",
                length: 4,
                max: 12//0 if not set
            },
            {
                name: "birthday",
                length: 5,
                max: 31
            },
            {
                name: "favoriteColor",
                length: 4,
                max: 11
            },
            {
                name: "favorited",
                length: 1
            },
            {
                name: "unknown",
                length: 1
            },

            //0x1A
            {
                name: "name",
                text: true,
                length: 160
            },
            //0x2E
            {
                name: "height",
                length: 8,
                max: 127
            },
            //0x2F
            {
                name: "weight",
                length: 8,
                max: 127
            },
            //0x30
            {
                name: "faceColor",
                length: 3,
                max: 5
            },
            {
                name: "faceType",
                length: 4,
                max: 11
            },
            {
                name: "sharing",
                length: 1//0 True, 1 False
            },
            //0x31
            {
                name: "makeup",
                length: 4,
                max: 11
            },
            {
                name: "faceFeature",
                length: 4,
                max: 11
            },
            //0x32
            {
                name: "hairStyle",
                length: 8,
                max: 131
            },
            //0x33
            {
                name: "unknown",
                length: 4
            },
            {
                name: "hairFlipped",
                length: 1
            },
            {
                name: "hairColor",
                length: 3,
                max: 7
            },

            //0x34
            {
                word: true,
                length: 32
            },
            {
                name: "eyeType",
                length: 6,
                max: 59
            },
            {
                name: "eyeColor",
                length: 3,
                max: 5
            },
            {
                name: "eyeSize",
                length: 4,
                max: 7//flip
            },
            {
                name: "eyeSquash",
                length: 3,
                max: 6//flip
            },
            {
                name: "eyeRotation",
                length: 5,
                max: 7
            },
            {
                name: "eyeDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "eyeYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x38
            {
                word: true,
                length: 32
            },
            {
                name: "eyebrowType",
                length: 5,
                max: 24
            },
            {
                name: "eyebrowColor",
                length: 3,
                max: 7
            },
            {
                name: "eyebrowSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "eyebrowSquash",
                length: 3,
                max: 6//flip
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyebrowRotation",
                length: 4,
                max: 11
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyebrowDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "eyebrowYPosition",
                length: 5,
                min: 3,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x3C
            {
                word: true,
                length: 16
            },
            {
                name: "noseType",
                length: 5,
                max: 17
            },
            {
                name: "noseSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "noseYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x3E
            {
                word: true,
                length: 16
            },
            {
                name: "mouthType",
                length: 6,
                max: 35
            },
            {
                name: "mouthColor",
                length: 3,
                max: 4
            },
            {
                name: "mouthSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "mouthSquash",
                length: 3,
                max: 6//flip
            },

            //0x40
            {
                name: "unknown",
                length: 8
            },

            //0x41
            {
                name: "mouthYPosition",
                length: 5,
                max: 18
            },
            {
                name: "mustacheType",
                length: 3,
                max: 5
            },

            //0x42
            {
                word: true,
                length: 16
            },
            {
                name: "beardType",
                length: 3,
                max: 5
            },
            {
                name: "beardColor",
                length: 3,
                max: 7
            },
            {
                name: "mustacheSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "mustacheYPosition",
                length: 5,
                max: 16
            },
            {
                name: "unknown",
                length: 1
            },

            //0x44
            {
                word: true,
                length: 16
            },
            {
                name: "glassesType",
                length: 4,
                max: 8
            },
            {
                name: "glassesColor",
                length: 3,
                max: 5
            },
            {
                name: "glassesSize",
                length: 4,
                max: 7//flip
            },
            {
                name: "glassesYPosition",
                length: 5,
                max: 20
            },

            //0x46
            {
                word: true,
                length: 16
            },
            {
                name: "moleActive",
                length: 1
            },
            {
                name: "moleSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "moleXPosition",
                length: 5,
                max: 16
            },
            {
                name: "moleYPosition",
                length: 5,
                max: 30
            },
            {
                name: "unknown",
                length: 1
            },

            //0x48
            {
                name: "creatorName",
                text: true,
                length: 160
            }
        ]
    },
    'cfsd': {//3DS With 2 Byte 00 Buffer and 2 Byte Checksum Appended
        length: 0x60,
        struct: [
            //0x0
            {
                name: "version",
                length: 8,
                min: 3,
                max: 3
            },
            //0x1
            {
                name: "unknown",
                length: 2
            },
            {
                name: "charset",
                length: 2,
                max: 3
            },
            {
                name: "region",
                length: 2,
                max: 3
            },
            {
                name: "profaneNames",
                length: 1
            },
            {
                name: "copying",
                length: 1
            },
            //0x2
            {
                name: "selectionSlotIndex",
                length: 4
            },
            {
                name: "selectionPageIndex",
                length: 4
            },
            //0x3
            {
                name: "unknown",
                length: 1
            },
            {
                name: "originalDevice",
                length: 3,
                min: 3,
                max: 3
            },
            {
                name: "unknown",
                length: 4
            },
            //0x4
            {
                name: "systemId",
                length: 64
            },
            //0xC
            {
                name: "miiId",
                length: 32
            },
            //0x10
            {
                name: "creatorMac",
                length: 48
            },
            //0x16
            {
                name: "padding",
                length: 16,
                max: 0
            },

            //0x18
            {
                word: true,
                length: 16
            },
            {
                name: "gender",
                length: 1//0 Male, 1 Female
            },
            {
                name: "birthMonth",
                length: 4,
                max: 12//0 if not set
            },
            {
                name: "birthday",
                length: 5,
                max: 31
            },
            {
                name: "favoriteColor",
                length: 4,
                max: 11
            },
            {
                name: "favorited",
                length: 1
            },
            {
                name: "unknown",
                length: 1
            },

            //0x1A
            {
                name: "name",
                text: true,
                length: 160
            },
            //0x2E
            {
                name: "height",
                length: 8,
                max: 127
            },
            //0x2F
            {
                name: "weight",
                length: 8,
                max: 127
            },
            //0x30
            {
                name: "faceColor",
                length: 3,
                max: 5
            },
            {
                name: "faceType",
                length: 4,
                max: 11
            },
            {
                name: "sharing",
                length: 1//0 True, 1 False
            },
            //0x31
            {
                name: "makeup",
                length: 4,
                max: 11
            },
            {
                name: "faceFeature",
                length: 4,
                max: 11
            },
            //0x32
            {
                name: "hairStyle",
                length: 8,
                max: 131
            },
            //0x33
            {
                name: "unknown",
                length: 4
            },
            {
                name: "hairFlipped",
                length: 1
            },
            {
                name: "hairColor",
                length: 3,
                max: 7
            },

            //0x34
            {
                word: true,
                length: 32
            },
            {
                name: "eyeType",
                length: 6,
                max: 59
            },
            {
                name: "eyeColor",
                length: 3,
                max: 5
            },
            {
                name: "eyeSize",
                length: 4,
                max: 7//flip
            },
            {
                name: "eyeSquash",
                length: 3,
                max: 6//flip
            },
            {
                name: "eyeRotation",
                length: 5,
                max: 7
            },
            {
                name: "eyeDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "eyeYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x38
            {
                word: true,
                length: 32
            },
            {
                name: "eyebrowType",
                length: 5,
                max: 24
            },
            {
                name: "eyebrowColor",
                length: 3,
                max: 7
            },
            {
                name: "eyebrowSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "eyebrowSquash",
                length: 3,
                max: 6//flip
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyebrowRotation",
                length: 4,
                max: 11
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyebrowDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "eyebrowYPosition",
                length: 5,
                min: 3,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x3C
            {
                word: true,
                length: 16
            },
            {
                name: "noseType",
                length: 5,
                max: 17
            },
            {
                name: "noseSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "noseYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x3E
            {
                word: true,
                length: 16
            },
            {
                name: "mouthType",
                length: 6,
                max: 35
            },
            {
                name: "mouthColor",
                length: 3,
                max: 4
            },
            {
                name: "mouthSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "mouthSquash",
                length: 3,
                max: 6//flip
            },

            //0x40
            {
                name: "unknown",
                length: 8
            },

            //0x41
            {
                name: "mouthYPosition",
                length: 5,
                max: 18
            },
            {
                name: "mustacheType",
                length: 3,
                max: 5
            },

            //0x42
            {
                word: true,
                length: 16
            },
            {
                name: "beardType",
                length: 3,
                max: 5
            },
            {
                name: "beardColor",
                length: 3,
                max: 7
            },
            {
                name: "mustacheSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "mustacheYPosition",
                length: 5,
                max: 16
            },
            {
                name: "unknown",
                length: 1
            },

            //0x44
            {
                word: true,
                length: 16
            },
            {
                name: "glassesType",
                length: 4,
                max: 8
            },
            {
                name: "glassesColor",
                length: 3,
                max: 5
            },
            {
                name: "glassesSize",
                length: 4,
                max: 7//flip
            },
            {
                name: "glassesYPosition",
                length: 5,
                max: 20
            },

            //0x46
            {
                word: true,
                length: 16
            },
            {
                name: "moleActive",
                length: 1
            },
            {
                name: "moleSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "moleXPosition",
                length: 5,
                max: 16
            },
            {
                name: "moleYPosition",
                length: 5,
                max: 30
            },
            {
                name: "unknown",
                length: 1
            },

            //0x48
            {
                name: "creatorName",
                text: true,
                length: 160
            },

            {
                name: "buffer",
                length: 16,
                max: 0
            },
            {
                name: "checksum",
                length: 16
            }
        ]
    },
    'ffsd': {//Exact same as CFSD, but with one number changed to 4 instead of 3
        length: 0x60,
        struct: [
            //0x0
            {
                name: "version",
                length: 8,
                min: 3,
                max: 3
            },
            //0x1
            {
                name: "unknown",
                length: 2
            },
            {
                name: "charset",
                length: 2,
                max: 3
            },
            {
                name: "region",
                length: 2,
                max: 3
            },
            {
                name: "profaneNames",
                length: 1
            },
            {
                name: "copying",
                length: 1
            },
            //0x2
            {
                name: "selectionSlotIndex",
                length: 4
            },
            {
                name: "selectionPageIndex",
                length: 4
            },
            //0x3
            {
                name: "unknown",
                length: 1
            },
            {
                name: "originalDevice",
                length: 3,
                min: 4,
                max: 4
            },
            {
                name: "unknown",
                length: 4
            },
            //0x4
            {
                name: "systemId",
                length: 64
            },
            //0xC
            {
                name: "miiId",
                length: 32
            },
            //0x10
            {
                name: "creatorMac",
                length: 48
            },
            //0x16
            {
                name: "padding",
                length: 16,
                max: 0
            },

            //0x18
            {
                word: true,
                length: 16
            },
            {
                name: "gender",
                length: 1//0 Male, 1 Female
            },
            {
                name: "birthMonth",
                length: 4,
                max: 12//0 if not set
            },
            {
                name: "birthday",
                length: 5,
                max: 31
            },
            {
                name: "favoriteColor",
                length: 4,
                max: 11
            },
            {
                name: "favorited",
                length: 1
            },
            {
                name: "unknown",
                length: 1
            },

            //0x1A
            {
                name: "name",
                text: true,
                length: 160
            },
            //0x2E
            {
                name: "height",
                length: 8,
                max: 127
            },
            //0x2F
            {
                name: "weight",
                length: 8,
                max: 127
            },
            //0x30
            {
                name: "faceColor",
                length: 3,
                max: 5
            },
            {
                name: "faceType",
                length: 4,
                max: 11
            },
            {
                name: "sharing",
                length: 1//0 True, 1 False
            },
            //0x31
            {
                name: "makeup",
                length: 4,
                max: 11
            },
            {
                name: "faceFeature",
                length: 4,
                max: 11
            },
            //0x32
            {
                name: "hairStyle",
                length: 8,
                max: 131
            },
            //0x33
            {
                name: "unknown",
                length: 4
            },
            {
                name: "hairFlipped",
                length: 1
            },
            {
                name: "hairColor",
                length: 3,
                max: 7
            },

            //0x34
            {
                word: true,
                length: 32
            },
            {
                name: "eyeType",
                length: 6,
                max: 59
            },
            {
                name: "eyeColor",
                length: 3,
                max: 5
            },
            {
                name: "eyeSize",
                length: 4,
                max: 7//flip
            },
            {
                name: "eyeSquash",
                length: 3,
                max: 6//flip
            },
            {
                name: "eyeRotation",
                length: 5,
                max: 7
            },
            {
                name: "eyeDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "eyeYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x38
            {
                word: true,
                length: 32
            },
            {
                name: "eyebrowType",
                length: 5,
                max: 24
            },
            {
                name: "eyebrowColor",
                length: 3,
                max: 7
            },
            {
                name: "eyebrowSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "eyebrowSquash",
                length: 3,
                max: 6//flip
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyebrowRotation",
                length: 4,
                max: 11
            },
            {
                name: "unknown",
                length: 1
            },
            {
                name: "eyebrowDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "eyebrowYPosition",
                length: 5,
                min: 3,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x3C
            {
                word: true,
                length: 16
            },
            {
                name: "noseType",
                length: 5,
                max: 17
            },
            {
                name: "noseSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "noseYPosition",
                length: 5,
                max: 18
            },
            {
                name: "unknown",
                length: 2
            },

            //0x3E
            {
                word: true,
                length: 16
            },
            {
                name: "mouthType",
                length: 6,
                max: 35
            },
            {
                name: "mouthColor",
                length: 3,
                max: 4
            },
            {
                name: "mouthSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "mouthSquash",
                length: 3,
                max: 6//flip
            },

            //0x40
            {
                name: "unknown",
                length: 8
            },

            //0x41
            {
                name: "mouthYPosition",
                length: 5,
                max: 18
            },
            {
                name: "mustacheType",
                length: 3,
                max: 5
            },

            //0x42
            {
                word: true,
                length: 16
            },
            {
                name: "beardType",
                length: 3,
                max: 5
            },
            {
                name: "beardColor",
                length: 3,
                max: 7
            },
            {
                name: "mustacheSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "mustacheYPosition",
                length: 5,
                max: 16
            },
            {
                name: "unknown",
                length: 1
            },

            //0x44
            {
                word: true,
                length: 16
            },
            {
                name: "glassesType",
                length: 4,
                max: 8
            },
            {
                name: "glassesColor",
                length: 3,
                max: 5
            },
            {
                name: "glassesSize",
                length: 4,
                max: 7//flip
            },
            {
                name: "glassesYPosition",
                length: 5,
                max: 20
            },

            //0x46
            {
                word: true,
                length: 16
            },
            {
                name: "moleActive",
                length: 1
            },
            {
                name: "moleSize",
                length: 4,
                max: 8//flip
            },
            {
                name: "moleXPosition",
                length: 5,
                max: 16
            },
            {
                name: "moleYPosition",
                length: 5,
                max: 30
            },
            {
                name: "unknown",
                length: 1
            },

            //0x48
            {
                name: "creatorName",
                text: true,
                length: 160
            },

            {
                name: "buffer",
                length: 16,
                max: 0
            },
            {
                name: "checksum",
                length: 16
            }
        ]
    },

    'cfed': {//CFSD Encrypted for QR (Unofficial Name)
        length: 0x70
        //These are encrypted so no validation can be done without running decryption or part of decryption
    },
    'ffed': {//FFSD Encrypted for QR (Unofficial Name)
        length: 0x70
        //These are encrypted so no validation can be done without running decryption or part of decryption
    },

    'nfsd': {//Switch NAND Format (Probably Unofficial Name)
        aliases: ['switchdb', 'nfdb', 'sampledb'],
        length: 544,
        struct: [
            {
                name: "hairType",
                length: 8,
                max: 131
            },
            {
                name: "moleActive",
                length: 1
            },
            {
                name: "height",
                length: 7,
                max: 127
            },
            {
                name: "hairFlipped",
                length: 1
            },
            {
                name: "weight",
                length: 7,
                max: 127
            },
            {
                name: "isSpecial",
                length: 1
            },
            {
                name: "hairColor",
                length: 7,
                max: 99
            },
            {
                name: "gender",
                length: 1
            },
            {
                name: "eyeColor",
                length: 7,
                max: 99
            },
            {
                name: "eyebrowColor",
                length: 8,
                max: 99
            },
            {
                name: "mouthColor",
                length: 8,
                max: 99
            },
            {
                name: "beardColor",
                length: 8,
                max: 99
            },
            {
                name: "glassesColor",
                length: 8,
                max: 99
            },
            {
                name: "unknown",
                length: 2
            },
            {
                name: "eyeType",
                length: 6,
                max: 59
            },
            {
                name: "charset",
                length: 2,
                max: 3
            },
            {
                name: "mouthType",
                length: 6,
                max: 35
            },
            {
                name: "glassesSize",
                length: 3,
                max: 7
            },
            {
                name: "eyeYPosition",
                length: 5,
                max: 18
            },
            {
                name: "mustacheType",
                length: 3,
                max: 5
            },
            {
                name: "eyebrowType",
                length: 5,
                max: 23
            },
            {
                name: "beardType",
                length: 3,
                max: 5
            },
            {
                name: "noseType",
                length: 5,
                max: 17
            },
            {
                name: "mouthSquash",
                length: 3,
                max: 6
            },
            {
                name: "noseYPosition",
                length: 5,
                max: 18
            },
            {
                name: "eyebrowSquash",
                length: 3,
                max: 6
            },
            {
                name: "mouthYPosition",
                length: 5,
                max: 18
            },
            {
                name: "eyeRotation",
                length: 3,
                max: 7
            },
            {
                name: "mustacheYPosition",
                length: 5,
                max: 16
            },
            {
                name: "eyeSquash",
                length: 3,
                max: 6
            },
            {
                name: "glassesYPosition",
                length: 5,
                max: 20
            },
            {
                name: "eyeSize",
                length: 3,
                max: 7
            },
            {
                name: "moleXPosition",
                length: 5,
                max: 16
            },
            {
                name: "moleYPosition",
                length: 8,
                max: 30
            },
            {
                name: "glassesType",
                length: 8,
                max: 19
            },
            {
                name: "faceType",
                length: 4,
                max: 11
            },
            {
                name: "favoriteColor",
                length: 4,
                max: 11
            },
            {
                name: "faceFeature",
                length: 4,
                max: 11
            },
            {
                name: "faceColor",
                length: 4,
                max: 9
            },
            {
                name: "eyeDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "makeup",
                length: 4,
                max: 11
            },
            {
                name: "eyebrowRotation",
                length: 4,
                max: 11
            },
            {
                name: "eyebrowSize",
                length: 4,
                max: 8
            },
            {
                name: "eyebrowYPosition",
                length: 4,
                min: 3,
                max: 18
            },
            {
                name: "eyebrowDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "mouthSize",
                length: 4,
                max: 8
            },
            {
                name: "noseSize",
                length: 4,
                max: 8
            },
            {
                name: "moleSize",
                length: 4,
                max: 8
            },
            {
                name: "mustacheSize",
                length: 4,
                max: 8
            },
            {
                name: "name",
                text: true,
                length: 160
            },
            {
                name: "miiId",
                length: 128
            },
            {
                name: "checksum",
                length: 8
            },
            {
                name: "checksum",
                length: 8
            }
        ]
    },
    'nfcd': {//Switch NAND Format without checksums or miiId (Probably Unofficial Name)
        length: 400,
        struct: [
            {
                name: "hairType",
                length: 8,
                max: 131
            },
            {
                name: "moleActive",
                length: 1
            },
            {
                name: "height",
                length: 7,
                max: 127
            },
            {
                name: "hairFlipped",
                length: 1
            },
            {
                name: "weight",
                length: 7,
                max: 127
            },
            {
                name: "isSpecial",
                length: 1
            },
            {
                name: "hairColor",
                length: 7,
                max: 99
            },
            {
                name: "gender",
                length: 1
            },
            {
                name: "eyeColor",
                length: 7,
                max: 99
            },
            {
                name: "eyebrowColor",
                length: 8,
                max: 99
            },
            {
                name: "mouthColor",
                length: 8,
                max: 99
            },
            {
                name: "beardColor",
                length: 8,
                max: 99
            },
            {
                name: "glassesColor",
                length: 8,
                max: 99
            },
            {
                name: "unknown",
                length: 2
            },
            {
                name: "eyeType",
                length: 6,
                max: 59
            },
            {
                name: "charSet",
                length: 2,
                max: 3
            },
            {
                name: "mouthType",
                length: 6,
                max: 35
            },
            {
                name: "glassesSize",
                length: 3,
                max: 7
            },
            {
                name: "eyeYPosition",
                length: 5,
                max: 18
            },
            {
                name: "mustacheType",
                length: 3,
                max: 5
            },
            {
                name: "eyebrowType",
                length: 5,
                max: 23
            },
            {
                name: "beardType",
                length: 3,
                max: 5
            },
            {
                name: "noseType",
                length: 5,
                max: 17
            },
            {
                name: "mouthSquash",
                length: 3,
                max: 6
            },
            {
                name: "noseYPosition",
                length: 5,
                max: 18
            },
            {
                name: "eyebrowSquash",
                length: 3,
                max: 6
            },
            {
                name: "mouthYPosition",
                length: 5,
                max: 18
            },
            {
                name: "eyeRotation",
                length: 3,
                max: 7
            },
            {
                name: "mustacheYPosition",
                length: 5,
                max: 16
            },
            {
                name: "eyeSquash",
                length: 3,
                max: 6
            },
            {
                name: "glassesYPosition",
                length: 5,
                max: 20
            },
            {
                name: "eyeSize",
                length: 3,
                max: 7
            },
            {
                name: "moleXPosition",
                length: 5,
                max: 16
            },
            {
                name: "moleYPosition",
                length: 8,
                max: 30
            },
            {
                name: "glassesType",
                length: 8,
                max: 19
            },
            {
                name: "faceType",
                length: 4,
                max: 11
            },
            {
                name: "favoriteColor",
                length: 4,
                max: 11
            },
            {
                name: "faceFeature",
                length: 4,
                max: 11
            },
            {
                name: "faceColor",
                length: 4,
                max: 9
            },
            {
                name: "eyeDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "makeup",
                length: 4,
                max: 11
            },
            {
                name: "eyebrowRotation",
                length: 4,
                max: 11
            },
            {
                name: "eyebrowSize",
                length: 4,
                max: 8
            },
            {
                name: "eyebrowYPosition",
                length: 4,
                min: 3,
                max: 18
            },
            {
                name: "eyebrowDistanceApart",
                length: 4,
                max: 12
            },
            {
                name: "mouthSize",
                length: 4,
                max: 8
            },
            {
                name: "noseSize",
                length: 4,
                max: 8
            },
            {
                name: "moleSize",
                length: 4,
                max: 8
            },
            {
                name: "mustacheSize",
                length: 4,
                max: 8
            },
            {
                name: "name",
                text: true,
                length: 160
            }
        ]
    },
    'charinfo': {//Switch format
        aliases: ['ufsd', 'mii'],
        length: 0x58,
        struct: [
            {
                name: "miiId",
                length: 128
            },
            {
                name: "name",
                text: true,
                length: 176
            },
            {
                name: "charset",
                length: 8,
                max: 3
            },
            {
                name: "favoriteColor",
                length: 8,
                max: 11
            },
            {
                name: "gender",
                length: 8,
                max: 1
            },
            {
                name: "height",
                length: 8,
                max: 127
            },
            {
                name: "weight",
                length: 8,
                max: 127
            },
            {
                name: "isSpecial",
                length: 8,
                max: 1
            },
            {
                name: "unknown",
                length: 8
            },
            {
                name: "faceType",
                length: 8,
                max: 11
            },
            {
                name: "faceColor",
                length: 8,
                max: 9
            },
            {
                name: "faceFeature",
                length: 8,
                max: 11
            },
            {
                name: "makeup",
                length: 8,
                max: 11
            },
            {
                name: "hairType",
                length: 8,
                max: 131
            },
            {
                name: "hairColor",
                length: 8,
                max: 99
            },
            {
                name: "hairFlipped",
                length: 8,
                max: 1
            },
            {
                name: "eyeType",
                length: 8,
                max: 59
            },
            {
                name: "eyeColor",
                length: 8,
                max: 99
            },
            {
                name: "eyeSize",
                length: 8,
                max: 7
            },
            {
                name: "eyeSquash",
                length: 8,
                max: 6
            },
            {
                name: "eyeRotation",
                length: 8,
                max: 7
            },
            {
                name: "eyeDistanceApart",
                length: 8,
                max: 12
            },
            {
                name: "eyeYPosition",
                length: 8,
                max: 18
            },
            {
                name: "eyebrowType",
                length: 8,
                max: 23
            },
            {
                name: "eyebrowColor",
                length: 8,
                max: 99
            },
            {
                name: "eyebrowSize",
                length: 8,
                max: 8
            },
            {
                name: "eyebrowSquash",
                length: 8,
                max: 6
            },
            {
                name: "eyebrowRotation",
                length: 8,
                max: 11
            },
            {
                name: "eyebrowDistanceApart",
                length: 8,
                max: 12
            },
            {
                name: "eyebrowYPosition",
                length: 8,
                min: 3,
                max: 18
            },
            {
                name: "noseType",
                length: 8,
                max: 17
            },
            {
                name: "noseSize",
                length: 8,
                max: 8
            },
            {
                name: "noseYPosition",
                length: 8,
                max: 18
            },
            {
                name: "mouthType",
                length: 8,
                max: 35
            },
            {
                name: "mouthColor",
                length: 8,
                max: 99
            },
            {
                name: "mouthSize",
                length: 8,
                max: 8
            },
            {
                name: "mouthSquash",
                length: 8,
                max: 6
            },
            {
                name: "mouthYPosition",
                length: 8,
                max: 18
            },
            {
                name: "beardColor",
                length: 8,
                max: 99
            },
            {
                name: "beardType",
                length: 8,
                max: 5
            },
            {
                name: "mustacheType",
                length: 8,
                max: 5
            },
            {
                name: "mustacheSize",
                length: 8,
                max: 8
            },
            {
                name: "mustacheYPosition",
                length: 8,
                max: 16
            },
            {
                name: "glassesType",
                length: 8,
                max: 19
            },
            {
                name: "glassesColor",
                length: 8,
                max: 99
            },
            {
                name: "glassesSize",
                length: 8,
                max: 7
            },
            {
                name: "glassesYPosition",
                length: 8,
                max: 20
            },
            {
                name: "moleActive",
                length: 8,
                max: 1
            },
            {
                name: "moleSize",
                length: 8,
                max: 8
            },
            {
                name: "moleXPosition",
                length: 8,
                max: 16
            },
            {
                name: "moleYPosition",
                length: 8,
                max: 30
            },
            {
                name: "unknown",
                length: 8,
                max: 0
            }
        ]
    },

    'mnms': {//Nintendo Studio localstorage object (Unofficial Name)
        length: 0x2e,
        struct: [
            {
                name: "beardColor",
                length: 8,
                max: 99
            },
            {
                name: "beardType",
                length: 8,
                max: 5
            },
            {
                name: "weight",
                length: 8,
                max: 127
            },
            {
                name: "eyeSquash",
                length: 8,
                max: 6
            },
            {
                name: "eyeColor",
                length: 8,
                max: 99
            },
            {
                name: "eyeRotation",
                length: 8,
                max: 7
            },
            {
                name: "eyeSize",
                length: 8,
                max: 7
            },
            {
                name: "eyeType",
                length: 8,
                max: 59
            },
            {
                name: "eyeDistanceApart",
                length: 8,
                max: 12
            },
            {
                name: "eyeYPosition",
                length: 8,
                max: 18
            },
            {
                name: "eyebrowSquash",
                length: 8,
                max: 6
            },
            {
                name: "eyebrowColor",
                length: 8,
                max: 99
            },
            {
                name: "eyebrowRotation",
                length: 8,
                max: 11
            },
            {
                name: "eyebrowSize",
                length: 8,
                max: 8
            },
            {
                name: "eyebrowType",
                length: 8,
                max: 23
            },
            {
                name: "eyebrowDistanceApart",
                length: 8,
                max: 12
            },
            {
                name: "eyebrowYPosition",
                length: 8,
                min: 3,
                max: 18
            },
            {
                name: "faceColor",
                length: 8,
                max: 9
            },
            {
                name: "makeup",
                length: 8,
                max: 11
            },
            {
                name: "faceType",
                length: 8,
                max: 11
            },
            {
                name: "faceFeature",
                length: 8,
                max: 11
            },
            {
                name: "favoriteColor",
                length: 8,
                max: 11
            },
            {
                name: "gender",
                length: 8,
                max: 1
            },
            {
                name: "glassesColor",
                length: 8,
                max: 99
            },
            {
                name: "glassesSize",
                length: 8,
                max: 7
            },
            {
                name: "glassesType",
                length: 8,
                max: 19
            },
            {
                name: "glassesYPosition",
                length: 8,
                max: 20
            },
            {
                name: "hairColor",
                length: 8,
                max: 99
            },
            {
                name: "hairFlipped",
                length: 8,
                max: 1
            },
            {
                name: "hairType",
                length: 8,
                max: 131
            },
            {
                name: "height",
                length: 8,
                max: 127
            },
            {
                name: "moleSize",
                length: 8,
                max: 8
            },
            {
                name: "moleActive",
                length: 8,
                max: 1
            },
            {
                name: "moleXPosition",
                length: 8,
                max: 16
            },
            {
                name: "moleYPosition",
                length: 8,
                max: 30
            },
            {
                name: "mouthSquash",
                length: 8,
                max: 6
            },
            {
                name: "mouthColor",
                length: 8,
                max: 99
            },
            {
                name: "mouthSize",
                length: 8,
                max: 8
            },
            {
                name: "mouthType",
                length: 8,
                max: 35
            },
            {
                name: "mouthYPosition",
                length: 8,
                max: 18
            },
            {
                name: "mustacheSize",
                length: 8,
                max: 8
            },
            {
                name: "mustacheType",
                length: 8,
                max: 5
            },
            {
                name: "mustacheYPosition",
                length: 8,
                max: 16
            },
            {
                name: "noseSize",
                length: 8,
                max: 8
            },
            {
                name: "noseType",
                length: 8,
                max: 17
            },
            {
                name: "noseYPosition",
                length: 8,
                max: 18
            }
        ]
    },

    'amiibo': {//Self explanatory (Unofficial Name)
        length: 4320
    },
    'amiibotrimmed': {//Sometimes Amiibo files get the last part cut off to be 532 bytes, they should be 540 but 532 byte files will be thrown around (Unofficial Name)
        length: 4256
    }
};