#!/usr/bin/env node
// Builds WebHotkeys.min.js and stamps the version + the SRI hash into README.md.
// Run through `npm run build`; `npm version` calls it automatically, so the snippet
// in README.md can never get out of sync with the file jsDelivr serves.
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const esbuild = require('esbuild')

const root = path.join(__dirname, '..')
const pkg = require(path.join(root, 'package.json'))
const SOURCE = 'WebHotkeys.js'
const TARGET = 'WebHotkeys.min.js'

// NEVER add `bundle: true` here. Without it esbuild keeps the top level scope intact, so
// `class WebHotkeys` stays a global for the plain <script> consumers. Bundling would rename
// it and `new WebHotkeys()` / `window.webHotkeys` would silently disappear.
esbuild.buildSync({
    entryPoints: [path.join(root, SOURCE)],
    outfile: path.join(root, TARGET),
    minify: true,
    charset: "utf8", // keep the ⌘⌥⇧⌃ symbols readable instead of ⌘ escapes
    target: "es2022", // the source uses ||=, ?., #-free classes; do not downlevel
    legalComments: "none",
    banner: { js: `/*! WebHotkeys v${pkg.version} | ${pkg.license} | ${pkg.homepage} */` },
})

const minified = fs.readFileSync(path.join(root, TARGET))
const integrity = "sha384-" + crypto.createHash("sha384").update(minified).digest("base64")

// Rewrite every pinned CDN snippet in README.md: the version tag and the integrity hash at once.
const readmePath = path.join(root, "README.md")
const readme = fs.readFileSync(readmePath, "utf8")
const stamped = readme
    .replace(/WebHotkeys@[0-9]+\.[0-9]+\.[0-9]+/g, `WebHotkeys@${pkg.version}`)
    .replace(/integrity="sha384-[A-Za-z0-9+/=]*"/g, `integrity="${integrity}"`)
if (stamped !== readme) {
    fs.writeFileSync(readmePath, stamped)
}

const gzip = require('zlib').gzipSync(minified).length
console.log(`${TARGET}: ${minified.length} B (${gzip} B gzip)`)
console.log(`integrity: ${integrity}`)
if (!/integrity="sha384-/.test(stamped)) {
    console.error(`WARNING: no integrity attribute found in README.md - the SRI hash was not stamped anywhere`)
    process.exitCode = 1
}
