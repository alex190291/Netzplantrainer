const FIELD_LABELS = { faz: "FAZ", fez: "FEZ", saz: "SAZ", sez: "SEZ", gp: "GP", fp: "FP" };
const LEVELS = {
  easy: { label: "Basis", hide: ["gp", "fp"], hint: "GP = SAZ − FAZ. Für FP zählt der kleinste FAZ aller direkten Nachfolger." },
  medium: { label: "Prüfung", hide: ["saz", "sez", "gp", "fp"], hint: "Beginne beim Projektende und rechne rückwärts. Danach bestimmst du beide Puffer." },
  hard: { label: "Profi", hide: ["faz", "fez", "saz", "sez", "gp", "fp"], hint: "GP = SAZ − FAZ. Für FP zählt der kleinste FAZ aller direkten Nachfolger." }
};

const PROJECTS = [
  ["Client-Rollout", ["Anforderungen", "Image erstellen", "Hardware prüfen", "Pilot installieren", "Tests", "Rollout", "Abnahme"]],
  ["Webshop-Release", ["Backlog klären", "UI umsetzen", "API entwickeln", "Datenbank", "Integrationstest", "Deployment", "Abnahme"]],
  ["Servermigration", ["Ist-Analyse", "Zielsystem", "Backup", "Server aufsetzen", "Daten migrieren", "Tests", "Umschalten"]],
  ["WLAN-Erweiterung", ["Ausleuchtung", "Konzept", "Hardware ordern", "Verkabelung", "APs montieren", "Konfiguration", "Abnahme"]],
  ["Ticketsystem", ["Anforderungen", "Systemauswahl", "VM bereitstellen", "Workflows", "Schnittstellen", "Schulung", "Go-live"]],
  ["Backup-Konzept", ["Schutzbedarf", "Konzept", "Storage", "Software", "Jobs einrichten", "Restore-Test", "Freigabe"]],
  ["App-Release", ["Planung", "Backend", "Frontend", "Testdaten", "Systemtest", "Rollout", "Review"]],
  ["Firewall-Tausch", ["Regeln prüfen", "Design", "Gerät liefern", "Konfiguration", "Einbau", "Funktionstest", "Übergabe"]],
  ["Monitoring", ["Ziele definieren", "Toolauswahl", "Server", "Checks", "Dashboards", "Alarmtest", "Betrieb"]],
  ["Datenbank-Upgrade", ["Analyse", "Migrationsplan", "Testinstanz", "Anpassungen", "Migration", "Lasttest", "Freigabe"]]
];

const PATTERNS = [
  [[], [0], [0], [1,2], [2], [3,4], [5]],
  [[], [0], [0], [0], [1,2], [2,3], [4,5]],
  [[], [0], [1], [0], [1,3], [2,4], [5]],
  [[], [0], [0], [1], [1,2], [2,3], [4,5]],
  [[], [0], [0], [1,2], [1], [3,4], [5]],
  [[], [0], [0], [1], [1], [2,3,4], [5]],
  [[], [0], [0], [1], [2], [3,4], [5]],
  [[], [0], [1], [1], [0], [2,3,4], [5]],
  [[], [0], [0], [1,2], [2], [3], [4,5]],
  [[], [0], [0], [0], [1,3], [2,3], [4,5]]
];

function seeded(seed) {
  let value = seed * 9301 + 49297;
  return () => ((value = (value * 9301 + 49297) % 233280) / 233280);
}

function makeTask(index) {
  const rand = seeded(index + 17);
  const project = PROJECTS[index % PROJECTS.length];
  const pattern = PATTERNS[(index * 3 + Math.floor(index / 10)) % PATTERNS.length];
  const nodes = pattern.map((preds, i) => ({
    id: String.fromCharCode(65 + i), name: project[1][i], duration: 1 + Math.floor(rand() * (index < 34 ? 5 : index < 67 ? 8 : 11)), preds: [...preds]
  }));
  calculate(nodes);
  return { id: index + 1, title: `${project[0]} planen`, nodes };
}

function calculate(nodes) {
  nodes.forEach((node, i) => {
    node.faz = node.preds.length ? Math.max(...node.preds.map(p => nodes[p].fez)) : 0;
    node.fez = node.faz + node.duration;
    node.succs = [];
    nodes.forEach((candidate, c) => { if (candidate.preds.includes(i)) node.succs.push(c); });
  });
  const projectEnd = Math.max(...nodes.map(n => n.fez));
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    node.sez = node.succs.length ? Math.min(...node.succs.map(s => nodes[s].saz)) : projectEnd;
    node.saz = node.sez - node.duration;
    node.gp = node.saz - node.faz;
    node.fp = node.succs.length ? Math.min(...node.succs.map(s => nodes[s].faz)) - node.fez : projectEnd - node.fez;
  }
}

const tasks = Array.from({ length: 100 }, (_, i) => makeTask(i));
const saved = JSON.parse(localStorage.getItem("netzplan-progress") || "{}");
const state = { task: Number(saved.lastTask || 0), level: saved.level || "medium", mode: saved.mode || "calculate", attempts: saved.attempts || {}, solved: saved.solved || {}, checked: false, selectedNode: null, userEdges: new Set() };

const el = id => document.getElementById(id);

function layoutNodes(nodes) {
  const levels = [];
  nodes.forEach((node, i) => {
    levels[i] = node.preds.length ? Math.max(...node.preds.map(p => levels[p])) + 1 : 0;
  });
  const maxLevel = Math.max(...levels);
  const groups = Array.from({ length: maxLevel + 1 }, () => []);
  levels.forEach((level, i) => groups[level].push(i));
  const width = Math.max(920, (maxLevel + 1) * 205 + 70);
  const height = 490;
  const positions = nodes.map((_, i) => {
    const group = groups[levels[i]];
    const row = group.indexOf(i);
    const gap = height / (group.length + 1);
    return { x: 38 + levels[i] * ((width - 230) / Math.max(1, maxLevel)), y: gap * (row + 1) - 74 };
  });
  return { positions, width, height };
}

function renderTask() {
  const task = tasks[state.task];
  const hiddenFields = LEVELS[state.level].hide;
  state.checked = false;
  state.selectedNode = null;
  state.userEdges = new Set();
  el("task-number").textContent = `AUFGABE ${String(task.id).padStart(2, "0")} / 100`;
  el("task-title").textContent = task.title;
  el("feedback").hidden = true;
  document.querySelectorAll("[data-level]").forEach(b => b.classList.toggle("active", b.dataset.level === state.level));
  document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active", b.dataset.mode === state.mode));
  el("instruction-title").textContent = state.mode === "build" ? "Baue den Netzplan aus den Vorgängern auf." : "Ergänze die fehlenden Werte.";
  el("instruction-text").textContent = state.mode === "build" ? "Klicke zuerst den Vorgänger und danach den Nachfolger an. Ein erneuter Klick auf dieselbe Verbindung entfernt sie." : "Berechne Vorwärts- und Rückwärtsrechnung sowie Gesamtpuffer und freien Puffer. Zeitangaben in Tagen.";
  el("task-table-wrap").hidden = state.mode !== "build";
  el("toggle-table").textContent = state.mode === "build" ? "Vorgangsliste ausblenden" : "Vorgangsliste anzeigen";

  el("task-table").innerHTML = task.nodes.map(n => `<tr><td><strong>${n.id}</strong></td><td>${n.name}</td><td>${n.duration} Tage</td><td>${n.preds.length ? n.preds.map(p => task.nodes[p].id).join(", ") : "–"}</td></tr>`).join("");
  const { positions, width, height } = layoutNodes(task.nodes);
  const network = el("network");
  network.style.width = `${width}px`;
  network.style.height = `${height}px`;

  const marker = `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="context-stroke"/></marker></defs>`;
  const targetEdges = task.nodes.flatMap((node, i) => node.preds.map(p => ({ p, i })));
  const visibleEdges = state.mode === "build" ? [] : targetEdges;
  const edges = visibleEdges.map(({ p, i }) => {
    const node = task.nodes[i];
    const from = positions[p], to = positions[i];
    const critical = task.nodes[p].gp === 0 && node.gp === 0 && task.nodes[p].fez === node.faz;
    const x1 = from.x + 154, y1 = from.y + 74, x2 = to.x, y2 = to.y + 74;
    const bend = (x1 + x2) / 2;
    return `<path class="edge ${critical ? "critical" : ""}" d="M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2 - 7} ${y2}" marker-end="url(#arrow)"/>`;
  }).join("");

  const nodes = task.nodes.map((node, i) => {
    if (state.mode === "build") return `<button class="node build-node" data-build-node="${i}" style="left:${positions[i].x}px;top:${positions[i].y + 28}px"><div class="node-head"><span class="node-id">${node.id}</span><span class="node-name">Vorgang</span></div><div class="build-body"><span>${node.name}<strong>${node.duration} T</strong></span></div><span class="build-duration">${node.duration}</span></button>`;
    const fields = hiddenFields.map(field => fieldCell(task.id, i, field, node[field])).join("");
    const known = Object.keys(FIELD_LABELS).filter(f => !hiddenFields.includes(f)).map(field => fieldCell(task.id, i, field, node[field], true)).join("");
    const ordered = ["faz", "fez", "saz", "sez", "gp", "fp"].map(field => hiddenFields.includes(field) ? fields.match(new RegExp(`<div class="node-cell" data-field="${field}">[\\s\\S]*?<\\/div>`))?.[0] : known.match(new RegExp(`<div class="node-cell" data-field="${field}">[\\s\\S]*?<\\/div>`))?.[0]).join("");
    return `<div class="node" data-critical="${node.gp === 0}" style="left:${positions[i].x}px;top:${positions[i].y}px"><div class="node-head"><span class="node-id">${node.id}</span><span class="node-name" title="${node.name}">${node.name}</span></div><div class="node-grid">${ordered}</div><span class="duration" title="Dauer">${node.duration}</span></div>`;
  }).join("");
  network.innerHTML = `<svg class="edge-layer" viewBox="0 0 ${width} ${height}">${marker}${edges}</svg>${nodes}`;
  network.querySelectorAll("input").forEach(input => input.addEventListener("input", updateFilled));
  network.querySelectorAll("[data-build-node]").forEach(node => node.addEventListener("click", () => selectBuildNode(Number(node.dataset.buildNode))));
  el("field-count").textContent = state.mode === "build" ? targetEdges.length : task.nodes.length * hiddenFields.length;
  updateFilled();
  save();
}

function fieldCell(taskId, nodeIndex, field, value, known = false) {
  const control = known ? `<output>${value}</output>` : `<input type="number" inputmode="numeric" aria-label="${FIELD_LABELS[field]} Vorgang ${String.fromCharCode(65 + nodeIndex)}" data-node="${nodeIndex}" data-answer="${value}" data-kind="${field}">`;
  return `<div class="node-cell" data-field="${field}"><label>${FIELD_LABELS[field]}</label>${control}</div>`;
}

function updateFilled() {
  el("filled-count").textContent = state.mode === "build" ? state.userEdges.size : [...el("network").querySelectorAll("input")].filter(i => i.value !== "").length;
}

function selectBuildNode(index) {
  if (state.selectedNode === null) {
    state.selectedNode = index;
    el("network").querySelector(`[data-build-node="${index}"]`).classList.add("selected");
    return;
  }
  if (state.selectedNode === index) {
    state.selectedNode = null;
    renderBuildEdges();
    return;
  }
  const key = `${state.selectedNode}-${index}`;
  state.userEdges.has(key) ? state.userEdges.delete(key) : state.userEdges.add(key);
  state.selectedNode = null;
  renderBuildEdges();
  updateFilled();
}

function renderBuildEdges() {
  const task = tasks[state.task];
  const { positions, width, height } = layoutNodes(task.nodes);
  const paths = [...state.userEdges].map(key => {
    const [p, i] = key.split("-").map(Number);
    const from = positions[p], to = positions[i];
    const x1 = from.x + 154, y1 = from.y + 102, x2 = to.x, y2 = to.y + 102, bend = (x1 + x2) / 2;
    return `<path class="edge" d="M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2 - 7} ${y2}" marker-end="url(#arrow)"/>`;
  }).join("");
  el("network").querySelector(".edge-layer").innerHTML = `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa59f"/></marker></defs>${paths}`;
  el("network").querySelectorAll("[data-build-node]").forEach((node, i) => node.classList.toggle("selected", i === state.selectedNode));
}

function checkAnswers() {
  if (state.mode === "build") return checkBuild();
  const inputs = [...el("network").querySelectorAll("input")];
  const empty = inputs.filter(i => i.value === "").length;
  let wrong = 0;
  inputs.forEach(input => {
    const correct = Number(input.value) === Number(input.dataset.answer);
    input.classList.toggle("correct", correct);
    input.classList.toggle("wrong", !correct);
    if (!correct) wrong++;
  });
  state.attempts[state.task] = (state.attempts[state.task] || 0) + 1;
  state.checked = true;
  const feedback = el("feedback");
  feedback.hidden = false;
  if (!wrong) {
    state.solved[state.task] = true;
    el("network").classList.add("show-critical");
    feedback.className = "feedback success";
    feedback.innerHTML = `<strong>Vollständig richtig.</strong> Du hast Vorwärtsrechnung, Rückwärtsrechnung und beide Puffer korrekt bestimmt.`;
  } else {
    feedback.className = "feedback error";
    feedback.innerHTML = `<strong>Noch nicht ganz.</strong> ${empty ? `${empty} Feld${empty === 1 ? " ist" : "er sind"} noch leer; ` : ""}${wrong} Wert${wrong === 1 ? " stimmt" : "e stimmen"} noch nicht. Prüfe die rot markierten Felder.`;
  }
  save(); renderStats();
}

function checkBuild() {
  const task = tasks[state.task];
  const answers = new Set(task.nodes.flatMap((n, i) => n.preds.map(p => `${p}-${i}`)));
  const missing = [...answers].filter(edge => !state.userEdges.has(edge));
  const extra = [...state.userEdges].filter(edge => !answers.has(edge));
  state.attempts[state.task] = (state.attempts[state.task] || 0) + 1;
  const feedback = el("feedback");
  feedback.hidden = false;
  if (!missing.length && !extra.length) {
    state.solved[state.task] = true;
    feedback.className = "feedback success";
    feedback.innerHTML = "<strong>Netzplan korrekt aufgebaut.</strong> Alle Vorgängerbeziehungen stimmen. Wechsle jetzt zu „Berechnen“, um die Zeitwerte und Puffer zu ergänzen.";
  } else {
    feedback.className = "feedback error";
    feedback.innerHTML = `<strong>Die Struktur stimmt noch nicht.</strong> ${missing.length} Verbindung${missing.length === 1 ? " fehlt" : "en fehlen"}, ${extra.length} ${extra.length === 1 ? "ist" : "sind"} zu viel.`;
  }
  save(); renderStats();
}

function showHint() {
  const feedback = el("feedback");
  feedback.hidden = false;
  feedback.className = "feedback hint";
  if (state.mode === "build") {
    const task = tasks[state.task];
    const answers = task.nodes.flatMap((n, i) => n.preds.map(p => `${p}-${i}`));
    const missing = answers.find(edge => !state.userEdges.has(edge));
    feedback.innerHTML = missing ? `<strong>Struktur-Tipp:</strong> Laut Vorgangsliste führt eine Verbindung von ${task.nodes[Number(missing.split("-")[0])].id} zu ${task.nodes[Number(missing.split("-")[1])].id}.` : "<strong>Struktur-Tipp:</strong> Prüfe, ob du eine zusätzliche Verbindung eingezeichnet hast.";
    return;
  }
  const firstEmpty = el("network").querySelector("input:not(.correct)");
  const extra = firstEmpty ? ` Beginne bei Vorgang ${tasks[state.task].nodes[Number(firstEmpty.dataset.node)].id} mit ${FIELD_LABELS[firstEmpty.dataset.kind]}.` : "";
  feedback.innerHTML = `<strong>Rechentipp:</strong> ${LEVELS[state.level].hint}${extra}`;
}

function save() {
  localStorage.setItem("netzplan-progress", JSON.stringify({ lastTask: state.task, level: state.level, mode: state.mode, attempts: state.attempts, solved: state.solved }));
}

function renderStats() {
  const solved = Object.keys(state.solved).length;
  const attempts = Object.values(state.attempts).reduce((a, b) => a + b, 0);
  const accuracy = attempts ? `${Math.round(solved / attempts * 100)} %` : "–";
  el("solved-mini").textContent = solved;
  el("accuracy-mini").textContent = accuracy;
  el("stat-solved").textContent = Object.keys(state.attempts).length;
  el("stat-correct").textContent = solved;
  el("stat-accuracy").textContent = accuracy;
  const grid = el("task-grid");
  grid.innerHTML = tasks.map((t, i) => `<button data-task="${i}" class="${state.solved[i] ? "solved" : state.attempts[i] ? "attempted" : ""}" aria-label="Aufgabe ${t.id}: ${t.title}">${t.id}</button>`).join("");
  grid.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { state.task = Number(b.dataset.task); switchView("training"); renderTask(); }));
}

function switchView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === `${view}-view`));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === view));
  el("page-title").textContent = view === "training" ? "Training" : view === "learn" ? "Lernzettel" : "Fortschritt";
  if (view === "progress") renderStats();
}

document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => switchView(b.dataset.view)));
document.querySelectorAll("[data-level]").forEach(b => b.addEventListener("click", () => { state.level = b.dataset.level; renderTask(); }));
document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => { state.mode = b.dataset.mode; renderTask(); }));
el("prev-task").addEventListener("click", () => { state.task = (state.task + 99) % 100; renderTask(); });
el("next-task").addEventListener("click", () => { state.task = (state.task + 1) % 100; renderTask(); });
el("check-button").addEventListener("click", checkAnswers);
el("hint-button").addEventListener("click", showHint);
el("toggle-table").addEventListener("click", () => {
  const wrap = el("task-table-wrap");
  wrap.hidden = !wrap.hidden;
  el("toggle-table").textContent = wrap.hidden ? "Vorgangsliste anzeigen" : "Vorgangsliste ausblenden";
});

renderTask();
renderStats();
