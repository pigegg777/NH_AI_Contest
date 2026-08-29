import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // 공개 스토어프론트는 로그인 없이 누구나 F12 를 열 수 있다. 소스맵을 함께
    // 배포하면 브라우저가 그것을 읽어 압축된 번들을 원본 파일 구조·변수명·
    // 주석까지 그대로 복원해 보여준다. 디버깅이 편해 켜고 싶어지는 설정이라
    // 기본값(false)에 기대지 않고 의도를 남겨 둔다.
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
