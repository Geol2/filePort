import { defineConfig } from 'vite';
import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';

// 가독성용(비압축) 빌드 설정.
// 메인 빌드(vite.config.ts)가 압축본 + 타입선언을 먼저 생성한 뒤,
// 이 설정으로 minify를 끈 filePort.dev.js 를 같은 dist 폴더에 추가한다.
export default defineConfig({
    build: {
        lib: {
            entry:    resolve(__dirname, 'src/filePort.ts'),
            name:     'FilePort',
            fileName: 'filePort.dev',           // 출력: dist/filePort.dev.js, dist/filePort.dev.iife.js
            formats:  ['es', 'iife'],           // 비압축 ESM + 비압축 IIFE(바닐라에서 읽기용)
        },

        minify:      false,                     // 변수명·들여쓰기 보존 (핵심)
        emptyOutDir: false,                     // 메인 빌드 산출물을 지우지 않음

        rollupOptions: {
            plugins: [commonjs()],
            output: {
                assetFileNames: 'filePort.dev.[ext]',  // 배포용 filePort.css 를 덮어쓰지 않도록 분리
            },
        },

        outDir: 'dist',
    },
});
