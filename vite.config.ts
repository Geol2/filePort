/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        dts({
            include:     ['src/**/*.ts'],
            exclude:     ['src/**/*.d.ts'],
            outDir:      'dist',
            tsconfigPath: './tsconfig.json',
        }),
    ],
    build: {
        lib: {
            entry:    resolve(__dirname, 'src/filePort.ts'),
            name:     'FilePort',               // IIFE 전역 변수명: window.FilePort
            fileName: 'filePort',               // 출력 파일명 접두어
            formats:  ['es', 'iife'],           // ESM + 바닐라(IIFE) 동시 빌드
        },

        rollupOptions: {
            plugins: [commonjs()],
            output: {
                // CSS 파일을 dist/filePort.css 로 출력
                assetFileNames: 'filePort.[ext]',
            },
        },

        outDir: 'dist',
    },

    test: {
        environment: 'jsdom',
        include:     ['src/__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include:  ['src/**/*.ts'],
            exclude:  ['src/**/*.d.ts', 'src/__tests__/**'],
        },
    },
});
