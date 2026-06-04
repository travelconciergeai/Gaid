import { cpSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'Gaid-Preview-Export');

mkdirSync(out, { recursive: true });
cpSync(dist, join(out, 'app'), { recursive: true });

const launcher = `#!/bin/bash
cd "$(dirname "$0")/app"
echo ""
echo "  Gaid — abrindo preview em http://localhost:8765"
echo "  Feche esta janela ou pressione Ctrl+C para parar."
echo ""
if ! command -v npx >/dev/null 2>&1; then
  echo "Erro: Node.js/npx não encontrado. Instale em https://nodejs.org"
  read -r -p "Pressione Enter para sair..."
  exit 1
fi
(npx --yes serve . -l 8765 >/dev/null 2>&1 &)
sleep 2
open "http://localhost:8765"
wait
`;

writeFileSync(join(out, 'Visualizar Gaid.command'), launcher, { mode: 0o755 });
chmodSync(join(out, 'Visualizar Gaid.command'), 0o755);

writeFileSync(
  join(out, 'LEIA-ME.txt'),
  `GAID — PREVIEW LOCAL
==================

1) Dê duplo clique em "Visualizar Gaid.command"
   (se o Mac bloquear: botão direito → Abrir → Abrir)

2) O navegador abrirá http://localhost:8765

3) Para parar o servidor, feche a janela do Terminal que abrir.

Requisito: Node.js instalado (https://nodejs.org)

Pasta "app/" = build estático gerado por "npm run export:html".
`,
  'utf8'
);

console.log(`Export pronto: ${out}`);
