import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry:    resolve(__dirname, 'src/filePort.js'),
            name:     'FilePort',               // IIFE 전역 변수명: window.FilePort
            fileName: 'filePort',               // 출력 파일명 접두어
            formats:  ['es', 'iife'],           // ESM + 바닐라(IIFE) 동시 빌드
        },

        rollupOptions: {
            // Dropzone은 external — 사용자가 직접 로드
            //   ESM  : import Dropzone from 'dropzone'  (번들에 포함하지 않음)
            //   IIFE : window.Dropzone 전역 변수로 매핑
            external: ['dropzone'],
            output: {
                globals: { dropzone: 'Dropzone' },
            },
        },

        // 출력 디렉토리: dist/
        outDir: 'dist',
    },
});
