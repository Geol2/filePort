import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        // API 요청을 Express 예제 백엔드(포트 3000)로 프록시
        proxy: {
            '/upload': 'http://localhost:3000',
            '/api':    'http://localhost:3000',
        },
    },
});
