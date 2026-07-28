#!/usr/bin/env python3
"""Скрипт для анализа md-файлов и создания отдельных страниц для каждого троллейбуса."""

import re
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

VAULT_DIR = Path(__file__).parent
OUTPUT_DIR = VAULT_DIR / "Троллейбусы"
STALE_DAYS = 7


def _clean_status(s):
    """Убирает артефакты вроде ^d0188e из статуса."""
    return re.sub(r"\^[a-fA-F0-9]+\s*", "", s).strip()


def parse_work_file(path):
    """Парсит файл Работа.md — извлекает историю носителей и задачи.

    Формат строки: <номер_троллейбуса> <название_снятого_диска>
    """
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
    for match in re.finditer(r"(\d+)\.\s+(\d{3})[ \t]+(.*?)$", content, re.MULTILINE):
        num = match.group(2)
        status_raw = _clean_status(match.group(3))
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
    for match in re.finditer(r"(\d+)\.\s+(\d{3})[ \t]+(.*?)$", content, re.MULTILINE):
        num = match.group(2)
        status_raw = _clean_status(match.group(3))
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
    lines.append("---")
    lines.append("tags:")
    lines.append("  - троллейбус")
    lines.append("---")
    lines.append("")
    lines.append(f"# Троллейбус {num}")
    lines.append("")

    lines.append("## Текущее состояние")
    lines.append("")
    monitor_str = monitor_status if monitor_status else "нет данных"
    informator_str = informator_status if informator_status else "нет данных"
    lines.append("| Параметр | Статус |")
    lines.append("|----------|--------|")
    lines.append(f"| Монитор | {monitor_str} |")
    lines.append(f"| Информатор | {informator_str} |")
    lines.append("")

    if tasks:
        lines.append("## Задачи")
        lines.append("")
        for task in tasks:
            lines.append(f"- {task.split(']')[1].strip()}")
        lines.append("")

    if history_entries:
        last = sorted(history_entries, key=lambda x: _parse_date(x["date"]), reverse=True)[0]
        lines.append(f"**Последнее снятие:** {last['date']} — «{last['info']}»")
    else:
        lines.append("**Последнее снятие:** нет данных")
    lines.append("")

    lines.append("---")
    lines.append(
        "*Сгенерировано автоматически из [[Работа]], [[Мониторы]], [[Информаторы]]*"
    )

    return "\n".join(lines)


def _parse_date(d):
    """Парсит дату DD.MM в текущем году."""
    return datetime.strptime(f"{d}.2026", "%d.%m.%Y")


def generate_stale_page(history):
    """Генерирует страницу троллейбусов, которые не снимали больше недели."""
    today = datetime.now()
    cutoff = today - timedelta(days=STALE_DAYS)

    stale = []
    no_data = []

    for num in sorted(history.keys(), key=lambda x: int(x)):
        entries = history[num]
        last = sorted(entries, key=lambda x: _parse_date(x["date"]), reverse=True)[0]
        try:
            last_date = _parse_date(last["date"])
            if last_date < cutoff:
                days = (today - last_date).days
                stale.append((num, last["date"], days, last["info"]))
        except ValueError:
            no_data.append(num)

    lines = []
    lines.append("---")
    lines.append("tags:")
    lines.append("  - старые")
    lines.append("---")
    lines.append("")
    lines.append("# Не проверялись больше недели")
    lines.append("")
    lines.append(f"*Сгенерировано: {today.strftime('%d.%m.%Y')}*")
    lines.append("")

    if stale:
        lines.append(f"| Троллейбус | Дата | Дней | Диск |")
        lines.append(f"|------------|------|------|------|")
        for num, date, days, info in stale:
            lines.append(f"| [[{num}]] | {date} | {days} | {info} |")
        lines.append("")
    else:
        lines.append("Все троллейбусы проверены за последнюю неделю.")
        lines.append("")

    if no_data:
        lines.append(f"**Нет данных:** {', '.join(f'[[{n}]]' for n in no_data)}")
        lines.append("")

    lines.append("---")
    lines.append("*Обновляется автоматически скриптом [[generate_trolleybus_pages]]*")

    return "\n".join(lines)


def generate_home(all_numbers, tasks, monitors, informators):
    """Генерирует Home.md — дашборд со ссылками на все троллейбусы."""
    lines = []
    lines.append("---")
    lines.append("tags:")
    lines.append("  - главная")
    lines.append("---")
    lines.append("")
    lines.append("# Депо троллейбусов")
    lines.append("")

    lines.append("## Навигация")
    lines.append("")
    lines.append("- [[Работа]] — журнал работы")
    lines.append("- [[Мониторы]] — статус мониторов")
    lines.append("- [[Информаторы]] — статус информаторов")
    lines.append("- [[Работники депо]] — контакты")
    lines.append("- [[Старые]] — не проверялись больше недели")
    lines.append("")

    with_issues = []
    for num in sorted(all_numbers, key=lambda x: int(x)):
        num_tasks = get_trolleybus_tasks(tasks, num)
        mon = monitors.get(num, "")
        info = informators.get(num, "")

        issues = []
        if num_tasks:
            issues.append("задачи")
        if mon and mon != "+" and mon != "Адмирал":
            issues.append(f"монитор: {mon}")
        if info and info != "+" and info != "Адмирал" and info != "—":
            issues.append(f"информатор: {info}")
        if issues:
            with_issues.append((num, issues))

    if with_issues:
        lines.append("## Проблемные")
        lines.append("")
        for num, issues in with_issues:
            lines.append(f"- [[{num}]] — {', '.join(issues)}")
        lines.append("")

    lines.append("## Все троллейбусы")
    lines.append("")

    rows_per_line = 8
    nums_sorted = sorted(all_numbers, key=lambda x: int(x))
    for i in range(0, len(nums_sorted), rows_per_line):
        chunk = nums_sorted[i:i + rows_per_line]
        line = " | ".join(f"[[{n}]]" for n in chunk)
        lines.append(line)
    lines.append("")

    lines.append(f"**Всего:** {len(all_numbers)} троллейбусов")
    lines.append("")

    lines.append("---")
    lines.append("*Обновляется автоматически скриптом [[generate_trolleybus_pages]]*")

    return "\n".join(lines)


def main():
    work_path = VAULT_DIR / "Google Keep" / "Работа.md"
    monitor_path = VAULT_DIR / "Google Keep" / "Мониторы.md"
    informator_path = VAULT_DIR / "Google Keep" / "Информаторы.md"

    tasks, history = parse_work_file(work_path)
    monitors = parse_monitor_file(monitor_path)
    informators = parse_informator_file(informator_path)

    all_numbers = (
        set(history.keys())
        | set(monitors.keys())
        | set(informators.keys())
    )

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

    home = generate_home(all_numbers, tasks, monitors, informators)
    with open(VAULT_DIR / "Home.md", "w", encoding="utf-8") as f:
        f.write(home)
    print(f"  Обновлён: Home.md")

    stale = generate_stale_page(history)
    with open(VAULT_DIR / "Старые.md", "w", encoding="utf-8") as f:
        f.write(stale)
    print(f"  Создан: Старые.md")

    print(f"\nГотово! Создано {len(all_numbers)} файлов в {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
