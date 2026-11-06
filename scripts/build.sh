#!/usr/bin/env bash
# src/ 의 조각들을 합쳐 단일 파일 dist/index.html 을 만든다.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
{ cat src/b_audio.js; echo "(()=>{"; cat src/c3_core.js src/c3_geo.js src/c3_scenes.js src/c3_sea.js src/c3_rain.js src/c3_valley.js src/c3_field.js src/c3_thunder.js src/c3_bolt.js src/c3_spout.js src/c3_hail.js src/e3_ws.js src/e4_room.js src/d3_main.js src/e5_yell.js src/e6_smash.js src/e7_kick.js src/e8_punch.js; echo "})();"; } > dist/app.js
sed -i "s#__RELAY_URL__#${RELAY_URL:-wss://gomyeong-relay.gomyeong.workers.dev/ws}#" dist/app.js
node --check dist/app.js
{ cat src/a_head.html; echo "<script>"; cat dist/app.js; echo "</script>"; } > dist/index.html
rm -rf dist/snd; cp -r assets/snd dist/snd
VER=$(git rev-parse --short HEAD 2>/dev/null || date +%s)
echo "$VER" > dist/version.txt
sed -i "s#__BUILD__#$VER#" dist/index.html
touch dist/.nojekyll
echo "built dist/index.html ($(wc -c < dist/index.html) bytes)"
