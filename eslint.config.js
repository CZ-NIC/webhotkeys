const globals = require("globals")

module.exports = [
    // A config block holding nothing but `ignores` is the global one. `site/` is the local mkdocs
    // build (gitignored, so CI never sees it) and would otherwise drown the report in vendor code.
    { ignores: ["site/", "WebHotkeys.min.js"] },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "script",
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            "no-unused-vars": ["warn", { caughtErrors: "none" }],
            "no-undef": "error",
        },
    },
    {
        files: ["WebHotkeys.mjs", "test/*.mjs"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: { ...globals.node },
        },
    },
]
