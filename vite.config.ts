/// <reference types="vitest" />
import { defineConfig } from 'vite';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'vite-plugin-dts';

// [import용 / ESM] 빌드 — dist/esm
//   번들러(Vite/Webpack/React 등)나 <script type="module"> 에서 import 하는 용도.
//   타입 선언(.d.ts)도 이 폴더에 함께 출력한다.
export default defineConfig({
    plugins: [
        dts({
            include:     ['src/**/*.ts'],
            // src/locales 는 내부 모듈(공개 API 타입에 불필요).
            // dist/locales 폴더를 만들지 않아 파일 와처 잠금(EPERM) 문제를 원천 차단한다.
            exclude:     ['src/**/*.d.ts', 'src/locales/**', 'src/__tests__/**'],
            outDir:      'dist/esm',
            tsconfigPath: './tsconfig.json',
        }),
    ],
    build: {
        lib: {
            entry:    'src/filePort.ts',
            name:     'FilePort',
            fileName: 'filePort',               // dist/esm/filePort.js
            formats:  ['es'],                   // ESM 한 벌
        },

        target:      'esnext',                  // #private 등 네이티브 문법 유지
        outDir:      'dist/esm',
        emptyOutDir: true,                      // 자기 폴더만 비움(dist/locales 등 외부는 안 건드림)

        rollupOptions: {
            plugins: [commonjs()],
            output: {
                assetFileNames: 'filePort.[ext]',  // dist/esm/filePort.css
            },
        },
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
