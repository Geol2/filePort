import { defineConfig } from 'vite';
import commonjs from '@rollup/plugin-commonjs';

// [비압축본 / IIFE] 빌드 — dist/dev
//   디버깅·코드 읽기용 + 레거시(jQuery.html() 주입) 호환용.
//   압축본과 동일하게 <script src> 하나로 동작하지만 minify를 꺼서
//   변수명·들여쓰기·#private 문법을 원본 소스처럼 보존한다.
//
//   ★ 왜 ESM 이 아니라 IIFE 인가:
//     dWorks 는 화면을 $.ajax + jQuery.html() 로 주입한다. 이때 주입된 조각 안의
//     외부 classic 스크립트(<script src>)는 jQuery 가 동기(_evalUrl, async:false)로
//     실행하지만, <script type="module"> 은 항상 비동기라 조각의 동기 호출부보다
//     늦게 실행된다 → 'FilePort is not defined'. 그래서 전역 window.FilePort 를
//     동기적으로 노출하는 IIFE 가 이 구조에 맞다.
export default defineConfig({
    build: {
        lib: {
            entry:    'src/filePort.ts',
            name:     'FilePort',               // window.FilePort (전역)
            fileName: 'filePort',               // dist/dev/filePort.iife.js
            formats:  ['iife'],
        },

        minify:      false,                     // 변수명·들여쓰기 보존
        cssMinify:   false,                     // CSS 도 원본 그대로 (458줄)
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
