import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
{
ignores: [
'node_modules/**',
'release/**',
'dist/**',
'.obsidian/**',
'.yarn/**'
]
},
        {
                files: ['**/*.ts'],
                extends: [js.configs.recommended, ...tseslint.configs.recommended],
                languageOptions: {
                        parserOptions: {
                                projectService: true,
                                tsconfigRootDir: import.meta.dirname
                        }
                },
rules: {
'no-console': 'off',
'@typescript-eslint/no-explicit-any': 'off',
'@typescript-eslint/no-unused-vars': 'off',
'@typescript-eslint/no-unsafe-function-type': 'off'
}
}
);
