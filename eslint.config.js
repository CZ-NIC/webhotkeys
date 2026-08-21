const globals = require("globals")

module.exports = [
    {
        files: ["**/*.js"],
        ignores: ["WebHotkeys.min.js"],
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
