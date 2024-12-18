/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  projects: ["<rootDir>/packages/*"],
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
};
