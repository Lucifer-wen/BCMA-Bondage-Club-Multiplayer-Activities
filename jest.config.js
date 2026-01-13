/** @type {import('jest').Config} */
const config = {
	preset: "ts-jest",
	testEnvironment: "node",
	rootDir: "./",
	testMatch: ["<rootDir>/test/**/*.test.ts"]
};

export default config;
