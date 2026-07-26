---
name: png-to-webp
description: >-
  Converts PNG/JPG images to WebP via system cwebp (libwebp).
  Use when the user asks to convert images to WebP, optimize PNG/JPG assets,
  replace .png/.jpg with .webp, or run png-to-webp / convert-to-webp.
disable-model-invocation: true
---

# PNG → WebP

Конвертация через **cwebp** (libwebp). Node — только для скрипта-обёртки. Без npm, без установки пакетов в проект.

## Установка (один раз)

```bash
git clone https://github.com/ELLECTRAgit/png-to-webp.git ~/.cursor/skills/png-to-webp
```

Плюс **cwebp** в системе: Windows `choco install libwebp`, macOS `brew install webp`, Linux `apt install webp`.

Проверка: `cwebp -version` или `node "<skill-root>/scripts/convert-to-webp.mjs" --check`

## Если cwebp не в PATH

Скрипт проверяет PATH (`where`/`which` + `cwebp -version`) при каждом запуске. Если не найден — печатает инструкцию и выходит с кодом `1`.

Пользователю: установить libwebp → перезапустить терминал → `cwebp -version` → `--check`.

Агенту: **не** `npm`/`pnpm` в проекте — только показать инструкцию из README.

## Команда

Из **корня проекта** пользователя:

```bash
node "<skill-root>/scripts/convert-to-webp.mjs" <путь...> [опции]
```

`<skill-root>` = `~/.cursor/skills/png-to-webp` (Windows: `%USERPROFILE%\.cursor\skills\png-to-webp`).

Примеры:

```bash
node "<skill-root>/scripts/convert-to-webp.mjs" public/images/hero.png --dry-run
node "<skill-root>/scripts/convert-to-webp.mjs" public/images --replace-in src --delete-originals --require-ref-update
```

## Логика

- Качество: **q90 → q80 → q75 → lossless**, если WebP тяжелее исходника
- `--replace-in`: пути в коде, в т.ч. Next.js `/images/...` (без `public/`)
- `--require-ref-update`: не удалять PNG без ссылок в коде

## Правила для агента

- **Не** `npm install` / `pnpm install` — ни в проекте, ни в скиле
- **Не** копировать скрипт в репозиторий пользователя
- Только `<skill-root>/scripts/convert-to-webp.mjs`
- Нет cwebp → показать инструкцию по libwebp (README, раздел «Если cwebp не в PATH»), не npm-пакеты
- Перед `--delete-originals` — `--dry-run`
- Не коммить без просьбы
