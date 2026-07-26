#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$MinNodeMajor = 18
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-NodeMajor {
  $version = (node -p "process.versions.node" 2>$null)
  if (-not $version) { return $null }
  return [int]($version.Split('.')[0])
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Ошибка: Node.js не найден. Нужен Node.js ${MinNodeMajor}+." -ForegroundColor Red
  Write-Host "Скачать: https://nodejs.org/"
  exit 1
}

$nodeMajor = Get-NodeMajor
if ($null -eq $nodeMajor -or $nodeMajor -lt $MinNodeMajor) {
  Write-Host "Ошибка: нужен Node.js ${MinNodeMajor}+." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "Ошибка: pnpm не найден." -ForegroundColor Red
  Write-Host "Установка: npm install -g pnpm"
  exit 1
}

Set-Location $ScriptDir
pnpm install

Write-Host ""
Write-Host "Готово."
Write-Host "Папка скила: $ScriptDir"
Write-Host ""
Write-Host "Проверка:"
Write-Host "  node scripts/convert-to-webp.mjs --help"
