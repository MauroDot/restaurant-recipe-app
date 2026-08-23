const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    ignores: ["lib/**", "eslint.config.js"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
    },
  }
);
