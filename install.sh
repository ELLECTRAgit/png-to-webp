#!/usr/bin/env bash
set -euo pipefail

MIN_NODE_MAJOR=18
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Ошибка: Node.js не найден. Нужен Node.js ${MIN_NODE_MAJOR}+."
  echo "Скачать: https://nodejs.org/"
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  echo "Ошибка: нужен Node.js ${MIN_NODE_MAJOR}+, сейчас $(node -v)"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Ошибка: pnpm не найден."
  echo "Установка: npm install -g pnpm"
  exit 1
fi

cd "$SCRIPT_DIR"
pnpm install

echo ""
echo "Готово."
echo "Папка скила: $SCRIPT_DIR"
echo ""
echo "Проверка:"
echo "  node scripts/convert-to-webp.mjs --help"
