module.exports = {
  root: true,
  env: {
    browser: true
  },
  parser: "@typescript-eslint/parser",
  extends: '@react-native',
  rules: {
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error"
  },
  parserOptions: {
    project: "./tsconfig.json"
  },
};
