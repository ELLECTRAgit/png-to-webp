# PNG → WebP (Cursor skill)

Репозиторий: https://github.com/ELLECTRAgit/png-to-webp

Скрипт и Cursor skill для конвертации PNG/JPG в WebP. Работает на Windows, macOS и Linux через Node.js и [sharp](https://sharp.pixelplumbing.com/) — системный `cwebp` не нужен.

## Что умеет

- Конвертирует `.png`, `.jpg`, `.jpeg` в `.webp`
- Подбирает качество: **90 → 80 → 75 → lossless**, если предыдущий вариант тяжелее исходника
- Не пишет WebP, если даже лучший вариант больше исходника (можно переопределить)
- Заменяет пути в коде (`--replace-in`) — по **относительным путям**, не только по имени файла
- Удаляет исходники после конвертации (с опциональной проверкой ссылок в коде)
- Отчёт в JSON для агента или CI (`--json`, `--report`)

## Требования

- **Node.js 18+**
- **pnpm** (`npm install -g pnpm`)

## Установка

### 1. Клонировать в папку Cursor skills

**macOS / Linux:**

```bash
git clone https://github.com/ELLECTRAgit/png-to-webp.git ~/.cursor/skills/png-to-webp
cd ~/.cursor/skills/png-to-webp
chmod +x install.sh
./install.sh
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/ELLECTRAgit/png-to-webp.git $env:USERPROFILE\.cursor\skills\png-to-webp
cd $env:USERPROFILE\.cursor\skills\png-to-webp
.\install.ps1
```

### 2. Проверка

```bash
node scripts/convert-to-webp.mjs --help
```

Должна появиться справка с версией `v1.0.0`.

## Использование

Команды ниже — для **ручного** запуска в терминале. Если работаете через Cursor, проще описать задачу в чате — см. раздел [Через Cursor (агент)](#через-cursor-агент).

Запускайте из **корня своего проекта** (не из папки скила), чтобы относительные пути совпадали с кодом.

### Один файл (сначала dry-run)

```bash
node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs public/images/hero.png --dry-run
```

На Windows:

```powershell
node $env:USERPROFILE\.cursor\skills\png-to-webp\scripts\convert-to-webp.mjs public\images\hero.png --dry-run
```

### Папка + замена путей в `src`

```bash
node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs public/images --replace-in src
```

### Полный цикл: конвертация + код + удаление исходников

```bash
node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs public/images \
  --delete-originals \
  --replace-in src \
  --require-ref-update \
  --report report.json
```

`--require-ref-update` — не удалять PNG/JPG, если в `src` не нашлось ссылок на этот файл.

### Фиксированное качество (как `cwebp -q 90`)

```bash
node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs icon.png --quality 90
```

### JSON-отчёт (для агента / автоматизации)

```bash
node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs public/images --json
node ~/.cursor/skills/png-to-webp/scripts/convert-to-webp.mjs public/images --report report.json
```

## Опции

| Опция | Описание |
| --- | --- |
| `--dry-run` | Показать план без записи и удаления |
| `--quality N` | Одно качество, без лестницы |
| `--qualities 90,80,75` | Своя лестница качества |
| `--no-lossless` | Не пробовать lossless |
| `--keep-if-larger` | Писать WebP даже если больше исходника |
| `--delete-originals` | Удалить PNG/JPG после успешной конвертации |
| `--require-ref-update` | С `--delete-originals`: не удалять, если ссылки в коде не найдены |
| `--replace-in <dir>` | Заменить пути в текстовых файлах под папкой |
| `--also-replace-basename` | Дополнительно заменять только имя файла (осторожно: возможны ложные срабатывания) |
| `--exclude <list>` | Пропускать папки при обходе (по умолчанию: `node_modules`, `.git`, `dist`, `.next`, …) |
| `--json` | Вывести отчёт в stdout |
| `--report <file>` | Сохранить отчёт в JSON-файл |

## Логика качества

1. Пробует **q90** (обычно для фото и UI с текстом).
2. Если WebP **больше** исходника → **q80**, потом **q75**.
3. Если всё ещё больше → **lossless** (палитровые PNG, иконки).
4. Если лучший вариант всё равно тяжелее — файл **пропускается** (код выхода `2`).

## Замена путей в коде

По умолчанию ищет **относительные пути** от текущей папки и от `--replace-in`:

- `public/images/hero.png` → `public/images/hero.webp`
- `./public/images/hero.png` → `./public/images/hero.webp`
- варианты с `\` для Windows

Имя файла без пути (`hero.png`) **не** заменяется по умолчанию — добавьте `--also-replace-basename`, если в коде только короткие имена.

## Через Cursor (агент)

После установки в `~/.cursor/skills/png-to-webp` агент читает `SKILL.md` и сам запускает скрипт. **Писать команды в терминал не обязательно** — достаточно описать задачу словами в чате (режим **Agent**).

Слово **png-to-webp** в начале запроса помогает агенту точнее подхватить скил.

### Примеры запросов

**Один файл, сначала без изменений:**

> png-to-webp: конверти `public/images/pen.png` в WebP. Сначала dry-run, ничего не меняй.

**Папка целиком:**

> Конверти все PNG в `public/images/categories` в WebP.

**С заменой путей в коде:**

> Конверти картинки в `public/images/ads` в WebP и замени пути в `src`.

**Полный цикл (конвертация + код + удаление исходников):**

> png-to-webp: конверти `public/images`, замени пути в `src`, удали исходные PNG только если ссылки в коде нашлись. Сначала покажи dry-run.

**Фиксированное качество:**

> Конверти `public/images/push-icon.png` в WebP с качеством 90, без автоподбора.

**С отчётом:**

> Оптимизируй картинки в `public/images/express-auctions`, сохрани отчёт в `report.json`.

**Если в коде только имя файла без пути:**

> Конверти `public/images/hero.png` в WebP, замени в `src`, включи замену по имени файла.

### Как просить опции — человеческим языком

Флаги из терминала писать не нужно — скажите, что хотите получить:

| Что нужно | Как сказать агенту |
| --- | --- |
| Только посмотреть план | «сначала dry-run» / «ничего не меняй, только покажи» |
| Править импорты в коде | «замени пути в src» |
| Удалить PNG после конвертации | «удали исходники» |
| Безопасное удаление | «удали PNG только если ссылка в коде обновилась» |
| Сохранить WebP даже если больше | «сохрани webp даже если файл станет больше» |
| Отчёт в файл | «сохрани отчёт в report.json» |
| Одно качество | «качество 90» |
| Без lossless | «без lossless» |

### Что агент сделает сам

- Запустит скрипт из `~/.cursor/skills/png-to-webp`
- Работает из корня вашего проекта
- Перед массовым удалением покажет dry-run или список файлов
- Объяснит результат: что сжалось, что пропущено и почему
- Не закоммитит изменения без вашей просьбы

### Если не сработало

1. Скил не установлен или не выполнен `pnpm install` (ошибка «Не найден sharp»).
2. Вы в режиме **Ask** — агент только отвечает, скрипт не запускает. Нужен **Agent**.
3. Явно упомяните задачу: «конверти в webp», «png-to-webp».

## Коды выхода

| Код | Значение |
| --- | --- |
| `0` | Всё ок |
| `1` | Ошибка (нет файлов, нет sharp, неверные аргументы) |
| `2` | Часть файлов пропущена (WebP больше исходника) |

## Обновление

```bash
cd ~/.cursor/skills/png-to-webp
git pull
pnpm install
```

## Структура репозитория

```
png-to-webp/
├── SKILL.md              # инструкции для Cursor-агента
├── README.md             # эта документация
├── package.json
├── install.sh            # установка зависимостей (Unix)
├── install.ps1           # установка зависимостей (Windows)
└── scripts/
    └── convert-to-webp.mjs
```

## Лицензия

Внутренний инструмент — используйте в своих проектах по договорённости в команде.
