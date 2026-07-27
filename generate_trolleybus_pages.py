#!/usr/bin/env python3
"""Скрипт для анализа md-файлов и создания отдельных страниц для каждого троллейбуса."""

import os
import re
from collections import defaultdict
from pathlib import Path

VAULT_DIR = Path(__file__).parent
OUTPUT_DIR = VAULT_DIR / "Троллейбусы"


def parse_work_file(path):
    """Парсит файл Работа.md — извлекает историю носителей и задачи."""
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    tasks = []
    history = defaultdict(list)
    current_date = None

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("- ["):
            tasks.append(stripped)

        date_match = re.match(r"^(\d{2}\.\d{2})$", stripped)
        if date_match:
            current_date = date_match.group(1)
            continue

        if not current_date:
            continue

        entry_match = re.match(r"^(\d{3})\s+(.+)$", stripped)
        if entry_match:
            num = entry_match.group(1)
            info = entry_match.group(2).strip()
            history[num].append({"date": current_date, "info": info})

    return tasks, history


def parse_monitor_file(path):
    """Парсит файл Мониторы.md — извлекает статус мониторов."""
    with open(path, encoding="utf-8") as f:
        content = f.read()

    monitors = {}
    for match in re.finditer(r"(\d+)\.\s+(\d{3})\s+(.*?)$", content, re.MULTILINE):
        num = match.group(2)
        status_raw = match.group(3).strip()
        if status_raw == "+":
            monitors[num] = "+"
        elif status_raw == "-":
            monitors[num] = "-"
        elif "адмирал" in status_raw.lower():
            monitors[num] = "Адмирал"
        else:
            monitors[num] = status_raw
    return monitors


def parse_informator_file(path):
    """Парсит файл Информаторы.md — извлекает статус информаторов."""
    with open(path, encoding="utf-8") as f:
        content = f.read()

    informators = {}
    for match in re.finditer(r"(\d+)\.\s+(\d{3})\s+(.*?)$", content, re.MULTILINE):
        num = match.group(2)
        status_raw = match.group(3).strip()
        if status_raw == "+":
            informators[num] = "+"
        elif "адмирал" in status_raw.lower():
            informators[num] = "Адмирал"
        elif status_raw == "":
            informators[num] = "—"
        else:
            informators[num] = status_raw
    return informators


def get_trolleybus_tasks(tasks, num):
    """Возвращает задачи для конкретного троллейбуса."""
    result = []
    for task in tasks:
        if task.split("]")[1].strip().startswith(num):
            result.append(task)
    return result


def generate_page(num, history_entries, monitor_status, informator_status, tasks):
    """Генерирует содержимое md-файла для троллейбуса."""
    lines = []
    lines.append(f"---")
    lines.append(f"tags:")
    lines.append(f"  - троллейбус")
    lines.append(f"---")
    lines.append(f"")
    lines.append(f"# Троллейбус {num}")
    lines.append(f"")

    lines.append(f"## Текущее состояние")
    lines.append(f"")
    monitor_str = monitor_status if monitor_status else "нет данных"
    informator_str = informator_status if informator_status else "нет данных"
    lines.append(f"| Параметр | Статус |")
    lines.append(f"|----------|--------|")
    lines.append(f"| Монитор | {monitor_str} |")
    lines.append(f"| Информатор | {informator_str} |")
    lines.append(f"")

    if tasks:
        lines.append(f"## Задачи")
        lines.append(f"")
        for task in tasks:
            lines.append(f"- {task.split(']')[1].strip()}")
        lines.append(f"")

    if history_entries:
        lines.append(f"## История носителей")
        lines.append(f"")
        lines.append(f"| Дата | Носитель |")
        lines.append(f"|------|----------|")
        for entry in sorted(history_entries, key=lambda x: x["date"], reverse=True):
            lines.append(f"| {entry['date']} | {entry['info']} |")
        lines.append(f"")

    current = history_entries[0]["info"] if history_entries else "нет данных"
    lines.append(f"**Текущий носитель:** {current}")
    lines.append(f"")

    lines.append(f"---")
    lines.append(f"*Сгенерировано автоматически из [[Работа]], [[Мониторы]], [[Информаторы]]*")

    return "\n".join(lines)


def main():
    work_path = VAULT_DIR / "Google Keep" / "Работа.md"
    monitor_path = VAULT_DIR / "Google Keep" / "Мониторы.md"
    informator_path = VAULT_DIR / "Google Keep" / "Информаторы.md"

    tasks, history = parse_work_file(work_path)
    monitors = parse_monitor_file(monitor_path)
    informators = parse_informator_file(informator_path)

    all_numbers = set(history.keys()) | set(monitors.keys()) | set(informators.keys())

    OUTPUT_DIR.mkdir(exist_ok=True)

    for num in sorted(all_numbers, key=lambda x: int(x)):
        page = generate_page(
            num,
            history.get(num, []),
            monitors.get(num),
            informators.get(num),
            get_trolleybus_tasks(tasks, num),
        )
        out_path = OUTPUT_DIR / f"{num}.md"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(page)
        print(f"  Создан: {num}.md")

    print(f"\nГотово! Создано {len(all_numbers)} файлов в {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
