module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",

    "^.+/supabaseClient(.js)?$": "<rootDir>/__mocks__/supabaseClient.js",
    "^.+/lib/ticketmaster(.js)?$": "<rootDir>/__mocks__/ticketmaster.js",
  },
  setupFiles: ["<rootDir>/jest.polyfills.js"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.cjs"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
