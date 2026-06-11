import { defineConfig } from 'vite';
import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';

// [비압축본 / IIFE] 빌드 — dist/dev
//   디버깅·코드 읽기용. 압축본과 동일하게 <script src> 하나로 동작하지만
//   minify를 꺼서 변수명·들여쓰기·#private 문법을 원본 소스처럼 보존한다.
export default defineConfig({
    build: {
        lib: {
            entry:    resolve(__dirname, 'src/filePort.ts'),
            name:     'FilePort',               // window.FilePort
            fileName: 'filePort',               // dist/dev/filePort.iife.js
            formats:  ['iife'],
        },

        minify:      false,                     // 변수명·들여쓰기 보존 (핵심)
        target:      'esnext',                  // #private 등 네이티브 문법 유지 → __privateGet 헬퍼 제거
        outDir:      'dist/dev',
        emptyOutDir: true,

        rollupOptions: {
            plugins: [commonjs()],
            output: {
                assetFileNames: 'filePort.[ext]',  // dist/dev/filePort.css
            },
        },
    },
});
