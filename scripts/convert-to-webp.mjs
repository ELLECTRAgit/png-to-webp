#!/usr/bin/env node

import { execFile, exec } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

const VERSION = '2.1.1'

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg'])
const DEFAULT_QUALITIES = [90, 80, 75]
const DEFAULT_EXCLUDES = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'coverage',
  '.turbo',
  'build',
  '.cache',
])

const TEXT_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.mdx',
  '.css',
  '.scss',
  '.html',
  '.yml',
  '.yaml',
])

const CWEBP_INSTALL_HINT = `Установите libwebp — в PATH должна появиться утилита cwebp:

  Windows:  choco install libwebp   или   scoop install webp
  macOS:    brew install webp
  Linux:    sudo apt install webp   /   sudo dnf install libwebp-tools

Скачать: https://developers.google.com/speed/webp/download

После установки:
  1. Закройте и откройте терминал (или Cursor) заново
  2. Проверьте: cwebp -version
  3. Или: node scripts/convert-to-webp.mjs --check`

function printCwebpMissingError() {
  console.error('Не найден cwebp (libwebp) в PATH.\n')
  console.error(CWEBP_INSTALL_HINT)
}

async function findCwebpInPath() {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('where cwebp', {
        shell: true,
        windowsHide: true,
      })
      const line = stdout.trim().split(/\r?\n/).find((l) => l.trim())
      return line?.trim() || null
    }
    const { stdout } = await execAsync('command -v cwebp 2>/dev/null || which cwebp', {
      shell: true,
    })
    return stdout.trim() || null
  } catch {
    return null
  }
}

async function resolveCwebp() {
  const pathHit = await findCwebpInPath()
  const candidates = []
  if (pathHit) candidates.push(pathHit)
  if (process.platform === 'win32') {
    candidates.push('cwebp.exe', 'cwebp')
  } else {
    candidates.push('cwebp')
  }

  const tried = new Set()
  for (const cmd of candidates) {
    if (!cmd || tried.has(cmd)) continue
    tried.add(cmd)
    try {
      const { stdout, stderr } = await execFileAsync(cmd, ['-version'])
      const versionLine = `${stdout || stderr}`.trim().split(/\r?\n/)[0]
      return { cmd, resolvedPath: pathHit || cmd, version: versionLine }
    } catch {
      // try next
    }
  }

  printCwebpMissingError()
  process.exit(1)
}

function printHelp() {
  console.log(`convert-to-webp v${VERSION} — PNG/JPG → WebP (через cwebp)

Использование:
  node scripts/convert-to-webp.mjs <путь...> [опции]

Требуется: cwebp (libwebp) в PATH, Node.js 18+

Аргументы:
  <путь...>              файл(ы) или папка(и) с .png/.jpg/.jpeg

Опции:
  --quality <n>          одно качество (без лестницы), например 90
  --qualities <list>     лестница через запятую, по умолчанию 90,80,75
  --no-lossless          не пробовать lossless, если lossy всё ещё больше исходника
  --keep-if-larger       оставить WebP даже если он больше исходника
  --delete-originals     удалить исходный PNG/JPG после успешной конвертации
  --require-ref-update   с --delete-originals: не удалять, если --replace-in
                         не нашёл ссылок на этот файл в коде
  --replace-in <dir>     заменить пути в текстовых файлах под dir
  --exclude <list>       пропускать папки при обходе (через запятую)
  --json                 вывести отчёт в JSON (в stdout)
  --report <file>        сохранить отчёт в JSON-файл
  --check                проверить cwebp в PATH и выйти
  --dry-run              только показать план, ничего не писать/не удалять
  --help                 эта справка

Примеры:
  node scripts/convert-to-webp.mjs public/images/hero.png --dry-run
  node scripts/convert-to-webp.mjs public/images --delete-originals --replace-in src
`)
}

function parseExcludeList(raw) {
  if (!raw) return new Set(DEFAULT_EXCLUDES)
  const merged = new Set(DEFAULT_EXCLUDES)
  for (const part of raw.split(',')) {
    const name = part.trim()
    if (name) merged.add(name)
  }
  return merged
}

function parseArgs(argv) {
  const targets = []
  const opts = {
    qualities: [...DEFAULT_QUALITIES],
    tryLossless: true,
    keepIfLarger: false,
    deleteOriginals: false,
    requireRefUpdate: false,
    replaceIn: null,
    excludes: new Set(DEFAULT_EXCLUDES),
    dryRun: false,
    json: false,
    reportPath: null,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    if (arg === '--dry-run') {
      opts.dryRun = true
      continue
    }
    if (arg === '--json') {
      opts.json = true
      continue
    }
    if (arg === '--delete-originals') {
      opts.deleteOriginals = true
      continue
    }
    if (arg === '--require-ref-update') {
      opts.requireRefUpdate = true
      continue
    }
    if (arg === '--keep-if-larger') {
      opts.keepIfLarger = true
      continue
    }
    if (arg === '--no-lossless') {
      opts.tryLossless = false
      continue
    }
    if (arg === '--quality') {
      const value = Number(argv[++i])
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error('--quality должен быть числом 0–100')
      }
      opts.qualities = [value]
      opts.tryLossless = false
      continue
    }
    if (arg === '--qualities') {
      const raw = argv[++i]
      if (!raw) throw new Error('--qualities нужен список, например 90,80,75')
      opts.qualities = raw.split(',').map((part) => {
        const n = Number(part.trim())
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          throw new Error(`Некорректное качество: ${part}`)
        }
        return n
      })
      continue
    }
    if (arg === '--exclude') {
      const raw = argv[++i]
      if (!raw) throw new Error('--exclude нужен список папок через запятую')
      opts.excludes = parseExcludeList(raw)
      continue
    }
    if (arg === '--replace-in') {
      const dir = argv[++i]
      if (!dir) throw new Error('--replace-in нужен путь к папке')
      opts.replaceIn = path.resolve(dir)
      continue
    }
    if (arg === '--report') {
      const file = argv[++i]
      if (!file) throw new Error('--report нужен путь к файлу')
      opts.reportPath = path.resolve(file)
      continue
    }
    if (arg.startsWith('-')) {
      throw new Error(`Неизвестная опция: ${arg}`)
    }
    targets.push(path.resolve(arg))
  }

  if (targets.length === 0) {
    printHelp()
    process.exit(1)
  }

  if (opts.requireRefUpdate && !opts.replaceIn) {
    throw new Error('--require-ref-update работает только вместе с --replace-in')
  }

  return { targets, opts }
}

function shouldSkipDir(name, excludes) {
  return excludes.has(name)
}

async function collectImages(targets, excludes) {
  const files = []

  async function walk(entry) {
    const stat = await fs.stat(entry)
    if (stat.isDirectory()) {
      const kids = await fs.readdir(entry)
      for (const kid of kids) {
        if (shouldSkipDir(kid, excludes)) continue
        await walk(path.join(entry, kid))
      }
      return
    }
    const ext = path.extname(entry).toLowerCase()
    if (IMAGE_EXTS.has(ext)) files.push(entry)
  }

  for (const target of targets) {
    await walk(target)
  }

  return [...new Set(files)].sort()
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function tempWebpPath() {
  return path.join(os.tmpdir(), `png-to-webp-${randomBytes(8).toString('hex')}.webp`)
}

async function runCwebp(cwebpCmd, inputPath, outputPath, { lossless, quality }) {
  const args = lossless
    ? ['-lossless', inputPath, '-o', outputPath]
    : ['-q', String(quality), inputPath, '-o', outputPath]
  await execFileAsync(cwebpCmd, args)
  const stat = await fs.stat(outputPath)
  return stat.size
}

async function safeUnlink(filePath) {
  try {
    await fs.unlink(filePath)
  } catch {
    // ignore
  }
}

async function convertOne(cwebpCmd, inputPath, opts) {
  const outPath = inputPath.replace(/\.(png|jpe?g)$/i, '.webp')
  const srcStat = await fs.stat(inputPath)
  const srcSize = srcStat.size

  const attempts = []
  for (const quality of opts.qualities) {
    attempts.push({ label: `q${quality}`, lossless: false, quality })
  }
  if (opts.tryLossless) {
    attempts.push({ label: 'lossless', lossless: true, quality: 100 })
  }

  let best = null
  const tryLog = []
  const tempFiles = []

  try {
    for (const attempt of attempts) {
      const tmpOut = tempWebpPath()
      tempFiles.push(tmpOut)

      try {
        const size = await runCwebp(cwebpCmd, inputPath, tmpOut, attempt)
        const smaller = size < srcSize
        tryLog.push({ label: attempt.label, size, smaller })

        if (!best || size < best.size) {
          best = { ...attempt, size, tempPath: tmpOut }
        }

        if (smaller) break
      } catch (err) {
        await safeUnlink(tmpOut)
        throw new Error(`cwebp (${attempt.label}): ${err.message || err}`)
      }
    }
  } finally {
    for (const tmp of tempFiles) {
      if (best?.tempPath === tmp) continue
      await safeUnlink(tmp)
    }
  }

  const improved = best.size < srcSize
  const shouldWrite = improved || opts.keepIfLarger

  return {
    inputPath,
    outPath,
    srcSize,
    best,
    tryLog,
    improved,
    shouldWrite,
    refsUpdated: false,
    deleted: false,
    deleteSkippedReason: null,
  }
}

function toPosix(p) {
  return p.split(path.sep).join('/')
}

function addPathVariants(relPath, relPathOut, add) {
  if (!relPath || relPath.startsWith('..')) return

  add(relPath, relPathOut)
  add(relPath.replace(/\//g, '\\'), relPathOut.replace(/\//g, '\\'))
  add(`/${relPath}`, `/${relPathOut}`)
  add(`./${relPath}`, `./${relPathOut}`)

  const publicMatch = relPath.match(/^public\/(.+)$/i)
  if (!publicMatch) return

  const urlPath = publicMatch[1]
  const urlPathOut = relPathOut.replace(/^public\//i, '')
  add(`/${urlPath}`, `/${urlPathOut}`)
  add(urlPath, urlPathOut)
  add(`./${urlPath}`, `./${urlPathOut}`)
  add(urlPath.replace(/\//g, '\\'), urlPathOut.replace(/\//g, '\\'))
}

function buildReplacementPatterns(inputPath, outPath, replaceRoot, cwd) {
  const patterns = []
  const seen = new Set()

  function add(from, to) {
    if (!from || from === to || seen.has(from)) return
    seen.add(from)
    patterns.push({ from, to })
  }

  const relCwd = toPosix(path.relative(cwd, inputPath))
  const relCwdOut = toPosix(path.relative(cwd, outPath))
  addPathVariants(relCwd, relCwdOut, add)

  if (replaceRoot) {
    const relRoot = toPosix(path.relative(replaceRoot, inputPath))
    const relRootOut = toPosix(path.relative(replaceRoot, outPath))
    addPathVariants(relRoot, relRootOut, add)
  }

  return patterns
}

async function collectTextFiles(rootDir, excludes) {
  const files = []

  async function walk(entry) {
    const stat = await fs.stat(entry)
    if (stat.isDirectory()) {
      const name = path.basename(entry)
      if (shouldSkipDir(name, excludes)) return
      const kids = await fs.readdir(entry)
      for (const kid of kids) await walk(path.join(entry, kid))
      return
    }
    if (TEXT_EXTS.has(path.extname(entry).toLowerCase())) {
      files.push(entry)
    }
  }

  await walk(rootDir)
  return files
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function replaceRefs(replaceRoot, conversions, opts, cwd) {
  if (!replaceRoot || conversions.length === 0) {
    return { changedFiles: [], hitsByInput: new Map() }
  }

  const perFile = conversions.map((conv) => ({
    inputPath: conv.inputPath,
    patterns: buildReplacementPatterns(conv.inputPath, conv.outPath, replaceRoot, cwd),
    hitCount: 0,
  }))

  const textFiles = await collectTextFiles(replaceRoot, opts.excludes)
  const changedFiles = []

  for (const file of textFiles) {
    let content = await fs.readFile(file, 'utf8')
    let next = content
    let fileChanged = false

    for (const item of perFile) {
      for (const { from, to } of item.patterns) {
        const re = new RegExp(escapeRegExp(from), 'g')
        const matches = next.match(re)
        if (matches?.length) {
          item.hitCount += matches.length
          next = next.replace(re, to)
          fileChanged = true
        }
      }
    }

    if (fileChanged && next !== content) {
      changedFiles.push(file)
      if (!opts.dryRun) await fs.writeFile(file, next, 'utf8')
    }
  }

  const hitsByInput = new Map()
  for (const item of perFile) {
    hitsByInput.set(item.inputPath, item.hitCount)
  }

  return { changedFiles, hitsByInput }
}

function log(...args) {
  console.log(...args)
}

function logErr(...args) {
  console.error(...args)
}

function buildReport(results, changedCodeFiles, opts, cwebpCmd) {
  const converted = results.filter((r) => r.shouldWrite)
  const skipped = results.filter((r) => !r.shouldWrite)

  return {
    version: VERSION,
    encoder: 'cwebp',
    cwebp: cwebpCmd,
    dryRun: opts.dryRun,
    summary: {
      total: results.length,
      converted: converted.length,
      skipped: skipped.length,
      refsChangedFiles: changedCodeFiles.length,
      deleted: converted.filter((r) => r.deleted).length,
    },
    options: {
      qualities: opts.qualities,
      tryLossless: opts.tryLossless,
      deleteOriginals: opts.deleteOriginals,
      requireRefUpdate: opts.requireRefUpdate,
      replaceIn: opts.replaceIn,
      excludes: [...opts.excludes],
    },
    files: results.map((r) => ({
      input: r.inputPath,
      output: r.outPath,
      status: r.shouldWrite ? 'ok' : 'skip',
      srcSize: r.srcSize,
      outSize: r.best.size,
      mode: r.best.label,
      improved: r.improved,
      attempts: r.tryLog.map((t) => ({
        label: t.label,
        size: t.size,
        smaller: t.smaller,
      })),
      refsUpdated: r.refsUpdated,
      refsHitCount: r.refsHitCount ?? 0,
      deleted: r.deleted,
      deleteSkippedReason: r.deleteSkippedReason,
    })),
    changedCodeFiles,
  }
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.some((a) => a === '--help' || a === '-h')) {
    printHelp()
    process.exit(0)
  }

  if (argv.some((a) => a === '--check')) {
    const cwebp = await resolveCwebp()
    console.log(`OK: cwebp в PATH`)
    console.log(`  путь: ${cwebp.resolvedPath}`)
    if (cwebp.version) console.log(`  ${cwebp.version}`)
    process.exit(0)
  }

  const cwebpInfo = await resolveCwebp()
  const cwebpCmd = cwebpInfo.cmd
  const cwd = process.cwd()
  const { targets, opts } = parseArgs(argv)
  const images = await collectImages(targets, opts.excludes)

  if (images.length === 0) {
    logErr('Не найдено PNG/JPG по указанным путям.')
    process.exit(1)
  }

  if (!opts.json) {
    log(`convert-to-webp v${VERSION} (cwebp)`)
    log(`Найдено изображений: ${images.length}`)
    if (opts.dryRun) log('Режим: dry-run (без записи)')
    log(`Качества: ${opts.qualities.join(', ')}${opts.tryLossless ? ' + lossless' : ''}`)
  }

  const results = []
  for (const inputPath of images) {
    const result = await convertOne(cwebpCmd, inputPath, opts)
    results.push(result)

    if (!opts.json) {
      const delta = result.best.size - result.srcSize
      const deltaStr = `${delta >= 0 ? '+' : ''}${formatBytes(Math.abs(delta))}${delta >= 0 ? ' больше' : ' меньше'}`
      const tries = result.tryLog
        .map((t) => `${t.label}=${formatBytes(t.size)}${t.smaller ? '*' : ''}`)
        .join(', ')

      if (!result.shouldWrite) {
        log(`SKIP  ${inputPath}`)
        log(
          `      исходник ${formatBytes(result.srcSize)} → лучший WebP ${formatBytes(result.best.size)} (${deltaStr})`
        )
        log(`      попытки: ${tries}`)
        log(`      WebP больше исходника — не пишем (добавь --keep-if-larger чтобы сохранить)`)
        if (result.best.tempPath) await safeUnlink(result.best.tempPath)
        continue
      }

      log(`OK    ${inputPath}`)
      log(
        `      ${formatBytes(result.srcSize)} → ${formatBytes(result.best.size)} (${deltaStr}), режим ${result.best.label}`
      )
      log(`      попытки: ${tries}`)
      log(`      → ${result.outPath}`)
    }

    if (!opts.dryRun && result.shouldWrite) {
      await fs.copyFile(result.best.tempPath, result.outPath)
    }
    if (result.best.tempPath) {
      await safeUnlink(result.best.tempPath)
    }
  }

  const written = results.filter((r) => r.shouldWrite)
  let changedCodeFiles = []

  if (opts.replaceIn && written.length > 0) {
    const { changedFiles, hitsByInput } = await replaceRefs(
      opts.replaceIn,
      written,
      opts,
      cwd
    )
    changedCodeFiles = changedFiles

    for (const result of written) {
      const hits = hitsByInput.get(result.inputPath) ?? 0
      result.refsHitCount = hits
      result.refsUpdated = hits > 0
    }

    if (!opts.json) {
      log('')
      log(`Замена путей в: ${opts.replaceIn}`)
      if (changedFiles.length === 0) {
        log('  совпадений путей в коде не найдено')
      } else {
        for (const file of changedFiles) {
          log(`  ${opts.dryRun ? 'будет изменён' : 'изменён'}: ${file}`)
        }
      }
    }
  }

  if (opts.deleteOriginals) {
    for (const result of written) {
      if (!result.shouldWrite) continue

      if (opts.requireRefUpdate && opts.replaceIn && !result.refsUpdated) {
        result.deleteSkippedReason = 'no_refs_found'
        if (!opts.json) {
          log(`      исходник не удалён: ссылки в коде не найдены (--require-ref-update)`)
        }
        continue
      }

      if (!opts.dryRun) {
        await fs.unlink(result.inputPath)
      }
      result.deleted = true
      if (!opts.json) {
        log(`      ${opts.dryRun ? 'будет удалён' : 'удалён'} исходник`)
      }
    }
  }

  const report = buildReport(results, changedCodeFiles, opts, cwebpInfo.resolvedPath)

  if (opts.reportPath) {
    await fs.writeFile(opts.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    log('')
    log(
      `Итого: ${report.summary.converted} конвертировано, ${report.summary.skipped} пропущено` +
        (opts.dryRun ? ' (dry-run)' : '')
    )
    if (opts.reportPath) {
      log(`Отчёт: ${opts.reportPath}`)
    }
  }

  if (report.summary.skipped > 0 && !opts.keepIfLarger) {
    process.exitCode = 2
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
