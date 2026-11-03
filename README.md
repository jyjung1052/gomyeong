# 고명 3D (gomyeong)

온라인 3D 명상센터. 로그인(이름) → 하얀 방의 문 7개 → 바다·숲·호숫가·계곡·산·동굴·원두막에서 걷고, 앉고, 눕고, 소리를 들으며 명상합니다.

- 배포: GitHub Pages — https://jyjung1052.github.io/gomyeong/ (main 에 push 하면 자동 배포)
- 세션: 서버 없이 쿠키(`gomyeong3d_name`, `gomyeong3d_sid`)로 이름을 기억합니다.
- 빌드: `./scripts/build.sh` → `dist/index.html`
- 테스트: `node src/stub.js`
- 함께 보이기: 내가 운영하는 중계 서버(Cloudflare Workers + Durable Object, `worker/`)에 WebSocket 으로 이름·위치·자세만 올리고 받습니다. 저장하지 않고, 나가면 사라집니다.
  - 서버는 허용한 사이트(`ALLOWED_ORIGINS`)에서 온 접속만 받고, 값 검사·속도 제한(초당 8개)·접속 수 제한(전체 60, IP당 4)을 합니다.
  - 설정: 저장소 Secrets 에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` → `worker/` 변경 시 자동 배포 → 나온 주소(`wss://…workers.dev/ws`)를 저장소 Variables 의 `RELAY_URL` 에 넣고 Pages 를 다시 배포.
- 시험: `node test/relay.test.js`
