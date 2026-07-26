# PNG → WebP

https://github.com/ELLECTRAgit/png-to-webp

Конвертация PNG/JPG в WebP через **cwebp** (libwebp). Скрипт на Node.js без npm-зависимостей — не трогает `node_modules` проекта.

## Установка

```bash
git clone https://github.com/ELLECTRAgit/png-to-webp.git ~/.cursor/skills/png-to-webp
```

**cwebp** в системе (один раз):

| ОС | Команда |
| --- | --- |
| Windows | `choco install libwebp` или `scoop install webp` |
| macOS | `brew install webp` |
| Linux | `sudo apt install webp` |

Проверка: `cwebp -version` или `node .../convert-to-webp.mjs --check`

## Если cwebp не в PATH

Скрипт при запуске ищет `cwebp` через `where`/`which` и проверяет `cwebp -version`. Если не найден — выводит инструкцию и завершается с кодом `1`.

Что делать:

1. Установить libwebp (таблица выше)
2. **Перезапустить терминал** (или Cursor) — без этого PATH может не обновиться
3. Проверить: `cwebp -version`
4. Проверить скрипт: `node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs --check`

Не ставьте npm-пакеты в проект — нужна только системная утилита.

## Использование

Из **корня проекта**:

```bash
node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs public/images/hero.png --dry-run
```

Windows:

```powershell
node $env:USERPROFILE\.cursor\skills\png-to-webp\scripts\convert-to-webp.mjs public\images\hero.png --dry-run
```

### Частые сценарии

```bash
# папка + замена путей в src
node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs public/images --replace-in src

# полный цикл
node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs public/images \
  --delete-originals --replace-in src --require-ref-update
```

## Опции

| Опция | Описание |
| --- | --- |
| `--dry-run` | План без записи |
| `--quality N` | Одно качество (как `cwebp -q N`) |
| `--qualities 90,80,75` | Своя лестница |
| `--no-lossless` | Без lossless |
| `--keep-if-larger` | Писать WebP даже если больше исходника |
| `--delete-originals` | Удалить PNG/JPG |
| `--require-ref-update` | Не удалять без ссылок в коде |
| `--replace-in src` | Заменить пути в коде |
| `--json` / `--report file.json` | Отчёт |

## Качество

1. `cwebp -q 90` → **80** → **75**, если файл растёт
2. Потом `-lossless`
3. Если всё ещё тяжелее — пропуск (код выхода `2`)

## Пути в коде (Next.js)

- `public/images/hero.png` → `.../hero.webp`
- `/images/hero.png` → `/images/hero.webp`

## Через Cursor

Режим **Agent**, запросы словами:

> png-to-webp: конверти `public/images/ads` в WebP, замени пути в `src`. Сначала dry-run.

Агент **не должен** запускать `npm`/`pnpm` в проекте и **не должен** копировать скрипт в репозиторий.

## Обновление

```bash
cd ~/.cursor/skills/png-to-webp && git pull
```

## Состав репозитория

```
png-to-webp/
├── SKILL.md
├── README.md
└── scripts/
    └── convert-to-webp.mjs
```
