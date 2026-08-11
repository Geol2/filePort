import { defineConfig } from 'vite';
import commonjs from '@rollup/plugin-commonjs';

// [압축본 / IIFE] 빌드 — dist/min
//   바닐라 HTML 배포용. <script src="dist/min/filePort.iife.js"> 하나로 동작.
//   전역 window.FilePort 노출, 용량 최소화(minify).
export default defineConfig({
    build: {
        lib: {
            entry:    'src/filePort.ts',
            name:     'FilePort',               // window.FilePort
            fileName: 'filePort',               // dist/min/filePort.iife.js
            formats:  ['iife'],
        },

        minify:      true,
        target:      'esnext',
        outDir:      'dist/min',
        emptyOutDir: true,

        rollupOptions: {
            plugins: [commonjs()],
            output: {
                assetFileNames: 'filePort.[ext]',  // dist/min/filePort.css
            },
        },
    },
});
