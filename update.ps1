#!/usr/bin/env pwsh
# Обновление страниц троллейбусов и пуш в репозиторий

Set-Location $PSScriptRoot

Write-Host "Скачивание изменений с GitHub..." -ForegroundColor Cyan
git pull origin main --rebase
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при pull!" -ForegroundColor Red
    exit 1
}

Write-Host "Запуск generate_trolleybus_pages.py..." -ForegroundColor Cyan
python generate_trolleybus_pages.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка выполнения Python-скрипта!" -ForegroundColor Red
    exit 1
}

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "Изменений нет." -ForegroundColor Yellow
    exit 0
}

Write-Host "Обнаружены изменения:" -ForegroundColor Green
Write-Host $changes

git add -A
git commit -m "auto: обновление страниц троллейбусов $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main
Write-Host "Готово!" -ForegroundColor Green
