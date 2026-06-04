#!/bin/bash
cd "$(dirname "$0")"
if [ ! -f "dist/index.html" ]; then
  echo "Build não encontrado. Gerando..."
  npm run build || {
    echo "Falha no build. Instale Node.js em https://nodejs.org e rode: npm install && npm run build"
    read -r -p "Pressione Enter..."
    exit 1
  }
fi
cd dist
echo ""
echo "  Gaid — abrindo http://localhost:8765"
echo "  Ctrl+C nesta janela para parar"
echo ""
npx --yes serve . -l 8765 &
sleep 2
open "http://localhost:8765"
wait
