var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TrolleybusGeneratorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var STALE_DAYS = 7;
var VIEW_TYPE = "trolleybus-sidebar";
function cleanStatus(s) {
  return s.replace(/\^[a-fA-F0-9]+\s*/g, "").trim();
}
function parseWorkFile(content) {
  const lines = content.split("\n");
  const tasks = [];
  const history = {};
  let currentDate = null;
  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith("- [")) {
      tasks.push(stripped);
    }
    const dateMatch = stripped.match(/^(\d{2}\.\d{2})$/);
    if (dateMatch) {
      currentDate = dateMatch[1];
      continue;
    }
    if (!currentDate) continue;
    const entryMatch = stripped.match(/^(\d{3})\s+(.+)$/);
    if (entryMatch) {
      const num = entryMatch[1];
      const info = entryMatch[2].trim();
      if (!history[num]) history[num] = [];
      history[num].push({ date: currentDate, info });
    }
  }
  return { tasks, history };
}
function parseMonitorFile(content) {
  const monitors = {};
  const regex = /(\d+)\.\s+(\d{3})[ \t]+(.*?)$/gm;
  let match;
  while (match = regex.exec(content)) {
    const num = match[2];
    const raw = cleanStatus(match[3]);
    if (raw === "+") monitors[num] = "+";
    else if (raw === "-") monitors[num] = "-";
    else if (raw.toLowerCase().includes("\u0430\u0434\u043C\u0438\u0440\u0430\u043B")) monitors[num] = "\u0410\u0434\u043C\u0438\u0440\u0430\u043B";
    else monitors[num] = raw;
  }
  return monitors;
}
function parseInformatorFile(content) {
  const informators = {};
  const regex = /(\d+)\.\s+(\d{3})[ \t]+(.*?)$/gm;
  let match;
  while (match = regex.exec(content)) {
    const num = match[2];
    const raw = cleanStatus(match[3]);
    if (raw === "+") informators[num] = "+";
    else if (raw.toLowerCase().includes("\u0430\u0434\u043C\u0438\u0440\u0430\u043B")) informators[num] = "\u0410\u0434\u043C\u0438\u0440\u0430\u043B";
    else if (raw === "") informators[num] = "\u2014";
    else informators[num] = raw;
  }
  return informators;
}
function parseReportHTML(content) {
  const data = {};
  const rows = content.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
  for (const row of rows) {
    const cells = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs) || [];
    const texts = cells.map(
      (c) => c.replace(/<[^>]+>/g, "").trim()
    );
    if (texts.length < 3) continue;
    const num = texts[1];
    if (!/^\d{3}$/.test(num)) continue;
    const regStatus = texts[2] || "";
    let regComment = texts[3] || "";
    if (!regComment && texts[4]) regComment = texts[4];
    const camDriver = texts[6] || "";
    const camRoad = texts[7] || "";
    const cam1 = texts[8] || "";
    const cam2 = texts[9] || "";
    const cam3 = texts[10] || "";
    const ladder = texts[11] || "";
    let camComment = texts[13] || "";
    const monStatus = texts[15] || "";
    let monComment = texts[16] || "";
    if (!monComment && texts[17]) monComment = texts[17];
    data[num] = {
      registrator: regStatus,
      registratorComment: regComment,
      cameras: {
        \u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C: camDriver,
        \u0434\u043E\u0440\u043E\u0433\u0430: camRoad,
        "1": cam1,
        "2": cam2,
        "3": cam3,
        \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u0430: ladder
      },
      camerasComment: camComment,
      monitorComment: monComment
    };
  }
  return data;
}
function getTasks(tasks, num) {
  return tasks.filter((t) => {
    var _a;
    return (_a = t.split("]")[1]) == null ? void 0 : _a.trim().startsWith(num);
  }).map((t) => t.split("]")[1].trim());
}
function parseDate(d) {
  const [day, month] = d.split(".");
  return new Date(2026, parseInt(month) - 1, parseInt(day));
}
function generatePage(num, data) {
  const lines = [];
  lines.push("---");
  lines.push("tags:");
  lines.push("  - \u0442\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441");
  lines.push("---");
  lines.push("");
  lines.push(`# \u0422\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441 ${num}`);
  lines.push("");
  lines.push("## \u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435");
  lines.push("");
  const monitorStr = data.monitor || "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445";
  const informatorStr = data.informator || "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445";
  const regStr = data.registrator || "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445";
  lines.push("| \u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 | \u0421\u0442\u0430\u0442\u0443\u0441 |");
  lines.push("|----------|--------|");
  lines.push(`| \u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 | ${regStr} |`);
  lines.push(`| \u041C\u043E\u043D\u0438\u0442\u043E\u0440 | ${monitorStr} |`);
  lines.push(`| \u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440 | ${informatorStr} |`);
  lines.push("");
  const comments = [];
  if (data.registratorComment)
    comments.push(`**\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440:** ${data.registratorComment}`);
  if (data.monitorComment)
    comments.push(`**\u041C\u043E\u043D\u0438\u0442\u043E\u0440:** ${data.monitorComment}`);
  if (data.camerasComment)
    comments.push(`**\u041A\u0430\u043C\u0435\u0440\u044B:** ${data.camerasComment}`);
  if (comments.length) {
    lines.push("### \u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438");
    lines.push("");
    for (const c of comments) lines.push(`- ${c}`);
    lines.push("");
  }
  const camVals = Object.values(data.cameras || {}).filter(Boolean);
  if (camVals.length) {
    lines.push("### \u041A\u0430\u043C\u0435\u0440\u044B");
    lines.push("");
    lines.push("| \u041A\u0430\u043C\u0435\u0440\u0430 | \u0421\u0442\u0430\u0442\u0443\u0441 |");
    lines.push("|--------|--------|");
    for (const [label, val] of Object.entries(data.cameras || {})) {
      if (val) lines.push(`| ${label} | ${val} |`);
    }
    lines.push("");
  }
  if (data.tasks.length) {
    lines.push("## \u0417\u0430\u0434\u0430\u0447\u0438");
    lines.push("");
    for (const task of data.tasks) lines.push(`- ${task}`);
    lines.push("");
  }
  if (data.lastRemoval) {
    lines.push(
      `**\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u0441\u043D\u044F\u0442\u0438\u0435:** ${data.lastRemoval.date} \u2014 \xAB${data.lastRemoval.info}\xBB`
    );
  } else {
    lines.push("**\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u0441\u043D\u044F\u0442\u0438\u0435:** \u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445");
  }
  lines.push("");
  lines.push("---");
  lines.push(
    "*\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0438\u0437 [[\u0420\u0430\u0431\u043E\u0442\u0430]], [[\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u044B]], [[\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440\u044B]], [[\u041B\u0438\u0441\u04421]]*"
  );
  return lines.join("\n");
}
function generateHome(allNumbers, issues) {
  const lines = [];
  lines.push("---");
  lines.push("tags:");
  lines.push("  - \u0433\u043B\u0430\u0432\u043D\u0430\u044F");
  lines.push("---");
  lines.push("");
  lines.push("# \u0414\u0435\u043F\u043E \u0442\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u043E\u0432");
  lines.push("");
  lines.push("## \u041D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F");
  lines.push("");
  lines.push("- [[\u0420\u0430\u0431\u043E\u0442\u0430]] \u2014 \u0436\u0443\u0440\u043D\u0430\u043B \u0440\u0430\u0431\u043E\u0442\u044B");
  lines.push("- [[\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u044B]] \u2014 \u0441\u0442\u0430\u0442\u0443\u0441 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u043E\u0432");
  lines.push("- [[\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440\u044B]] \u2014 \u0441\u0442\u0430\u0442\u0443\u0441 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440\u043E\u0432");
  lines.push("- [[\u0420\u0430\u0431\u043E\u0442\u043D\u0438\u043A\u0438 \u0434\u0435\u043F\u043E]] \u2014 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B");
  lines.push("- [[\u041B\u0438\u0441\u04421]] \u2014 \u043E\u0442\u0447\u0451\u0442 \u043F\u043E \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430\u043C \u0438 \u043A\u0430\u043C\u0435\u0440\u0430\u043C");
  lines.push("- [[\u0421\u0442\u0430\u0440\u044B\u0435]] \u2014 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u043B\u0438\u0441\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0434\u0435\u043B\u0438");
  lines.push("");
  if (issues.length) {
    lines.push("## \u041F\u0440\u043E\u0431\u043B\u0435\u043C\u043D\u044B\u0435");
    lines.push("");
    for (const { num, problems } of issues) {
      lines.push(`- [[${num}]] \u2014 ${problems.join(", ")}`);
    }
    lines.push("");
  }
  lines.push("## \u0412\u0441\u0435 \u0442\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u044B");
  lines.push("");
  const sorted = allNumbers.sort((a, b) => parseInt(a) - parseInt(b));
  for (let i = 0; i < sorted.length; i += 8) {
    const chunk = sorted.slice(i, i + 8);
    lines.push(chunk.map((n) => `[[${n}]]`).join(" | "));
  }
  lines.push("");
  lines.push(`**\u0412\u0441\u0435\u0433\u043E:** ${sorted.length} \u0442\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u043E\u0432`);
  lines.push("");
  lines.push("---");
  lines.push("*\u041E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u043C Trolleybus Generator*");
  return lines.join("\n");
}
function generateStalePage(history) {
  const now = /* @__PURE__ */ new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);
  const stale = [];
  const noData = [];
  for (const [num, entries] of Object.entries(history)) {
    const sorted = entries.sort(
      (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
    );
    const last = sorted[0];
    const lastDate = parseDate(last.date);
    if (lastDate < cutoff) {
      const days = Math.floor(
        (now.getTime() - lastDate.getTime()) / (1e3 * 60 * 60 * 24)
      );
      stale.push({ num, date: last.date, days, info: last.info });
    }
  }
  stale.sort((a, b) => parseInt(a.num) - parseInt(b.num));
  const lines = [];
  lines.push("---");
  lines.push("tags:");
  lines.push("  - \u0441\u0442\u0430\u0440\u044B\u0435");
  lines.push("---");
  lines.push("");
  lines.push("# \u041D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u043B\u0438\u0441\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0434\u0435\u043B\u0438");
  lines.push("");
  lines.push(
    `*\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E: ${now.toLocaleDateString("ru-RU")}*`
  );
  lines.push("");
  if (stale.length) {
    lines.push("| \u0422\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441 | \u0414\u0430\u0442\u0430 | \u0414\u043D\u0435\u0439 | \u0414\u0438\u0441\u043A |");
    lines.push("|------------|------|------|------|");
    for (const s of stale) {
      lines.push(`| [[${s.num}]] | ${s.date} | ${s.days} | ${s.info} |`);
    }
    lines.push("");
  } else {
    lines.push("\u0412\u0441\u0435 \u0442\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044E\u044E \u043D\u0435\u0434\u0435\u043B\u044E.");
    lines.push("");
  }
  lines.push("---");
  lines.push("*\u041E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u043C Trolleybus Generator*");
  return lines.join("\n");
}
var TrolleybusSidebar = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "\u0414\u0435\u043F\u043E";
  }
  getIcon() {
    return "bus";
  }
  async onOpen() {
    await this.renderContent();
  }
  async renderContent() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("trolleybus-sidebar");
    const header = container.createEl("h3", { text: "\u0414\u0435\u043F\u043E \u0442\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u043E\u0432" });
    header.addClass("sidebar-header");
    const status = this.plugin.lastStatus;
    if (!status) {
      container.createEl("p", {
        text: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\xBB \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043B\u0430\u0433\u0438\u043D\u0430",
        cls: "sidebar-hint"
      });
      return;
    }
    const summary = container.createEl("div", { cls: "sidebar-summary" });
    summary.createEl("span", {
      text: `\u0412\u0441\u0435\u0433\u043E: ${status.allNumbers.length}`,
      cls: "summary-item"
    });
    summary.createEl("span", {
      text: `\u041F\u0440\u043E\u0431\u043B\u0435\u043C\u043D\u044B\u0445: ${status.issues.length}`,
      cls: `summary-item ${status.issues.length ? "warning" : ""}`
    });
    summary.createEl("span", {
      text: `\u0421\u0442\u0430\u0440\u044B\u0445: ${status.staleCount}`,
      cls: `summary-item ${status.staleCount ? "danger" : ""}`
    });
    if (status.issues.length) {
      const section = container.createEl("div", { cls: "sidebar-section" });
      section.createEl("h4", { text: "\u041F\u0440\u043E\u0431\u043B\u0435\u043C\u043D\u044B\u0435" });
      const list = section.createEl("ul", { cls: "sidebar-list" });
      for (const { num, problems } of status.issues) {
        const li = list.createEl("li");
        li.createEl("a", {
          text: num,
          attr: { "data-href": `\u0422\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u044B/${num}` },
          cls: "internal-link"
        });
        li.appendText(` \u2014 ${problems.join(", ")}`);
      }
    }
    if (status.staleCount) {
      const section = container.createEl("div", { cls: "sidebar-section" });
      section.createEl("h4", { text: "\u041D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u043B\u0438\u0441\u044C > 7 \u0434\u043D\u0435\u0439" });
      const list = section.createEl("ul", { cls: "sidebar-list" });
      for (const s of status.staleList) {
        const li = list.createEl("li");
        li.createEl("a", {
          text: s.num,
          attr: { "data-href": `\u0422\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u044B/${s.num}` },
          cls: "internal-link"
        });
        li.appendText(` \u2014 ${s.date} (${s.days} \u0434\u043D.)`);
      }
    }
  }
};
var TrolleybusGeneratorPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "lastStatus", null);
  }
  async onload() {
    console.log("Trolleybus Generator loaded");
    this.registerView(VIEW_TYPE, (leaf) => new TrolleybusSidebar(leaf, this));
    this.addCommand({
      id: "generate-trolleybus-pages",
      name: "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0442\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u043E\u0432",
      callback: () => this.generate()
    });
    this.addCommand({
      id: "open-trolleybus-sidebar",
      name: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C \u0434\u0435\u043F\u043E",
      callback: () => this.activateSidebar()
    });
    this.addRibbonIcon("bus", "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u044B", () => this.generate());
    this.registerEvent(
      this.app.vault.on("modify", (file) => this.onFileChange(file))
    );
    await this.activateSidebar();
  }
  async onunload() {
    console.log("Trolleybus Generator unloaded");
  }
  async activateSidebar() {
    var _a;
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    await ((_a = this.app.workspace.getRightLeaf(false)) == null ? void 0 : _a.setViewState({
      type: VIEW_TYPE,
      active: true
    }));
  }
  async onFileChange(file) {
    const watchPaths = [
      "Google Keep/\u0420\u0430\u0431\u043E\u0442\u0430.md",
      "Google Keep/\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u044B.md",
      "Google Keep/\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440\u044B.md",
      "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u044B_\u043A\u0430\u043C\u0435\u0440\u044B/\u041B\u0438\u0441\u04421.html"
    ];
    if (watchPaths.includes(file.path)) {
      await this.generate(true);
    }
  }
  async generate(silent = false) {
    const vault = this.app.vault;
    const workFile = vault.getAbstractFileByPath("Google Keep/\u0420\u0430\u0431\u043E\u0442\u0430.md");
    const monitorFile = vault.getAbstractFileByPath("Google Keep/\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u044B.md");
    const informatorFile = vault.getAbstractFileByPath(
      "Google Keep/\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440\u044B.md"
    );
    const reportFile = vault.getAbstractFileByPath(
      "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u044B_\u043A\u0430\u043C\u0435\u0440\u044B/\u041B\u0438\u0441\u04421.html"
    );
    if (!workFile || !monitorFile || !informatorFile || !reportFile) {
      new import_obsidian.Notice("\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B!");
      return;
    }
    const workContent = await vault.read(workFile);
    const monitorContent = await vault.read(monitorFile);
    const informatorContent = await vault.read(informatorFile);
    const reportContent = await vault.read(reportFile);
    const { tasks, history } = parseWorkFile(workContent);
    const monitors = parseMonitorFile(monitorContent);
    const informators = parseInformatorFile(informatorContent);
    const report = parseReportHTML(reportContent);
    const allNumbers = /* @__PURE__ */ new Set([
      ...Object.keys(history),
      ...Object.keys(monitors),
      ...Object.keys(informators),
      ...Object.keys(report)
    ]);
    const issues = [];
    const now = /* @__PURE__ */ new Date();
    const staleCutoff = new Date(now);
    staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);
    const staleList = [];
    const dirPath = "\u0422\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u044B";
    let dir = vault.getAbstractFileByPath(dirPath);
    if (!dir) {
      dir = await vault.createFolder(dirPath);
    }
    for (const num of Array.from(allNumbers).sort(
      (a, b) => parseInt(a) - parseInt(b)
    )) {
      const numTasks = getTasks(tasks, num);
      const mon = monitors[num] || "";
      const info = informators[num] || "";
      const rep = report[num] || {};
      const historyEntries = history[num] || [];
      const sorted = historyEntries.sort(
        (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
      );
      const lastRemoval = sorted[0] || null;
      const problems = [];
      if (numTasks.length) problems.push("\u0437\u0430\u0434\u0430\u0447\u0438");
      if (rep.registrator && rep.registrator !== "+")
        problems.push(`\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440: ${rep.registrator}`);
      if (mon && mon !== "+" && mon !== "\u0410\u0434\u043C\u0438\u0440\u0430\u043B")
        problems.push(`\u043C\u043E\u043D\u0438\u0442\u043E\u0440: ${mon}`);
      if (info && info !== "+" && info !== "\u0410\u0434\u043C\u0438\u0440\u0430\u043B" && info !== "\u2014")
        problems.push(`\u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440: ${info}`);
      if (problems.length) issues.push({ num, problems });
      if (lastRemoval) {
        const lastDate = parseDate(lastRemoval.date);
        if (lastDate < staleCutoff) {
          const days = Math.floor(
            (now.getTime() - lastDate.getTime()) / (1e3 * 60 * 60 * 24)
          );
          staleList.push({ num, date: lastRemoval.date, days });
        }
      }
      const page = generatePage(num, {
        num,
        monitor: mon,
        informator: info,
        registrator: rep.registrator || "",
        registratorComment: rep.registratorComment || "",
        cameras: rep.cameras || {},
        camerasComment: rep.camerasComment || "",
        monitorComment: rep.monitorComment || "",
        tasks: numTasks,
        history: historyEntries,
        lastRemoval
      });
      const filePath = `${dirPath}/${num}.md`;
      const existing = vault.getAbstractFileByPath(filePath);
      if (existing) {
        await vault.modify(existing, page);
      } else {
        await vault.create(filePath, page);
      }
    }
    const sortedNumbers = Array.from(allNumbers).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );
    const homeContent = generateHome(sortedNumbers, issues);
    const homeFile = vault.getAbstractFileByPath("Home.md");
    if (homeFile) {
      await vault.modify(homeFile, homeContent);
    } else {
      await vault.create("Home.md", homeContent);
    }
    const staleContent = generateStalePage(history);
    const staleFile = vault.getAbstractFileByPath("\u0421\u0442\u0430\u0440\u044B\u0435.md");
    if (staleFile) {
      await vault.modify(staleFile, staleContent);
    } else {
      await vault.create("\u0421\u0442\u0430\u0440\u044B\u0435.md", staleContent);
    }
    this.lastStatus = {
      allNumbers: sortedNumbers,
      issues,
      staleCount: staleList.length,
      staleList
    };
    const sidebar = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of sidebar) {
      const view = leaf.view;
      await view.renderContent();
    }
    if (!silent) {
      new import_obsidian.Notice(`\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E ${sortedNumbers.length} \u0441\u0442\u0440\u0430\u043D\u0438\u0446 \u0442\u0440\u043E\u043B\u043B\u0435\u0439\u0431\u0443\u0441\u043E\u0432`);
    }
  }
};
