#!/usr/bin/env pwsh
# Обновление страниц троллейбусов и пуш в репозиторий

Set-Location $PSScriptRoot
$logFile = Join-Path $PSScriptRoot "update.log"

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Log "=== Запуск обновления ==="

Log "Сохранение локальных изменений..."
$stashed = git stash 2>&1 | ForEach-Object { Log "  $_"; $_ }
if ($stashed -match "No local changes") {
    Log "Локальных изменений не было."
} else {
    Log "Изменения сохранены в stash."
}

Log "Скачивание изменений с GitHub..."
git pull origin main --rebase 2>&1 | ForEach-Object { Log "  $_" }
if ($LASTEXITCODE -ne 0) {
    Log "ОШИБКА: git pull вернул $LASTEXITCODE"
    git stash pop 2>&1 | ForEach-Object { Log "  $_" }
    exit 1
}

if ($stashed -notmatch "No local changes") {
    Log "Восстановление локальных изменений..."
    git stash pop 2>&1 | ForEach-Object { Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Log "ОШИБКА: stash pop вернул $LASTEXITCODE (возможны конфликты)"
        exit 1
    }
}

Log "Запуск generate_trolleybus_pages.py..."
python generate_trolleybus_pages.py 2>&1 | ForEach-Object { Log "  $_" }
if ($LASTEXITCODE -ne 0) {
    Log "ОШИБКА: python вернул $LASTEXITCODE"
    exit 1
}

$changes = git status --porcelain
if (-not $changes) {
    Log "Изменений нет."
    exit 0
}

Log "Обнаружены изменения:"
$changes | ForEach-Object { Log "  $_" }

git add -A
git commit -m "auto: обновление страниц троллейбусов $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | ForEach-Object { Log "  $_" }
git push origin main 2>&1 | ForEach-Object { Log "  $_" }
if ($LASTEXITCODE -ne 0) {
    Log "ОШИБКА: git push вернул $LASTEXITCODE"
    exit 1
}

Log "Готово!"
