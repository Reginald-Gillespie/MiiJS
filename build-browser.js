const esbuild = require('esbuild');
const http = require('http');
const fs = require('fs');
const path = require('path');

const isServe = process.argv.includes('--serve');
const port = 8080;

// Plugin to replace Node.js-only modules with stubs
const nodeShimPlugin = {
    name: 'node-shim',
    setup(build) {
        // Shim built-in Node.js modules (except crypto which is used by amiiboHandler with Web Crypto API)
        const emptyModules = ['fs', 'canvas', 'gl', 'jimp', 'jsdom', 'https'];
        
        emptyModules.forEach(mod => {
            build.onResolve({ filter: new RegExp(`^${mod}$`) }, () => ({
                path: path.resolve(__dirname, 'shims/empty.js'),
            }));
        });
        
        // Shim crypto with browser-compatible version (allows crypto.subtle passthrough)
        build.onResolve({ filter: /^crypto$/ }, () => ({
            path: path.resolve(__dirname, 'shims/crypto-browser.js'),
        }));
        
        // Shim path with browser version
        build.onResolve({ filter: /^path$/ }, () => ({
            path: path.resolve(__dirname, 'shims/path-browser.js'),
        }));
        
        // Shim FFL.js modules
        build.onResolve({ filter: /ffl\.js\/examples\/ffl-emscripten-single-file\.js$/ }, () => ({
            path: path.resolve(__dirname, 'shims/empty.js'),
        }));
        
        build.onResolve({ filter: /ffl\.js\/FFLShaderMaterial\.js$/ }, () => ({
            path: path.resolve(__dirname, 'shims/empty.js'),
        }));
        
        build.onResolve({ filter: /ffl\.js\/ffl\.js$/ }, () => ({
            path: path.resolve(__dirname, 'shims/empty.js'),
        }));
        
        // Shim fflWrapper.js
        build.onResolve({ filter: /\.\/fflWrapper\.js$/ }, () => ({
            path: path.resolve(__dirname, 'shims/ffl-wrapper-stub.js'),
        }));
        
        // Note: amiiboHandler.js is now cross-platform, no need to shim
        
        // Shim struct-fu
        build.onResolve({ filter: /^struct-fu$/ }, () => ({
            path: path.resolve(__dirname, 'shims/empty.js'),
        }));
    }
};

// Build configuration for browser bundle
const buildOptions = {
    entryPoints: ['./index.js'],
    bundle: true,
    outfile: './dist/miijs.browser.js',
    format: 'iife',
    globalName: 'MiiJS',
    platform: 'browser',
    target: ['es2020'],
    sourcemap: true,
    minify: !isServe,
    define: {
        'process.versions': 'undefined',
    },
    plugins: [nodeShimPlugin],
    loader: {
        '.json': 'json'
    }
};

// Also build an ESM version
const esmBuildOptions = {
    ...buildOptions,
    outfile: './dist/miijs.browser.esm.js',
    format: 'esm',
    globalName: undefined
};

async function build() {
    try {
        // Create dist directory if it doesn't exist
        if (!fs.existsSync('./dist')) {
            fs.mkdirSync('./dist');
        }

        // Build IIFE version
        await esbuild.build(buildOptions);
        console.log('✓ Built dist/miijs.browser.js (IIFE)');

        // Build ESM version
        await esbuild.build(esmBuildOptions);
        console.log('✓ Built dist/miijs.browser.esm.js (ESM)');

        console.log('Build complete!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

async function serve() {
    try {
        // Create dist directory
        if (!fs.existsSync('./dist')) {
            fs.mkdirSync('./dist');
        }

        // Start esbuild in watch mode
        const ctx = await esbuild.context({
            ...buildOptions,
            minify: false,
        });
        await ctx.watch();
        console.log('✓ Watching for changes...');

        // Also build ESM version
        const ctxEsm = await esbuild.context({
            ...esmBuildOptions,
            minify: false,
        });
        await ctxEsm.watch();

        // Create a simple HTTP server
        const server = http.createServer((req, res) => {
            let filePath = req.url === '/' ? '/webpage-example/index.html' : req.url;
            filePath = path.join(__dirname, filePath);

            // Get file extension
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.mii': 'application/octet-stream',
            };

            const contentType = mimeTypes[ext] || 'application/octet-stream';

            fs.readFile(filePath, (error, content) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        res.writeHead(404);
                        res.end('File not found: ' + req.url);
                    } else {
                        res.writeHead(500);
                        res.end('Server error: ' + error.code);
                    }
                } else {
                    res.writeHead(200, { 
                        'Content-Type': contentType,
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(content, 'utf-8');
                }
            });
        });

        server.listen(port, () => {
            console.log(`\n🚀 Dev server running at http://localhost:${port}`);
            console.log(`   Open http://localhost:${port} to view the example\n`);
        });

    } catch (error) {
        console.error('Serve failed:', error);
        process.exit(1);
    }
}

if (isServe) {
    serve();
} else {
    build();
}
