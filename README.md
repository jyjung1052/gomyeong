# 고명 3D (gomyeong)

온라인 3D 명상센터. 로그인(이름) → 하얀 방의 문 7개 → 바다·숲·호숫가·계곡·산·동굴·원두막에서 걷고, 앉고, 눕고, 소리를 들으며 명상합니다.

- 배포: GitHub Pages — https://jyjung1052.github.io/gomyeong/ (main 에 push 하면 자동 배포)
- 세션: 서버 없이 쿠키(`gomyeong3d_name`, `gomyeong3d_sid`)로 이름을 기억합니다.
- 빌드: `./scripts/build.sh` → `dist/index.html`
- 테스트: `node src/stub.js`
