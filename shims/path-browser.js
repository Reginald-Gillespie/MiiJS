// Browser path shim with minimal functionality
module.exports = {
    join: function(...parts) {
        return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
    },
    dirname: function(p) {
        const parts = p.split('/');
        parts.pop();
        return parts.join('/') || '.';
    },
    basename: function(p, ext) {
        let base = p.split('/').pop() || '';
        if (ext && base.endsWith(ext)) {
            base = base.slice(0, -ext.length);
        }
        return base;
    },
    extname: function(p) {
        const base = p.split('/').pop() || '';
        const idx = base.lastIndexOf('.');
        return idx > 0 ? base.slice(idx) : '';
    },
    resolve: function(...parts) {
        return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
    }
};
