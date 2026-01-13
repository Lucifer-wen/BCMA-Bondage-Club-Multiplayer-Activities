import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-config-prettier";

export default tseslint.config(
	{
		ignores: ["dist", "static", "static_devel", "static_stable"]
	},
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json"
			}
		},
		plugins: {
			"@typescript-eslint": tseslint.plugin
		},
		rules: {
			...tseslint.configs.recommended.rules
		}
	},
	eslintPluginPrettier
);
