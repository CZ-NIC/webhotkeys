#!/usr/bin/env node
// The whole release: `npm run release`. Nothing else to remember, nothing to pass.
//
// The version is not an argument - it is whatever CHANGELOG.md declares at the top as
// "# <version> (unreleased)". Write the entry, pick the number there, and this script does
// the rest: preflight, `npm version` (which rebuilds, restamps README.md, dates the CHANGELOG
// heading and runs the suite against the minified build) and, through `postversion`, the push.
//
// Pushing the tag triggers .github/workflows/release.yml -> npm publish -> jsDelivr serves the
// new version. Pushing main triggers .github/workflows/docs.yml -> GitHub Pages.
'use strict'

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const pkg = require(path.join(root, 'package.json'))

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const die = message => { console.error(`release: ${message}`); process.exit(1) }

// 1. Release exactly what is on origin/main - no local-only commits, no uncommitted edits.
if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main') die('not on the main branch')
if (git('status', '--porcelain')) die('the working tree is dirty - commit or stash first')
git('fetch', '--quiet', 'origin', 'main')
if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) {
    die('main and origin/main differ - pull or push first, so the tag lands on the pushed commit')
}

// 2. The CHANGELOG entry is the one thing written by hand, so it is also what names the version.
const first = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').split('\n').find(l => l.startsWith('# '))
const match = /^# ([0-9]+\.[0-9]+\.[0-9]+) \(unreleased\)$/.exec(first || '')
if (!match) {
    die(`the top CHANGELOG.md heading must read "# <version> (unreleased)" - write the entry first.`
        + `\n        found: ${first}`)
}
const version = match[1]
const asNumbers = v => v.split('.').map(Number)
const [major, minor, patch] = asNumbers(version)
const [oldMajor, oldMinor, oldPatch] = asNumbers(pkg.version)
if (major * 1e6 + minor * 1e3 + patch <= oldMajor * 1e6 + oldMinor * 1e3 + oldPatch) {
    die(`CHANGELOG.md announces ${version}, which is not newer than the current ${pkg.version}`)
}

// 3. `npm version` runs preversion (lint + tests), version (build, README + CHANGELOG stamping,
//    tests against the minified build), commits, tags, then postversion pushes it all.
console.log(`release: ${pkg.version} -> ${version}`)
execFileSync('npm', ['version', version], { cwd: root, stdio: 'inherit' })

const repo = 'https://github.com/CZ-NIC/webhotkeys'
console.log(`\nPushed. Two workflows are now running:`
    + `\n  npm publish   ${repo}/actions/workflows/release.yml`
    + `\n  docs to Pages ${repo}/actions/workflows/docs.yml`
    + `\nThe CDN link goes live once the first one finishes:`
    + `\n  https://cdn.jsdelivr.net/npm/webhotkeys@${version}/WebHotkeys.min.js`)
