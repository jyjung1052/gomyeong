#!/usr/bin/env bash
# src/ 의 조각들을 합쳐 단일 파일 dist/index.html 을 만든다.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
{ cat src/b_audio.js; echo "(()=>{"; cat src/c3_core.js src/c3_geo.js src/c3_scenes.js src/c3_sea.js src/c3_rain.js src/c3_valley.js src/e4_room.js src/d3_main.js; echo "})();"; } > dist/app.js
node --check dist/app.js
{ cat src/a_head.html; echo "<script>"; cat dist/app.js; echo "</script>"; } > dist/index.html
touch dist/.nojekyll
echo "built dist/index.html ($(wc -c < dist/index.html) bytes)"
