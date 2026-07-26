---
name: png-to-webp
description: >-
  Converts PNG/JPG images to WebP via the bundled Node.js sharp script.
  Use when the user asks to convert images to WebP, optimize PNG/JPG assets,
  replace .png/.jpg with .webp, or run png-to-webp / convert-to-webp.
disable-model-invocation: true
---

# PNG → WebP

Конвертация PNG/JPG в WebP через скрипт репозитория (Node.js + **sharp**). Системный `cwebp` не нужен.

## Где лежит скил

После установки коллегой:

- macOS/Linux: `~/.cursor/skills/png-to-webp`
- Windows: `%USERPROFILE%\.cursor\skills\png-to-webp`

Скрипт: `<skill-root>/scripts/convert-to-webp.mjs`

Если папка не найдена — подскажи установку из README репозитория (`git clone` + `install.sh` / `install.ps1`).

## Setup (один раз у пользователя)

```bash
cd ~/.cursor/skills/png-to-webp
pnpm install
```

Или: `./install.sh` (Unix) / `.\install.ps1` (Windows).

## Когда применять

Пользователь просит: конвертировать PNG/JPG в WebP, оптимизировать картинки, заменить расширения в коде, удалить исходники.

## Workflow

1. Уточни: какие файлы/папки, `--replace-in`, `--delete-originals`.
2. Сначала `--dry-run` или `--json` для проверки.
3. Запускай из **корня проекта пользователя** (cwd = корень репо).
4. Покажи отчёт: что сжалось, что пропущено, какие файлы кода изменены.
5. Не коммить без явной просьбы.

## Команда

```bash
node "<skill-root>/scripts/convert-to-webp.mjs" <путь...> [опции]
```

### Типовые вызовы

Проверка:

```bash
node "<skill-root>/scripts/convert-to-webp.mjs" path/to/file.png --dry-run
```

Папка + замена в `src` + удаление с проверкой ссылок:

```bash
node "<skill-root>/scripts/convert-to-webp.mjs" public/images \
  --delete-originals --replace-in src --require-ref-update --report report.json
```

JSON для машинного разбора:

```bash
node "<skill-root>/scripts/convert-to-webp.mjs" public/images --json
```

## Поведение скрипта

1. Lossy **q90** → **q80** → **q75**, если WebP больше исходника.
2. Потом **lossless** (палитровые PNG).
3. По умолчанию не пишет WebP, если лучший вариант тяжелее исходника (`--keep-if-larger` — переопределить).
4. `--replace-in` меняет **относительные пути** в коде, не только имя файла.
5. `--also-replace-basename` — доп. замена по имени (осторожно).
6. `--require-ref-update` + `--delete-originals`: не удалять исходник, если ссылки в `--replace-in` не найдены.
7. По умолчанию пропускает `node_modules`, `.git`, `dist`, `.next` при обходе (`--exclude` для своих папок).

Коды выхода: `0` — ок; `1` — ошибка; `2` — часть файлов пропущена.

## Опции

| Опция | Смысл |
| --- | --- |
| `--dry-run` | Только план |
| `--quality N` | Одно качество |
| `--qualities 90,80,75` | Своя лестница |
| `--no-lossless` | Без lossless |
| `--keep-if-larger` | Писать WebP даже если больше |
| `--delete-originals` | Удалить PNG/JPG |
| `--require-ref-update` | Не удалять без ссылок в коде |
| `--replace-in src` | Заменить пути в тексте |
| `--also-replace-basename` | Замена по имени файла |
| `--exclude a,b,c` | Доп. исключения при обходе |
| `--json` | JSON в stdout |
| `--report file.json` | Сохранить отчёт |

## Правила для агента

- Используй этот скрипт, не ручной `cwebp`.
- Перед `--delete-originals` — dry-run или покажи список.
- С `--delete-originals` предпочитай `--require-ref-update`, если есть `--replace-in`.
- После `--replace-in` проверь grep'ом оставшиеся ссылки на старые расширения.
- Объясняй результат простым языком.
