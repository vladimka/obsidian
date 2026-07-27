#!/usr/bin/env python3
"""Скрипт для анализа md-файлов и создания отдельных страниц для каждого троллейбуса."""

import os
import re
from collections import defaultdict
from datetime import datetime, timedelta
from html.parser import HTMLParser
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


class _HTMLTableParser(HTMLParser):
    """Внутренний парсер HTML-таблицы."""

    def __init__(self):
        super().__init__()
        self.in_td = False
        self.current_row = []
        self.current_cell = ""
        self.rows = []

    def handle_starttag(self, tag, attrs):
        if tag in ("td", "th"):
            self.in_td = True
            self.current_cell = ""
        elif tag == "tr":
            self.current_row = []

    def handle_endtag(self, tag):
        if tag in ("td", "th"):
            self.in_td = False
            self.current_row.append(self.current_cell.strip())
        elif tag == "tr":
            if self.current_row:
                self.rows.append(self.current_row)

    def handle_data(self, data):
        if self.in_td:
            self.current_cell += data


def parse_report_html(path):
    """Парсит Лист1.html — извлекает данные о регистраторах, камерах и мониторах."""
    with open(path, encoding="utf-8") as f:
        content = f.read()

    parser = _HTMLTableParser()
    parser.feed(content)

    data = {}
    for row in parser.rows:
        if len(row) < 3:
            continue
        num = row[1].strip()
        if not re.match(r"^\d{3}$", num):
            continue

        reg_status = row[2].strip() if len(row) > 2 else ""
        reg_comment = row[3].strip() if len(row) > 3 else ""
        if not reg_comment and len(row) > 4:
            reg_comment = row[4].strip()
        cam_driver = row[6].strip() if len(row) > 6 else ""
        cam_road = row[7].strip() if len(row) > 7 else ""
        cam1 = row[8].strip() if len(row) > 8 else ""
        cam2 = row[9].strip() if len(row) > 9 else ""
        cam3 = row[10].strip() if len(row) > 10 else ""
        ladder = row[11].strip() if len(row) > 11 else ""
        cam_comment = row[13].strip() if len(row) > 13 else ""
        mon_status = row[15].strip() if len(row) > 15 else ""
        mon_comment = row[16].strip() if len(row) > 16 else ""
        if not mon_comment and len(row) > 17:
            mon_comment = row[17].strip()

        cameras = {"водитель": cam_driver, "дорога": cam_road, "1": cam1, "2": cam2, "3": cam3, "лестница": ladder}

        data[num] = {
            "registrator": reg_status,
            "registrator_comment": reg_comment,
            "cameras": cameras,
            "cameras_comment": cam_comment,
            "monitor": mon_status,
            "monitor_comment": mon_comment,
        }

    return data


def get_trolleybus_tasks(tasks, num):
    """Возвращает задачи для конкретного троллейбуса."""
    result = []
    for task in tasks:
        if task.split("]")[1].strip().startswith(num):
            result.append(task)
    return result


def generate_page(
    num, history_entries, monitor_status, informator_status, tasks, report_data,
):
    """Генерирует содержимое md-файла для троллейбуса."""
    rep = report_data or {}
    reg_status = rep.get("registrator", "")
    reg_comment = rep.get("registrator_comment", "")
    cameras = rep.get("cameras", {})
    cam_comment = rep.get("cameras_comment", "")
    mon_comment = rep.get("monitor_comment", "")

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
    reg_str = reg_status if reg_status else "нет данных"
    lines.append("| Параметр | Статус |")
    lines.append("|----------|--------|")
    lines.append(f"| Регистратор | {reg_str} |")
    lines.append(f"| Монитор | {monitor_str} |")
    lines.append(f"| Информатор | {informator_str} |")
    lines.append("")

    comments = []
    if reg_comment:
        comments.append(f"**Регистратор:** {reg_comment}")
    if mon_comment:
        comments.append(f"**Монитор:** {mon_comment}")
    if cam_comment:
        comments.append(f"**Камеры:** {cam_comment}")
    if comments:
        lines.append("### Комментарии")
        lines.append("")
        for c in comments:
            lines.append(f"- {c}")
        lines.append("")

    cam_vals = [v for v in cameras.values() if v]
    if cam_vals:
        lines.append("### Камеры")
        lines.append("")
        lines.append("| Камера | Статус |")
        lines.append("|--------|--------|")
        for label, val in cameras.items():
            if val:
                lines.append(f"| {label} | {val} |")
        lines.append("")

    if tasks:
        lines.append("## Задачи")
        lines.append("")
        for task in tasks:
            lines.append(f"- {task.split(']')[1].strip()}")
        lines.append("")

    if history_entries:
        last = sorted(history_entries, key=lambda x: x["date"], reverse=True)[0]
        lines.append(f"**Последнее снятие:** {last['date']} — «{last['info']}»")
    else:
        lines.append("**Последнее снятие:** нет данных")
    lines.append("")

    lines.append("---")
    lines.append(
        "*Сгенерировано автоматически из [[Работа]], [[Мониторы]], [[Информаторы]], [[Лист1]]*"
    )

    return "\n".join(lines)


def generate_home(all_numbers, tasks, monitors, informators, report):
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
    lines.append("- [[Лист1]] — отчёт по регистраторам и камерам")
    lines.append("")

    with_issues = []
    for num in sorted(all_numbers, key=lambda x: int(x)):
        num_tasks = get_trolleybus_tasks(tasks, num)
        mon = monitors.get(num, "")
        info = informators.get(num, "")
        rep = report.get(num, {})
        reg = rep.get("registrator", "")

        issues = []
        if num_tasks:
            issues.append("задачи")
        if reg and reg != "+":
            issues.append(f"регистратор: {reg}")
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
    report_path = VAULT_DIR / "Регистраторы_камеры" / "Лист1.html"

    tasks, history = parse_work_file(work_path)
    monitors = parse_monitor_file(monitor_path)
    informators = parse_informator_file(informator_path)
    report = parse_report_html(report_path)

    all_numbers = (
        set(history.keys())
        | set(monitors.keys())
        | set(informators.keys())
        | set(report.keys())
    )

    OUTPUT_DIR.mkdir(exist_ok=True)

    for num in sorted(all_numbers, key=lambda x: int(x)):
        page = generate_page(
            num,
            history.get(num, []),
            monitors.get(num),
            informators.get(num),
            get_trolleybus_tasks(tasks, num),
            report.get(num),
        )
        out_path = OUTPUT_DIR / f"{num}.md"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(page)
        print(f"  Создан: {num}.md")

    home = generate_home(all_numbers, tasks, monitors, informators, report)
    with open(VAULT_DIR / "Home.md", "w", encoding="utf-8") as f:
        f.write(home)
    print(f"  Обновлён: Home.md")

    print(f"\nГотово! Создано {len(all_numbers)} файлов в {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
