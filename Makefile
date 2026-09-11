# Thin aliases over the npm scripts - `make` is shorter to type, package.json stays the source of truth.
.PHONY: help release build test test-min lint docs clean

help:  ## Show this list
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*##/\t/' | expand -t 12

release:  ## Release: version from the "(unreleased)" heading in CHANGELOG.md, then tag, push, npm publish, docs
	npm run release

build:  ## Build dist/WebHotkeys.min.js (gitignored) and stamp the version + SRI hash into README.md
	npm run build

test:  ## Run the whole suite against the source
	npm test

test-min:  ## Run the whole suite against the minified build
	npm run test:min

lint:  ## Lint
	npm run lint

docs:  ## Serve the mkdocs site locally on http://127.0.0.1:8000
	mkdocs serve

clean:  ## Remove the generated build and the local mkdocs site
	rm -rf dist site
