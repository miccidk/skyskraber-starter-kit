import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['dist', '**/*.gen.ts', '**/*.d.ts', '**/*.js', 'vite.config.ts'],
	},
	{
		files: ['**/*.{ts,tsx}'],
		extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
		languageOptions: {
			ecmaVersion: 2020,
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				project: ['./tsconfig.json'],
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
			'simple-import-sort': simpleImportSort,
		},
		rules: {
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			...reactHooks.configs.recommended.rules,
			'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
			'@typescript-eslint/no-deprecated': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true }],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['../*', './*'],
							message:
								'Use absolute imports with @/ prefix instead of relative imports.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/routes/**/*.{ts,tsx}'],
		rules: {
			// TanStack Router file-based routing exports Route + component from same file
			'react-refresh/only-export-components': 'off',
		},
	},
	{
		files: ['src/components/ui/**/*.{ts,tsx}'],
		rules: {
			// Radix UI wrapper components export multiple related items
			'react-refresh/only-export-components': 'off',
		},
	},
	{
		files: ['server/**/*.ts'],
		rules: {
			'no-console': 'off',
			'no-restricted-imports': 'off',
		},
	},
);
