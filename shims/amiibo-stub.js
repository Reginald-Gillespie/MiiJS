// Stub for amiiboHandler in browser builds
// Amiibo functions require Node.js crypto module

module.exports = {
    insertMiiIntoAmiibo: function() {
        throw new Error('insertMiiIntoAmiibo is only available in Node.js');
    },
    extractMiiFromAmiibo: function() {
        throw new Error('extractMiiFromAmiibo is only available in Node.js');
    }
};
