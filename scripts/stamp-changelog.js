#!/usr/bin/env node
// Turns the top "# <version> (unreleased)" heading in CHANGELOG.md into "# <version> (YYYY-MM-DD)".
// Runs from the `version` lifecycle only - by then package.json already holds the new version.
'use strict'

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const version = require(path.join(root, 'package.json')).version
const file = path.join(root, 'CHANGELOG.md')
const changelog = fs.readFileSync(file, 'utf8')

const first = changelog.split('\n').find(line => line.startsWith('# '))
const match = /^# ([0-9]+\.[0-9]+\.[0-9]+) \(unreleased\)$/.exec(first || '')
if (!match) {
    console.error(`CHANGELOG.md: the top heading must read "# ${version} (unreleased)", found: ${first}`)
    process.exit(1)
}
// `npm run release` derives the version from this very heading, so they can only disagree when
// someone bumps with a bare `npm version <patch|minor|major>`. Refuse rather than renumber.
if (match[1] !== version) {
    console.error(`CHANGELOG.md describes ${match[1]} but the release is ${version}`
        + ` - fix the heading, or release with \`npm run release\`, which takes the version from it`)
    process.exit(1)
}

const date = new Date().toLocaleDateString("sv")  // sv gives plain YYYY-MM-DD, in the local timezone
fs.writeFileSync(file, changelog.replace(first, `# ${version} (${date})`))
console.log(`CHANGELOG.md: ${version} dated ${date}`)
