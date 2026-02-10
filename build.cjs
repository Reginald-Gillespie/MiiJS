const esbuild = require('esbuild');
const http = require('http');
const fs = require('fs');
const path = require('path');

const isServe = process.argv.includes('--serve');
const port = 8080;

// Plugin to replace Node.js-only modules with stubs
const nodeShimPlugin = {
  name: "node-shim",
  setup(build) {
    const shim = (p) => ({ path: path.resolve(__dirname, p) });

    // Replace ./platform.js with browser shim
    build.onResolve({ filter: /^\.\/platform\.js$/ }, (args) => ({
      path: path.join(args.resolveDir, "shims/platform.browser.js"),
    }));

    // Core node builtins -> browser shims/polyfills
    build.onResolve({ filter: /^(node:)?fs$/ }, () => shim("shims/fs.browser.js"));
    build.onResolve({ filter: /^path$/ }, () => ({ path: require.resolve("path-browserify") }));
    build.onResolve({ filter: /^node:path$/ }, () => ({ path: require.resolve("path-browserify") }));
    build.onResolve({ filter: /^(node:)?util$/ }, () => ({ path: require.resolve("util/") }));

    build.onResolve({ filter: /^stream$/ }, () => ({ path: require.resolve("stream-browserify") }));
    build.onResolve({ filter: /^events$/ }, () => ({ path: require.resolve("events/") }));
    build.onResolve({ filter: /^assert$/ }, () => ({ path: require.resolve("assert/") }));
    build.onResolve({ filter: /^util$/ }, () => ({ path: require.resolve("util/") }));
    build.onResolve({ filter: /^buffer$/ }, () => ({ path: require.resolve("buffer/") }));
    build.onResolve({ filter: /^crypto$/ }, () => ({ path: require.resolve("crypto-browserify") }));
    build.onResolve({ filter: /^zlib$/ }, () => ({ path: require.resolve("browserify-zlib") }));


    // Anything that should never be bundled for browser:
    for (const mod of ["jsdom","canvas","pngjs","jpeg-js","is-png","is-jpg","webgpu","fetch"]) {
      build.onResolve({ filter: new RegExp(`^${mod}$`) }, () => shim("shims/empty.js"));
    }

    // If you still reference the old FFL emscripten CJS file:
    build.onResolve(
      { filter: /ffl\.js\/examples\/ffl-emscripten-single-file\.cjs$/ },
      () => shim("shims/empty.js")
    );
  }
};



//Build configuration for browser bundle
const buildOptions = {
    entryPoints: ['./index.js'],
    bundle: true,
    globalName: 'MiiJS',
    outfile: './dist/miijs.browser.js',
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    sourcemap: true,
    minify: !isServe,
    define: {
        'process.versions': 'undefined',
    },
    plugins: [nodeShimPlugin],
    loader: {
        '.json': 'json'
    },
    inject: [path.resolve(__dirname, "shims/globals.browser.js")],
    external: ["jsdom", "canvas", "pngjs", "jpeg-js", "is-png", "is-jpg"]
};
// Also build an ESM version
const esmBuildOptions = {
    ...buildOptions,
    outfile: './dist/miijs.browser.esm.js',
    format: 'esm',
    globalName: undefined
};

//Build config for CJS exports
const nodeCjsBuildOptions = {
  entryPoints: ["./index.js"],
  bundle: true,
  outfile: "./dist/miijs.cjs",
  format: "cjs",
  platform: "node",
  target: ["node20"],
  sourcemap: true,
  minify: !isServe,
  external:["canvas","jsdom","webgpu"],
  footer: {
    js: "if (module.exports && module.exports.default) { module.exports = module.exports.default; module.exports.default = module.exports; }"
  }
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

        // Build Node CJS version
        await esbuild.build(nodeCjsBuildOptions);
        console.log("✓ Built dist/miijs.cjs (Node CJS)");

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
