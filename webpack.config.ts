import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import type { Configuration } from "webpack";
import "webpack-dev-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = (_env: Record<string, never>, argv: Record<string, string>): Configuration => {
	const isProduction = argv.mode === "production";
	const outFile = isProduction ? "bcma.js" : "bcma.dev.js";

	return {
		entry: "./src/index.ts",
		mode: isProduction ? "production" : "development",
		output: {
			filename: outFile,
			path: path.resolve(__dirname, "dist"),
		},
		resolve: {
			extensions: [".ts", ".js"],
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					use: "ts-loader",
					exclude: /node_modules/,
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				BCMA_VERSION: JSON.stringify(process.env.BCMA_VERSION ?? "dev"),
			}),
		],
		devServer: {
			static: path.join(__dirname, "dist"),
			port: 8080,
			hot: true,
			devMiddleware: {
				publicPath: "/",
			},
		},
		devtool: isProduction ? false : "source-map",
	};
};

export default config;
