/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        dts({
            include:     ['src/**/*.ts'],
            // src/locales 는 내부 모듈(공개 API 타입에 불필요).
            // dist/locales 폴더를 만들지 않아 파일 와처 잠금(EPERM) 문제를 원천 차단한다.
            exclude:     ['src/**/*.d.ts', 'src/locales/**'],
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
        // dist 를 통째로 비우지 않는다(같은 파일명은 덮어씀).
        // 과거 빌드가 남긴 잠긴 dist/locales 빈 폴더를 건드리지 않기 위함 — 재부팅하면 사라진다.
        emptyOutDir: false,
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
