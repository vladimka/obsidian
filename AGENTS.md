# Obsidian Trolleybus Vault

## What this is

Obsidian vault for a trolleybus depot. A Python script (`generate_trolleybus_pages.py`) reads hand-edited notes and generates per-trolleybus pages.

## Regenerate pages

```
python generate_trolleybus_pages.py
```

Writes to `Троллейбусы/{num}.md`, `Home.md`, `Старые.md`. No other commands needed.

## Deploy flow

`update.ps1` does: `git pull` → run script → `git add -A` → commit → push. Used for automated updates.

## Data sources (Google Keep/)

| File | What it contains |
|------|-----------------|
| `Работа.md` | Tasks (`- [ ]` items) + history entries under date headers (`DD.MM`) |
| `Мониторы.md` | Monitor statuses per trolleybus number |
| `Информаторы.md` | Informator statuses per trolleybus number |

**Do not edit files in `Троллейбусы/`** — they are regenerated and will be overwritten.

## Formatting conventions

- Trolleybus numbers are 3-digit (e.g., `277`, `330`).
- Date format in `Работа.md`: `DD.MM` (no year). Year is hardcoded as 2026 in `_parse_date()` — update when year changes.
- Status artifacts like `^d0188e` are cleaned by `_clean_status()`.
- Monitor/informator status lines match: `<seq>. <number> <status>` (e.g., `2. 277 +`).
- History lines in `Работа.md` match: `<number> <info>` (e.g., `330 вд`).
