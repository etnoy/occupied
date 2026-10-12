// Generated from occupied-panel.ts by pnpm run build. Do not edit.
// custom_components/occupied/frontend/util.ts
function errorMessage(error) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : String(error);
}
function isValueChangedEvent(event2) {
  return (
    "detail" in event2 &&
    typeof event2.detail === "object" &&
    event2.detail !== null &&
    "value" in event2.detail
  );
}
function required(value) {
  if (value == null)
    throw new Error("Required editor element or value is missing");
  return value;
}
function progress(start, deadline, now = Date.now()) {
  const from = Date.parse(start);
  return Math.max(
    0,
    Math.min(1, (now - from) / Math.max(1, Date.parse(deadline) - from)),
  );
}
function download(name, text2, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text2], { type })),
    link2 = document.createElement("a");
  link2.href = url;
  link2.download = name;
  link2.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
function entityName(catalog, id) {
  return catalog.entities.find((entity) => entity.entity_id === id)?.name || id;
}

// custom_components/occupied/frontend/model.ts
var copy = (value) => structuredClone(value);
var days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
function get(object, path) {
  let value = object;
  for (const key2 of path) value = value == null ? void 0 : value[key2];
  return value;
}
function set(object, path, value) {
  if (!path.length) throw new Error("Cannot set an empty path");
  let parent = object;
  path.slice(0, -1).forEach((key2, i) => {
    parent = parent[key2] ??= typeof path[i + 1] === "number" ? [] : {};
  });
  const last = path[path.length - 1];
  if (value === void 0) delete parent[last];
  else parent[last] = value;
}
function resources(program) {
  return [
    ...(program.groups || []).map((x) => ({ ...x, kind: "group" })),
    ...(program.routines || []).flatMap((r2) => [
      { ...r2, kind: "routine" },
      ...["steps", "activities", "activity_windows"].flatMap((k) =>
        (r2[k] || []).map((x) => ({
          ...x,
          kind:
            k === "steps" ? "step" : k === "activities" ? "activity" : "window",
          routine: r2.id,
        })),
      ),
    ]),
  ];
}
function identifier(program, name) {
  let base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(base)) base = "item_" + base;
  base ||= "item";
  const used = new Set(resources(program).map((x) => x.id));
  let id = base,
    n = 2;
  while (used.has(id)) id = `${base}_${n++}`;
  return id;
}
function references(program, id) {
  const found = [];
  function visit(value, path) {
    if (!value || typeof value !== "object") return;
    for (const [key2, child2] of Object.entries(value)) {
      if (key2 === "data" || key2 === "weights") continue;
      if ((key2 === "relative_to" || key2 === "step") && child2 === id)
        found.push([...path, key2]);
      else if (
        key2 === "groups" &&
        Array.isArray(child2) &&
        child2.includes(id)
      )
        found.push([...path, key2]);
      else if (typeof child2 === "object")
        visit(child2, [...path, Array.isArray(value) ? Number(key2) : key2]);
    }
  }
  visit(program, []);
  return found;
}
function removeResource(program, path) {
  const item = get(program, path),
    ids = [item.id];
  if (path[0] === "routines" && path.length === 2)
    ids.push(
      ...["steps", "activities", "activity_windows"].flatMap((k) =>
        (item[k] || []).map((x) => x.id),
      ),
    );
  const outside = ids
    .flatMap((id) => references(program, id))
    .filter((p) => !path.every((k, i) => p[i] === k));
  if (outside.length)
    throw new Error(
      `Referenced by ${outside.map((p) => p.join(" \u2192 ")).join(", ")}. Remove these references first.`,
    );
  get(program, path.slice(0, -1)).splice(Number(path.at(-1)), 1);
}
function parentSteps(program, child2) {
  const steps = resources(program).filter((x) => x.kind === "step");
  const blocked = /* @__PURE__ */ new Set([child2]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of steps)
      if (blocked.has(s.when?.relative_to) && !blocked.has(s.id)) {
        blocked.add(s.id);
        changed = true;
      }
  }
  return steps.filter((x) => !blocked.has(x.id));
}

// custom_components/occupied/frontend/styles.ts
var styles = `
  p,
  li {
    overflow-wrap: anywhere;
  }
  :host {
    display: block;
    min-height: 100%;
    background: var(--primary-background-color, #f4f5f8);
    color: var(--primary-text-color, #202c37);
    font:
      15px/1.5 system-ui,
      sans-serif;
  }
  * {
    box-sizing: border-box;
  }
  main {
    max-width: 1200px;
    margin: auto;
    padding: 24px;
  }
  h1 {
    margin: 0;
    font-size: 28px;
  }
  h2 {
    font-size: 21px;
    margin: 0 0 12px;
  }
  h3 {
    font-size: 17px;
  }
  p {
    margin: 8px 0;
  }
  small,
  .hint {
    color: var(--secondary-text-color, #596773);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  nav,
  .row,
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  nav {
    margin: 18px 0;
  }
  nav button[aria-current="page"] {
    background: var(--primary-color, #167b94);
    color: white;
  }
  section {
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 12px;
    padding: 20px;
    margin: 16px 0;
    min-width: 0;
  }
  section section {
    border-radius: 8px;
  }
  details {
    padding: 12px 0;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  button,
  input,
  select,
  textarea {
    font: inherit;
    color: inherit;
  }
  button {
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #bdc9d2);
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
    min-height: 42px;
  }
  button.primary {
    background: var(--primary-color, #167b94);
    color: white;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  summary:focus-visible,
  a:focus-visible,
  [tabindex]:focus-visible {
    outline: 3px solid var(--primary-color, #167b94);
    outline-offset: 2px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 12px 0;
    max-width: 700px;
  }
  label {
    font-weight: 500;
  }
  input:not([type="checkbox"]),
  select,
  textarea {
    border: 1px solid var(--divider-color, #bdc9d2);
    border-radius: 6px;
    background: var(--card-background-color, #fff);
    padding: 9px;
    min-width: 0;
    max-width: 100%;
  }
  .field input,
  .field select,
  .field textarea {
    width: 100%;
  }
  textarea {
    resize: vertical;
  }
  .field textarea {
    font:
      14px/1.5 ui-monospace,
      monospace;
  }
  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    vertical-align: middle;
  }
  fieldset {
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 8px;
    margin: 12px 0;
    min-width: 0;
  }
  .banner {
    padding: 12px 16px;
    border-radius: 8px;
    background: var(--secondary-background-color, #e3eef2);
    margin: 12px 0;
    overflow-wrap: anywhere;
  }
  .error,
  [aria-invalid="true"] {
    color: var(--error-color, #b3261e);
  }
  [aria-invalid="true"] {
    border-color: var(--error-color, #b3261e);
  }
  [hidden] {
    display: none !important;
  }
  dl {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) 3fr;
    gap: 8px 20px;
  }
  dt {
    color: var(--secondary-text-color, #596773);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .badge {
    padding: 6px 12px;
    background: var(--secondary-background-color, #e3eef2);
    border-radius: 20px;
  }
  .toolbar {
    position: sticky;
    top: 0;
    padding: 12px 0;
    background: var(--primary-background-color, #f4f5f8);
    z-index: 2;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font:
      13px/1.5 ui-monospace,
      monospace;
  }
  .table-wrap {
    overflow: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 9px;
    text-align: left;
    border-bottom: 1px solid var(--divider-color, #d5dce3);
    max-width: 300px;
    overflow-wrap: anywhere;
  }
  th {
    white-space: nowrap;
  }
  progress {
    width: min(350px, 100%);
    accent-color: var(--primary-color, #167b94);
  }
  .timeline {
    margin: 18px 0;
    padding-top: 42px;
    overflow: hidden;
    position: relative;
  }
  .ruler {
    position: absolute;
    top: 0;
    left: 160px;
    right: 12px;
    height: 40px;
    font-size: 10px;
  }
  .ruler span {
    position: absolute;
    width: 100px;
    transform: translateX(-50%);
  }
  .ruler span:first-child {
    transform: none;
  }
  .ruler span:last-child {
    transform: translateX(-100%);
  }
  .lane {
    display: flex;
    min-height: 36px;
    align-items: center;
  }
  .lane-label {
    width: 150px;
    flex-shrink: 0;
    overflow-wrap: anywhere;
    padding-right: 8px;
    font-size: 12px;
  }
  .track {
    position: relative;
    width: 100%;
    min-width: 0;
    height: 32px;
    margin: 0 12px 0 10px;
    background: var(--secondary-background-color, #f1f4f6);
    border-radius: 4px;
  }
  .bar {
    position: absolute;
    top: 7px;
    height: 18px;
    min-width: 3px;
    border-radius: 3px;
    background: #4f8a96;
  }
  .bar.activity {
    background: #7762a6;
  }
  .bar.active {
    top: 12px;
    height: 8px;
    background: #168555;
  }
  .bar.ramp {
    background: linear-gradient(90deg, #f2d69b, #b88a2e);
  }
  .marker {
    position: absolute;
    top: 3px;
    transform: translateX(-50%);
    color: var(--primary-color, #167b94);
  }
  @media (max-width: 600px) {
    main {
      padding: 14px;
    }
    section {
      padding: 14px;
    }
    nav {
      gap: 5px;
    }
    nav button {
      padding: 7px 10px;
    }
    dl {
      grid-template-columns: 1fr;
      gap: 3px;
    }
    dd {
      margin-bottom: 8px;
    }
    .lane-label {
      width: 90px;
      font-size: 11px;
    }
    .ruler {
      left: 100px;
    }
    .ruler span {
      width: 60px;
    }
    .row input {
      width: 100%;
    }
  }

  /* Routine builder */
  main {
    max-width: 1120px;
    padding: 32px;
  }
  header {
    margin-bottom: 24px;
  }
  header h1 {
    font-size: 24px;
    letter-spacing: -0.7px;
  }
  header p {
    margin: 2px 0;
    font-size: 13px;
  }
  nav {
    border-bottom: 1px solid var(--divider-color, #d5dce3);
    gap: 24px;
    margin: 16px 0 32px;
  }
  nav button,
  nav button[aria-current="page"] {
    border: 0;
    border-radius: 0;
    border-bottom: 3px solid transparent;
    background: transparent;
    padding: 10px 0;
    color: var(--secondary-text-color, #596773);
  }
  nav button[aria-current="page"] {
    border-bottom-color: var(--primary-color, #167b94);
    color: var(--primary-color, #167b94);
    font-weight: 650;
  }
  .field-label-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
  }
  .field-label-row .text-button {
    min-height: 24px;
    padding: 0;
    border: 0;
    font-size: 13px;
  }
  .text-button {
    border-color: transparent;
    background: transparent;
    color: var(--primary-color, #167b94);
    padding-left: 4px;
    padding-right: 4px;
  }
  .page-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin: 24px 0;
  }
  .page-heading h2 {
    font-size: 30px;
    letter-spacing: -0.8px;
    margin: 0;
  }
  .page-heading .hint {
    max-width: 500px;
  }
  .routine-empty {
    text-align: center;
    padding: 60px 32px;
    border-style: dashed;
  }
  .routine-empty h2 {
    font-size: 25px;
    letter-spacing: -0.5px;
  }
  .routine-empty p {
    max-width: 490px;
    margin: 12px auto 24px;
  }
  .empty-steps {
    font-size: 13px;
    color: var(--secondary-text-color, #596773);
  }
  .routine-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 20px;
    min-width: 0;
  }
  .routine-card {
    width: calc(100% - var(--depth) * 14px);
    margin-left: calc(var(--depth) * 14px);
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 12px;
    background: var(--card-background-color, #fff);
    overflow: hidden;
  }
  .routine-row {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr) minmax(0, 0.85fr);
    align-items: center;
    gap: 14px;
    text-align: left;
    width: 100%;
    padding: 20px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
  }
  .routine-row:disabled { opacity: 1; cursor: default; }
  .routine-row:not(:disabled):hover { background: var(--secondary-background-color, #e3eef2); }
  .routine-row[aria-expanded="true"] { border-bottom: 1px solid var(--divider-color, #d5dce3); }
  .routine-card .routine-editor { margin: 0; }
  .step-editor-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .routine-symbol {
    color: var(--primary-color, #167b94);
    font-size: 22px;
    width: 26px;
  }
  .routine-row-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }
  .routine-row strong {
    font-size: 16px;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  .routine-row-content .hint {
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .routine-row-time {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: right;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .step-delete-dialog {
    width: 440px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    overflow: auto;
    padding: 24px;
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 12px;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #202c37);
    box-shadow: 0 6px 24px #0003;
  }
  .step-delete-dialog::backdrop {
    background: #0006;
  }
  .step-delete-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 24px;
  }
  .danger {
    color: var(--error-color, #b3261e);
  }
  .routine-editor {
    max-width: 680px;
    margin: 0 auto 32px;
    padding: 32px;
  }
  .routine-editor h3 {
    font-size: 23px;
    font-weight: 600;
    letter-spacing: -0.5px;
    margin: 28px 0 8px;
  }
  .builder-steps {
    display: flex;
    list-style: none;
    padding: 0 0 20px;
    margin: 20px 0;
    border-bottom: 1px solid var(--divider-color, #d5dce3);
    gap: 24px;
    color: var(--secondary-text-color, #596773);
    font-size: 13px;
  }
  .builder-steps [aria-current="step"] {
    color: var(--primary-color, #167b94);
    font-weight: 750;
  }
  .builder-steps .complete {
    color: var(--primary-text-color, #202c37);
  }
  .entity-native-selector {
    display: block;
    width: 100%;
  }
  .builder-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    border-top: 1px solid var(--divider-color, #d5dce3);
    padding-top: 22px;
    margin-top: 28px;
  }
  .builder-footer button:first-child {
    margin-right: auto;
  }
  .routine-editor details {
    padding: 8px 0;
  }
  .routine-editor .field {
    margin: 18px 0;
  }
  .source-picker {
    position: relative;
  }
  .source-picker ha-generic-picker {
    display: block;
    width: 100%;
  }
  .routine-editor .error {
    font-size: 13px;
  }
  .timing-options {
    border: 0;
    padding: 0;
    margin: 18px 0;
  }
  .timing-option-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .timing-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    min-height: 44px;
    border: 1px solid var(--divider-color, #bdc9d2);
    border-radius: 8px;
    cursor: pointer;
  }
  .timing-option:has(input:checked) {
    border-color: var(--primary-color, #167b94);
    background: var(--secondary-background-color, #e3eef2);
    color: var(--primary-color, #167b94);
  }
  .timing-options input[type="radio"] {
    width: 18px;
    height: 18px;
    padding: 0;
    margin: 0;
    flex: 0 0 auto;
    accent-color: var(--primary-color, #167b94);
  }

  .routine-editor .step-name-editor .field {
    max-width: none;
    margin: 20px 0 28px;
  }
  .editing .step-name-editor label {
    font-weight: 600;
  }
  .editing .step-name-editor input {
    font-family: inherit;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.4;
    padding: 14px;
  }

  .routine-editor.editing {
    max-width: none;
  }
  .editing .editor-sections {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 28px;
  }
  .editing .editor-sections > div {
    min-width: 0;
  }
  .editing h3 {
    margin: 16px 0 8px;
    font-size: 20px;
  }
  .editing .field {
    margin: 14px 0;
  }
  @media (max-width: 900px) {
    .editing .editor-sections {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .editing .editor-sections > div + div {
      border-top: 1px solid var(--divider-color, #d5dce3);
      padding-top: 12px;
    }
  }
  #issues:empty {
    display: none;
  }
  #issues button {
    margin: 0 6px 8px 0;
    text-align: left;
  }
  @media (max-width: 600px) {
    main {
      padding: 18px 14px;
    }
    header {
      gap: 10px;
      margin-bottom: 8px;
    }
    header .row {
      gap: 4px;
    }
    #runtime {
      font-size: 12px;
    }
    nav {
      margin-bottom: 24px;
    }
    .page-heading {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
    }
    .page-heading h2 {
      font-size: 27px;
    }
    .routine-row {
      padding: 14px;
      gap: 10px;
      grid-template-columns: 26px minmax(0, 1fr);
    }
    .routine-row-time {
      grid-column: 2;
      text-align: left;
    }
    .routine-editor {
      padding: 20px 16px;
    }
    .builder-steps {
      gap: 18px;
    }
    .builder-footer {
      gap: 6px;
    }
    .builder-footer button {
      padding: 8px 12px;
    }
    .routine-empty {
      padding: 36px 20px;
    }
    .empty-steps {
      line-height: 2;
    }
  }
`;

// custom_components/occupied/frontend/translations.ts
var sv = {
  "Steps and time sources": "Steg och tidsk\xE4llor",
  "matching sources": "matchande tidsk\xE4llor",
  "No matching steps or time sources.":
    "Inga matchande steg eller tidsk\xE4llor.",
  Steps: "Steg",
  "Solar events": "Solh\xE4ndelser",
  "Home Assistant times": "Home Assistant-tider",
  Calendars: "Kalendrar",
  "Unavailable sources": "Otillg\xE4ngliga tidsk\xE4llor",
  "Search steps or time sources": "S\xF6k efter steg eller tidsk\xE4llor",
  start: "start",
  end: "slut",
  dawn: "gryning",
  dusk: "skymning",
  noon: "solmiddag",
  midnight: "solmidnatt",
  Dawn: "Gryning",
  Dusk: "Skymning",
  "Solar noon": "Solmiddag",
  "Solar midnight": "Solmidnatt",
  "Uses the time currently reported by Home Assistant. Time-only helpers repeat daily; dated sources run only on their reported date.":
    "Anv\xE4nder tiden som Home Assistant rapporterar. Hj\xE4lpare med enbart tid upprepas dagligen; daterade tidsk\xE4llor k\xF6rs bara p\xE5 det rapporterade datumet.",
  "Your steps": "Dina steg",
  "Step type": "Typ av steg",
  "Home Assistant scene": "Home Assistant-scen",
  "Activate scene": "Aktivera scen",
  "Entity service action": "Tj\xE4nsteanrop f\xF6r entiteter",
  "Lights and switches": "Lampor och brytare",
  Settings: "Inst\xE4llningar",
  Tools: "Verktyg",
  "Create step": "Skapa steg",
  "Create your first step": "Skapa ditt f\xF6rsta steg",
  "Discard unsaved changes and open another step?":
    "Kasta osparade \xE4ndringar och \xF6ppna ett annat steg?",
  "Edit step": "Redigera steg",
  "Add related step": "L\xE4gg till relaterat steg",
  "Save step": "Spara steg",
  "Save changes": "Spara \xE4ndringar",
  "Step name": "Stegets namn",
  "Optional, leave blank for auto-generated":
    "Valfritt, l\xE4mna tomt f\xF6r automatisk generering",
  "Preview schedule": "F\xF6rhandsvisa schema",
  "Back to steps": "Tillbaka till steg",
  "Back to settings": "Tillbaka till inst\xE4llningar",
  Continue: "Forts\xE4tt",
  Cancel: "Avbryt",
  Back: "Tillbaka",
  Action: "\xC5tg\xE4rd",
  Timing: "Tidpunkt",
  "Absolute time": "Absolut tid",
  "Relative to": "Relativt till",
  "Start time window": "Tidsintervallets start",
  "Runs at": "K\xF6rs kl.",
  "Runs at a random time between": "K\xF6rs vid en slumpm\xE4ssig tid mellan",
  and: "och",
  "the next day": "n\xE4sta dag",
  Runs: "K\xF6rs",
  step: "steg",
  hour: "timme",
  hours: "timmar",
  minute: "minut",
  minutes: "minuter",
  second: "sekund",
  seconds: "sekunder",
  "Runs at the same time as": "K\xF6rs samtidigt som",
  "the start of": "starten av",
  "Add an end of window to introduce randomness.":
    "L\xE4gg till ett slut p\xE5 tidsintervallet f\xF6r att variera tiden.",
  "Start and end are the same, so the time is fixed.":
    "Start och slut \xE4r samma, s\xE5 tiden \xE4r fast.",
  "End of window (optional)": "Slut p\xE5 tidsintervall (valfritt)",
  "Add end of window": "L\xE4gg till slut p\xE5 tidsintervall",
  "Remove end of window": "Ta bort slut p\xE5 tidsintervall",
  "Start offset": "Startf\xF6rskjutning",
  "End offset (optional)": "Slutf\xF6rskjutning (valfritt)",
  "Add end offset": "L\xE4gg till slutf\xF6rskjutning",
  "Remove end offset": "Ta bort slutf\xF6rskjutning",
  "Choose a step or event": "V\xE4lj ett steg eller en h\xE4ndelse",
  "Turn on": "Sl\xE5 p\xE5",
  "Turn off": "Sl\xE5 av",
  "Every day": "Varje dag",
  Weekends: "Helger",
  before: "f\xF6re",
  after: "efter",
  Sunrise: "Soluppg\xE5ng",
  Sunset: "Solnedg\xE5ng",
  sunrise: "soluppg\xE5ng",
  sunset: "solnedg\xE5ng",
  "Search entities or rooms": "S\xF6k entiteter eller rum",
  selected: "valda",
  "Turn on simulation": "Starta simulering",
  "Turn off simulation": "Stoppa simulering",
  Off: "Av",
  Running: "K\xF6rs",
  Waiting: "V\xE4ntar",
  Paused: "Pausad",
  Overview: "\xD6versikt",
  Handover: "\xD6verg\xE5ng",
  Timeline: "Tidslinje",
  Diagnostics: "Diagnostik",
  "Discard edits": "\xC5terst\xE4ll \xE4ndringar",
  "Reload saved program": "L\xE4s in sparat program",
  "Unsaved edits": "Osparade \xE4ndringar",
  "Loading household\u2026": "L\xE4ser in hush\xE5ll\u2026",
  Enable: "Aktivera",
  Disable: "Inaktivera",
  Pause: "Pausa",
  Resume: "\xC5teruppta",
  "Dry run": "Simulerad k\xF6rning",
  Live: "Enhetsstyrning",
  Status: "Status",
  Reason: "Orsak",
  "Next action": "N\xE4sta \xE5tg\xE4rd",
  "Active activities": "P\xE5g\xE5ende aktiviteter",
  "Lighting convergence": "Ljus\xF6verg\xE5ng",
  Entities: "Entiteter",
  Targets: "M\xE5l",
  Delete: "Radera",
  "Delete step?": "Radera steg?",
  "Delete step": "Radera steg",
  "Used by": "Anv\xE4nds av",
  "Change those relationships before deleting.":
    "\xC4ndra dessa relationer innan du raderar steget.",
  "This step will be removed when you save changes.":
    "Steget tas bort n\xE4r du sparar \xE4ndringarna.",
  Weekdays: "Veckodagar",
  Previous: "F\xF6reg\xE5ende",
  Next: "N\xE4sta",
  Date: "Datum",
  Days: "Dagar",
  Seed: "Slumpfr\xF6",
  Refresh: "Uppdatera",
  "Run preview": "F\xF6rhandsvisa",
  "Reroll preview": "Nytt slumpfr\xF6",
  "Export YAML": "Exportera YAML",
  "Import as draft": "Importera som utkast",
  Download: "Ladda ner",
  None: "Inga",
  mon: "m\xE5n",
  tue: "tis",
  wed: "ons",
  thu: "tor",
  fri: "fre",
  sat: "l\xF6r",
  sun: "s\xF6n",
};
function translator(language) {
  return (key2) => (language?.startsWith("sv") ? sv[key2] : void 0) || key2;
}

// node_modules/.pnpm/esm-env@1.2.2/node_modules/esm-env/dev-fallback.js
var node_env = globalThis.process?.env?.NODE_ENV;
var dev_fallback_default =
  node_env && !node_env.toLowerCase().startsWith("prod");

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/shared/utils.js
var is_array = Array.isArray;
var index_of = Array.prototype.indexOf;
var includes = Array.prototype.includes;
var array_from = Array.from;
var object_keys = Object.keys;
var define_property = Object.defineProperty;
var get_descriptor = Object.getOwnPropertyDescriptor;
var get_descriptors = Object.getOwnPropertyDescriptors;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var get_prototype_of = Object.getPrototypeOf;
var is_extensible = Object.isExtensible;
function is_function(thing) {
  return typeof thing === "function";
}
var noop = () => {};
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i]();
  }
}
function deferred() {
  var resolve;
  var reject;
  var promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function to_array(value, n) {
  if (Array.isArray(value)) {
    return value;
  }
  if (n === void 0 || !(Symbol.iterator in value)) {
    return Array.from(value);
  }
  const array = [];
  for (const element2 of value) {
    array.push(element2);
    if (array.length === n) break;
  }
  return array;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/constants.js
var DERIVED = 1 << 1;
var EFFECT = 1 << 2;
var RENDER_EFFECT = 1 << 3;
var MANAGED_EFFECT = 1 << 24;
var BLOCK_EFFECT = 1 << 4;
var BRANCH_EFFECT = 1 << 5;
var ROOT_EFFECT = 1 << 6;
var BOUNDARY_EFFECT = 1 << 7;
var PAUSED = 1 << 8;
var CONNECTED = 1 << 9;
var CLEAN = 1 << 10;
var DIRTY = 1 << 11;
var MAYBE_DIRTY = 1 << 12;
var INERT = 1 << 13;
var DESTROYED = 1 << 14;
var REACTION_RAN = 1 << 15;
var DESTROYING = 1 << 25;
var EFFECT_TRANSPARENT = 1 << 16;
var EAGER_EFFECT = 1 << 17;
var HEAD_EFFECT = 1 << 18;
var EFFECT_PRESERVED = 1 << 19;
var USER_EFFECT = 1 << 20;
var EFFECT_OFFSCREEN = 1 << 25;
var REACTION_IS_UPDATING = 1 << 21;
var ASYNC = 1 << 22;
var ERROR_VALUE = 1 << 23;
var STATE_SYMBOL = /* @__PURE__ */ Symbol("$state");
var COMPONENT_SYMBOL = /* @__PURE__ */ Symbol("component");
var LEGACY_PROPS = /* @__PURE__ */ Symbol("legacy props");
var LOADING_ATTR_SYMBOL = /* @__PURE__ */ Symbol("");
var PROXY_PATH_SYMBOL = /* @__PURE__ */ Symbol("proxy path");
var ATTRIBUTES_CACHE = /* @__PURE__ */ Symbol("attributes");
var CLASS_CACHE = /* @__PURE__ */ Symbol("class");
var STYLE_CACHE = /* @__PURE__ */ Symbol("style");
var TEXT_CACHE = /* @__PURE__ */ Symbol("text");
var FORM_RESET_HANDLER = /* @__PURE__ */ Symbol("form reset");
var HMR_ANCHOR = /* @__PURE__ */ Symbol("hmr anchor");
var STALE_REACTION = new (class StaleReactionError extends Error {
  name = "StaleReactionError";
  message =
    "The reaction that called `getAbortSignal()` was re-run or destroyed";
})();
var IS_XHTML =
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  !!globalThis.document?.contentType &&
  /* @__PURE__ */ globalThis.document.contentType.includes("xml");
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/constants.js
var EACH_ITEM_REACTIVE = 1;
var EACH_INDEX_REACTIVE = 1 << 1;
var EACH_IS_CONTROLLED = 1 << 2;
var EACH_IS_ANIMATED = 1 << 3;
var EACH_ITEM_IMMUTABLE = 1 << 4;
var PROPS_IS_IMMUTABLE = 1;
var PROPS_IS_RUNES = 1 << 1;
var PROPS_IS_UPDATED = 1 << 2;
var PROPS_IS_BINDABLE = 1 << 3;
var PROPS_IS_LAZY_INITIAL = 1 << 4;
var TRANSITION_OUT = 1 << 1;
var TRANSITION_GLOBAL = 1 << 2;
var TEMPLATE_FRAGMENT = 1;
var TEMPLATE_USE_IMPORT_NODE = 1 << 1;
var TEMPLATE_USE_SVG = 1 << 2;
var TEMPLATE_USE_MATHML = 1 << 3;
var HYDRATION_START = "[";
var HYDRATION_START_ELSE = "[!";
var HYDRATION_START_FAILED = "[?";
var HYDRATION_END = "]";
var HYDRATION_ERROR = {};
var ELEMENT_PRESERVE_ATTRIBUTE_CASE = 1 << 1;
var ELEMENT_IS_INPUT = 1 << 2;
var UNINITIALIZED = /* @__PURE__ */ Symbol("uninitialized");
var FILENAME = /* @__PURE__ */ Symbol("filename");
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/warnings.js
var bold = "font-weight: bold";
var normal = "font-weight: normal";
function await_reactivity_loss(name) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] await_reactivity_loss
%cDetected reactivity loss when reading \`${name}\`. This happens when state is read in an async function after an earlier \`await\`
https://svelte.dev/e/await_reactivity_loss`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/await_reactivity_loss`);
  }
}
function await_waterfall(name, location) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] await_waterfall
%cAn async derived, \`${name}\` (${location}) was not read immediately after it resolved. This often indicates an unnecessary waterfall, which can slow down your app
https://svelte.dev/e/await_waterfall`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/await_waterfall`);
  }
}
function derived_inert() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] derived_inert
%cReading a derived belonging to a now-destroyed effect may result in stale values
https://svelte.dev/e/derived_inert`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/derived_inert`);
  }
}
function hydration_attribute_changed(attribute, html2, value) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] hydration_attribute_changed
%cThe \`${attribute}\` attribute on \`${html2}\` changed its value between server and client renders. The client value, \`${value}\`, will be ignored in favour of the server value
https://svelte.dev/e/hydration_attribute_changed`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/hydration_attribute_changed`);
  }
}
function hydration_mismatch(location) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] hydration_mismatch
%c${location ? `Hydration failed because the initial UI does not match what was rendered on the server. The error occurred near ${location}` : "Hydration failed because the initial UI does not match what was rendered on the server"}
https://svelte.dev/e/hydration_mismatch`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/hydration_mismatch`);
  }
}
function lifecycle_double_unmount() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] lifecycle_double_unmount
%cTried to unmount a component that was not mounted
https://svelte.dev/e/lifecycle_double_unmount`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/lifecycle_double_unmount`);
  }
}
function select_multiple_invalid_value() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] select_multiple_invalid_value
%cThe \`value\` property of a \`<select multiple>\` element should be an array, but it received a non-array value. The selection will be kept as is.
https://svelte.dev/e/select_multiple_invalid_value`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/select_multiple_invalid_value`);
  }
}
function state_proxy_equality_mismatch(operator) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] state_proxy_equality_mismatch
%cReactive \`$state(...)\` proxies and the values they proxy have different identities. Because of this, comparisons with \`${operator}\` will produce unexpected results
https://svelte.dev/e/state_proxy_equality_mismatch`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/state_proxy_equality_mismatch`);
  }
}
function svelte_boundary_reset_noop() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] svelte_boundary_reset_noop
%cA \`<svelte:boundary>\` \`reset\` function only resets the boundary the first time it is called
https://svelte.dev/e/svelte_boundary_reset_noop`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/hydration.js
var hydrating = false;
function set_hydrating(value) {
  hydrating = value;
}
var hydrate_node;
function set_hydrate_node(node) {
  if (node === null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return (hydrate_node = node);
}
function hydrate_next() {
  return set_hydrate_node(get_next_sibling(hydrate_node));
}
function reset(node) {
  if (!hydrating) return;
  if (get_next_sibling(hydrate_node) !== null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  hydrate_node = node;
}
function next(count = 1) {
  if (hydrating) {
    var i = count;
    var node = hydrate_node;
    while (i--) {
      node = /** @type {TemplateNode} */ get_next_sibling(node);
    }
    hydrate_node = node;
  }
}
function skip_nodes(remove = true) {
  var depth = 0;
  var node = hydrate_node;
  while (true) {
    if (node.nodeType === COMMENT_NODE) {
      var data =
        /** @type {Comment} */
        node.data;
      if (data === HYDRATION_END) {
        if (depth === 0) return node;
        depth -= 1;
      } else if (
        data === HYDRATION_START ||
        data === HYDRATION_START_ELSE || // "[1", "[2", etc. for if blocks
        (data[0] === "[" && !isNaN(Number(data.slice(1))))
      ) {
        depth += 1;
      }
    }
    var next2 =
      /** @type {TemplateNode} */
      get_next_sibling(node);
    if (remove) node.remove();
    node = next2;
  }
}
function read_hydration_instruction(node) {
  if (!node || node.nodeType !== COMMENT_NODE) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return (
    /** @type {Comment} */
    node.data
  );
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/equality.js
function equals(value) {
  return value === this.v;
}
function safe_not_equal(a, b) {
  return a != a
    ? b == b
    : a !== b ||
        (a !== null && typeof a === "object") ||
        typeof a === "function";
}
function safe_equals(value) {
  return !safe_not_equal(value, this.v);
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/shared/errors.js
function invariant_violation(message) {
  if (dev_fallback_default) {
    const error = new Error(`invariant_violation
An invariant violation occurred, meaning Svelte's internal assumptions were flawed. This is a bug in Svelte, not your app \u2014 please open an issue at https://github.com/sveltejs/svelte, citing the following message: "${message}"
https://svelte.dev/e/invariant_violation`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/invariant_violation`);
  }
}
function lifecycle_outside_component(name) {
  if (dev_fallback_default) {
    const error = new Error(`lifecycle_outside_component
\`${name}(...)\` can only be used during component initialisation
https://svelte.dev/e/lifecycle_outside_component`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/errors.js
function async_derived_orphan() {
  if (dev_fallback_default) {
    const error = new Error(`async_derived_orphan
Cannot create a \`$derived(...)\` with an \`await\` expression outside of an effect tree
https://svelte.dev/e/async_derived_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/async_derived_orphan`);
  }
}
function derived_references_self() {
  if (dev_fallback_default) {
    const error = new Error(`derived_references_self
A derived value cannot reference itself recursively
https://svelte.dev/e/derived_references_self`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/derived_references_self`);
  }
}
function each_key_duplicate(a, b, value) {
  if (dev_fallback_default) {
    const error = new Error(`each_key_duplicate
${value ? `Keyed each block has duplicate key \`${value}\` at indexes ${a} and ${b}` : `Keyed each block has duplicate key at indexes ${a} and ${b}`}
https://svelte.dev/e/each_key_duplicate`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/each_key_duplicate`);
  }
}
function each_key_volatile(index2, a, b) {
  if (dev_fallback_default) {
    const error = new Error(`each_key_volatile
Keyed each block has key that is not idempotent \u2014 the key for item at index ${index2} was \`${a}\` but is now \`${b}\`. Keys must be the same each time for a given item
https://svelte.dev/e/each_key_volatile`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/each_key_volatile`);
  }
}
function effect_in_teardown(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_teardown
\`${rune}\` cannot be used inside an effect cleanup function
https://svelte.dev/e/effect_in_teardown`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_teardown`);
  }
}
function effect_in_unowned_derived() {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_unowned_derived
Effect cannot be created inside a \`$derived\` value that was not itself created inside an effect
https://svelte.dev/e/effect_in_unowned_derived`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
  }
}
function effect_orphan(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_orphan
\`${rune}\` can only be used inside an effect (e.g. during component initialisation)
https://svelte.dev/e/effect_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_orphan`);
  }
}
function effect_update_depth_exceeded() {
  if (dev_fallback_default) {
    const error = new Error(`effect_update_depth_exceeded
Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state
https://svelte.dev/e/effect_update_depth_exceeded`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
  }
}
function hydration_failed() {
  if (dev_fallback_default) {
    const error = new Error(`hydration_failed
Failed to hydrate the application
https://svelte.dev/e/hydration_failed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/hydration_failed`);
  }
}
function invalid_snippet() {
  if (dev_fallback_default) {
    const error = new Error(`invalid_snippet
Could not \`{@render}\` snippet due to the expression being \`null\` or \`undefined\`. Consider using optional chaining \`{@render snippet?.()}\`
https://svelte.dev/e/invalid_snippet`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/invalid_snippet`);
  }
}
function props_invalid_value(key2) {
  if (dev_fallback_default) {
    const error = new Error(`props_invalid_value
Cannot do \`bind:${key2}={undefined}\` when \`${key2}\` has a fallback value
https://svelte.dev/e/props_invalid_value`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/props_invalid_value`);
  }
}
function rune_outside_svelte(rune) {
  if (dev_fallback_default) {
    const error = new Error(`rune_outside_svelte
The \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files
https://svelte.dev/e/rune_outside_svelte`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/rune_outside_svelte`);
  }
}
function state_descriptors_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_descriptors_fixed
Property descriptors defined on \`$state\` objects must contain \`value\` and always be \`enumerable\`, \`configurable\` and \`writable\`.
https://svelte.dev/e/state_descriptors_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
  }
}
function state_prototype_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_prototype_fixed
Cannot set prototype of \`$state\` object
https://svelte.dev/e/state_prototype_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
  }
}
function state_unsafe_mutation() {
  if (dev_fallback_default) {
    const error = new Error(`state_unsafe_mutation
Updating state inside \`$derived(...)\`, \`$inspect(...)\` or a template expression is forbidden. If the value should not be reactive, declare it without \`$state\`
https://svelte.dev/e/state_unsafe_mutation`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
  }
}
function svelte_boundary_reset_onerror() {
  if (dev_fallback_default) {
    const error = new Error(`svelte_boundary_reset_onerror
A \`<svelte:boundary>\` \`reset\` function cannot be called while an error is still being handled
https://svelte.dev/e/svelte_boundary_reset_onerror`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/flags/index.js
var async_mode_flag = false;
var legacy_mode_flag = false;
var tracing_mode_flag = false;

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dev/tracing.js
var tracing_expressions = null;
function tag(source2, label) {
  source2.label = label;
  tag_proxy(source2.v, label);
  return source2;
}
function tag_proxy(value, label) {
  value?.[PROXY_PATH_SYMBOL]?.(label);
  return value;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/shared/dev.js
function get_error(label) {
  const error = new Error();
  const stack2 = get_stack();
  if (stack2.length === 0) {
    return null;
  }
  stack2.unshift("\n");
  define_property(error, "stack", {
    value: stack2.join("\n"),
  });
  define_property(error, "name", {
    value: label,
  });
  return (
    /** @type {Error & { stack: string }} */
    error
  );
}
function get_stack() {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = Infinity;
  const stack2 = new Error().stack;
  Error.stackTraceLimit = limit;
  if (!stack2) return [];
  const lines = stack2.split("\n");
  const new_lines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const posixified = line.replaceAll("\\", "/");
    if (line.trim() === "Error") {
      continue;
    }
    if (line.includes("validate_each_keys")) {
      return [];
    }
    if (
      posixified.includes("svelte/src/internal") ||
      posixified.includes("node_modules/.vite")
    ) {
      continue;
    }
    new_lines.push(line);
  }
  return new_lines;
}
function invariant(condition, message) {
  if (!dev_fallback_default) {
    throw new Error("invariant(...) was not guarded by if (DEV)");
  }
  if (!condition) invariant_violation(message);
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/context.js
var component_context = null;
function set_component_context(context) {
  component_context = context;
}
var dev_stack = null;
function set_dev_stack(stack2) {
  dev_stack = stack2;
}
var dev_current_component_function = null;
function set_dev_current_component_function(fn) {
  dev_current_component_function = fn;
}
function push(props, runes = false, fn) {
  component_context = {
    p: component_context,
    i: false,
    c: null,
    e: null,
    s: props,
    x: null,
    r:
      /** @type {Effect} */
      active_effect,
    l: legacy_mode_flag && !runes ? { s: null, u: null, $: [] } : null,
  };
  if (dev_fallback_default) {
    component_context.function = fn;
    dev_current_component_function = fn;
  }
}
function pop(component2) {
  var context =
    /** @type {ComponentContext} */
    component_context;
  var effects = context.e;
  if (effects !== null) {
    context.e = null;
    for (var fn of effects) {
      create_user_effect(fn);
    }
  }
  if (component2 !== void 0) {
    context.x = component2;
  }
  context.i = true;
  component_context = context.p;
  if (dev_fallback_default) {
    dev_current_component_function = component_context?.function ?? null;
  }
  return mark_as_component(component2);
}
function mark_as_component(component2 = {}) {
  define_property(component2, COMPONENT_SYMBOL, { value: true });
  return component2;
}
function is_runes() {
  return (
    !legacy_mode_flag ||
    (component_context !== null && component_context.l === null)
  );
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/task.js
var micro_tasks = [];
function run_micro_tasks() {
  var tasks = micro_tasks;
  micro_tasks = [];
  run_all(tasks);
}
function queue_micro_task(fn) {
  if (micro_tasks.length === 0 && !is_flushing_sync) {
    var tasks = micro_tasks;
    queueMicrotask(() => {
      if (tasks === micro_tasks) run_micro_tasks();
    });
  }
  micro_tasks.push(fn);
}
function flush_tasks() {
  while (micro_tasks.length > 0) {
    run_micro_tasks();
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/status.js
var STATUS_MASK = ~(DIRTY | MAYBE_DIRTY | CLEAN);
function set_signal_status(signal, status) {
  signal.f = (signal.f & STATUS_MASK) | status;
}
function update_derived_status(derived3) {
  if ((derived3.f & CONNECTED) !== 0 || derived3.deps === null) {
    set_signal_status(derived3, CLEAN);
  } else {
    set_signal_status(derived3, MAYBE_DIRTY);
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/utils.js
function defer_effect(effect2, dirty_effects, maybe_dirty_effects) {
  if ((effect2.f & DIRTY) !== 0) {
    dirty_effects.add(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    maybe_dirty_effects.add(effect2);
  }
  set_signal_status(effect2, CLEAN);
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/misc.js
function remove_textarea_child(dom) {
  if (hydrating && get_first_child(dom) !== null) {
    clear_text_content(dom);
  }
}
var listening_to_form_reset = false;
function add_form_reset_listener() {
  if (!listening_to_form_reset) {
    listening_to_form_reset = true;
    document.addEventListener(
      "reset",
      (evt) => {
        Promise.resolve().then(() => {
          if (!evt.defaultPrevented) {
            /**@type {HTMLFormElement} */
            for (const e of evt.target.elements) {
              e[FORM_RESET_HANDLER]?.();
            }
          }
        });
      },
      // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
      { capture: true },
    );
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function without_reactive_context(fn) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    return fn();
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/async.js
function flatten(blockers, sync, async2, fn) {
  const d = is_runes() ? derived : derived_safe_equal;
  var pending2 = blockers.filter((b) => !b.settled);
  var deriveds = sync.map(d);
  if (dev_fallback_default) {
    deriveds.forEach((d2, i) => {
      d2.label = sync[i]
        .toString()
        .replace("() => ", "")
        .replaceAll("$.eager(() => ", "$state.eager(")
        .replace(/\$\.get\((.+?)\)/g, (_, id) => id);
    });
  }
  if (async2.length === 0 && pending2.length === 0) {
    fn(deriveds);
    return;
  }
  var parent =
    /** @type {Effect} */
    active_effect;
  var restore = capture();
  var blocker_promise =
    pending2.length === 1
      ? pending2[0].promise
      : pending2.length > 1
        ? Promise.all(pending2.map((b) => b.promise))
        : null;
  function finish(async3) {
    if ((parent.f & DESTROYED) !== 0) {
      return;
    }
    restore();
    try {
      fn([...deriveds, ...async3]);
    } catch (error) {
      invoke_error_boundary(error, parent);
    }
    unset_context();
  }
  var decrement_pending = increment_pending();
  if (async2.length === 0) {
    blocker_promise.then(() => finish([])).finally(decrement_pending);
    return;
  }
  function run3() {
    Promise.all(async2.map((expression) => async_derived(expression)))
      .then(finish)
      .catch((error) => invoke_error_boundary(error, parent))
      .finally(decrement_pending);
  }
  if (blocker_promise) {
    blocker_promise.then(() => {
      if ((parent.f & DESTROYED) !== 0) {
        decrement_pending();
        return;
      }
      restore();
      run3();
      unset_context();
    });
  } else {
    run3();
  }
}
function capture() {
  var previous_effect =
    /** @type {Effect} */
    active_effect;
  var previous_reaction = active_reaction;
  var previous_component_context = component_context;
  var previous_batch2 =
    /** @type {Batch} */
    current_batch;
  if (dev_fallback_default) {
    var previous_dev_stack = dev_stack;
  }
  return function restore(activate_batch = true) {
    set_active_effect(previous_effect);
    set_active_reaction(previous_reaction);
    set_component_context(previous_component_context);
    if (activate_batch && (previous_effect.f & DESTROYED) === 0) {
      previous_batch2?.activate();
      previous_batch2?.apply();
    }
    if (dev_fallback_default) {
      set_reactivity_loss_tracker(null);
      set_dev_stack(previous_dev_stack);
    }
  };
}
var restored = false;
function unset_context(deactivate_batch = true) {
  restored = false;
  set_active_effect(null);
  set_active_reaction(null);
  set_component_context(null);
  if (deactivate_batch) current_batch?.deactivate();
  if (dev_fallback_default) {
    set_reactivity_loss_tracker(null);
    set_dev_stack(null);
  }
}
function increment_pending() {
  var effect2 =
    /** @type {Effect} */
    active_effect;
  var boundary2 = effect2.b;
  var batch =
    /** @type {Batch} */
    current_batch;
  var blocking = !!boundary2?.is_rendered();
  boundary2?.update_pending_count(1, batch);
  batch.increment(blocking, effect2);
  return () => {
    boundary2?.update_pending_count(-1, batch);
    batch.decrement(blocking, effect2);
  };
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/deriveds.js
var reactivity_loss_tracker = null;
function set_reactivity_loss_tracker(v) {
  reactivity_loss_tracker = v;
}
var recent_async_deriveds = /* @__PURE__ */ new Set();
// @__NO_SIDE_EFFECTS__
function derived(fn) {
  var flags2 = DERIVED | DIRTY;
  if (active_effect !== null) {
    active_effect.f |= EFFECT_PRESERVED;
  }
  const signal = {
    ctx: component_context,
    deps: null,
    effects: null,
    equals,
    f: flags2,
    fn,
    reactions: null,
    rv: 0,
    v:
      /** @type {V} */
      UNINITIALIZED,
    wv: 0,
    parent: active_effect,
    ac: null,
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = get_error("created at");
  }
  return signal;
}
var OBSOLETE = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function async_derived(fn, label, location) {
  let parent =
    /** @type {Effect | null} */
    active_effect;
  if (parent === null) {
    async_derived_orphan();
  }
  var promise =
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0;
  var signal = source(
    /** @type {V} */
    UNINITIALIZED,
  );
  if (dev_fallback_default) signal.label = label ?? fn.toString();
  var should_suspend = !active_reaction;
  var deferreds = /* @__PURE__ */ new Set();
  async_effect(() => {
    var effect2 =
      /** @type {Effect} */
      active_effect;
    if (dev_fallback_default) {
      reactivity_loss_tracker = {
        effect: effect2,
        effect_deps: /* @__PURE__ */ new Set(),
        warned: false,
      };
    }
    var d = deferred();
    promise = d.promise;
    try {
      Promise.resolve(fn())
        .then(d.resolve, (e) => {
          if (e !== STALE_REACTION) d.reject(e);
        })
        .finally(unset_context);
    } catch (error) {
      d.reject(error);
      unset_context();
    }
    if (dev_fallback_default) {
      if (reactivity_loss_tracker) {
        if (effect2.deps !== null) {
          for (let i = 0; i < skipped_deps; i += 1) {
            reactivity_loss_tracker.effect_deps.add(effect2.deps[i]);
          }
        }
        if (new_deps !== null) {
          for (let i = 0; i < new_deps.length; i += 1) {
            reactivity_loss_tracker.effect_deps.add(new_deps[i]);
          }
        }
      }
      reactivity_loss_tracker = null;
    }
    var batch =
      /** @type {Batch} */
      current_batch;
    if (should_suspend) {
      if ((effect2.f & REACTION_RAN) !== 0) {
        var decrement_pending = increment_pending();
      }
      if (
        // boundary can be null if the async derived is inside an $effect.root not connected to the component render tree
        parent.b?.is_rendered()
      ) {
        batch.async_deriveds.get(effect2)?.reject(OBSOLETE);
      } else {
        for (const d2 of deferreds.values()) {
          d2.reject(OBSOLETE);
        }
      }
      deferreds.add(d);
      batch.async_deriveds.set(effect2, d);
    }
    const handler = (value, error = void 0) => {
      if (dev_fallback_default) {
        reactivity_loss_tracker = null;
      }
      decrement_pending?.();
      deferreds.delete(d);
      if (error === OBSOLETE) return;
      batch.activate();
      if (error) {
        signal.f |= ERROR_VALUE;
        internal_set(signal, error);
      } else {
        if ((signal.f & ERROR_VALUE) !== 0) {
          signal.f ^= ERROR_VALUE;
        }
        if (
          dev_fallback_default &&
          location !== void 0 &&
          !signal.equals(value)
        ) {
          recent_async_deriveds.add(signal);
          setTimeout(() => {
            if (
              recent_async_deriveds.has(signal) &&
              (effect2.f & DESTROYED) === 0
            ) {
              await_waterfall(
                /** @type {string} */
                signal.label,
                location,
              );
              recent_async_deriveds.delete(signal);
            }
          });
        }
        internal_set(signal, value);
      }
      batch.deactivate();
    };
    d.promise.then(handler, (e) => handler(null, e || "unknown"));
  });
  teardown(() => {
    for (const d of deferreds) {
      d.reject(OBSOLETE);
    }
  });
  if (dev_fallback_default) {
    signal.f |= ASYNC;
  }
  return new Promise((fulfil) => {
    function next2(p) {
      function go() {
        if (p === promise) {
          fulfil(signal);
        } else {
          next2(promise);
        }
      }
      p.then(go, go);
    }
    next2(promise);
  });
}
// @__NO_SIDE_EFFECTS__
function user_derived(fn) {
  const d = /* @__PURE__ */ derived(fn);
  if (!async_mode_flag) push_reaction_value(d);
  return d;
}
// @__NO_SIDE_EFFECTS__
function derived_safe_equal(fn) {
  const signal = /* @__PURE__ */ derived(fn);
  signal.equals = safe_equals;
  return signal;
}
function destroy_derived_effects(derived3) {
  var effects = derived3.effects;
  if (effects !== null) {
    derived3.effects = null;
    for (var i = 0; i < effects.length; i += 1) {
      destroy_effect(
        /** @type {Effect} */
        effects[i],
      );
    }
  }
}
var stack = [];
function execute_derived(derived3) {
  var value;
  var prev_active_effect = active_effect;
  var parent = derived3.parent;
  if (
    !is_destroying_effect &&
    parent !== null &&
    derived3.v !== UNINITIALIZED && // if it was never evaluated before, it's guaranteed to fail downstream, so we try to execute instead
    (parent.f & (DESTROYED | INERT)) !== 0
  ) {
    derived_inert();
    return derived3.v;
  }
  set_active_effect(parent);
  if (dev_fallback_default) {
    let prev_eager_effects = eager_effects;
    set_eager_effects(/* @__PURE__ */ new Set());
    try {
      if (includes.call(stack, derived3)) {
        derived_references_self();
      }
      stack.push(derived3);
      destroy_derived_effects(derived3);
      value = update_reaction(derived3);
    } finally {
      set_active_effect(prev_active_effect);
      set_eager_effects(prev_eager_effects);
      stack.pop();
    }
  } else {
    try {
      destroy_derived_effects(derived3);
      value = update_reaction(derived3);
    } finally {
      set_active_effect(prev_active_effect);
    }
  }
  return value;
}
function update_derived(derived3) {
  var value = execute_derived(derived3);
  if (!derived3.equals(value)) {
    derived3.wv = increment_write_version();
    if (!current_batch?.is_fork || derived3.deps === null) {
      if (current_batch !== null) {
        current_batch.capture(derived3, value, true);
        previous_batch?.capture(derived3, value, true);
      } else {
        derived3.v = value;
      }
      if (derived3.deps === null) {
        set_signal_status(derived3, CLEAN);
        return;
      }
    }
  }
  if (is_destroying_effect) {
    return;
  }
  if (batch_values !== null) {
    if (effect_tracking() || current_batch?.is_fork) {
      batch_values.set(derived3, value);
    }
  } else {
    update_derived_status(derived3);
  }
}
function freeze_derived_effects(derived3) {
  if (derived3.effects === null) return;
  for (const e of derived3.effects) {
    if (e.teardown || e.ac) {
      e.teardown?.();
      if (e.ac !== null) {
        without_reactive_context(() => {
          e.ac.abort(STALE_REACTION);
          e.ac = null;
        });
      }
      if (e.fn !== null) e.teardown = noop;
      remove_reactions(e, 0);
      destroy_effect_children(e);
    }
  }
}
function unfreeze_derived_effects(derived3) {
  if (derived3.effects === null) return;
  for (const e of derived3.effects) {
    if (e.teardown && e.fn !== null) {
      update_effect(e);
    }
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/batch.js
var first_batch = null;
var last_batch = null;
var current_batch = null;
var previous_batch = null;
var batch_values = null;
var last_scheduled_effect = null;
var is_flushing_sync = false;
var is_processing = false;
var collected_effects = null;
var legacy_updates = null;
var flush_count = 0;
var source_stacks = /* @__PURE__ */ new Set();
var uid = 1;
var Batch = class _Batch {
  id = uid++;
  /** True as soon as `#process` was called */
  #started = false;
  linked = true;
  /** @type {Batch | null} */
  #prev = null;
  /** @type {Batch | null} */
  #next = null;
  /** @type {Map<Effect, ReturnType<typeof deferred<any>>>} */
  async_deriveds = /* @__PURE__ */ new Map();
  /**
   * The current values of any signals that are updated in this batch.
   * Tuple format: [value, is_derived] (note: is_derived is false for deriveds, too, if they were overridden via assignment)
   * They keys of this map are identical to `this.#previous`
   * @type {Map<Value, [any, boolean]>}
   */
  current = /* @__PURE__ */ new Map();
  /**
   * The values of any signals (sources and deriveds) that are updated in this batch _before_ those updates took place.
   * They keys of this map are identical to `this.#current`
   * @type {Map<Value, any>}
   */
  previous = /* @__PURE__ */ new Map();
  /**
   * When the batch is committed (and the DOM is updated), we need to remove old branches
   * and append new ones by calling the functions added inside (if/each/key/etc) blocks
   * @type {Set<(batch: Batch) => void>}
   */
  #commit_callbacks = /* @__PURE__ */ new Set();
  /**
   * If a fork is discarded, we need to destroy any effects that are no longer needed
   * @type {Set<(batch: Batch) => void>}
   */
  #discard_callbacks = /* @__PURE__ */ new Set();
  /**
   * The number of async effects that are currently in flight
   */
  #pending = 0;
  /**
   * Async effects that are currently in flight, _not_ inside a pending boundary
   * @type {Map<Effect, number>}
   */
  #blocking_pending = /* @__PURE__ */ new Map();
  /**
   * A deferred that resolves when the batch is committed, used with `settled()`
   * TODO replace with Promise.withResolvers once supported widely enough
   * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
   */
  #deferred = null;
  /**
   * Effects that were scheduled in this batch but not yet 'resolved' into the
   * root effects that need to be flushed. Resolving — the upwards traversal that
   * marks the path to each effect on the shared effect tree (see #resolve) — is
   * deferred until the batch is processed, so that the markers are created and
   * consumed within a single traversal. Scheduling into other batches (which can
   * happen concurrently, e.g. while a batch is committed) can therefore never
   * observe (and be confused by) this batch's markers.
   * May contain duplicates — deduplication happens during resolving
   * @type {Effect[]}
   */
  #scheduled = [];
  /**
   * Effects created while this batch was active.
   * @type {Effect[]}
   */
  #new_effects = [];
  /**
   * Deferred effects (which run after async work has completed) that are DIRTY
   * @type {Set<Effect>}
   */
  #dirty_effects = /* @__PURE__ */ new Set();
  /**
   * Deferred effects that are MAYBE_DIRTY
   * @type {Set<Effect>}
   */
  #maybe_dirty_effects = /* @__PURE__ */ new Set();
  /**
   * A map of branches that still exist, but will be destroyed when this batch
   * is committed — we skip over these during `process`.
   * The value contains child effects that were dirty/maybe_dirty before being reset,
   * so they can be rescheduled if the branch survives.
   * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
   */
  #skipped_branches = /* @__PURE__ */ new Map();
  /**
   * Inverse of #skipped_branches which we need to tell prior batches to unskip them when committing
   * @type {Set<Effect>}
   */
  #unskipped_branches = /* @__PURE__ */ new Set();
  is_fork = false;
  #decrement_queued = false;
  constructor() {
    if (last_batch === null) {
      first_batch = last_batch = this;
    } else {
      last_batch.#next = this;
      this.#prev = last_batch;
    }
    last_batch = this;
  }
  #is_deferred() {
    if (this.is_fork) return true;
    for (const effect2 of this.#blocking_pending.keys()) {
      var e = effect2;
      var skipped = false;
      while (e.parent !== null) {
        if (this.#skipped_branches.has(e)) {
          skipped = true;
          break;
        }
        e = e.parent;
      }
      if (!skipped) {
        return true;
      }
    }
    return false;
  }
  /**
   * Add an effect to the #skipped_branches map and reset its children
   * @param {Effect} effect
   */
  skip_effect(effect2) {
    if (!this.#skipped_branches.has(effect2)) {
      this.#skipped_branches.set(effect2, { d: [], m: [] });
    }
    this.#unskipped_branches.delete(effect2);
  }
  /**
   * Remove an effect from the #skipped_branches map and reschedule
   * any tracked dirty/maybe_dirty child effects
   * @param {Effect} effect
   * @param {(e: Effect) => void} callback
   */
  unskip_effect(effect2, callback = (e) => this.schedule(e)) {
    var tracked = this.#skipped_branches.get(effect2);
    if (tracked) {
      this.#skipped_branches.delete(effect2);
      for (var e of tracked.d) {
        set_signal_status(e, DIRTY);
        callback(e);
      }
      for (e of tracked.m) {
        set_signal_status(e, MAYBE_DIRTY);
        callback(e);
      }
    }
    this.#unskipped_branches.add(effect2);
  }
  /**
   * Convert the effects that were scheduled in this batch into the root effects
   * that need to be traversed, marking the path to each effect (by clearing the
   * `CLEAN` flag on ancestor branches) so that the traversal can find them.
   * This happens right before traversal rather than at scheduling time, so that
   * the markers left on the (shared) effect tree are created and consumed within
   * a single traversal — scheduling into other batches can never observe them
   * @returns {Effect[]}
   */
  #resolve() {
    var roots = [];
    for (const effect2 of this.#scheduled) {
      if (
        (effect2.f & DESTROYED) !== 0 ||
        (effect2.f & (DIRTY | MAYBE_DIRTY)) === 0
      )
        continue;
      var e = effect2;
      var covered = false;
      while (e.parent !== null) {
        e = e.parent;
        var flags2 = e.f;
        if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
          if ((flags2 & CLEAN) === 0) {
            covered = true;
            break;
          }
          e.f ^= CLEAN;
        }
      }
      if (!covered) {
        roots.push(e);
      }
    }
    this.#scheduled = [];
    return roots;
  }
  #process() {
    this.#started = true;
    if (dev_fallback_default) {
      for (const value of this.current.keys()) {
        source_stacks.add(value);
      }
    }
    for (const e of this.#dirty_effects) {
      this.#maybe_dirty_effects.delete(e);
      set_signal_status(e, DIRTY);
      this.schedule(e);
    }
    for (const e of this.#maybe_dirty_effects) {
      set_signal_status(e, MAYBE_DIRTY);
      this.schedule(e);
    }
    this.apply();
    var effects = (collected_effects = []);
    var render_effects = [];
    var updates = (legacy_updates = []);
    while (this.#scheduled.length > 0) {
      if (flush_count++ > 1e3) {
        this.#unlink();
        infinite_loop_guard();
      }
      for (const root19 of this.#resolve()) {
        try {
          this.#traverse(root19, effects, render_effects);
        } catch (e) {
          reset_all(root19);
          if (!this.#is_deferred()) this.discard();
          throw e;
        }
      }
    }
    current_batch = null;
    if (updates.length > 0) {
      var batch = _Batch.ensure();
      for (const e of updates) {
        batch.schedule(e);
      }
    }
    collected_effects = null;
    legacy_updates = null;
    if (this.#is_deferred()) {
      this.#defer_effects(render_effects);
      this.#defer_effects(effects);
      for (const [e, t] of this.#skipped_branches) {
        reset_branch(e, t);
      }
      if (updates.length > 0) {
        /** @type {unknown} */
        current_batch.#process();
      }
      return;
    }
    const earlier_batch = this.#find_earlier_batch();
    if (earlier_batch) {
      this.#defer_effects(render_effects);
      this.#defer_effects(effects);
      earlier_batch.#merge(this);
      return;
    }
    this.#dirty_effects.clear();
    this.#maybe_dirty_effects.clear();
    for (const fn of this.#commit_callbacks) fn(this);
    this.#commit_callbacks.clear();
    previous_batch = this;
    flush_queued_effects(render_effects);
    flush_queued_effects(effects);
    previous_batch = null;
    this.#deferred?.resolve();
    var next_batch =
      /** @type {Batch | null} */
      /** @type {unknown} */
      current_batch;
    if (
      this.#pending === 0 &&
      (this.#scheduled.length === 0 || next_batch !== null)
    ) {
      this.#unlink();
      if (async_mode_flag) {
        this.#commit();
        current_batch = next_batch;
      }
    }
    if (this.#scheduled.length > 0) {
      if (next_batch !== null) {
        for (const e of this.#scheduled) {
          next_batch.#scheduled.push(e);
        }
        this.#scheduled = [];
      } else {
        next_batch = this;
      }
    }
    if (next_batch !== null) {
      old_values.clear();
      next_batch.#process();
    }
  }
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   * @param {Effect[]} effects
   * @param {Effect[]} render_effects
   */
  #traverse(root19, effects, render_effects) {
    root19.f ^= CLEAN;
    var effect2 = root19.first;
    while (effect2 !== null) {
      var flags2 = effect2.f;
      var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
      var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
      var skip =
        is_skippable_branch ||
        (flags2 & INERT) !== 0 ||
        this.#skipped_branches.has(effect2);
      if (!skip && effect2.fn !== null) {
        if (is_branch) {
          effect2.f ^= CLEAN;
        } else if ((flags2 & EFFECT) !== 0) {
          effects.push(effect2);
        } else if (
          async_mode_flag &&
          (flags2 & (RENDER_EFFECT | MANAGED_EFFECT)) !== 0
        ) {
          render_effects.push(effect2);
        } else if (is_dirty(effect2)) {
          if ((flags2 & BLOCK_EFFECT) !== 0)
            this.#maybe_dirty_effects.add(effect2);
          update_effect(effect2);
        }
        var child2 = effect2.first;
        if (child2 !== null) {
          effect2 = child2;
          continue;
        }
      }
      while (effect2 !== null) {
        var next2 = effect2.next;
        if (next2 !== null) {
          effect2 = next2;
          break;
        }
        effect2 = effect2.parent;
      }
    }
  }
  #find_earlier_batch() {
    var batch = this.#prev;
    while (batch !== null) {
      if (!batch.is_fork) {
        for (const [value, [, is_derived]] of this.current) {
          if (batch.current.has(value) && !is_derived) {
            return batch;
          }
        }
      }
      batch = batch.#prev;
    }
    return null;
  }
  /**
   * @param {Batch} batch
   */
  #merge(batch) {
    for (const [source2, value] of batch.current) {
      if (!this.previous.has(source2) && batch.previous.has(source2)) {
        this.previous.set(source2, batch.previous.get(source2));
      }
      this.current.set(source2, value);
    }
    for (const [effect2, deferred2] of batch.async_deriveds) {
      const d = this.async_deriveds.get(effect2);
      if (d) deferred2.promise.then(d.resolve).catch(d.reject);
    }
    batch.async_deriveds.clear();
    this.transfer_effects(batch.#dirty_effects, batch.#maybe_dirty_effects);
    const mark = (value) => {
      var reactions = value.reactions;
      if (reactions === null) return;
      if (
        (value.f & DERIVED) !== 0 &&
        (value.f & (DIRTY | MAYBE_DIRTY)) === 0
      ) {
        return;
      }
      for (const reaction of reactions) {
        var flags2 = reaction.f;
        if ((flags2 & DERIVED) !== 0) {
          mark(
            /** @type {Derived} */
            reaction,
          );
        } else {
          var effect2 =
            /** @type {Effect} */
            reaction;
          if (
            flags2 & (ASYNC | BLOCK_EFFECT) &&
            !this.async_deriveds.has(effect2)
          ) {
            this.#maybe_dirty_effects.delete(effect2);
            set_signal_status(effect2, DIRTY);
            this.schedule(effect2);
          }
        }
      }
    };
    for (const source2 of this.current.keys()) {
      mark(source2);
    }
    this.oncommit(() => batch.discard());
    batch.#unlink();
    current_batch = this;
    this.#process();
  }
  /**
   * @param {Effect[]} effects
   */
  #defer_effects(effects) {
    for (var i = 0; i < effects.length; i += 1) {
      defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects);
    }
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Value} source
   * @param {any} value
   * @param {boolean} [is_derived]
   */
  capture(source2, value, is_derived = false) {
    if (source2.v !== UNINITIALIZED && !this.previous.has(source2)) {
      this.previous.set(source2, source2.v);
    }
    if ((source2.f & ERROR_VALUE) === 0) {
      this.current.set(source2, [value, is_derived]);
      batch_values?.set(source2, value);
    }
    if (!this.is_fork) {
      source2.v = value;
    }
  }
  activate() {
    current_batch = this;
  }
  deactivate() {
    current_batch = null;
    batch_values = null;
  }
  flush() {
    try {
      if (dev_fallback_default) {
        source_stacks.clear();
      }
      is_processing = true;
      current_batch = this;
      this.#process();
    } finally {
      flush_count = 0;
      last_scheduled_effect = null;
      collected_effects = null;
      legacy_updates = null;
      is_processing = false;
      current_batch = null;
      batch_values = null;
      old_values.clear();
      if (dev_fallback_default) {
        for (const source2 of source_stacks) {
          source2.updated = null;
        }
      }
    }
  }
  discard() {
    for (const fn of this.#discard_callbacks) fn(this);
    this.#discard_callbacks.clear();
    for (const deferred2 of this.async_deriveds.values()) {
      deferred2.reject(OBSOLETE);
    }
    this.#unlink();
    this.#deferred?.resolve();
  }
  /**
   * @param {Effect} effect
   */
  register_created_effect(effect2) {
    this.#new_effects.push(effect2);
  }
  #commit() {
    for (let batch = first_batch; batch !== null; batch = batch.#next) {
      var is_earlier = batch.id < this.id;
      var sources = [];
      for (const [source3, [value, is_derived]] of this.current) {
        if (batch.current.has(source3)) {
          var batch_value =
            /** @type {[any, boolean]} */
            batch.current.get(source3)[0];
          if (is_earlier && value !== batch_value) {
            batch.current.set(source3, [value, is_derived]);
          } else {
            continue;
          }
        }
        sources.push(source3);
      }
      if (is_earlier) {
        for (const [effect2, deferred2] of this.async_deriveds) {
          const d = batch.async_deriveds.get(effect2);
          if (d) deferred2.promise.then(d.resolve).catch(d.reject);
        }
      }
      var current = [...batch.current.keys()].filter(
        (source3) =>
          !(/** @type {[any, boolean]} */ batch.current.get(source3)[1]),
      );
      if (!batch.#started || current.length === 0) continue;
      var others = current.filter((source3) => !this.current.has(source3));
      if (others.length === 0) {
        if (is_earlier) {
          batch.discard();
        }
      } else if (sources.length > 0) {
        if (dev_fallback_default && !batch.#decrement_queued) {
          invariant(
            batch.#scheduled.length === 0,
            "Batch has scheduled effects",
          );
        }
        if (is_earlier) {
          for (const unskipped of this.#unskipped_branches) {
            batch.unskip_effect(unskipped, (e) => {
              if ((e.f & (BLOCK_EFFECT | ASYNC)) !== 0) {
                batch.schedule(e);
              } else {
                batch.#defer_effects([e]);
              }
            });
          }
        }
        batch.activate();
        var marked = /* @__PURE__ */ new Set();
        var checked = /* @__PURE__ */ new Map();
        for (var source2 of sources) {
          mark_effects(source2, others, marked, checked);
        }
        checked = /* @__PURE__ */ new Map();
        var current_unequal = [...batch.current]
          .filter(([c, v1]) => {
            const v2 = this.current.get(c);
            if (!v2) return true;
            return v2[0] !== v1[0] || v2[1] !== v1[1];
          })
          .map(([c]) => c);
        if (current_unequal.length > 0) {
          for (const effect2 of this.#new_effects) {
            if (
              (effect2.f & (DESTROYED | INERT | EAGER_EFFECT)) === 0 &&
              depends_on(effect2, current_unequal, checked)
            ) {
              if ((effect2.f & (ASYNC | BLOCK_EFFECT)) !== 0) {
                set_signal_status(effect2, DIRTY);
                batch.schedule(effect2);
              } else {
                batch.#dirty_effects.add(effect2);
              }
            }
          }
        }
        if (batch.#scheduled.length > 0 && !batch.#decrement_queued) {
          batch.apply();
          for (var root19 of batch.#resolve()) {
            batch.#traverse(root19, [], []);
          }
        }
        batch.deactivate();
      }
    }
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  increment(blocking, effect2) {
    this.#pending += 1;
    if (blocking) {
      let blocking_pending_count = this.#blocking_pending.get(effect2) ?? 0;
      this.#blocking_pending.set(effect2, blocking_pending_count + 1);
    }
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  decrement(blocking, effect2) {
    this.#pending -= 1;
    if (blocking) {
      let blocking_pending_count = this.#blocking_pending.get(effect2) ?? 0;
      if (blocking_pending_count === 1) {
        this.#blocking_pending.delete(effect2);
      } else {
        this.#blocking_pending.set(effect2, blocking_pending_count - 1);
      }
    }
    if (this.#decrement_queued) return;
    this.#decrement_queued = true;
    queue_micro_task(() => {
      this.#decrement_queued = false;
      if (this.linked) {
        this.flush();
      }
    });
  }
  /**
   * @param {Set<Effect>} dirty_effects
   * @param {Set<Effect>} maybe_dirty_effects
   */
  transfer_effects(dirty_effects, maybe_dirty_effects) {
    for (const e of dirty_effects) {
      this.#dirty_effects.add(e);
    }
    for (const e of maybe_dirty_effects) {
      this.#maybe_dirty_effects.add(e);
    }
    dirty_effects.clear();
    maybe_dirty_effects.clear();
  }
  /** @param {(batch: Batch) => void} fn */
  oncommit(fn) {
    this.#commit_callbacks.add(fn);
  }
  /** @param {(batch: Batch) => void} fn */
  ondiscard(fn) {
    this.#discard_callbacks.add(fn);
  }
  settled() {
    return (this.#deferred ??= deferred()).promise;
  }
  static ensure() {
    if (current_batch === null) {
      const batch = (current_batch = new _Batch());
      if (!is_processing && !is_flushing_sync) {
        queue_micro_task(() => {
          if (!batch.#started) {
            batch.flush();
          }
        });
      }
    }
    return current_batch;
  }
  apply() {
    if (
      !async_mode_flag ||
      (!this.is_fork && this.#prev === null && this.#next === null)
    ) {
      batch_values = null;
      return;
    }
    batch_values = /* @__PURE__ */ new Map();
    for (const [source2, [value]] of this.current) {
      batch_values.set(source2, value);
    }
    for (let batch = first_batch; batch !== null; batch = batch.#next) {
      if (batch === this || batch.is_fork) continue;
      var intersects = false;
      if (batch.id < this.id) {
        for (const [source2, [, is_derived]] of batch.current) {
          if (is_derived) continue;
          if (this.current.has(source2)) {
            intersects = true;
            break;
          }
        }
      }
      if (!intersects) {
        for (const [source2, previous] of batch.previous) {
          if (!batch_values.has(source2)) {
            batch_values.set(source2, previous);
          }
        }
      }
    }
  }
  /**
   *
   * @param {Effect} effect
   */
  schedule(effect2) {
    last_scheduled_effect = effect2;
    if (
      effect2.b?.is_pending &&
      (effect2.f & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0 &&
      (effect2.f & REACTION_RAN) === 0
    ) {
      effect2.b.defer_effect(effect2);
      return;
    }
    this.#scheduled.push(effect2);
  }
  #unlink() {
    if (!this.linked) return;
    var prev = this.#prev;
    var next2 = this.#next;
    if (prev === null) {
      first_batch = next2;
    } else {
      prev.#next = next2;
    }
    if (next2 === null) {
      last_batch = prev;
    } else {
      next2.#prev = prev;
    }
    this.linked = false;
  }
};
function flushSync(fn) {
  var was_flushing_sync = is_flushing_sync;
  var prev_previous_batch = previous_batch;
  previous_batch = null;
  is_flushing_sync = true;
  try {
    var result;
    if (fn) {
      flushSync();
      result = fn();
    }
    while (true) {
      flush_tasks();
      if (current_batch === null) {
        return (
          /** @type {T} */
          result
        );
      }
      current_batch.flush();
    }
  } finally {
    is_flushing_sync = was_flushing_sync;
    previous_batch = prev_previous_batch;
  }
}
function infinite_loop_guard() {
  if (dev_fallback_default) {
    var updates = /* @__PURE__ */ new Map();
    /** @type {Batch} */
    for (const source2 of current_batch.current.keys()) {
      for (const [stack2, update2] of source2.updated ?? []) {
        var entry = updates.get(stack2);
        if (!entry) {
          entry = { error: update2.error, count: 0 };
          updates.set(stack2, entry);
        }
        entry.count += update2.count;
      }
    }
    for (const update2 of updates.values()) {
      if (update2.error) {
        console.error(update2.error);
      }
    }
  }
  try {
    effect_update_depth_exceeded();
  } catch (error) {
    if (dev_fallback_default) {
      define_property(error, "stack", { value: "" });
    }
    invoke_error_boundary(error, last_scheduled_effect);
  }
}
var eager_block_effects = null;
function flush_queued_effects(effects) {
  var length = effects.length;
  if (length === 0) return;
  var i = 0;
  while (i < length) {
    var effect2 = effects[i++];
    if ((effect2.f & (DESTROYED | INERT)) === 0 && is_dirty(effect2)) {
      eager_block_effects = /* @__PURE__ */ new Set();
      update_effect(effect2);
      if (
        effect2.deps === null &&
        effect2.first === null &&
        effect2.nodes === null &&
        effect2.teardown === null &&
        effect2.ac === null
      ) {
        unlink_effect(effect2);
      }
      if (eager_block_effects?.size > 0) {
        old_values.clear();
        for (const e of eager_block_effects) {
          if ((e.f & (DESTROYED | INERT)) !== 0) continue;
          const ordered_effects = [e];
          let ancestor = e.parent;
          while (ancestor !== null) {
            if (eager_block_effects.has(ancestor)) {
              eager_block_effects.delete(ancestor);
              ordered_effects.push(ancestor);
            }
            ancestor = ancestor.parent;
          }
          for (let j = ordered_effects.length - 1; j >= 0; j--) {
            const e2 = ordered_effects[j];
            if ((e2.f & (DESTROYED | INERT)) !== 0) continue;
            update_effect(e2);
          }
        }
        eager_block_effects.clear();
      }
    }
  }
  eager_block_effects = null;
}
function mark_effects(value, sources, marked, checked) {
  if (marked.has(value)) return;
  marked.add(value);
  if (value.reactions !== null) {
    for (const reaction of value.reactions) {
      const flags2 = reaction.f;
      if ((flags2 & DERIVED) !== 0) {
        mark_effects(
          /** @type {Derived} */
          reaction,
          sources,
          marked,
          checked,
        );
      } else if (
        (flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 &&
        (flags2 & DIRTY) === 0 &&
        depends_on(reaction, sources, checked)
      ) {
        set_signal_status(reaction, DIRTY);
        schedule_effect(
          /** @type {Effect} */
          reaction,
        );
      }
    }
  }
}
function depends_on(reaction, sources, checked) {
  const depends = checked.get(reaction);
  if (depends !== void 0) return depends;
  if (reaction.deps !== null) {
    for (const dep of reaction.deps) {
      if (includes.call(sources, dep)) {
        return true;
      }
      if (
        (dep.f & DERIVED) !== 0 &&
        depends_on(
          /** @type {Derived} */
          dep,
          sources,
          checked,
        )
      ) {
        checked.set(
          /** @type {Derived} */
          dep,
          true,
        );
        return true;
      }
    }
  }
  checked.set(reaction, false);
  return false;
}
function schedule_effect(effect2) {
  current_batch.schedule(effect2);
}
function reset_branch(effect2, tracked) {
  if ((effect2.f & BRANCH_EFFECT) !== 0 && (effect2.f & CLEAN) !== 0) {
    return;
  }
  if ((effect2.f & DIRTY) !== 0) {
    tracked.d.push(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    tracked.m.push(effect2);
  }
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_branch(e, tracked);
    e = e.next;
  }
}
function reset_all(effect2) {
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_all(e);
    e = e.next;
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/sources.js
var eager_effects = /* @__PURE__ */ new Set();
var old_values = /* @__PURE__ */ new Map();
function set_eager_effects(v) {
  eager_effects = v;
}
var eager_effects_deferred = false;
function set_eager_effects_deferred() {
  eager_effects_deferred = true;
}
function source(v, stack2) {
  var signal = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v,
    reactions: null,
    equals,
    rv: 0,
    wv: 0,
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = stack2 ?? get_error("created at");
    signal.updated = null;
    signal.set_during_effect = false;
    signal.trace = null;
  }
  return signal;
}
// @__NO_SIDE_EFFECTS__
function state(v, stack2) {
  const s = source(v, stack2);
  push_reaction_value(s);
  return s;
}
// @__NO_SIDE_EFFECTS__
function mutable_source(initial_value, immutable = false, trackable = true) {
  const s = source(initial_value);
  if (!immutable) {
    s.equals = safe_equals;
  }
  if (
    legacy_mode_flag &&
    trackable &&
    component_context !== null &&
    component_context.l !== null
  ) {
    (component_context.l.s ??= []).push(s);
  }
  return s;
}
function set2(source2, value, should_proxy = false) {
  if (
    active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
    // to ensure we error if state is set inside an inspect effect
    (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) &&
    is_runes() &&
    (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !==
      0 &&
    (current_sources === null || !current_sources.has(source2))
  ) {
    state_unsafe_mutation();
  }
  let new_value = should_proxy ? proxy(value) : value;
  if (dev_fallback_default) {
    tag_proxy(
      new_value,
      /** @type {string} */
      source2.label,
    );
  }
  return internal_set(source2, new_value, legacy_updates);
}
var seen = null;
var count_deps = 0;
function internal_set(source2, value, updated_during_traversal = null) {
  if (!source2.equals(value)) {
    if (is_destroying_effect) {
      old_values.set(source2, value);
    } else if (!old_values.has(source2)) {
      old_values.set(source2, source2.v);
    }
    var batch = Batch.ensure();
    batch.capture(source2, value);
    if (dev_fallback_default) {
      if (tracing_mode_flag || active_effect !== null) {
        source2.updated ??= /* @__PURE__ */ new Map();
        const count = (source2.updated.get("")?.count ?? 0) + 1;
        source2.updated.set("", {
          error:
            /** @type {any} */
            null,
          count,
        });
        if (tracing_mode_flag || count > 5) {
          const error = get_error("updated at");
          if (error !== null) {
            let entry = source2.updated.get(error.stack);
            if (!entry) {
              entry = { error, count: 0 };
              source2.updated.set(error.stack, entry);
            }
            entry.count++;
          }
        }
      }
      if (active_effect !== null) {
        source2.set_during_effect = true;
      }
    }
    if ((source2.f & DERIVED) !== 0) {
      const derived3 =
        /** @type {Derived} */
        source2;
      if ((source2.f & DIRTY) !== 0) {
        execute_derived(derived3);
      }
      if (batch_values === null) {
        update_derived_status(derived3);
      }
    }
    source2.wv = increment_write_version();
    seen = null;
    count_deps = 0;
    mark_reactions(source2, DIRTY, updated_during_traversal);
    seen = null;
    if (
      is_runes() &&
      active_effect !== null &&
      (active_effect.f & CLEAN) !== 0 &&
      (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0
    ) {
      if (untracked_writes === null) {
        set_untracked_writes([source2]);
      } else {
        untracked_writes.push(source2);
      }
    }
    if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
      flush_eager_effects();
    }
  }
  return value;
}
function flush_eager_effects() {
  eager_effects_deferred = false;
  for (const effect2 of eager_effects) {
    if ((effect2.f & CLEAN) !== 0) {
      set_signal_status(effect2, MAYBE_DIRTY);
    }
    let dirty;
    try {
      dirty = is_dirty(effect2);
    } catch {
      dirty = true;
    }
    if (dirty) {
      update_effect(effect2);
    }
  }
  eager_effects.clear();
}
function increment(source2) {
  set2(source2, source2.v + 1);
}
function mark_reactions(signal, status, updated_during_traversal) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  var runes = is_runes();
  var length = reactions.length;
  count_deps += length;
  if (count_deps > 1e5 && seen === null) seen = /* @__PURE__ */ new Set();
  if (seen !== null) {
    if (seen.has(signal)) return;
    seen.add(signal);
  }
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i];
    var flags2 = reaction.f;
    if (!runes && reaction === active_effect) continue;
    var not_dirty = (flags2 & DIRTY) === 0;
    if (not_dirty) {
      set_signal_status(reaction, status);
    }
    if ((flags2 & EAGER_EFFECT) !== 0) {
      eager_effects.add(
        /** @type {Effect} */
        reaction,
      );
    } else if ((flags2 & DERIVED) !== 0) {
      var derived3 =
        /** @type {Derived} */
        reaction;
      batch_values?.delete(derived3);
      mark_reactions(derived3, MAYBE_DIRTY, updated_during_traversal);
    } else if (not_dirty) {
      var effect2 =
        /** @type {Effect} */
        reaction;
      if ((flags2 & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
        eager_block_effects.add(effect2);
      }
      if (updated_during_traversal !== null) {
        updated_during_traversal.push(effect2);
      } else {
        schedule_effect(effect2);
      }
    }
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/proxy.js
var regex_is_valid_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function proxy(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    STATE_SYMBOL in value ||
    COMPONENT_SYMBOL in value
  ) {
    return value;
  }
  const prototype = get_prototype_of(value);
  if (prototype !== object_prototype && prototype !== array_prototype) {
    return value;
  }
  var sources = /* @__PURE__ */ new Map();
  var is_proxied_array = is_array(value);
  var version = state(0);
  var stack2 =
    dev_fallback_default && tracing_mode_flag ? get_error("created at") : null;
  var parent_version = update_version;
  var with_parent = (fn) => {
    if (update_version === parent_version) {
      return fn();
    }
    var reaction = active_reaction;
    var version2 = update_version;
    set_active_reaction(null);
    set_update_version(parent_version);
    var result = fn();
    set_active_reaction(reaction);
    set_update_version(version2);
    return result;
  };
  if (is_proxied_array) {
    sources.set(
      "length",
      state(
        /** @type {any[]} */
        value.length,
        stack2,
      ),
    );
    if (dev_fallback_default) {
      value =
        /** @type {any} */
        inspectable_array(
          /** @type {any[]} */
          value,
        );
    }
  }
  var path = "";
  let updating = false;
  function update_path(new_path) {
    if (updating) return;
    updating = true;
    path = new_path;
    tag(version, `${path} version`);
    for (const [prop2, source2] of sources) {
      tag(source2, get_label(path, prop2));
    }
    updating = false;
  }
  return new Proxy(
    /** @type {any} */
    value,
    {
      defineProperty(_, prop2, descriptor) {
        if (
          !("value" in descriptor) ||
          descriptor.configurable === false ||
          descriptor.enumerable === false ||
          descriptor.writable === false
        ) {
          state_descriptors_fixed();
        }
        var s = sources.get(prop2);
        if (s === void 0) {
          with_parent(() => {
            var s2 = state(descriptor.value, stack2);
            sources.set(prop2, s2);
            if (dev_fallback_default && typeof prop2 === "string") {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
        } else {
          set2(s, descriptor.value, true);
        }
        return true;
      },
      deleteProperty(target, prop2) {
        var s = sources.get(prop2);
        if (s === void 0) {
          if (prop2 in target) {
            const s2 = with_parent(() => state(UNINITIALIZED, stack2));
            sources.set(prop2, s2);
            increment(version);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
          }
        } else {
          set2(s, UNINITIALIZED);
          increment(version);
        }
        return true;
      },
      get(target, prop2, receiver) {
        if (prop2 === STATE_SYMBOL) {
          return value;
        }
        if (dev_fallback_default && prop2 === PROXY_PATH_SYMBOL) {
          return update_path;
        }
        var s = sources.get(prop2);
        var exists = prop2 in target;
        if (
          s === void 0 &&
          (!exists || get_descriptor(target, prop2)?.writable)
        ) {
          s = with_parent(() => {
            var p = proxy(exists ? target[prop2] : UNINITIALIZED);
            var s2 = state(p, stack2);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
          sources.set(prop2, s);
        }
        if (s !== void 0) {
          var v = get2(s);
          return v === UNINITIALIZED ? void 0 : v;
        }
        return Reflect.get(target, prop2, receiver);
      },
      getOwnPropertyDescriptor(target, prop2) {
        this.has?.(target, prop2);
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        var s = sources.get(prop2);
        if (s !== void 0) {
          var value2 = get2(s);
          if (value2 === UNINITIALIZED) {
            return void 0;
          }
          if (descriptor && "value" in descriptor) {
            descriptor.value = value2;
          } else {
            return {
              enumerable: true,
              configurable: true,
              value: value2,
              writable: true,
            };
          }
        }
        return descriptor;
      },
      has(target, prop2) {
        if (prop2 === STATE_SYMBOL) {
          return true;
        }
        var s = sources.get(prop2);
        var has =
          (s !== void 0 && s.v !== UNINITIALIZED) || Reflect.has(target, prop2);
        if (
          s !== void 0 ||
          (active_effect !== null &&
            (!has || get_descriptor(target, prop2)?.writable))
        ) {
          if (s === void 0) {
            s = with_parent(() => {
              var p = has ? proxy(target[prop2]) : UNINITIALIZED;
              var s2 = state(p, stack2);
              if (dev_fallback_default) {
                tag(s2, get_label(path, prop2));
              }
              return s2;
            });
            sources.set(prop2, s);
          }
          var value2 = get2(s);
          if (value2 === UNINITIALIZED) {
            return false;
          }
        }
        return has;
      },
      set(target, prop2, value2, receiver) {
        var s = sources.get(prop2);
        var has = prop2 in target;
        if (is_proxied_array && prop2 === "length") {
          for (var i = value2; i < /** @type {Source<number>} */ s.v; i += 1) {
            var other_s = sources.get(i + "");
            if (other_s !== void 0) {
              set2(other_s, UNINITIALIZED);
            } else if (i in target) {
              other_s = with_parent(() => state(UNINITIALIZED, stack2));
              sources.set(i + "", other_s);
              if (dev_fallback_default) {
                tag(other_s, get_label(path, i));
              }
            }
          }
        }
        if (s === void 0) {
          if (!has || get_descriptor(target, prop2)?.writable) {
            s = with_parent(() => state(void 0, stack2));
            if (dev_fallback_default) {
              tag(s, get_label(path, prop2));
            }
            set2(s, proxy(value2));
            sources.set(prop2, s);
          }
        } else {
          has = s.v !== UNINITIALIZED;
          var p = with_parent(() => proxy(value2));
          set2(s, p);
        }
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        if (descriptor?.set) {
          descriptor.set.call(receiver, value2);
        }
        if (!has) {
          if (is_proxied_array && typeof prop2 === "string") {
            var ls =
              /** @type {Source<number>} */
              sources.get("length");
            var n = Number(prop2);
            if (Number.isInteger(n) && n >= ls.v) {
              set2(ls, n + 1);
            }
          }
          increment(version);
        }
        return true;
      },
      ownKeys(target) {
        get2(version);
        var own_keys = Reflect.ownKeys(target).filter((key3) => {
          var source3 = sources.get(key3);
          return source3 === void 0 || source3.v !== UNINITIALIZED;
        });
        for (var [key2, source2] of sources) {
          if (source2.v !== UNINITIALIZED && !(key2 in target)) {
            own_keys.push(key2);
          }
        }
        return own_keys;
      },
      setPrototypeOf() {
        state_prototype_fixed();
      },
    },
  );
}
function get_label(path, prop2) {
  if (typeof prop2 === "symbol")
    return `${path}[Symbol(${prop2.description ?? ""})]`;
  if (regex_is_valid_identifier.test(prop2)) return `${path}.${prop2}`;
  return /^\d+$/.test(prop2) ? `${path}[${prop2}]` : `${path}['${prop2}']`;
}
function get_proxied_value(value) {
  try {
    if (value !== null && typeof value === "object" && STATE_SYMBOL in value) {
      return value[STATE_SYMBOL];
    }
  } catch {}
  return value;
}
function is(a, b) {
  return Object.is(get_proxied_value(a), get_proxied_value(b));
}
var ARRAY_MUTATING_METHODS = /* @__PURE__ */ new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);
function inspectable_array(array) {
  return new Proxy(array, {
    get(target, prop2, receiver) {
      var value = Reflect.get(target, prop2, receiver);
      if (
        !ARRAY_MUTATING_METHODS.has(
          /** @type {string} */
          prop2,
        )
      ) {
        return value;
      }
      return function (...args) {
        set_eager_effects_deferred();
        var result = value.apply(this, args);
        flush_eager_effects();
        return result;
      };
    },
  });
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dev/equality.js
function init_array_prototype_warnings() {
  const array_prototype2 = Array.prototype;
  const cleanup = Array.__svelte_cleanup;
  if (cleanup) {
    cleanup();
  }
  const { indexOf, lastIndexOf, includes: includes2 } = array_prototype2;
  array_prototype2.indexOf = function (item, from_index) {
    const index2 = indexOf.call(this, item, from_index);
    if (index2 === -1) {
      for (let i = from_index ?? 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.indexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.lastIndexOf = function (item, from_index) {
    const index2 = lastIndexOf.call(this, item, from_index ?? this.length - 1);
    if (index2 === -1) {
      for (let i = 0; i <= (from_index ?? this.length - 1); i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.lastIndexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.includes = function (item, from_index) {
    const has = includes2.call(this, item, from_index);
    if (!has) {
      for (let i = 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.includes(...)");
          break;
        }
      }
    }
    return has;
  };
  Array.__svelte_cleanup = () => {
    array_prototype2.indexOf = indexOf;
    array_prototype2.lastIndexOf = lastIndexOf;
    array_prototype2.includes = includes2;
  };
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/operations.js
var $window;
var $document;
var is_firefox;
var first_child_getter;
var next_sibling_getter;
function init_operations() {
  if ($window !== void 0) {
    return;
  }
  $window = window;
  $document = document;
  is_firefox = /Firefox/.test(navigator.userAgent);
  var element_prototype = Element.prototype;
  var node_prototype = Node.prototype;
  var text_prototype = Text.prototype;
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
  if (is_extensible(element_prototype)) {
    element_prototype[CLASS_CACHE] = void 0;
    element_prototype[ATTRIBUTES_CACHE] = null;
    element_prototype[STYLE_CACHE] = void 0;
    element_prototype.__e = void 0;
  }
  if (is_extensible(text_prototype)) {
    text_prototype[TEXT_CACHE] = void 0;
  }
  if (dev_fallback_default) {
    element_prototype.__svelte_meta = null;
    init_array_prototype_warnings();
  }
}
function create_text(value = "") {
  return document.createTextNode(value);
}
// @__NO_SIDE_EFFECTS__
function get_first_child(node) {
  return (
    /** @type {TemplateNode | null} */
    first_child_getter.call(node)
  );
}
// @__NO_SIDE_EFFECTS__
function get_next_sibling(node) {
  return (
    /** @type {TemplateNode | null} */
    next_sibling_getter.call(node)
  );
}
function child(node, is_text) {
  if (!hydrating) {
    return /* @__PURE__ */ get_first_child(node);
  }
  var child2 = /* @__PURE__ */ get_first_child(hydrate_node);
  if (child2 === null) {
    child2 = hydrate_node.appendChild(create_text());
  } else if (is_text && child2.nodeType !== TEXT_NODE) {
    var text2 = create_text();
    child2?.before(text2);
    set_hydrate_node(text2);
    return text2;
  }
  if (is_text) {
    merge_text_nodes(
      /** @type {Text} */
      child2,
    );
  }
  set_hydrate_node(child2);
  return child2;
}
function first_child(node, is_text = false) {
  if (!hydrating) {
    var first = /* @__PURE__ */ get_first_child(node);
    if (first instanceof Comment && first.data === "")
      return /* @__PURE__ */ get_next_sibling(first);
    return first;
  }
  if (is_text) {
    if (hydrate_node?.nodeType !== TEXT_NODE) {
      var text2 = create_text();
      hydrate_node?.before(text2);
      set_hydrate_node(text2);
      return text2;
    }
    merge_text_nodes(
      /** @type {Text} */
      hydrate_node,
    );
  }
  return hydrate_node;
}
function only_child(node, is_text = false) {
  if (!hydrating) {
    return /* @__PURE__ */ get_first_child(node);
  }
  var first = child(node, is_text);
  reset(node);
  return first;
}
function sibling(node, count = 1, is_text = false) {
  let next_sibling = hydrating ? hydrate_node : node;
  var last_sibling;
  while (count--) {
    last_sibling = next_sibling;
    next_sibling =
      /** @type {TemplateNode} */
      /* @__PURE__ */ get_next_sibling(next_sibling);
  }
  if (!hydrating) {
    return next_sibling;
  }
  if (is_text) {
    if (next_sibling?.nodeType !== TEXT_NODE) {
      var text2 = create_text();
      if (next_sibling === null) {
        last_sibling?.after(text2);
      } else {
        next_sibling.before(text2);
      }
      set_hydrate_node(text2);
      return text2;
    }
    merge_text_nodes(
      /** @type {Text} */
      next_sibling,
    );
  }
  set_hydrate_node(next_sibling);
  return next_sibling;
}
function clear_text_content(node) {
  node.textContent = "";
}
function should_defer_append() {
  if (!async_mode_flag) return false;
  if (eager_block_effects !== null) return false;
  var flags2 =
    /** @type {Effect} */
    active_effect.f;
  return (flags2 & REACTION_RAN) !== 0;
}
function create_element(tag2, namespace, is2) {
  if (namespace == null || namespace === NAMESPACE_HTML) {
    return (
      /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
      is2
        ? document.createElement(tag2, { is: is2 })
        : document.createElement(tag2)
    );
  }
  return (
    /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
    is2
      ? document.createElementNS(namespace, tag2, { is: is2 })
      : document.createElementNS(namespace, tag2)
  );
}
function merge_text_nodes(text2) {
  if (
    /** @type {string} */
    text2.nodeValue.length < 65536
  ) {
    return;
  }
  let next2 = text2.nextSibling;
  while (next2 !== null && next2.nodeType === TEXT_NODE) {
    next2.remove();
    text2.nodeValue += /** @type {string} */ next2.nodeValue;
    next2 = text2.nextSibling;
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/error-handling.js
var adjustments = /* @__PURE__ */ new WeakMap();
function handle_error(error) {
  var effect2 = active_effect;
  if (effect2 === null) {
    active_reaction.f |= ERROR_VALUE;
    return error;
  }
  if (
    dev_fallback_default &&
    error instanceof Error &&
    !adjustments.has(error)
  ) {
    adjustments.set(error, get_adjustments(error, effect2));
  }
  if ((effect2.f & REACTION_RAN) === 0 && (effect2.f & EFFECT) === 0) {
    if (dev_fallback_default && !effect2.parent && error instanceof Error) {
      apply_adjustments(error);
    }
    throw error;
  }
  invoke_error_boundary(error, effect2);
}
function invoke_error_boundary(error, effect2) {
  if (error === HYDRATION_ERROR) {
    throw error;
  }
  if (effect2 !== null && (effect2.f & DESTROYED) !== 0) {
    return;
  }
  while (effect2 !== null) {
    if (
      (effect2.f & BOUNDARY_EFFECT) !== 0 &&
      (effect2.f & (DESTROYED | DESTROYING)) === 0
    ) {
      if ((effect2.f & REACTION_RAN) === 0) {
        throw error;
      }
      try {
        effect2.b.error(error);
        return;
      } catch (e) {
        error = e;
      }
    }
    effect2 = effect2.parent;
  }
  if (dev_fallback_default && error instanceof Error) {
    apply_adjustments(error);
  }
  throw error;
}
function get_adjustments(error, effect2) {
  const message_descriptor = get_descriptor(error, "message");
  if (message_descriptor && !message_descriptor.configurable) return;
  var indent = is_firefox ? "  " : "	";
  var component_stack = `
${indent}in ${effect2.fn?.name || "<unknown>"}`;
  var context = effect2.ctx;
  while (context !== null) {
    component_stack += `
${indent}in ${context.function?.[FILENAME].split("/").pop()}`;
    context = context.p;
  }
  return {
    message:
      error.message +
      `
${component_stack}
`,
    stack: error.stack
      ?.split("\n")
      .filter((line) => !line.includes("svelte/src/internal"))
      .join("\n"),
  };
}
function apply_adjustments(error) {
  const adjusted = adjustments.get(error);
  if (adjusted) {
    define_property(error, "message", {
      value: adjusted.message,
    });
    define_property(error, "stack", {
      value: adjusted.stack,
    });
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/effects.js
function validate_effect(rune) {
  if (active_effect === null) {
    if (active_reaction === null) {
      effect_orphan(rune);
    }
    effect_in_unowned_derived();
  }
  if (is_destroying_effect) {
    effect_in_teardown(rune);
  }
}
function push_effect(effect2, parent_effect) {
  var parent_last = parent_effect.last;
  if (parent_last === null) {
    parent_effect.last = parent_effect.first = effect2;
  } else {
    parent_last.next = effect2;
    effect2.prev = parent_last;
    parent_effect.last = effect2;
  }
}
function create_effect(type, fn) {
  var parent = active_effect;
  if (dev_fallback_default) {
    while (parent !== null && (parent.f & EAGER_EFFECT) !== 0) {
      parent = parent.parent;
    }
  }
  if (parent !== null && (parent.f & INERT) !== 0) {
    type |= INERT;
  }
  var effect2 = {
    ctx: component_context,
    deps: null,
    nodes: null,
    f: type | DIRTY | CONNECTED,
    first: null,
    fn,
    last: null,
    next: null,
    parent,
    b: parent && parent.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null,
  };
  if (dev_fallback_default) {
    effect2.component_function = dev_current_component_function;
  }
  current_batch?.register_created_effect(effect2);
  var e = effect2;
  if ((type & EFFECT) !== 0) {
    if (collected_effects !== null) {
      collected_effects.push(effect2);
    } else {
      Batch.ensure().schedule(effect2);
    }
  } else if (fn !== null) {
    try {
      update_effect(effect2);
    } catch (e2) {
      destroy_effect(effect2);
      throw e2;
    }
    if (
      e.deps === null &&
      e.teardown === null &&
      e.nodes === null &&
      e.first === e.last && // either `null`, or a singular child
      (e.f & EFFECT_PRESERVED) === 0
    ) {
      e = e.first;
      if (
        (type & BLOCK_EFFECT) !== 0 &&
        (type & EFFECT_TRANSPARENT) !== 0 &&
        e !== null
      ) {
        e.f |= EFFECT_TRANSPARENT;
      }
    }
  }
  if (e !== null) {
    e.parent = parent;
    if (parent !== null) {
      push_effect(e, parent);
    }
    if (
      active_reaction !== null &&
      (active_reaction.f & DERIVED) !== 0 &&
      (type & ROOT_EFFECT) === 0
    ) {
      var derived3 =
        /** @type {Derived} */
        active_reaction;
      (derived3.effects ??= []).push(e);
    }
  }
  return effect2;
}
function effect_tracking() {
  return active_reaction !== null && !untracking;
}
function teardown(fn) {
  const effect2 = create_effect(RENDER_EFFECT, null);
  set_signal_status(effect2, CLEAN);
  effect2.teardown = fn;
  return effect2;
}
function user_effect(fn) {
  validate_effect("$effect");
  if (dev_fallback_default) {
    define_property(fn, "name", {
      value: "$effect",
    });
  }
  var flags2 =
    /** @type {Effect} */
    active_effect.f;
  var defer =
    !active_reaction &&
    (flags2 & BRANCH_EFFECT) !== 0 &&
    component_context !== null &&
    !component_context.i;
  if (defer) {
    var context =
      /** @type {ComponentContext} */
      component_context;
    (context.e ??= []).push(fn);
  } else {
    return create_user_effect(fn);
  }
}
function create_user_effect(fn) {
  return create_effect(EFFECT | USER_EFFECT, fn);
}
function effect_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
  return () => {
    destroy_effect(effect2);
  };
}
function component_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
  return (options = {}) => {
    return new Promise((fulfil) => {
      if (options.outro) {
        pause_effect(effect2, () => {
          destroy_effect(effect2);
          fulfil(void 0);
        });
      } else {
        destroy_effect(effect2);
        fulfil(void 0);
      }
    });
  };
}
function effect(fn) {
  return create_effect(EFFECT, fn);
}
function async_effect(fn) {
  return create_effect(ASYNC | EFFECT_PRESERVED, fn);
}
function render_effect(fn, flags2 = 0) {
  return create_effect(RENDER_EFFECT | flags2, fn);
}
function template_effect(fn, sync = [], async2 = [], blockers = []) {
  flatten(blockers, sync, async2, (values) => {
    create_effect(RENDER_EFFECT, () => {
      fn(...values.map(get2));
    });
  });
}
function block(fn, flags2 = 0) {
  var effect2 = create_effect(BLOCK_EFFECT | flags2, fn);
  if (dev_fallback_default) {
    effect2.dev_stack = dev_stack;
  }
  return effect2;
}
function branch(fn) {
  return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn);
}
function execute_effect_teardown(effect2) {
  var teardown2 = effect2.teardown;
  if (teardown2 !== null) {
    const previously_destroying_effect = is_destroying_effect;
    const previous_reaction = active_reaction;
    set_is_destroying_effect(true);
    set_active_reaction(null);
    try {
      teardown2.call(null);
    } catch (error) {
      invoke_error_boundary(error, effect2.parent);
    } finally {
      set_is_destroying_effect(previously_destroying_effect);
      set_active_reaction(previous_reaction);
    }
  }
}
function destroy_effect_children(signal, remove_dom = false) {
  var effect2 = signal.first;
  signal.first = signal.last = null;
  while (effect2 !== null) {
    const controller = effect2.ac;
    if (controller !== null) {
      without_reactive_context(() => {
        controller.abort(STALE_REACTION);
      });
    }
    var next2 = effect2.next;
    if ((effect2.f & ROOT_EFFECT) !== 0) {
      effect2.parent = null;
    } else {
      destroy_effect(effect2, remove_dom);
    }
    effect2 = next2;
  }
}
function destroy_block_effect_children(signal) {
  var effect2 = signal.first;
  while (effect2 !== null) {
    var next2 = effect2.next;
    if ((effect2.f & BRANCH_EFFECT) === 0) {
      destroy_effect(effect2);
    }
    effect2 = next2;
  }
}
function destroy_effect(effect2, remove_dom = true) {
  var removed = false;
  if (
    (remove_dom || (effect2.f & HEAD_EFFECT) !== 0) &&
    effect2.nodes !== null &&
    effect2.nodes.end !== null
  ) {
    remove_effect_dom(
      effect2.nodes.start,
      /** @type {TemplateNode} */
      effect2.nodes.end,
    );
    removed = true;
  }
  effect2.f |= DESTROYING;
  destroy_effect_children(effect2, remove_dom && !removed);
  remove_reactions(effect2, 0);
  var transitions = effect2.nodes && effect2.nodes.t;
  if (transitions !== null) {
    for (const transition2 of transitions) {
      transition2.stop();
    }
  }
  execute_effect_teardown(effect2);
  effect2.f ^= DESTROYING;
  effect2.f |= DESTROYED;
  var parent = effect2.parent;
  if (parent !== null && parent.first !== null) {
    unlink_effect(effect2);
  }
  if (dev_fallback_default) {
    effect2.component_function = null;
  }
  effect2.next =
    effect2.prev =
    effect2.teardown =
    effect2.ctx =
    effect2.deps =
    effect2.fn =
    effect2.nodes =
    effect2.ac =
    effect2.b =
      null;
}
function remove_effect_dom(node, end) {
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    node.remove();
    node = next2;
  }
}
function unlink_effect(effect2) {
  var parent = effect2.parent;
  var prev = effect2.prev;
  var next2 = effect2.next;
  if (prev !== null) prev.next = next2;
  if (next2 !== null) next2.prev = prev;
  if (parent !== null) {
    if (parent.first === effect2) parent.first = next2;
    if (parent.last === effect2) parent.last = prev;
  }
}
function pause_effect(effect2, callback, destroy = true) {
  var transitions = [];
  effect2.f |= PAUSED;
  pause_children(effect2, transitions, true);
  var fn = () => {
    if (destroy) destroy_effect(effect2);
    if (callback) callback();
  };
  var remaining = transitions.length;
  if (remaining > 0) {
    var check = () => --remaining || fn();
    for (var transition2 of transitions) {
      transition2.out(check);
    }
  } else {
    fn();
  }
}
function pause_children(effect2, transitions, local) {
  if ((effect2.f & INERT) !== 0) return;
  effect2.f ^= INERT;
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition2 of t) {
      if (transition2.is_global || local) {
        transitions.push(transition2);
      }
    }
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    if ((child2.f & ROOT_EFFECT) === 0) {
      var transparent =
        (child2.f & EFFECT_TRANSPARENT) !== 0 || // If this is a branch effect without a block effect parent,
        // it means the parent block effect was pruned. In that case,
        // transparency information was transferred to the branch effect.
        ((child2.f & BRANCH_EFFECT) !== 0 && (effect2.f & BLOCK_EFFECT) !== 0);
      pause_children(child2, transitions, transparent ? local : false);
    }
    child2 = sibling2;
  }
}
function resume_effect(effect2) {
  effect2.f &= ~PAUSED;
  resume_children(effect2, true);
}
function resume_children(effect2, local) {
  if ((effect2.f & PAUSED) !== 0) return;
  if ((effect2.f & INERT) === 0) return;
  effect2.f ^= INERT;
  if ((effect2.f & CLEAN) === 0) {
    set_signal_status(effect2, DIRTY);
    Batch.ensure().schedule(effect2);
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    var transparent =
      (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
    resume_children(child2, transparent ? local : false);
    child2 = sibling2;
  }
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition2 of t) {
      if (transition2.is_global || local) {
        transition2.in();
      }
    }
  }
}
function move_effect(effect2, fragment) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    fragment.append(node);
    node = next2;
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/legacy.js
var captured_signals = null;

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/runtime.js
var is_destroying_effect = false;
function set_is_destroying_effect(value) {
  is_destroying_effect = value;
}
var active_reaction = null;
var untracking = false;
function set_active_reaction(reaction) {
  active_reaction = reaction;
}
var active_effect = null;
function set_active_effect(effect2) {
  active_effect = effect2;
}
var current_sources = null;
function push_reaction_value(value) {
  if (
    active_reaction !== null &&
    ((!async_mode_flag && (active_reaction.f & REACTION_IS_UPDATING) !== 0) ||
      (active_reaction.f & DERIVED) !== 0)
  ) {
    (current_sources ??= /* @__PURE__ */ new Set()).add(value);
  }
}
var new_deps = null;
var skipped_deps = 0;
var untracked_writes = null;
function set_untracked_writes(value) {
  untracked_writes = value;
}
var write_version = 1;
var read_version = 0;
var update_version = read_version;
function set_update_version(value) {
  update_version = value;
}
function increment_write_version() {
  return ++write_version;
}
function is_dirty(reaction) {
  var flags2 = reaction.f;
  if ((flags2 & DIRTY) !== 0) {
    return true;
  }
  if ((flags2 & MAYBE_DIRTY) !== 0) {
    var dependencies =
      /** @type {Value[]} */
      reaction.deps;
    var length = dependencies.length;
    for (var i = 0; i < length; i++) {
      var dependency = dependencies[i];
      if (
        is_dirty(
          /** @type {Derived} */
          dependency,
        )
      ) {
        update_derived(
          /** @type {Derived} */
          dependency,
        );
      }
      if (dependency.wv > reaction.wv) {
        return true;
      }
    }
    if (
      (flags2 & CONNECTED) !== 0 && // During time traveling we don't want to reset the status so that
      // traversal of the graph in the other batches still happens
      batch_values === null
    ) {
      set_signal_status(reaction, CLEAN);
    }
  }
  return false;
}
function schedule_possible_effect_self_invalidation(
  signal,
  effect2,
  root19 = true,
) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  if (
    !async_mode_flag &&
    current_sources !== null &&
    current_sources.has(signal)
  ) {
    return;
  }
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i];
    if ((reaction.f & DERIVED) !== 0) {
      schedule_possible_effect_self_invalidation(
        /** @type {Derived} */
        reaction,
        effect2,
        false,
      );
    } else if (effect2 === reaction) {
      if (root19) {
        set_signal_status(reaction, DIRTY);
      } else if ((reaction.f & CLEAN) !== 0) {
        set_signal_status(reaction, MAYBE_DIRTY);
      }
      schedule_effect(
        /** @type {Effect} */
        reaction,
      );
    }
  }
}
function update_reaction(reaction) {
  var previous_deps = new_deps;
  var previous_skipped_deps = skipped_deps;
  var previous_untracked_writes = untracked_writes;
  var previous_reaction = active_reaction;
  var previous_sources = current_sources;
  var previous_component_context = component_context;
  var previous_untracking = untracking;
  var previous_update_version = update_version;
  var flags2 = reaction.f;
  new_deps = /** @type {null | Value[]} */ null;
  skipped_deps = 0;
  untracked_writes = null;
  active_reaction =
    (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
  current_sources = null;
  set_component_context(reaction.ctx);
  untracking = false;
  update_version = ++read_version;
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      reaction.ac.abort(STALE_REACTION);
    });
    reaction.ac = null;
  }
  try {
    reaction.f |= REACTION_IS_UPDATING;
    var fn =
      /** @type {Function} */
      reaction.fn;
    var result = fn();
    reaction.f |= REACTION_RAN;
    var deps = update_dependencies(reaction);
    if (
      is_runes() &&
      untracked_writes !== null &&
      !untracking &&
      deps !== null &&
      (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0
    ) {
      for (
        var i = 0;
        i < /** @type {Source[]} */ untracked_writes.length;
        i++
      ) {
        schedule_possible_effect_self_invalidation(
          untracked_writes[i],
          /** @type {Effect} */
          reaction,
        );
      }
    }
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++;
      if (previous_reaction.deps !== null) {
        for (let i2 = 0; i2 < previous_skipped_deps; i2 += 1) {
          previous_reaction.deps[i2].rv = read_version;
        }
      }
      if (previous_deps !== null) {
        for (const dep of previous_deps) {
          dep.rv = read_version;
        }
      }
      if (untracked_writes !== null) {
        if (previous_untracked_writes === null) {
          previous_untracked_writes = untracked_writes;
        } else {
          previous_untracked_writes.push(
            .../** @type {Source[]} */
            untracked_writes,
          );
        }
      }
    }
    if ((reaction.f & ERROR_VALUE) !== 0) {
      reaction.f ^= ERROR_VALUE;
    }
    return result;
  } catch (error) {
    update_dependencies(reaction);
    return handle_error(error);
  } finally {
    reaction.f ^= REACTION_IS_UPDATING;
    new_deps = previous_deps;
    skipped_deps = previous_skipped_deps;
    untracked_writes = previous_untracked_writes;
    active_reaction = previous_reaction;
    current_sources = previous_sources;
    set_component_context(previous_component_context);
    untracking = previous_untracking;
    update_version = previous_update_version;
  }
}
function update_dependencies(reaction) {
  var deps = reaction.deps;
  var is_fork = current_batch?.is_fork;
  if (new_deps !== null) {
    var i;
    if (!is_fork) {
      remove_reactions(reaction, skipped_deps);
    }
    if (deps !== null && skipped_deps > 0) {
      deps.length = skipped_deps + new_deps.length;
      for (i = 0; i < new_deps.length; i++) {
        deps[skipped_deps + i] = new_deps[i];
      }
    } else {
      reaction.deps = deps = new_deps;
    }
    if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
      for (i = skipped_deps; i < deps.length; i++) {
        (deps[i].reactions ??= []).push(reaction);
      }
    }
  } else if (!is_fork && deps !== null && skipped_deps < deps.length) {
    remove_reactions(reaction, skipped_deps);
    deps.length = skipped_deps;
  }
  return deps;
}
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions;
  if (reactions !== null) {
    var index2 = index_of.call(reactions, signal);
    if (index2 !== -1) {
      var new_length = reactions.length - 1;
      if (new_length === 0) {
        reactions = dependency.reactions = null;
      } else {
        reactions[index2] = reactions[new_length];
        reactions.pop();
      }
    }
  }
  if (
    reactions === null &&
    (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
    // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
    // allows us to skip the expensive work of disconnecting and immediately reconnecting it
    (new_deps === null || !includes.call(new_deps, dependency))
  ) {
    var derived3 =
      /** @type {Derived} */
      dependency;
    if ((derived3.f & CONNECTED) !== 0) {
      derived3.f ^= CONNECTED;
    }
    if (derived3.v !== UNINITIALIZED) {
      update_derived_status(derived3);
    }
    if (derived3.ac !== null) {
      without_reactive_context(() => {
        derived3.ac.abort(STALE_REACTION);
        derived3.ac = null;
        set_signal_status(derived3, DIRTY);
      });
    }
    freeze_derived_effects(derived3);
    remove_reactions(derived3, 0);
  }
}
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps;
  if (dependencies === null) return;
  for (var i = start_index; i < dependencies.length; i++) {
    remove_reaction(signal, dependencies[i]);
  }
}
function update_effect(effect2) {
  var flags2 = effect2.f;
  if ((flags2 & DESTROYED) !== 0) {
    return;
  }
  set_signal_status(effect2, CLEAN);
  var previous_effect = active_effect;
  active_effect = effect2;
  if (dev_fallback_default) {
    var previous_component_fn = dev_current_component_function;
    set_dev_current_component_function(effect2.component_function);
    var previous_stack =
      /** @type {any} */
      dev_stack;
    set_dev_stack(effect2.dev_stack ?? dev_stack);
  }
  try {
    if ((flags2 & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
      destroy_block_effect_children(effect2);
    } else {
      destroy_effect_children(effect2);
    }
    execute_effect_teardown(effect2);
    var teardown2 = update_reaction(effect2);
    effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
    effect2.wv = write_version;
    if (
      dev_fallback_default &&
      tracing_mode_flag &&
      (effect2.f & DIRTY) !== 0 &&
      effect2.deps !== null
    ) {
      for (var dep of effect2.deps) {
        if (dep.set_during_effect) {
          dep.wv = increment_write_version();
          dep.set_during_effect = false;
        }
      }
    }
  } finally {
    active_effect = previous_effect;
    if (dev_fallback_default) {
      set_dev_current_component_function(previous_component_fn);
      set_dev_stack(previous_stack);
    }
  }
}
function get2(signal) {
  var flags2 = signal.f;
  var is_derived = (flags2 & DERIVED) !== 0;
  captured_signals?.add(signal);
  if (active_reaction !== null && !untracking) {
    var destroyed =
      active_effect !== null && (active_effect.f & DESTROYED) !== 0;
    if (
      !destroyed &&
      (current_sources === null || !current_sources.has(signal))
    ) {
      var deps = active_reaction.deps;
      if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version;
          if (
            new_deps === null &&
            deps !== null &&
            deps[skipped_deps] === signal
          ) {
            skipped_deps++;
          } else if (new_deps === null) {
            new_deps = [signal];
          } else {
            new_deps.push(signal);
          }
        }
      } else {
        active_reaction.deps ??= [];
        if (!includes.call(active_reaction.deps, signal)) {
          active_reaction.deps.push(signal);
        }
        var reactions = signal.reactions;
        if (reactions === null) {
          signal.reactions = [active_reaction];
        } else if (!includes.call(reactions, active_reaction)) {
          reactions.push(active_reaction);
        }
      }
    }
  }
  if (dev_fallback_default) {
    if (
      !untracking &&
      reactivity_loss_tracker && // By checking that current/previous batch are null we filter out false positives.
      // reactivity_loss_tracker is only reset after a microtask, so if a flush happens
      // before that, we get warnings for things we shouldn't warn on.
      current_batch === null &&
      previous_batch === null &&
      !reactivity_loss_tracker.warned &&
      (reactivity_loss_tracker.effect.f & REACTION_IS_UPDATING) === 0 &&
      !reactivity_loss_tracker.effect_deps.has(signal)
    ) {
      reactivity_loss_tracker.warned = true;
      await_reactivity_loss(
        /** @type {string} */
        signal.label,
      );
      var trace2 = get_error("traced at");
      if (trace2) console.warn(trace2);
    }
    recent_async_deriveds.delete(signal);
    if (
      tracing_mode_flag &&
      !untracking &&
      tracing_expressions !== null &&
      active_reaction !== null &&
      tracing_expressions.reaction === active_reaction
    ) {
      if (signal.trace) {
        signal.trace();
      } else {
        trace2 = get_error("traced at");
        if (trace2) {
          var entry = tracing_expressions.entries.get(signal);
          if (entry === void 0) {
            entry = { traces: [] };
            tracing_expressions.entries.set(signal, entry);
          }
          var last = entry.traces[entry.traces.length - 1];
          if (trace2.stack !== last?.stack) {
            entry.traces.push(trace2);
          }
        }
      }
    }
  }
  if (is_destroying_effect && old_values.has(signal)) {
    return old_values.get(signal);
  }
  if (is_derived) {
    var derived3 =
      /** @type {Derived} */
      signal;
    if (is_destroying_effect) {
      var value = derived3.v;
      if (
        ((derived3.f & CLEAN) === 0 && derived3.reactions !== null) ||
        depends_on_old_values(derived3)
      ) {
        value = execute_derived(derived3);
      }
      old_values.set(derived3, value);
      return value;
    }
    var should_connect =
      (derived3.f & CONNECTED) === 0 &&
      !untracking &&
      active_reaction !== null &&
      (active_reaction.f & CONNECTED) !== 0;
    var is_new = (derived3.f & REACTION_RAN) === 0;
    if (is_dirty(derived3)) {
      if (should_connect) {
        derived3.f |= CONNECTED;
      }
      update_derived(derived3);
    }
    if (should_connect && !is_new) {
      unfreeze_derived_effects(derived3);
      reconnect(derived3);
    }
  }
  if (batch_values?.has(signal)) {
    return batch_values.get(signal);
  }
  if ((signal.f & ERROR_VALUE) !== 0) {
    throw signal.v;
  }
  return signal.v;
}
function reconnect(derived3) {
  derived3.f |= CONNECTED;
  if (derived3.deps === null) return;
  for (const dep of derived3.deps) {
    var reactions = dep.reactions;
    if (reactions === null) {
      dep.reactions = [derived3];
    } else if (!includes.call(reactions, derived3)) {
      reactions.push(derived3);
    }
    if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
      unfreeze_derived_effects(
        /** @type {Derived} */
        dep,
      );
      reconnect(
        /** @type {Derived} */
        dep,
      );
    }
  }
}
function depends_on_old_values(derived3) {
  if (derived3.v === UNINITIALIZED) return true;
  if (derived3.deps === null) return false;
  for (const dep of derived3.deps) {
    if (old_values.has(dep)) {
      return true;
    }
    if (
      (dep.f & DERIVED) !== 0 &&
      depends_on_old_values(
        /** @type {Derived} */
        dep,
      )
    ) {
      return true;
    }
  }
  return false;
}
function untrack(fn) {
  var previous_untracking = untracking;
  try {
    untracking = true;
    return fn();
  } finally {
    untracking = previous_untracking;
  }
}
function deep_read_state(value) {
  if (typeof value !== "object" || !value || value instanceof EventTarget) {
    return;
  }
  if (STATE_SYMBOL in value) {
    deep_read(value);
  } else if (!Array.isArray(value)) {
    for (let key2 in value) {
      const prop2 = value[key2];
      if (typeof prop2 === "object" && prop2 && STATE_SYMBOL in prop2) {
        deep_read(prop2);
      }
    }
  }
}
function deep_read(value, visited = /* @__PURE__ */ new Set()) {
  if (
    typeof value === "object" &&
    value !== null && // We don't want to traverse DOM elements
    !(value instanceof EventTarget) &&
    !visited.has(value)
  ) {
    visited.add(value);
    if (value instanceof Date) {
      value.getTime();
    }
    for (let key2 in value) {
      try {
        deep_read(value[key2], visited);
      } catch (e) {}
    }
    const proto = get_prototype_of(value);
    if (
      proto !== Object.prototype &&
      proto !== Array.prototype &&
      proto !== Map.prototype &&
      proto !== Set.prototype &&
      proto !== Date.prototype
    ) {
      const descriptors = get_descriptors(proto);
      for (let key2 in descriptors) {
        const get4 = descriptors[key2].get;
        if (get4) {
          try {
            get4.call(value);
          } catch (e) {}
        }
      }
    }
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/utils.js
var DOM_BOOLEAN_ATTRIBUTES = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
  "webkitdirectory",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback",
];
var DOM_PROPERTIES = [
  ...DOM_BOOLEAN_ATTRIBUTES,
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  "readOnly",
  "value",
  "volume",
  "defaultValue",
  "defaultChecked",
  "srcObject",
  "noValidate",
  "allowFullscreen",
  "disablePictureInPicture",
  "disableRemotePlayback",
];
var PASSIVE_EVENTS = ["touchstart", "touchmove"];
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name);
}
var STATE_CREATION_RUNES =
  /** @type {const} */
  ["$state", "$state.raw", "$derived", "$derived.by"];
var RUNES =
  /** @type {const} */
  [
    ...STATE_CREATION_RUNES,
    "$state.eager",
    "$state.snapshot",
    "$props",
    "$props.id",
    "$bindable",
    "$effect",
    "$effect.pre",
    "$effect.tracking",
    "$effect.root",
    "$effect.pending",
    "$inspect",
    "$inspect().with",
    "$inspect.trace",
    "$host",
  ];

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/events.js
var event_symbol = /* @__PURE__ */ Symbol("events");
var all_registered_events = /* @__PURE__ */ new Set();
var root_event_handles = /* @__PURE__ */ new Set();
function create_event(event_name, dom, handler, options = {}) {
  function target_handler(event2) {
    if (!options.capture) {
      handle_event_propagation.call(dom, event2);
    }
    if (!event2.cancelBubble) {
      return without_reactive_context(() => {
        return handler?.call(this, event2);
      });
    }
  }
  if (
    event_name.startsWith("pointer") ||
    event_name.startsWith("touch") ||
    event_name === "wheel"
  ) {
    target_handler.__removed = false;
    queue_micro_task(() => {
      if (!target_handler.__removed) {
        dom.addEventListener(event_name, target_handler, options);
      }
    });
  } else {
    dom.addEventListener(event_name, target_handler, options);
  }
  return target_handler;
}
function event(event_name, dom, handler, capture2, passive2) {
  var options = { capture: capture2, passive: passive2 };
  var target_handler = create_event(event_name, dom, handler, options);
  if (
    dom === document.body || // @ts-ignore
    dom === window || // @ts-ignore
    dom === document || // Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
    dom instanceof HTMLMediaElement
  ) {
    teardown(() => {
      target_handler.__removed = true;
      dom.removeEventListener(event_name, target_handler, options);
    });
  }
}
function delegated(event_name, element2, handler) {
  (element2[event_symbol] ??= {})[event_name] = handler;
}
function delegate(events) {
  for (var i = 0; i < events.length; i++) {
    all_registered_events.add(events[i]);
  }
  for (var fn of root_event_handles) {
    fn(events);
  }
}
var last_propagated_event = null;
var last_propagated_event_clear_scheduled = false;
function handle_event_propagation(event2) {
  var handler_element = this;
  var owner_document =
    /** @type {Node} */
    handler_element.ownerDocument;
  var event_name = event2.type;
  var path = event2.composedPath?.() || [];
  var current_target =
    /** @type {null | Element} */
    path[0] || event2.target;
  last_propagated_event = event2;
  if (!last_propagated_event_clear_scheduled) {
    last_propagated_event_clear_scheduled = true;
    setTimeout(() => {
      last_propagated_event_clear_scheduled = false;
      last_propagated_event = null;
    });
  }
  var path_idx = 0;
  var handled_at = last_propagated_event === event2 && event2[event_symbol];
  if (handled_at) {
    var at_idx = path.indexOf(handled_at);
    if (
      at_idx !== -1 &&
      (handler_element === document ||
        handler_element === /** @type {any} */ window)
    ) {
      event2[event_symbol] = handler_element;
      return;
    }
    var handler_idx = path.indexOf(handler_element);
    if (handler_idx === -1) {
      return;
    }
    if (at_idx <= handler_idx) {
      path_idx = at_idx;
    }
  }
  current_target = /** @type {Element} */ path[path_idx] || event2.target;
  if (current_target === handler_element) return;
  define_property(event2, "currentTarget", {
    configurable: true,
    get() {
      return current_target || owner_document;
    },
  });
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    var throw_error;
    var other_errors = [];
    while (current_target !== null) {
      if (current_target === handler_element) break;
      try {
        var delegated2 = current_target[event_symbol]?.[event_name];
        if (
          delegated2 != null &&
          (!(/** @type {any} */ current_target.disabled) || // DOM could've been updated already by the time this is reached, so we check this as well
            // -> the target could not have been disabled because it emits the event in the first place
            event2.target === current_target)
        ) {
          delegated2.call(current_target, event2);
        }
      } catch (error) {
        if (throw_error) {
          other_errors.push(error);
        } else {
          throw_error = error;
        }
      }
      if (event2.cancelBubble) break;
      path_idx++;
      current_target =
        path_idx < path.length
          ? /** @type {Element} */
            path[path_idx]
          : null;
    }
    if (throw_error) {
      for (let error of other_errors) {
        queueMicrotask(() => {
          throw error;
        });
      }
      throw throw_error;
    }
  } finally {
    event2[event_symbol] = handler_element;
    delete event2.currentTarget;
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/reconciler.js
var policy =
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  globalThis?.window?.trustedTypes &&
  /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy(
    "svelte-trusted-html",
    {
      /** @param {string} html */
      createHTML: (html2) => {
        return html2;
      },
    },
  );
function create_trusted_html(html2) {
  return (
    /** @type {string} */
    policy?.createHTML(html2) ?? html2
  );
}
function create_fragment_from_html(html2) {
  var elem = create_element("template");
  elem.innerHTML = create_trusted_html(html2.replaceAll("<!>", "<!---->"));
  return elem.content;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/template.js
function assign_nodes(start, end) {
  var effect2 =
    /** @type {Effect} */
    active_effect;
  if (effect2.nodes === null) {
    effect2.nodes = { start, end, a: null, t: null };
  }
}
// @__NO_SIDE_EFFECTS__
function from_html(content, flags2) {
  var is_fragment = (flags2 & TEMPLATE_FRAGMENT) !== 0;
  var use_import_node = (flags2 & TEMPLATE_USE_IMPORT_NODE) !== 0;
  var node;
  var has_start = !content.startsWith("<!>");
  return () => {
    if (hydrating) {
      assign_nodes(hydrate_node, null);
      return hydrate_node;
    }
    if (node === void 0) {
      node = create_fragment_from_html(has_start ? content : "<!>" + content);
      if (!is_fragment)
        node = /** @type {TemplateNode} */ get_first_child(node);
    }
    var clone =
      /** @type {TemplateNode} */
      use_import_node || is_firefox
        ? document.importNode(node, true)
        : node.cloneNode(true);
    if (is_fragment) {
      var start =
        /** @type {TemplateNode} */
        get_first_child(clone);
      var end =
        /** @type {TemplateNode} */
        clone.lastChild;
      assign_nodes(start, end);
    } else {
      assign_nodes(clone, clone);
    }
    return clone;
  };
}
function text(value = "") {
  if (!hydrating) {
    var t = create_text(value + "");
    assign_nodes(t, t);
    return t;
  }
  var node = hydrate_node;
  if (node.nodeType !== TEXT_NODE) {
    node.before((node = create_text()));
    set_hydrate_node(node);
  } else {
    merge_text_nodes(
      /** @type {Text} */
      node,
    );
  }
  assign_nodes(node, node);
  return node;
}
function comment() {
  if (hydrating) {
    assign_nodes(hydrate_node, null);
    return hydrate_node;
  }
  var frag = document.createDocumentFragment();
  var start = document.createComment("");
  var anchor = create_text();
  frag.append(start, anchor);
  assign_nodes(start, anchor);
  return frag;
}
function append(anchor, dom) {
  if (hydrating) {
    var effect2 =
      /** @type {Effect & { nodes: EffectNodes }} */
      active_effect;
    if ((effect2.f & REACTION_RAN) === 0 || effect2.nodes.end === null) {
      effect2.nodes.end = hydrate_node;
    }
    hydrate_next();
    return;
  }
  if (anchor === null) {
    return;
  }
  anchor.before(
    /** @type {Node} */
    dom,
  );
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/reactivity/create-subscriber.js
function createSubscriber(start) {
  let subscribers = 0;
  let version = source(0);
  let stop;
  if (dev_fallback_default) {
    tag(version, "createSubscriber version");
  }
  return () => {
    if (effect_tracking()) {
      get2(version);
      render_effect(() => {
        if (subscribers === 0) {
          stop = untrack(() => start(() => increment(version)));
        }
        subscribers += 1;
        return () => {
          queue_micro_task(() => {
            subscribers -= 1;
            if (subscribers === 0) {
              stop?.();
              stop = void 0;
              increment(version);
            }
          });
        };
      });
    }
  };
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;
function boundary(node, props, children, transform_error) {
  new Boundary(node, props, children, transform_error);
}
var Boundary = class {
  /** @type {Boundary | null} */
  parent;
  is_pending = false;
  /**
   * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
   * Inherited from parent boundary, or defaults to identity.
   * @type {(error: unknown) => unknown}
   */
  transform_error;
  /** @type {TemplateNode} */
  #anchor;
  /** @type {TemplateNode | null} */
  #hydrate_open = hydrating ? hydrate_node : null;
  /** @type {BoundaryProps} */
  #props;
  /** @type {((anchor: Node) => void)} */
  #children;
  /** @type {Effect} */
  #effect;
  /** @type {Effect | null} */
  #main_effect = null;
  /** @type {Effect | null} */
  #pending_effect = null;
  /** @type {Effect | null} */
  #failed_effect = null;
  /** @type {DocumentFragment | null} */
  #offscreen_fragment = null;
  #local_pending_count = 0;
  #pending_count = 0;
  #pending_count_update_queued = false;
  /** @type {Set<Effect>} */
  #dirty_effects = /* @__PURE__ */ new Set();
  /** @type {Set<Effect>} */
  #maybe_dirty_effects = /* @__PURE__ */ new Set();
  /**
   * A source containing the number of pending async deriveds/expressions.
   * Only created if `$effect.pending()` is used inside the boundary,
   * otherwise updating the source results in needless `Batch.ensure()`
   * calls followed by no-op flushes
   * @type {Source<number> | null}
   */
  #effect_pending = null;
  #effect_pending_subscriber = createSubscriber(() => {
    this.#effect_pending = source(this.#local_pending_count);
    if (dev_fallback_default) {
      tag(this.#effect_pending, "$effect.pending()");
    }
    return () => {
      this.#effect_pending = null;
    };
  });
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   * @param {((error: unknown) => unknown) | undefined} [transform_error]
   */
  constructor(node, props, children, transform_error) {
    this.#anchor = node;
    this.#props = props;
    this.#children = (anchor) => {
      var effect2 =
        /** @type {Effect} */
        active_effect;
      effect2.b = this;
      effect2.f |= BOUNDARY_EFFECT;
      children(anchor);
    };
    this.parent = /** @type {Effect} */ active_effect.b;
    this.transform_error =
      transform_error ?? this.parent?.transform_error ?? ((e) => e);
    this.#effect = block(() => {
      if (hydrating) {
        const comment_data = read_hydration_instruction(
          /** @type {TemplateNode} */
          this.#hydrate_open,
        );
        hydrate_next();
        const server_rendered_pending = comment_data === HYDRATION_START_ELSE;
        const server_rendered_failed = comment_data.startsWith(
          HYDRATION_START_FAILED,
        );
        if (server_rendered_failed) {
          const serialized_error = JSON.parse(
            comment_data.slice(HYDRATION_START_FAILED.length),
          );
          this.#hydrate_failed_content(serialized_error);
        } else if (server_rendered_pending) {
          this.#hydrate_pending_content();
        } else {
          this.#hydrate_resolved_content();
        }
      } else {
        this.#render();
      }
    }, flags);
    if (hydrating) {
      this.#anchor = hydrate_node;
    }
  }
  #hydrate_resolved_content() {
    try {
      this.#main_effect = branch(() => this.#children(this.#anchor));
    } catch (error) {
      this.error(error);
    }
  }
  /**
   * @param {unknown} error The deserialized error from the server's hydration comment
   */
  #hydrate_failed_content(error) {
    const failed = this.#props.failed;
    const { reset: reset2, invoke_onerror } = this.#create_reset(error);
    queue_micro_task(invoke_onerror);
    if (!failed) return;
    this.#failed_effect = branch(() => {
      failed(
        this.#anchor,
        () => error,
        () => reset2,
      );
    });
  }
  /**
   * Creates the `reset` function for a failed boundary, along with a function
   * that invokes `onerror` with it (if provided)
   * @param {unknown} error
   * @returns {{ reset: () => void, invoke_onerror: () => void }}
   */
  #create_reset(error) {
    var did_reset = false;
    var calling_on_error = false;
    const reset2 = () => {
      if (this.#is_destroyed()) return;
      if (did_reset) {
        svelte_boundary_reset_noop();
        return;
      }
      did_reset = true;
      if (calling_on_error) {
        svelte_boundary_reset_onerror();
      }
      if (this.#failed_effect !== null) {
        pause_effect(this.#failed_effect, () => {
          this.#failed_effect = null;
        });
      }
      this.#run(() => {
        this.#render();
      });
    };
    const invoke_onerror = () => {
      if (this.#is_destroyed()) return;
      try {
        calling_on_error = true;
        this.#props.onerror?.(error, reset2);
        calling_on_error = false;
      } catch (err) {
        invoke_error_boundary(err, this.#effect && this.#effect.parent);
      }
    };
    return { reset: reset2, invoke_onerror };
  }
  #is_destroyed() {
    return (this.#effect.f & (DESTROYED | DESTROYING)) !== 0;
  }
  #hydrate_pending_content() {
    const pending2 = this.#props.pending;
    if (!pending2) return;
    this.is_pending = true;
    this.#pending_effect = branch(() => pending2(this.#anchor));
    queue_micro_task(() => {
      if (this.#is_destroyed()) return;
      var fragment = (this.#offscreen_fragment =
        document.createDocumentFragment());
      var anchor = create_text();
      var handled = false;
      fragment.append(anchor);
      this.#main_effect = this.#run(() => {
        try {
          return branch(() => this.#children(anchor));
        } catch (error) {
          try {
            this.error(error);
            handled = true;
          } catch (error2) {
            invoke_error_boundary(error2, this.#effect.parent);
          }
          return null;
        }
      });
      if (this.#main_effect === null) {
        this.#offscreen_fragment = null;
        if (handled)
          this.#resolve(
            /** @type {Batch} */
            current_batch,
          );
        return;
      }
      if (this.#pending_count === 0) {
        this.#anchor.before(fragment);
        this.#offscreen_fragment = null;
        pause_effect(
          /** @type {Effect} */
          this.#pending_effect,
          () => {
            this.#pending_effect = null;
          },
        );
        this.#resolve(
          /** @type {Batch} */
          current_batch,
        );
      }
    });
  }
  #render() {
    try {
      this.is_pending = this.has_pending_snippet();
      this.#pending_count = 0;
      this.#local_pending_count = 0;
      this.#main_effect = branch(() => {
        this.#children(this.#anchor);
      });
      if (this.#pending_count > 0) {
        var fragment = (this.#offscreen_fragment =
          document.createDocumentFragment());
        move_effect(this.#main_effect, fragment);
        const pending2 =
          /** @type {(anchor: Node) => void} */
          this.#props.pending;
        this.#pending_effect = branch(() => pending2(this.#anchor));
      } else {
        this.#resolve(
          /** @type {Batch} */
          current_batch,
        );
      }
    } catch (error) {
      this.error(error);
    }
  }
  /**
   * @param {Batch} batch
   */
  #resolve(batch) {
    this.is_pending = false;
    batch.transfer_effects(this.#dirty_effects, this.#maybe_dirty_effects);
  }
  /**
   * Defer an effect inside a pending boundary until the boundary resolves
   * @param {Effect} effect
   */
  defer_effect(effect2) {
    defer_effect(effect2, this.#dirty_effects, this.#maybe_dirty_effects);
  }
  /**
   * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!this.#props.pending;
  }
  /**
   * @template T
   * @param {() => T} fn
   */
  #run(fn) {
    var previous_effect = active_effect;
    var previous_reaction = active_reaction;
    var previous_ctx = component_context;
    set_active_effect(this.#effect);
    set_active_reaction(this.#effect);
    set_component_context(this.#effect.ctx);
    try {
      Batch.ensure();
      return fn();
    } finally {
      set_active_effect(previous_effect);
      set_active_reaction(previous_reaction);
      set_component_context(previous_ctx);
    }
  }
  /**
   * Updates the pending count associated with the currently visible pending snippet,
   * if any, such that we can replace the snippet with content once work is done
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  #update_pending_count(d, batch) {
    if (!this.has_pending_snippet()) {
      if (this.parent) {
        this.parent.#update_pending_count(d, batch);
      }
      return;
    }
    this.#pending_count += d;
    if (this.#pending_count === 0) {
      this.#resolve(batch);
      if (this.#pending_effect) {
        pause_effect(this.#pending_effect, () => {
          this.#pending_effect = null;
        });
      }
      if (this.#offscreen_fragment) {
        this.#anchor.before(this.#offscreen_fragment);
        this.#offscreen_fragment = null;
      }
    }
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  update_pending_count(d, batch) {
    this.#update_pending_count(d, batch);
    this.#local_pending_count += d;
    if (!this.#effect_pending || this.#pending_count_update_queued) return;
    this.#pending_count_update_queued = true;
    queue_micro_task(() => {
      this.#pending_count_update_queued = false;
      if (this.#effect_pending) {
        internal_set(this.#effect_pending, this.#local_pending_count);
      }
    });
  }
  get_effect_pending() {
    this.#effect_pending_subscriber();
    return get2(
      /** @type {Source<number>} */
      this.#effect_pending,
    );
  }
  /** @param {unknown} error */
  error(error) {
    if (error === HYDRATION_ERROR) {
      throw error;
    }
    if (!this.#props.onerror && !this.#props.failed) {
      throw error;
    }
    if (current_batch?.is_fork) {
      if (this.#main_effect) current_batch.skip_effect(this.#main_effect);
      if (this.#pending_effect) current_batch.skip_effect(this.#pending_effect);
      if (this.#failed_effect) current_batch.skip_effect(this.#failed_effect);
      current_batch.oncommit(() => {
        if (!this.#is_destroyed()) this.#handle_error(error);
      });
    } else {
      this.#handle_error(error);
    }
  }
  /**
   * @param {unknown} error
   */
  #handle_error(error) {
    if (this.#main_effect) {
      destroy_effect(this.#main_effect);
      this.#main_effect = null;
    }
    if (this.#pending_effect) {
      destroy_effect(this.#pending_effect);
      this.#pending_effect = null;
    }
    if (this.#failed_effect) {
      destroy_effect(this.#failed_effect);
      this.#failed_effect = null;
    }
    if (hydrating) {
      set_hydrate_node(
        /** @type {TemplateNode} */
        this.#hydrate_open,
      );
      next();
      set_hydrate_node(skip_nodes());
    }
    let failed = this.#props.failed;
    const handle_error_result = (transformed_error) => {
      if (this.#is_destroyed()) return;
      const { reset: reset2, invoke_onerror } =
        this.#create_reset(transformed_error);
      invoke_onerror();
      if (failed && !this.#is_destroyed()) {
        this.#failed_effect = this.#run(() => {
          try {
            return branch(() => {
              var effect2 =
                /** @type {Effect} */
                active_effect;
              effect2.b = this;
              effect2.f |= BOUNDARY_EFFECT;
              failed(
                this.#anchor,
                () => transformed_error,
                () => reset2,
              );
            });
          } catch (error2) {
            invoke_error_boundary(
              error2,
              /** @type {Effect} */
              this.#effect.parent,
            );
            return null;
          }
        });
      }
    };
    queue_micro_task(() => {
      if (this.#is_destroyed()) return;
      var result;
      try {
        result = this.transform_error(error);
      } catch (e) {
        invoke_error_boundary(e, this.#effect && this.#effect.parent);
        return;
      }
      if (
        result !== null &&
        typeof result === "object" &&
        typeof (/** @type {any} */ result.then) === "function"
      ) {
        result.then(
          handle_error_result,
          /** @param {unknown} e */
          (e) => invoke_error_boundary(e, this.#effect && this.#effect.parent),
        );
      } else {
        handle_error_result(result);
      }
    });
  }
};

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/render.js
var should_intro = true;
function set_text(text2, value) {
  var str = value == null ? "" : typeof value === "object" ? `${value}` : value;
  if (str !== /** @type {any} */ (text2[TEXT_CACHE] ??= text2.nodeValue)) {
    text2[TEXT_CACHE] = str;
    text2.nodeValue = `${str}`;
  }
}
function mount(component2, options) {
  return _mount(component2, options);
}
function hydrate(component2, options) {
  init_operations();
  options.intro = options.intro ?? false;
  const target = options.target;
  const was_hydrating = hydrating;
  const previous_hydrate_node = hydrate_node;
  try {
    var anchor = get_first_child(target);
    while (
      anchor &&
      (anchor.nodeType !== COMMENT_NODE ||
        /** @type {Comment} */
        anchor.data !== HYDRATION_START)
    ) {
      anchor = get_next_sibling(anchor);
    }
    if (!anchor) {
      throw HYDRATION_ERROR;
    }
    set_hydrating(true);
    set_hydrate_node(
      /** @type {Comment} */
      anchor,
    );
    const instance = _mount(component2, { ...options, anchor });
    set_hydrating(false);
    return (
      /**  @type {Exports} */
      instance
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message
        .split("\n")
        .some((line) => line.startsWith("https://svelte.dev/e/"))
    ) {
      throw error;
    }
    if (error !== HYDRATION_ERROR) {
      console.warn("Failed to hydrate: ", error);
    }
    if (options.recover === false) {
      hydration_failed();
    }
    init_operations();
    clear_text_content(target);
    set_hydrating(false);
    return mount(component2, options);
  } finally {
    set_hydrating(was_hydrating);
    set_hydrate_node(previous_hydrate_node);
  }
}
var listeners = /* @__PURE__ */ new Map();
function _mount(
  Component,
  { target, anchor, props = {}, events, context, intro = true, transformError },
) {
  init_operations();
  var component2 = void 0;
  var unmount2 = component_root(() => {
    var anchor_node = anchor ?? target.appendChild(create_text());
    boundary(
      /** @type {TemplateNode} */
      anchor_node,
      {
        pending: () => {},
      },
      (anchor_node2) => {
        push({});
        var ctx =
          /** @type {ComponentContext} */
          component_context;
        if (context) ctx.c = context;
        if (events) {
          props.$$events = events;
        }
        if (hydrating) {
          assign_nodes(
            /** @type {TemplateNode} */
            anchor_node2,
            null,
          );
        }
        should_intro = intro;
        component2 = Component(anchor_node2, props) || mark_as_component();
        should_intro = true;
        if (hydrating) {
          active_effect.nodes.end = hydrate_node;
          if (
            hydrate_node === null ||
            hydrate_node.nodeType !== COMMENT_NODE ||
            /** @type {Comment} */
            hydrate_node.data !== HYDRATION_END
          ) {
            hydration_mismatch();
            throw HYDRATION_ERROR;
          }
        }
        pop();
      },
      transformError,
    );
    var registered_events = /* @__PURE__ */ new Set();
    var event_handle = (events2) => {
      for (var i = 0; i < events2.length; i++) {
        var event_name = events2[i];
        if (registered_events.has(event_name)) continue;
        registered_events.add(event_name);
        var passive2 = is_passive_event(event_name);
        for (const node of [target, document]) {
          var counts = listeners.get(node);
          if (counts === void 0) {
            counts = /* @__PURE__ */ new Map();
            listeners.set(node, counts);
          }
          var count = counts.get(event_name);
          if (count === void 0) {
            node.addEventListener(event_name, handle_event_propagation, {
              passive: passive2,
            });
            counts.set(event_name, 1);
          } else {
            counts.set(event_name, count + 1);
          }
        }
      }
    };
    event_handle(array_from(all_registered_events));
    root_event_handles.add(event_handle);
    return () => {
      for (var event_name of registered_events) {
        for (const node of [target, document]) {
          var counts =
            /** @type {Map<string, number>} */
            listeners.get(node);
          var count =
            /** @type {number} */
            counts.get(event_name);
          if (--count == 0) {
            node.removeEventListener(event_name, handle_event_propagation);
            counts.delete(event_name);
            if (counts.size === 0) {
              listeners.delete(node);
            }
          } else {
            counts.set(event_name, count);
          }
        }
      }
      root_event_handles.delete(event_handle);
      if (anchor_node !== anchor) {
        anchor_node.parentNode?.removeChild(anchor_node);
      }
    };
  });
  mounted_components.set(component2, unmount2);
  return component2;
}
var mounted_components = /* @__PURE__ */ new WeakMap();
function unmount(component2, options) {
  const fn = mounted_components.get(component2);
  if (fn) {
    mounted_components.delete(component2);
    return fn(options);
  }
  if (dev_fallback_default) {
    lifecycle_double_unmount();
  }
  return Promise.resolve();
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var BranchManager = class {
  /** @type {TemplateNode} */
  anchor;
  /** @type {Map<Batch, Key>} */
  #batches = /* @__PURE__ */ new Map();
  /**
   * Map of keys to effects that are currently rendered in the DOM.
   * These effects are visible and actively part of the document tree.
   * Example:
   * ```
   * {#if condition}
   * 	foo
   * {:else}
   * 	bar
   * {/if}
   * ```
   * Can result in the entries `true->Effect` and `false->Effect`
   * @type {Map<Key, Effect>}
   */
  #onscreen = /* @__PURE__ */ new Map();
  /**
   * Similar to #onscreen with respect to the keys, but contains branches that are not yet
   * in the DOM, because their insertion is deferred.
   * @type {Map<Key, Branch>}
   */
  #offscreen = /* @__PURE__ */ new Map();
  /**
   * Keys of effects that are currently outroing
   * @type {Set<Key>}
   */
  #outroing = /* @__PURE__ */ new Set();
  /**
   * Whether to pause (i.e. outro) on change, or destroy immediately.
   * This is necessary for `<svelte:element>`
   */
  #transition = true;
  /**
   * @param {TemplateNode} anchor
   * @param {boolean} transition
   */
  constructor(anchor, transition2 = true) {
    this.anchor = anchor;
    this.#transition = transition2;
  }
  /**
   * @param {Batch} batch
   */
  #commit = (batch) => {
    if (!this.#batches.has(batch)) return;
    var key2 =
      /** @type {Key} */
      this.#batches.get(batch);
    var onscreen = this.#onscreen.get(key2);
    if (onscreen) {
      resume_effect(onscreen);
      this.#outroing.delete(key2);
    } else {
      var offscreen = this.#offscreen.get(key2);
      if (offscreen) {
        resume_effect(offscreen.effect);
        this.#onscreen.set(key2, offscreen.effect);
        this.#offscreen.delete(key2);
        if (dev_fallback_default) {
          offscreen.fragment.lastChild[HMR_ANCHOR] = this.anchor;
        }
        offscreen.fragment.lastChild.remove();
        this.anchor.before(offscreen.fragment);
        onscreen = offscreen.effect;
      }
    }
    for (const [b, k] of this.#batches) {
      this.#batches.delete(b);
      if (b === batch) {
        break;
      }
      const offscreen2 = this.#offscreen.get(k);
      if (offscreen2) {
        destroy_effect(offscreen2.effect);
        this.#offscreen.delete(k);
      }
    }
    for (const [k, effect2] of this.#onscreen) {
      if (k === key2 || this.#outroing.has(k)) continue;
      const on_destroy = () => {
        const keys = Array.from(this.#batches.values());
        if (keys.includes(k)) {
          var fragment = document.createDocumentFragment();
          move_effect(effect2, fragment);
          fragment.append(create_text());
          this.#offscreen.set(k, { effect: effect2, fragment });
        } else {
          destroy_effect(effect2);
        }
        this.#outroing.delete(k);
        this.#onscreen.delete(k);
      };
      if (this.#transition || !onscreen) {
        this.#outroing.add(k);
        pause_effect(effect2, on_destroy, false);
      } else {
        on_destroy();
      }
    }
  };
  /**
   * @param {Batch} batch
   */
  #discard = (batch) => {
    this.#batches.delete(batch);
    const keys = Array.from(this.#batches.values());
    for (const [k, branch2] of this.#offscreen) {
      if (!keys.includes(k)) {
        destroy_effect(branch2.effect);
        this.#offscreen.delete(k);
      }
    }
  };
  /**
   *
   * @param {any} key
   * @param {null | ((target: TemplateNode) => void)} fn
   */
  ensure(key2, fn) {
    var batch =
      /** @type {Batch} */
      current_batch;
    var defer = should_defer_append();
    if (fn && !this.#onscreen.has(key2) && !this.#offscreen.has(key2)) {
      if (defer) {
        var fragment = document.createDocumentFragment();
        var target = create_text();
        fragment.append(target);
        this.#offscreen.set(key2, {
          effect: branch(() => fn(target)),
          fragment,
        });
      } else {
        this.#onscreen.set(
          key2,
          branch(() => fn(this.anchor)),
        );
      }
    }
    this.#batches.set(batch, key2);
    if (defer) {
      for (const [k, effect2] of this.#onscreen) {
        if (k === key2) {
          batch.unskip_effect(effect2);
        } else {
          batch.skip_effect(effect2);
        }
      }
      for (const [k, branch2] of this.#offscreen) {
        if (k === key2) {
          batch.unskip_effect(branch2.effect);
        } else {
          batch.skip_effect(branch2.effect);
        }
      }
      batch.oncommit(this.#commit);
      batch.ondiscard(this.#discard);
    } else {
      if (hydrating) {
        this.anchor = hydrate_node;
      }
      this.#commit(batch);
    }
  }
};

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/blocks/if.js
function if_block(node, fn, elseif = false) {
  var marker;
  if (hydrating) {
    marker = hydrate_node;
    hydrate_next();
  }
  var branches = new BranchManager(node);
  var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
  function update_branch(key2, fn2) {
    if (hydrating) {
      var data = read_hydration_instruction(
        /** @type {TemplateNode} */
        marker,
      );
      if (key2 !== parseInt(data.substring(1))) {
        var anchor = skip_nodes();
        set_hydrate_node(anchor);
        branches.anchor = anchor;
        set_hydrating(false);
        branches.ensure(key2, fn2);
        set_hydrating(true);
        return;
      }
    }
    branches.ensure(key2, fn2);
  }
  block(() => {
    var has_branch = false;
    fn((fn2, key2 = 0) => {
      has_branch = true;
      update_branch(key2, fn2);
    });
    if (!has_branch) {
      update_branch(-1, null);
    }
  }, flags2);
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/blocks/key.js
var NAN = /* @__PURE__ */ Symbol("NaN");
function key(node, get_key, render_fn) {
  if (hydrating) {
    hydrate_next();
  }
  var branches = new BranchManager(node);
  var legacy = !is_runes();
  block(() => {
    var key2 = get_key();
    if (key2 !== key2) {
      key2 = /** @type {any} */ NAN;
    }
    if (legacy && key2 !== null && typeof key2 === "object") {
      key2 = /** @type {V} */ {};
    }
    branches.ensure(key2, render_fn);
  });
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/blocks/each.js
function index(_, i) {
  return i;
}
function pause_effects(state2, to_destroy, controlled_anchor) {
  var transitions = [];
  var length = to_destroy.length;
  var group;
  var remaining = to_destroy.length;
  for (var i = 0; i < length; i++) {
    let effect2 = to_destroy[i];
    pause_effect(
      effect2,
      () => {
        if (group) {
          group.pending.delete(effect2);
          group.done.add(effect2);
          if (group.pending.size === 0) {
            var groups =
              /** @type {Set<EachOutroGroup>} */
              state2.outrogroups;
            destroy_effects(state2, array_from(group.done));
            groups.delete(group);
            if (groups.size === 0) {
              state2.outrogroups = null;
            }
          }
        } else {
          remaining -= 1;
        }
      },
      false,
    );
  }
  if (remaining === 0) {
    var fast_path =
      transitions.length === 0 &&
      controlled_anchor !== null &&
      state2.pending.size === 0;
    if (fast_path) {
      var anchor =
        /** @type {Element} */
        controlled_anchor;
      var parent_node =
        /** @type {Element} */
        anchor.parentNode;
      clear_text_content(parent_node);
      parent_node.append(anchor);
      state2.items.clear();
    }
    destroy_effects(state2, to_destroy, !fast_path);
  } else {
    group = {
      pending: new Set(to_destroy),
      done: /* @__PURE__ */ new Set(),
    };
    (state2.outrogroups ??= /* @__PURE__ */ new Set()).add(group);
  }
}
function destroy_effects(state2, to_destroy, remove_dom = true) {
  var preserved_effects;
  if (state2.pending.size > 0) {
    preserved_effects = /* @__PURE__ */ new Set();
    for (const keys of state2.pending.values()) {
      for (const key2 of keys) {
        preserved_effects.add(
          /** @type {EachItem} */
          state2.items.get(key2).e,
        );
      }
    }
  }
  for (var i = 0; i < to_destroy.length; i++) {
    var e = to_destroy[i];
    if (preserved_effects?.has(e)) {
      e.f |= EFFECT_OFFSCREEN;
      const fragment = document.createDocumentFragment();
      move_effect(e, fragment);
    } else {
      destroy_effect(to_destroy[i], remove_dom);
    }
  }
}
var offscreen_anchor;
function each(
  node,
  flags2,
  get_collection,
  get_key,
  render_fn,
  fallback_fn = null,
) {
  var anchor = node;
  var items = /* @__PURE__ */ new Map();
  var is_controlled = (flags2 & EACH_IS_CONTROLLED) !== 0;
  if (is_controlled) {
    var parent_node =
      /** @type {Element} */
      node;
    anchor = hydrating
      ? set_hydrate_node(get_first_child(parent_node))
      : parent_node.appendChild(create_text());
  }
  if (hydrating) {
    hydrate_next();
  }
  var fallback2 = null;
  var each_array = derived_safe_equal(() => {
    var collection = get_collection();
    return (
      /** @type {V[]} */
      is_array(collection)
        ? collection
        : collection == null
          ? []
          : array_from(collection)
    );
  });
  if (dev_fallback_default) {
    tag(each_array, "{#each ...}");
  }
  var pending2 = /* @__PURE__ */ new Map();
  var first_run = true;
  function commit(batch) {
    if ((state2.effect.f & DESTROYED) !== 0) {
      return;
    }
    state2.pending.delete(batch);
    var array = get2(each_array);
    state2.fallback = fallback2;
    reconcile(state2, array, anchor, flags2, get_key);
    if (fallback2 !== null) {
      if (array.length === 0) {
        if ((fallback2.f & EFFECT_OFFSCREEN) === 0) {
          resume_effect(fallback2);
        } else {
          fallback2.f ^= EFFECT_OFFSCREEN;
          move(fallback2, null, anchor);
        }
      } else {
        pause_effect(fallback2, () => {
          fallback2 = null;
        });
      }
    }
  }
  function discard(batch) {
    state2.pending.delete(batch);
  }
  var effect2 = block(() => {
    var array =
      /** @type {V[]} */
      get2(each_array);
    var length = array.length;
    let mismatch = false;
    if (hydrating) {
      var is_else = read_hydration_instruction(anchor) === HYDRATION_START_ELSE;
      if (is_else !== (length === 0)) {
        anchor = skip_nodes();
        set_hydrate_node(anchor);
        set_hydrating(false);
        mismatch = true;
      }
    }
    var keys = /* @__PURE__ */ new Set();
    var batch =
      /** @type {Batch} */
      current_batch;
    var defer = should_defer_append();
    for (var index2 = 0; index2 < length; index2 += 1) {
      if (
        hydrating &&
        hydrate_node.nodeType === COMMENT_NODE &&
        /** @type {Comment} */
        hydrate_node.data === HYDRATION_END
      ) {
        anchor = /** @type {Comment} */ hydrate_node;
        mismatch = true;
        set_hydrating(false);
      }
      var value = array[index2];
      var key2 = get_key(value, index2);
      if (dev_fallback_default) {
        var key_again = get_key(value, index2);
        if (key2 !== key_again) {
          each_key_volatile(String(index2), String(key2), String(key_again));
        }
      }
      var item = first_run ? null : items.get(key2);
      if (item) {
        if (item.v) internal_set(item.v, value);
        if (item.i) internal_set(item.i, index2);
        if (defer) {
          batch.unskip_effect(item.e);
        }
      } else {
        item = create_item(
          items,
          first_run ? anchor : (offscreen_anchor ??= create_text()),
          value,
          key2,
          index2,
          render_fn,
          flags2,
          get_collection,
        );
        if (!first_run) {
          item.e.f |= EFFECT_OFFSCREEN;
        }
        items.set(key2, item);
      }
      keys.add(key2);
    }
    if (length === 0 && fallback_fn && !fallback2) {
      if (first_run) {
        fallback2 = branch(() => fallback_fn(anchor));
      } else {
        fallback2 = branch(() =>
          fallback_fn((offscreen_anchor ??= create_text())),
        );
        fallback2.f |= EFFECT_OFFSCREEN;
      }
    }
    if (length > keys.size) {
      if (dev_fallback_default) {
        validate_each_keys(array, get_key);
      } else {
        each_key_duplicate("", "", "");
      }
    }
    if (hydrating && length > 0) {
      set_hydrate_node(skip_nodes());
    }
    if (!first_run) {
      pending2.set(batch, keys);
      if (defer) {
        for (const [key3, item2] of items) {
          if (!keys.has(key3)) {
            batch.skip_effect(item2.e);
          }
        }
        batch.oncommit(commit);
        batch.ondiscard(discard);
      } else {
        commit(batch);
      }
    }
    if (mismatch) {
      set_hydrating(true);
    }
    get2(each_array);
  });
  var state2 = {
    effect: effect2,
    flags: flags2,
    items,
    pending: pending2,
    outrogroups: null,
    fallback: fallback2,
  };
  first_run = false;
  if (hydrating) {
    anchor = hydrate_node;
  }
}
function skip_to_branch(effect2) {
  while (effect2 !== null && (effect2.f & BRANCH_EFFECT) === 0) {
    effect2 = effect2.next;
  }
  return effect2;
}
function reconcile(state2, array, anchor, flags2, get_key) {
  var is_animated = (flags2 & EACH_IS_ANIMATED) !== 0;
  var length = array.length;
  var items = state2.items;
  var current = skip_to_branch(state2.effect.first);
  var seen2;
  var prev = null;
  var to_animate;
  var matched = [];
  var stashed = [];
  var value;
  var key2;
  var effect2;
  var i;
  if (is_animated) {
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key2 = get_key(value, i);
      effect2 = /** @type {EachItem} */ items.get(key2).e;
      if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
        effect2.nodes?.a?.measure();
        (to_animate ??= /* @__PURE__ */ new Set()).add(effect2);
      }
    }
  }
  for (i = 0; i < length; i += 1) {
    value = array[i];
    key2 = get_key(value, i);
    effect2 = /** @type {EachItem} */ items.get(key2).e;
    if (state2.outrogroups !== null) {
      for (const group of state2.outrogroups) {
        group.pending.delete(effect2);
        group.done.delete(effect2);
      }
    }
    if ((effect2.f & INERT) !== 0) {
      resume_effect(effect2);
      if (is_animated) {
        effect2.nodes?.a?.unfix();
        (to_animate ??= /* @__PURE__ */ new Set()).delete(effect2);
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) !== 0) {
      effect2.f ^= EFFECT_OFFSCREEN;
      if (effect2 === current) {
        move(effect2, null, anchor);
      } else {
        var next2 = prev ? prev.next : current;
        if (effect2 === state2.effect.last) {
          state2.effect.last = effect2.prev;
        }
        if (effect2.prev) effect2.prev.next = effect2.next;
        if (effect2.next) effect2.next.prev = effect2.prev;
        link(state2, prev, effect2);
        link(state2, effect2, next2);
        move(effect2, next2, anchor);
        prev = effect2;
        matched = [];
        stashed = [];
        current = skip_to_branch(prev.next);
        continue;
      }
    }
    if (effect2 !== current) {
      if (seen2 !== void 0 && seen2.has(effect2)) {
        if (matched.length < stashed.length) {
          var start = stashed[0];
          var j;
          prev = start.prev;
          var a = matched[0];
          var b = matched[matched.length - 1];
          for (j = 0; j < matched.length; j += 1) {
            move(matched[j], start, anchor);
          }
          for (j = 0; j < stashed.length; j += 1) {
            seen2.delete(stashed[j]);
          }
          link(state2, a.prev, b.next);
          link(state2, prev, a);
          link(state2, b, start);
          current = start;
          prev = b;
          i -= 1;
          matched = [];
          stashed = [];
        } else {
          seen2.delete(effect2);
          move(effect2, current, anchor);
          link(state2, effect2.prev, effect2.next);
          link(
            state2,
            effect2,
            prev === null ? state2.effect.first : prev.next,
          );
          link(state2, prev, effect2);
          prev = effect2;
        }
        continue;
      }
      matched = [];
      stashed = [];
      while (current !== null && current !== effect2) {
        (seen2 ??= /* @__PURE__ */ new Set()).add(current);
        stashed.push(current);
        current = skip_to_branch(current.next);
      }
      if (current === null) {
        continue;
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
      matched.push(effect2);
    }
    prev = effect2;
    current = skip_to_branch(effect2.next);
  }
  if (state2.outrogroups !== null) {
    for (const group of state2.outrogroups) {
      if (group.pending.size === 0) {
        destroy_effects(state2, array_from(group.done));
        state2.outrogroups?.delete(group);
      }
    }
    if (state2.outrogroups.size === 0) {
      state2.outrogroups = null;
    }
  }
  if (current !== null || seen2 !== void 0) {
    var to_destroy = [];
    if (seen2 !== void 0) {
      for (effect2 of seen2) {
        if ((effect2.f & INERT) === 0) {
          to_destroy.push(effect2);
        }
      }
    }
    while (current !== null) {
      if ((current.f & INERT) === 0 && current !== state2.fallback) {
        to_destroy.push(current);
      }
      current = skip_to_branch(current.next);
    }
    var destroy_length = to_destroy.length;
    if (destroy_length > 0) {
      var controlled_anchor =
        (flags2 & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
      if (is_animated) {
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].nodes?.a?.measure();
        }
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].nodes?.a?.fix();
        }
      }
      pause_effects(state2, to_destroy, controlled_anchor);
    }
  }
  if (is_animated) {
    queue_micro_task(() => {
      if (to_animate === void 0) return;
      for (effect2 of to_animate) {
        effect2.nodes?.a?.apply();
      }
    });
  }
}
function create_item(
  items,
  anchor,
  value,
  key2,
  index2,
  render_fn,
  flags2,
  get_collection,
) {
  var v =
    (flags2 & EACH_ITEM_REACTIVE) !== 0
      ? (flags2 & EACH_ITEM_IMMUTABLE) === 0
        ? mutable_source(value, false, false)
        : source(value)
      : null;
  var i = (flags2 & EACH_INDEX_REACTIVE) !== 0 ? source(index2) : null;
  if (dev_fallback_default && v) {
    v.trace = () => {
      get_collection()[i?.v ?? index2];
    };
  }
  return {
    v,
    i,
    e: branch(() => {
      render_fn(anchor, v ?? value, i ?? index2, get_collection);
      return () => {
        items.delete(key2);
      };
    }),
  };
}
function move(effect2, next2, anchor) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  var dest =
    next2 && (next2.f & EFFECT_OFFSCREEN) === 0
      ? /** @type {EffectNodes} */
        next2.nodes.start
      : anchor;
  while (node !== null) {
    var next_node =
      /** @type {TemplateNode} */
      get_next_sibling(node);
    dest.before(node);
    if (node === end) {
      return;
    }
    node = next_node;
  }
}
function link(state2, prev, next2) {
  if (prev === null) {
    state2.effect.first = next2;
  } else {
    prev.next = next2;
  }
  if (next2 === null) {
    state2.effect.last = prev;
  } else {
    next2.prev = prev;
  }
}
function validate_each_keys(array, key_fn) {
  const keys = /* @__PURE__ */ new Map();
  const length = array.length;
  for (let i = 0; i < length; i++) {
    const key2 = key_fn(array[i], i);
    if (keys.has(key2)) {
      const a = String(keys.get(key2));
      const b = String(i);
      let k = String(key2);
      if (k.startsWith("[object ")) k = null;
      each_key_duplicate(a, b, k);
    }
    keys.set(key2, i);
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/blocks/snippet.js
function snippet(node, get_snippet, ...args) {
  var branches = new BranchManager(node);
  block(() => {
    const snippet2 = get_snippet() ?? null;
    if (dev_fallback_default && snippet2 == null) {
      invalid_snippet();
    }
    branches.ensure(
      snippet2,
      snippet2 && ((anchor) => snippet2(anchor, ...args)),
    );
  }, EFFECT_TRANSPARENT);
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/actions.js
function action(dom, action2, get_value) {
  effect(() => {
    var payload = untrack(() => action2(dom, get_value?.()) || {});
    if (get_value && payload?.update) {
      var inited = false;
      var prev =
        /** @type {any} */
        {};
      render_effect(() => {
        var value = get_value();
        deep_read_state(value);
        if (inited && safe_not_equal(prev, value)) {
          prev = value;
          payload.update(value);
        }
      });
      inited = true;
    }
    if (payload?.destroy) {
      return () =>
        /** @type {Function} */
        payload.destroy();
    }
  });
}

// node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t,
    f,
    n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e)
    if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++)
        e[t] && (f = r(e[t])) && (n && (n += " "), (n += f));
    } else for (f in e) e[f] && (n && (n += " "), (n += f));
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++)
    (e = arguments[f]) && (t = r(e)) && (n && (n += " "), (n += t));
  return n;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/shared/attributes.js
function clsx2(value) {
  if (typeof value === "object") {
    return clsx(value);
  } else {
    return value ?? "";
  }
}
var whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
function to_class(value, hash2, directives) {
  var classname = value == null ? "" : "" + value;
  if (hash2) {
    classname = classname ? classname + " " + hash2 : hash2;
  }
  if (directives) {
    for (var key2 of Object.keys(directives)) {
      if (directives[key2]) {
        classname = classname ? classname + " " + key2 : key2;
      } else if (classname.length) {
        var len = key2.length;
        var a = 0;
        while ((a = classname.indexOf(key2, a)) >= 0) {
          var b = a + len;
          if (
            (a === 0 || whitespace.includes(classname[a - 1])) &&
            (b === classname.length || whitespace.includes(classname[b]))
          ) {
            classname =
              (a === 0 ? "" : classname.substring(0, a)) +
              classname.substring(b + 1);
          } else {
            a = b;
          }
        }
      }
    }
  }
  return classname === "" ? null : classname;
}
function append_styles(styles2, important = false) {
  var separator = important ? " !important;" : ";";
  var css = "";
  for (var key2 of Object.keys(styles2)) {
    var value = styles2[key2];
    if (value != null && value !== "") {
      css += " " + key2 + ": " + value + separator;
    }
  }
  return css;
}
function to_css_name(name) {
  if (name[0] !== "-" || name[1] !== "-") {
    return name.toLowerCase();
  }
  return name;
}
function to_style(value, styles2) {
  if (styles2) {
    var new_style = "";
    var normal_styles;
    var important_styles;
    if (Array.isArray(styles2)) {
      normal_styles = styles2[0];
      important_styles = styles2[1];
    } else {
      normal_styles = styles2;
    }
    if (value) {
      value = String(value)
        .replaceAll(/\/\*.*?\*\//g, "")
        .trim();
      var in_str = false;
      var in_apo = 0;
      var in_comment = false;
      var reserved_names = [];
      if (normal_styles) {
        reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
      }
      if (important_styles) {
        reserved_names.push(...Object.keys(important_styles).map(to_css_name));
      }
      var start_index = 0;
      var name_index = -1;
      const len = value.length;
      for (var i = 0; i < len; i++) {
        var c = value[i];
        if (in_comment) {
          if (c === "/" && value[i - 1] === "*") {
            in_comment = false;
          }
        } else if (in_str) {
          if (in_str === c) {
            in_str = false;
          }
        } else if (c === "/" && value[i + 1] === "*") {
          in_comment = true;
        } else if (c === '"' || c === "'") {
          in_str = c;
        } else if (c === "(") {
          in_apo++;
        } else if (c === ")") {
          in_apo--;
        }
        if (!in_comment && in_str === false && in_apo === 0) {
          if (c === ":" && name_index === -1) {
            name_index = i;
          } else if (c === ";" || i === len - 1) {
            if (name_index !== -1) {
              var name = to_css_name(
                value.substring(start_index, name_index).trim(),
              );
              if (!reserved_names.includes(name)) {
                if (c !== ";") {
                  i++;
                }
                var property = value.substring(start_index, i).trim();
                new_style += " " + property + ";";
              }
            }
            start_index = i + 1;
            name_index = -1;
          }
        }
      }
    }
    if (normal_styles) {
      new_style += append_styles(normal_styles);
    }
    if (important_styles) {
      new_style += append_styles(important_styles, true);
    }
    new_style = new_style.trim();
    return new_style === "" ? null : new_style;
  }
  return value == null ? null : String(value);
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/class.js
function set_class(dom, is_html, value, hash2, prev_classes, next_classes) {
  var prev =
    /** @type {any} */
    dom[CLASS_CACHE];
  if (hydrating || prev !== value || prev === void 0) {
    var next_class_name = to_class(value, hash2, next_classes);
    if (!hydrating || next_class_name !== dom.getAttribute("class")) {
      if (next_class_name == null) {
        dom.removeAttribute("class");
      } else if (is_html) {
        dom.className = next_class_name;
      } else {
        dom.setAttribute("class", next_class_name);
      }
    }
    dom[CLASS_CACHE] = value;
  } else if (next_classes && prev_classes !== next_classes) {
    for (var key2 in next_classes) {
      var is_present = !!next_classes[key2];
      if (prev_classes == null || is_present !== !!prev_classes[key2]) {
        dom.classList.toggle(key2, is_present);
      }
    }
  }
  return next_classes;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/style.js
function update_styles(dom, prev = {}, next2, priority) {
  for (var key2 in next2) {
    var value = next2[key2];
    if (prev[key2] !== value) {
      if (next2[key2] == null) {
        dom.style.removeProperty(key2);
      } else {
        dom.style.setProperty(key2, value, priority);
      }
    }
  }
}
function set_style(dom, value, prev_styles, next_styles) {
  var prev =
    /** @type {any} */
    dom[STYLE_CACHE];
  if (hydrating || prev !== value) {
    var next_style_attr = to_style(value, next_styles);
    if (!hydrating || next_style_attr !== dom.getAttribute("style")) {
      if (next_style_attr == null) {
        dom.removeAttribute("style");
      } else {
        dom.style.cssText = next_style_attr;
      }
    }
    dom[STYLE_CACHE] = value;
  } else if (next_styles) {
    if (Array.isArray(next_styles)) {
      update_styles(dom, prev_styles?.[0], next_styles[0]);
      update_styles(dom, prev_styles?.[1], next_styles[1], "important");
    } else {
      update_styles(dom, prev_styles, next_styles);
    }
  }
  return next_styles;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
function set_selected(option, selected) {
  if (selected) {
    if (!option.hasAttribute("selected")) option.setAttribute("selected", "");
  } else {
    option.removeAttribute("selected");
  }
}
function apply_default_select_value(select, preserve) {
  var value = select.__defaultValue;
  var multiple = select.multiple;
  var values = multiple ? (value ?? []) : null;
  if (multiple && !is_array(values)) return;
  var index2 = select.selectedIndex;
  var selected = preserve && multiple ? new Set(select.selectedOptions) : null;
  for (var option of select.options) {
    var option_value = get_option_value(option);
    set_selected(
      option,
      multiple
        ? /** @type {any[]} */
          values.includes(option_value)
        : is(option_value, value),
    );
  }
  if (!preserve) return;
  if (selected !== null) {
    for (option of select.options) {
      var was_selected = selected.has(option);
      if (option.selected !== was_selected) option.selected = was_selected;
    }
  } else if (select.selectedIndex !== index2) {
    select.selectedIndex = index2;
  }
}
function select_option(select, value, mounting = false) {
  if (select.multiple) {
    if (value == void 0) {
      return;
    }
    if (!is_array(value)) {
      return select_multiple_invalid_value();
    }
    for (var option of select.options) {
      option.selected = value.includes(get_option_value(option));
    }
    return;
  }
  for (option of select.options) {
    var option_value = get_option_value(option);
    if (is(option_value, value)) {
      option.selected = true;
      return;
    }
  }
  if (!mounting || value !== void 0) {
    select.selectedIndex = -1;
  }
}
function init_select(select) {
  var observer = new MutationObserver((entries) => {
    if (entries.every(is_selectedcontent_mutation)) return;
    if ("__defaultValue" in select) {
      apply_default_select_value(select, false);
    }
    if ("__value" in select) {
      select_option(select, select.__value);
    }
  });
  observer.observe(select, {
    // Listen to option element changes
    childList: true,
    subtree: true,
    // because of <optgroup>
    // Listen to option element value attribute changes
    // (doesn't get notified of select value changes,
    // because that property is not reflected as an attribute)
    attributes: true,
    attributeFilter: ["value"],
  });
  teardown(() => {
    observer.disconnect();
  });
}
function get_option_value(option) {
  if ("__value" in option) {
    return option.__value;
  } else {
    return option.value;
  }
}
function is_selectedcontent_mutation(entry) {
  if (
    /** @type {Element} */
    entry.target.closest("selectedcontent") !== null
  ) {
    return true;
  }
  if (entry.type === "childList") {
    var nodes = [...entry.addedNodes, ...entry.removedNodes];
    return (
      nodes.length > 0 &&
      nodes.every((node) => node.nodeName === "SELECTEDCONTENT")
    );
  }
  return false;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var IS_CUSTOM_ELEMENT = /* @__PURE__ */ Symbol("is custom element");
var IS_HTML = /* @__PURE__ */ Symbol("is html");
var LINK_TAG = IS_XHTML ? "link" : "LINK";
var PROGRESS_TAG = IS_XHTML ? "progress" : "PROGRESS";
function remove_input_defaults(input) {
  if (!hydrating) return;
  var already_removed = false;
  var remove_defaults = () => {
    if (already_removed) return;
    already_removed = true;
    if (input.hasAttribute("value")) {
      var value = input.value;
      set_attribute2(input, "value", null);
      input.value = value;
    }
    if (input.hasAttribute("checked")) {
      var checked = input.checked;
      set_attribute2(input, "checked", null);
      input.checked = checked;
    }
  };
  input[FORM_RESET_HANDLER] = remove_defaults;
  queue_micro_task(remove_defaults);
  add_form_reset_listener();
}
function set_value(element2, value) {
  var attributes = get_attributes(element2);
  if (
    attributes.value ===
      (attributes.value = value ?? void 0) || // treat null and undefined the same for the initial value // @ts-expect-error
    // `progress` elements always need their value set when it's `0`
    (element2.value === value &&
      (value !== 0 || element2.nodeName !== PROGRESS_TAG))
  ) {
    return;
  }
  element2.value = value ?? "";
}
function set_checked(element2, checked) {
  var attributes = get_attributes(element2);
  if (
    attributes.checked ===
    (attributes.checked = checked ?? void 0) // treat null and undefined the same for the initial value
  ) {
    return;
  }
  element2.checked = checked;
}
function set_attribute2(element2, attribute, value, skip_warning) {
  var attributes = get_attributes(element2);
  if (hydrating) {
    attributes[attribute] = element2.getAttribute(attribute);
    if (
      attribute === "src" ||
      attribute === "srcset" ||
      (attribute === "href" && element2.nodeName === LINK_TAG)
    ) {
      if (!skip_warning) {
        check_src_in_dev_hydration(element2, attribute, value ?? "");
      }
      return;
    }
  }
  if (attributes[attribute] === (attributes[attribute] = value)) return;
  if (attribute === "loading") {
    element2[LOADING_ATTR_SYMBOL] = value;
  }
  if (value == null) {
    element2.removeAttribute(attribute);
  } else if (
    typeof value !== "string" &&
    get_setters(element2).has(attribute)
  ) {
    element2[attribute] = value;
  } else {
    element2.setAttribute(attribute, value);
  }
}
function set_custom_element_data(node, prop2, value) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  let was_hydrating = hydrating;
  if (hydrating) {
    set_hydrating(false);
  }
  set_active_reaction(null);
  set_active_effect(null);
  try {
    if (
      // `style` should use `set_attribute` rather than the setter
      prop2 !== "style" && // Don't compute setters for custom elements while they aren't registered yet,
      // because during their upgrade/instantiation they might add more setters.
      // Instead, fall back to a simple "an object, then set as property" heuristic.
      (setters_cache.has(node.getAttribute("is") || node.nodeName) || // customElements may not be available in browser extension contexts
      !customElements ||
      customElements.get(node.getAttribute("is") || node.nodeName.toLowerCase())
        ? get_setters(node).has(prop2)
        : value && typeof value === "object")
    ) {
      node[prop2] = value;
    } else {
      set_attribute2(node, prop2, value == null ? value : String(value));
    }
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
    if (was_hydrating) {
      set_hydrating(true);
    }
  }
}
function get_attributes(element2) {
  return (
    /** @type {Record<string | symbol, unknown>} **/
    /** @type {any} */
    (element2[ATTRIBUTES_CACHE] ??= {
      [IS_CUSTOM_ELEMENT]: element2.nodeName.includes("-"),
      [IS_HTML]: element2.namespaceURI === NAMESPACE_HTML,
    })
  );
}
var setters_cache = /* @__PURE__ */ new Map();
function get_setters(element2) {
  var cache_key = element2.getAttribute("is") || element2.nodeName;
  var setters = setters_cache.get(cache_key);
  if (setters) return setters;
  setters_cache.set(cache_key, (setters = /* @__PURE__ */ new Set()));
  var descriptors;
  var proto = element2;
  var element_proto = Element.prototype;
  while (element_proto !== proto) {
    descriptors = get_descriptors(proto);
    for (var key2 in descriptors) {
      if (
        descriptors[key2].set && // better safe than sorry, we don't want spread attributes to mess with HTML content
        key2 !== "innerHTML" &&
        key2 !== "textContent" &&
        key2 !== "innerText"
      ) {
        setters.add(key2);
      }
    }
    proto = get_prototype_of(proto);
  }
  return setters;
}
function check_src_in_dev_hydration(element2, attribute, value) {
  if (!dev_fallback_default) return;
  if (attribute === "srcset" && srcset_url_equal(element2, value)) return;
  if (src_url_equal(element2.getAttribute(attribute) ?? "", value)) return;
  hydration_attribute_changed(
    attribute,
    element2.outerHTML.replace(element2.innerHTML, element2.innerHTML && "..."),
    String(value),
  );
}
function src_url_equal(element_src, url) {
  if (element_src === url) return true;
  return (
    new URL(element_src, document.baseURI).href ===
    new URL(url, document.baseURI).href
  );
}
function split_srcset(srcset) {
  return srcset.split(",").map((src) => src.trim().split(" ").filter(Boolean));
}
function srcset_url_equal(element2, srcset) {
  var element_urls = split_srcset(element2.srcset);
  var urls = split_srcset(srcset);
  return (
    urls.length === element_urls.length &&
    urls.every(
      ([url, width], i) =>
        width === element_urls[i][1] && // We need to test both ways because Vite will create an a full URL with
        // `new URL(asset, import.meta.url).href` for the client when `base: './'`, and the
        // relative URLs inside srcset are not automatically resolved to absolute URLs by
        // browsers (in contrast to img.src). This means both SSR and DOM code could
        // contain relative or absolute URLs.
        (src_url_equal(element_urls[i][0], url) ||
          src_url_equal(url, element_urls[i][0])),
    )
  );
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function is_bound_this(bound_value, element_or_component) {
  return (
    bound_value === element_or_component ||
    bound_value?.[STATE_SYMBOL] === element_or_component
  );
}
function bind_this(
  element_or_component = mark_as_component(),
  update2,
  get_value,
  get_parts,
) {
  var component_effect =
    /** @type {ComponentContext} */
    component_context.r;
  var parent =
    /** @type {Effect} */
    active_effect;
  effect(() => {
    var old_parts;
    var parts;
    render_effect(() => {
      old_parts = parts;
      parts = get_parts?.() || [];
      untrack(() => {
        if (!is_bound_this(get_value(...parts), element_or_component)) {
          update2(element_or_component, ...parts);
          if (
            old_parts &&
            is_bound_this(get_value(...old_parts), element_or_component)
          ) {
            update2(null, ...old_parts);
          }
        }
      });
    });
    return () => {
      let p = parent;
      while (
        p !== component_effect &&
        p.parent !== null &&
        p.parent.f & DESTROYING
      ) {
        p = p.parent;
      }
      const teardown2 = () => {
        if (parts && is_bound_this(get_value(...parts), element_or_component)) {
          update2(null, ...parts);
        }
      };
      const original_teardown = p.teardown;
      p.teardown = () => {
        teardown2();
        original_teardown?.();
      };
    };
  });
  return element_or_component;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/store/utils.js
function subscribe_to_store(store, run3, invalidate) {
  if (store == null) {
    run3(void 0);
    if (invalidate) invalidate(void 0);
    return noop;
  }
  const unsub = untrack(() =>
    store.subscribe(
      run3,
      // @ts-expect-error
      invalidate,
    ),
  );
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/store/shared/index.js
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop = null;
  const subscribers = /* @__PURE__ */ new Set();
  function set3(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set3(
      fn(
        /** @type {T} */
        value,
      ),
    );
  }
  function subscribe(run3, invalidate = noop) {
    const subscriber = [run3, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set3, update2) || noop;
    }
    run3(
      /** @type {T} */
      value,
    );
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set: set3, update: update2, subscribe };
}
function get3(store) {
  let value;
  subscribe_to_store(store, (_) => (value = _))();
  return value;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/store.js
var is_store_binding = false;
var IS_UNMOUNTED = /* @__PURE__ */ Symbol("unmounted");
function store_get(store, store_name, stores) {
  const entry = (stores[store_name] ??= {
    store: null,
    source: mutable_source(void 0),
    unsubscribe: noop,
  });
  if (dev_fallback_default) {
    entry.source.label = store_name;
  }
  if (entry.store !== store && !(IS_UNMOUNTED in stores)) {
    entry.unsubscribe();
    entry.store = store ?? null;
    if (store == null) {
      entry.source.v = void 0;
      entry.unsubscribe = noop;
    } else {
      var is_synchronous_callback = true;
      entry.unsubscribe = subscribe_to_store(store, (v) => {
        if (is_synchronous_callback) {
          entry.source.v = v;
        } else {
          set2(entry.source, v);
        }
      });
      is_synchronous_callback = false;
    }
  }
  if (store && IS_UNMOUNTED in stores) {
    return get3(store);
  }
  return get2(entry.source);
}
function setup_stores() {
  const stores = {};
  function cleanup() {
    teardown(() => {
      for (var store_name in stores) {
        const ref = stores[store_name];
        ref.unsubscribe();
      }
      define_property(stores, IS_UNMOUNTED, {
        enumerable: false,
        value: true,
      });
    });
  }
  return [stores, cleanup];
}
function capture_store_binding(fn) {
  var previous_is_store_binding = is_store_binding;
  try {
    is_store_binding = false;
    return [fn(), is_store_binding];
  } finally {
    is_store_binding = previous_is_store_binding;
  }
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/reactivity/props.js
var spread_props_handler = {
  get(target, key2) {
    let i = target.props.length;
    while (i--) {
      let p = target.props[i];
      if (is_function(p)) p = p();
      if (typeof p === "object" && p !== null && key2 in p) return p[key2];
    }
  },
  set(target, key2, value) {
    let i = target.props.length;
    while (i--) {
      let p = target.props[i];
      if (is_function(p)) p = p();
      const desc = get_descriptor(p, key2);
      if (desc && desc.set) {
        desc.set(value);
        return true;
      }
    }
    return false;
  },
  getOwnPropertyDescriptor(target, key2) {
    let i = target.props.length;
    while (i--) {
      let p = target.props[i];
      if (is_function(p)) p = p();
      if (typeof p === "object" && p !== null && key2 in p) {
        const descriptor = get_descriptor(p, key2);
        if (descriptor && !descriptor.configurable) {
          descriptor.configurable = true;
        }
        return descriptor;
      }
    }
  },
  has(target, key2) {
    if (key2 === STATE_SYMBOL || key2 === LEGACY_PROPS) return false;
    for (let p of target.props) {
      if (is_function(p)) p = p();
      if (p != null && key2 in p) return true;
    }
    return false;
  },
  ownKeys(target) {
    const keys = [];
    for (let p of target.props) {
      if (is_function(p)) p = p();
      if (!p) continue;
      for (const key2 in p) {
        if (!keys.includes(key2)) keys.push(key2);
      }
      for (const key2 of Object.getOwnPropertySymbols(p)) {
        if (!keys.includes(key2)) keys.push(key2);
      }
    }
    return keys;
  },
};
function spread_props(...props) {
  return new Proxy({ props }, spread_props_handler);
}
function prop(props, key2, flags2, fallback2) {
  var runes = !legacy_mode_flag || (flags2 & PROPS_IS_RUNES) !== 0;
  var bindable = (flags2 & PROPS_IS_BINDABLE) !== 0;
  var lazy = (flags2 & PROPS_IS_LAZY_INITIAL) !== 0;
  var fallback_value =
    /** @type {V} */
    fallback2;
  var fallback_dirty = true;
  var fallback_signal =
    /** @type {Derived<V> | undefined} */
    void 0;
  var get_fallback = () => {
    if (lazy && runes) {
      fallback_signal ??= derived(
        /** @type {() => V} */
        fallback2,
      );
      return get2(fallback_signal);
    }
    if (fallback_dirty) {
      fallback_dirty = false;
      fallback_value = lazy
        ? untrack(
            /** @type {() => V} */
            fallback2,
          )
        : /** @type {V} */
          fallback2;
    }
    return fallback_value;
  };
  let setter;
  if (bindable) {
    var is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props;
    setter =
      get_descriptor(props, key2)?.set ??
      (is_entry_props && key2 in props ? (v) => (props[key2] = v) : void 0);
  }
  var initial_value;
  var is_store_sub = false;
  if (bindable) {
    [initial_value, is_store_sub] = capture_store_binding(
      () =>
        /** @type {V} */
        props[key2],
    );
  } else {
    initial_value = /** @type {V} */ props[key2];
  }
  if (initial_value === void 0 && fallback2 !== void 0) {
    initial_value = get_fallback();
    if (setter) {
      if (runes) props_invalid_value(key2);
      setter(initial_value);
    }
  }
  var getter;
  if (runes) {
    getter = () => {
      var value =
        /** @type {V} */
        props[key2];
      if (value === void 0) return get_fallback();
      fallback_dirty = true;
      return value;
    };
  } else {
    getter = () => {
      var value =
        /** @type {V} */
        props[key2];
      if (value !== void 0) {
        fallback_value = /** @type {V} */ void 0;
      }
      return value === void 0 ? fallback_value : value;
    };
  }
  if (runes && (flags2 & PROPS_IS_UPDATED) === 0) {
    return getter;
  }
  if (setter) {
    var legacy_parent = props.$$legacy;
    return (
      /** @type {() => V} */
      (
        function (value, mutation) {
          if (arguments.length > 0) {
            if (!runes || !mutation || legacy_parent || is_store_sub) {
              setter(mutation ? getter() : value);
            }
            return value;
          }
          return getter();
        }
      )
    );
  }
  var overridden = false;
  var d = ((flags2 & PROPS_IS_IMMUTABLE) !== 0 ? derived : derived_safe_equal)(
    () => {
      overridden = false;
      return getter();
    },
  );
  if (dev_fallback_default) {
    d.label = key2;
  }
  if (bindable) get2(d);
  var parent_effect =
    /** @type {Effect} */
    active_effect;
  return (
    /** @type {() => V} */
    (
      function (value, mutation) {
        if (arguments.length > 0) {
          const new_value = mutation
            ? get2(d)
            : runes && bindable
              ? proxy(value)
              : value;
          set2(d, new_value);
          overridden = true;
          if (fallback_value !== void 0) {
            fallback_value = new_value;
          }
          return value;
        }
        if (
          (is_destroying_effect && overridden) ||
          (parent_effect.f & DESTROYED) !== 0
        ) {
          return d.v;
        }
        return get2(d);
      }
    )
  );
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/legacy/legacy-client.js
function createClassComponent(options) {
  return new Svelte4Component(options);
}
var Svelte4Component = class {
  /** @type {any} */
  #events;
  /** @type {Record<string, any>} */
  #instance;
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(options) {
    var sources = /* @__PURE__ */ new Map();
    var add_source = (key2, value) => {
      var s = mutable_source(value, false, false);
      sources.set(key2, s);
      return s;
    };
    const props = new Proxy(
      { ...(options.props || {}), $$events: {} },
      {
        get(target, prop2) {
          return get2(
            sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)),
          );
        },
        has(target, prop2) {
          if (prop2 === LEGACY_PROPS) return true;
          get2(
            sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)),
          );
          return Reflect.has(target, prop2);
        },
        set(target, prop2, value) {
          set2(sources.get(prop2) ?? add_source(prop2, value), value);
          return Reflect.set(target, prop2, value);
        },
      },
    );
    this.#instance = (options.hydrate ? hydrate : mount)(options.component, {
      target: options.target,
      anchor: options.anchor,
      props,
      context: options.context,
      intro: options.intro ?? false,
      recover: options.recover,
      transformError: options.transformError,
    });
    if (
      !async_mode_flag &&
      (!options?.props?.$$host || options.sync === false)
    ) {
      flushSync();
    }
    this.#events = props.$$events;
    for (const key2 of Object.keys(this.#instance)) {
      if (key2 === "$set" || key2 === "$destroy" || key2 === "$on") continue;
      define_property(this, key2, {
        get() {
          return this.#instance[key2];
        },
        /** @param {any} value */
        set(value) {
          this.#instance[key2] = value;
        },
        enumerable: true,
      });
    }
    this.#instance.$set =
      /** @param {Record<string, any>} next */
      (next2) => {
        Object.assign(props, next2);
      };
    this.#instance.$destroy = () => {
      unmount(this.#instance);
    };
  }
  /** @param {Record<string, any>} props */
  $set(props) {
    this.#instance.$set(props);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(event2, callback) {
    this.#events[event2] = this.#events[event2] || [];
    const cb = (...args) => callback.call(this, ...args);
    this.#events[event2].push(cb);
    return () => {
      this.#events[event2] = this.#events[event2].filter(
        /** @param {any} fn */
        (fn) => fn !== cb,
      );
    };
  }
  $destroy() {
    this.#instance.$destroy();
  }
};

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/client/dom/elements/custom-element.js
var SvelteElement;
if (typeof HTMLElement === "function") {
  SvelteElement = class extends HTMLElement {
    /** The Svelte component constructor */
    $$ctor;
    /** Slots */
    $$s;
    /** @type {any} The Svelte component instance */
    $$c;
    /** Whether or not the custom element is connected */
    $$cn = false;
    /** @type {Record<string, any>} Component props data */
    $$d = {};
    /** `true` if currently in the process of reflecting component props back to attributes */
    $$r = false;
    /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
    $$p_d = {};
    /** @type {Record<string, EventListenerOrEventListenerObject[]>} Event listeners */
    $$l = {};
    /** @type {Map<EventListenerOrEventListenerObject, Function>} Event listener unsubscribe functions */
    $$l_u = /* @__PURE__ */ new Map();
    /** @type {any} The managed render effect for reflecting attributes */
    $$me;
    /** @type {ShadowRoot | null} The ShadowRoot of the custom element */
    $$shadowRoot = null;
    /**
     * @param {*} $$componentCtor
     * @param {*} $$slots
     * @param {ShadowRootInit | undefined} shadow_root_init
     */
    constructor($$componentCtor, $$slots, shadow_root_init) {
      super();
      this.$$ctor = $$componentCtor;
      this.$$s = $$slots;
      if (shadow_root_init) {
        this.$$shadowRoot = this.attachShadow(shadow_root_init);
      }
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    addEventListener(type, listener, options) {
      this.$$l[type] = this.$$l[type] || [];
      this.$$l[type].push(listener);
      if (this.$$c) {
        const unsub = this.$$c.$on(type, listener);
        this.$$l_u.set(listener, unsub);
      }
      super.addEventListener(type, listener, options);
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options);
      if (this.$$c) {
        const unsub = this.$$l_u.get(listener);
        if (unsub) {
          unsub();
          this.$$l_u.delete(listener);
        }
      }
    }
    async connectedCallback() {
      this.$$cn = true;
      if (!this.$$c) {
        let create_slot = function (name) {
          return (anchor) => {
            const slot2 = create_element("slot");
            if (name !== "default") slot2.name = name;
            append(anchor, slot2);
          };
        };
        await Promise.resolve();
        if (!this.$$cn || this.$$c) {
          return;
        }
        const $$slots = {};
        const existing_slots = get_custom_elements_slots(this);
        for (const name of this.$$s) {
          if (name in existing_slots) {
            if (name === "default" && !this.$$d.children) {
              this.$$d.children = create_slot(name);
              $$slots.default = true;
            } else {
              $$slots[name] = create_slot(name);
            }
          }
        }
        for (const attribute of this.attributes) {
          const name = this.$$g_p(attribute.name);
          if (!(name in this.$$d)) {
            this.$$d[name] = get_custom_element_value(
              name,
              attribute.value,
              this.$$p_d,
              "toProp",
            );
          }
        }
        for (const key2 in this.$$p_d) {
          if (!(key2 in this.$$d) && this[key2] !== void 0) {
            this.$$d[key2] = this[key2];
            delete this[key2];
          }
        }
        this.$$c = createClassComponent({
          component: this.$$ctor,
          target: this.$$shadowRoot || this,
          props: {
            ...this.$$d,
            $$slots,
            $$host: this,
          },
        });
        this.$$me = effect_root(() => {
          render_effect(() => {
            this.$$r = true;
            for (const key2 of object_keys(this.$$c)) {
              if (!this.$$p_d[key2]?.reflect) continue;
              this.$$d[key2] = this.$$c[key2];
              const attribute_value = get_custom_element_value(
                key2,
                this.$$d[key2],
                this.$$p_d,
                "toAttribute",
              );
              if (attribute_value == null) {
                this.removeAttribute(this.$$p_d[key2].attribute || key2);
              } else {
                this.setAttribute(
                  this.$$p_d[key2].attribute || key2,
                  attribute_value,
                );
              }
            }
            this.$$r = false;
          });
        });
        for (const type in this.$$l) {
          for (const listener of this.$$l[type]) {
            const unsub = this.$$c.$on(type, listener);
            this.$$l_u.set(listener, unsub);
          }
        }
        this.$$l = {};
      }
    }
    // We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
    // and setting attributes through setAttribute etc, this is helpful
    /**
     * @param {string} attr
     * @param {string} _oldValue
     * @param {string} newValue
     */
    attributeChangedCallback(attr2, _oldValue, newValue) {
      if (this.$$r) return;
      attr2 = this.$$g_p(attr2);
      this.$$d[attr2] = get_custom_element_value(
        attr2,
        newValue,
        this.$$p_d,
        "toProp",
      );
      this.$$c?.$set({ [attr2]: this.$$d[attr2] });
    }
    disconnectedCallback() {
      this.$$cn = false;
      Promise.resolve().then(() => {
        if (!this.$$cn && this.$$c) {
          this.$$c.$destroy();
          this.$$me();
          this.$$c = void 0;
        }
      });
    }
    /**
     * @param {string} attribute_name
     */
    $$g_p(attribute_name) {
      return (
        object_keys(this.$$p_d).find(
          (key2) =>
            this.$$p_d[key2].attribute === attribute_name ||
            (!this.$$p_d[key2].attribute &&
              key2.toLowerCase() === attribute_name),
        ) || attribute_name
      );
    }
  };
}
function get_custom_element_value(prop2, value, props_definition, transform) {
  const type = props_definition[prop2]?.type;
  value =
    type === "Boolean" && typeof value !== "boolean" ? value != null : value;
  if (!transform || !props_definition[prop2]) {
    return value;
  } else if (transform === "toAttribute") {
    switch (type) {
      case "Object":
      case "Array":
        return value == null ? null : JSON.stringify(value);
      case "Boolean":
        return value ? "" : null;
      case "Number":
        return value == null ? null : value;
      default:
        return value;
    }
  } else {
    switch (type) {
      case "Object":
      case "Array":
        return value && JSON.parse(value);
      case "Boolean":
        return value;
      // conversion already handled above
      case "Number":
        return value != null ? +value : value;
      default:
        return value;
    }
  }
}
function get_custom_elements_slots(element2) {
  const result = {};
  element2.childNodes.forEach((node) => {
    result[
      /** @type {Element} node */
      node.slot || "default"
    ] = true;
  });
  return result;
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/index-client.js
if (dev_fallback_default) {
  let throw_rune_error = function (rune) {
    if (!(rune in globalThis)) {
      let value;
      Object.defineProperty(globalThis, rune, {
        configurable: true,
        // eslint-disable-next-line getter-return
        get: () => {
          if (value !== void 0) {
            return value;
          }
          rune_outside_svelte(rune);
        },
        set: (v) => {
          value = v;
        },
      });
    }
  };
  throw_rune_error("$state");
  throw_rune_error("$effect");
  throw_rune_error("$derived");
  throw_rune_error("$inspect");
  throw_rune_error("$props");
  throw_rune_error("$bindable");
}
function onMount(fn) {
  if (component_context === null) {
    lifecycle_outside_component("onMount");
  }
  if (legacy_mode_flag && component_context.l !== null) {
    init_update_callbacks(component_context).m.push(fn);
  } else {
    user_effect(() => {
      const cleanup = untrack(fn);
      if (typeof cleanup === "function")
        return (
          /** @type {() => void} */
          cleanup
        );
    });
  }
}
function init_update_callbacks(context) {
  var l =
    /** @type {ComponentContextLegacy} */
    context.l;
  return (l.u ??= { a: [], b: [], m: [] });
}

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/version.js
var PUBLIC_VERSION = "5";

// node_modules/.pnpm/svelte@5.57.2/node_modules/svelte/src/internal/disclose-version.js
if (typeof window !== "undefined") {
  ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(
    PUBLIC_VERSION,
  );
}

// custom_components/occupied/frontend/step-model.ts
var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
var sorted = (values) => [...new Set(values)].sort();
function targetEntities(program, targets = {}) {
  return sorted([
    ...(targets.entities || []),
    ...(targets.groups || []).flatMap(
      (id) => program.groups?.find((g) => g.id === id)?.entities || [],
    ),
  ]);
}
function stepEntries(program) {
  return (program.routines || []).flatMap((routine, ri) =>
    ["steps", "activities", "activity_windows"].flatMap((kind) =>
      (routine[kind] || []).map((item, index2) => ({
        ...item,
        kind,
        container: routine,
        path: ["routines", ri, kind, index2],
        days: (routine.days || days).filter(
          (d) => !item.days || item.days.includes(d),
        ),
        entities: targetEntities(program, {
          entities:
            kind === "activity_windows"
              ? targetEntities(program, item.targets)
              : (item.actions || item.on_start || []).flatMap((a) =>
                  targetEntities(program, a.targets),
                ),
        }),
      })),
    ),
  );
}
function minutes(value) {
  if (value === "0") return 0;
  if (typeof value === "number") return value / 60;
  const text2 = String(value || "0s");
  if (
    !/^[+-]?(?:\d+(?:\.\d+)?h)?(?:\d+(?:\.\d+)?m)?(?:\d+(?:\.\d+)?s)?$/.test(
      text2,
    ) ||
    ["", "+", "-"].includes(text2)
  )
    return NaN;
  const total = [...text2.matchAll(/(\d+(?:\.\d+)?)([hms])/g)].reduce(
    (n, [, amount, unit]) =>
      n + Number(amount) * { h: 60, m: 1, s: 1 / 60 }[unit],
    0,
  );
  return text2.startsWith("-") ? -total : total;
}
function clockMinutes(value) {
  const [h, m, s = 0] = (value || "").split(":").map(Number);
  return h * 60 + m + s / 60;
}
var solarEvents = ["sunrise", "sunset", "dawn", "dusk", "noon", "midnight"];
function timeSourceChoices(program, id, catalog = {}) {
  return [
    ...parentSteps(program, id).map((step) => ({
      value: `step:${step.id}`,
      name: step.name,
      group: "Steps",
    })),
    ...(catalog.time_sources ||
      solarEvents.map((event2) => ({
        value: `sun:${event2}`,
        name: event2,
        group: "Solar events",
      }))),
  ];
}
function timingForm(when = {}) {
  const range =
    when.offset_range ||
    when.sun_range?.offset_range ||
    when.entity_range?.offset_range;
  const clock = when.clock_range;
  return {
    mode: clock || !range ? "absolute" : "relative",
    start: clock?.earliest || "18:00",
    end: clock && clock.latest !== clock.earliest ? clock.latest : "",
    anchor: when.relative_to
      ? `step:${when.relative_to}`
      : when.sun_range
        ? `sun:${when.sun_range.sun}`
        : when.entity_range
          ? `entity:${when.entity_range.entity_id}${when.entity_range.attribute ? `:${when.entity_range.attribute}` : ""}`
          : "",
    startOffset: range?.fixed ?? range?.min ?? "0s",
    endOffset:
      range && range.fixed == null && range.min !== range.max
        ? (range.max ?? "")
        : "",
    fallback: when.sun_range?.fallback || "",
  };
}
function simpleStep(entry) {
  if (entry.kind !== "steps" || !entry.actions?.length) return false;
  const actions = entry.actions;
  if (actions.length === 1 && actions[0].action.includes(".")) {
    const action2 = actions[0];
    if (!/^(light|switch)\.turn_(on|off)$/.test(action2.action))
      return (
        entry.entities.length > 0 &&
        !action2.stagger &&
        !action2.target_order &&
        !action2.resources?.length
      );
  }
  if (
    !actions.every((a) =>
      /^(?:(?:light|switch)\.)?turn_(on|off)$/.test(a.action),
    )
  )
    return false;
  if (
    !actions.every((a) =>
      a.action.endsWith(
        actions[0].action.endsWith("turn_on") ? "turn_on" : "turn_off",
      ),
    )
  )
    return false;
  if (
    !entry.entities.length ||
    entry.entities.some((e) => !/^(light|switch)\./.test(e))
  )
    return false;
  if (
    actions.length > 1 &&
    (actions.length !== 2 ||
      !same(actions[1].data || {}, {}) ||
      actions[0].action !== actions[1].action ||
      actions.some((a) => a.targets?.groups?.length) ||
      !(actions[0].targets?.entities || []).every((e) =>
        e.startsWith("light."),
      ) ||
      !(actions[1].targets?.entities || []).every((e) =>
        e.startsWith("switch."),
      ) ||
      actions.some((a) => a.stagger || a.target_order || a.resources?.length))
  )
    return false;
  return !!entry.when;
}
function stepEditor(program, entry, parent) {
  const source2 = entry || parent;
  const form = {
    name: entry?.name || "",
    kind:
      source2?.actions?.[0]?.action === "scene.turn_on"
        ? "scene"
        : source2?.actions?.[0]?.action &&
            !/^(?:(?:light|switch)\.)?turn_(on|off)$/.test(
              source2.actions[0].action,
            )
          ? "service"
          : "entities",
    service: source2?.actions?.[0]?.action || "homeassistant.turn_on",
    data: JSON.stringify(source2?.actions?.[0]?.data || {}, null, 2),
    entities: [...(entry?.entities || parent?.entities || [])],
    action: entry?.actions?.[0]?.action.endsWith("turn_off")
      ? "turn_off"
      : "turn_on",
    brightness:
      entry?.actions?.[0]?.data?.brightness_pct ??
      (entry?.actions?.[0]?.data?.brightness == null
        ? ""
        : Math.round((entry.actions[0].data.brightness * 1e4) / 255) / 100),
    days: [...(entry?.days || parent?.days || days)],
    timing: timingForm(entry?.when),
  };
  if (parent)
    Object.assign(form.timing, {
      mode: "relative",
      anchor: `step:${parent.id}`,
      startOffset: "30m",
    });
  return {
    id: entry?.id || identifier(program, "step"),
    existing: !!entry,
    stage: 0,
    form,
    original: copy(form),
    changed: !entry,
    errors: {},
  };
}
function hasStepChanges(editor) {
  return (
    !editor.existing ||
    JSON.stringify(editor.form) !== JSON.stringify(editor.original)
  );
}
function offsetErrors(time) {
  const errors = {},
    low = minutes(time.startOffset);
  const formatError = "Use h, m or s, for example 30m, 1h, 1h30m or -10m.";
  if (!time.startOffset || !Number.isFinite(low))
    errors.startOffset = formatError;
  else if (Math.abs(low) > 10080)
    errors.startOffset = "Offsets must be within seven days.";
  if (time.endOffset) {
    const high = minutes(time.endOffset);
    if (!Number.isFinite(high)) errors.endOffset = formatError;
    else if (Math.abs(high) > 10080)
      errors.endOffset = "Offsets must be within seven days.";
    else if (Number.isFinite(low) && high < low)
      errors.endOffset = "The end offset must be at least the start offset.";
  }
  return errors;
}
function editorErrors(program, editor, stage = 2) {
  const { form, id } = editor,
    errors = {};
  if (!form.entities.length)
    errors.entities =
      form.kind === "scene"
        ? "Select a Home Assistant scene."
        : "Select at least one entity.";
  if (form.entities.some((e) => !/^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(e)))
    errors.entities = "Choose valid Home Assistant entity IDs.";
  if (
    form.kind === "scene" &&
    (form.entities.length !== 1 || !form.entities[0]?.startsWith("scene."))
  )
    errors.entities = "Select one Home Assistant scene.";
  if (
    form.kind === "entities" &&
    form.entities.some((e) => !/^(light|switch)\./.test(e))
  )
    errors.entities = "Choose lights and switches, or select a service action.";
  if (form.kind === "service") {
    if (!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(form.service))
      errors.service = "Choose a service using domain.service.";
    try {
      const data = JSON.parse(form.data);
      if (!data || Array.isArray(data) || typeof data !== "object")
        throw new Error();
    } catch {
      errors.data = "Service data must be a JSON object.";
    }
  }
  if (!form.name.trim()) errors.name = "Give this step a name.";
  if (
    form.kind === "entities" &&
    form.brightness !== "" &&
    (!Number.isFinite(Number(form.brightness)) ||
      Number(form.brightness) <= 0 ||
      Number(form.brightness) > 100)
  )
    errors.brightness = "Choose a brightness between 1 and 100%.";
  if (!form.days.length) errors.days = "Choose at least one day.";
  const time = form.timing;
  const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
  if (time.mode === "absolute") {
    if (!clockPattern.test(time.start)) errors.start = "Choose a start time.";
    if (time.end && !clockPattern.test(time.end))
      errors.end = "Choose a valid end time or leave it blank.";
  } else if (time.mode === "relative") {
    Object.assign(errors, offsetErrors(time));
    if (time.anchor.startsWith("step:")) {
      const parent = stepEntries(program).find(
        (e) => e.id === time.anchor.slice(5) && e.kind === "steps",
      );
      if (!parent || !parentSteps(program, id).some((e) => e.id === parent.id))
        errors.anchor =
          "Choose another step without creating a circular relationship.";
      else if (form.days.some((d) => !parent.days.includes(d)))
        errors.anchor = `This step runs on days when ${parent.name} does not.`;
    } else if (
      !solarEvents.map((event2) => `sun:${event2}`).includes(time.anchor) &&
      !/^entity:[a-z_][a-z0-9_]*\.[a-z0-9_]+(?::(?:start_time|end_time))?$/.test(
        time.anchor,
      )
    )
      errors.anchor = "Choose a step or Home Assistant time source.";
    if (
      time.anchor.startsWith("sun:") &&
      time.fallback &&
      !clockPattern.test(time.fallback)
    )
      errors.fallback = "Choose a valid fallback time or leave it blank.";
  } else errors.mode = "Choose absolute time or relative to.";
  for (const child2 of stepEntries(program))
    if (
      child2.when?.relative_to === id &&
      child2.missing_anchor !== "skip" &&
      child2.days.some((d) => !form.days.includes(d))
    )
      errors.days = `${child2.name} depends on this step. Keep its days (${child2.days.join(", ")}) or edit it first.`;
  if (stage < 2) {
    const fields =
      stage === 0
        ? [
            "mode",
            "start",
            "end",
            "anchor",
            "startOffset",
            "endOffset",
            "fallback",
          ]
        : ["entities"];
    return Object.fromEntries(
      Object.entries(errors).filter(([key2]) => fields.includes(key2)),
    );
  }
  return errors;
}
function formWhen(time) {
  if (time.mode === "absolute") {
    const end = time.end || time.start;
    return {
      clock_range: {
        earliest: time.start,
        latest: end,
        cross_midnight: clockMinutes(end) < clockMinutes(time.start),
      },
    };
  }
  const startOffset = time.startOffset === "0" ? "0s" : time.startOffset;
  const endOffset = time.endOffset === "0" ? "0s" : time.endOffset;
  const range = endOffset
    ? { min: startOffset, max: endOffset }
    : { fixed: startOffset };
  if (time.anchor.startsWith("step:"))
    return { relative_to: time.anchor.slice(5), offset_range: range };
  if (time.anchor.startsWith("entity:")) {
    const [, entity_id, attribute] = time.anchor.split(":");
    return {
      entity_range: {
        entity_id,
        ...(attribute ? { attribute } : {}),
        offset_range: range,
      },
    };
  }
  return {
    sun_range: {
      sun: time.anchor.slice(4),
      offset_range: range,
      ...(time.fallback ? { fallback: time.fallback } : {}),
    },
  };
}
function buildStep(program, editor) {
  const errors = editorErrors(program, editor);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const next2 = copy(program),
    { form, original } = editor;
  let entry = stepEntries(next2).find((e) => e.id === editor.id);
  if (editor.existing && !entry)
    throw new Error(
      "This step changed elsewhere. Cancel and reopen it before saving.",
    );
  if (!entry) {
    const container2 = {
      id: identifier(next2, `${editor.id}_schedule`),
      name: form.name.trim(),
      days: [...days],
      steps: [
        {
          id: editor.id,
          name: form.name.trim(),
          actions: [],
          allow_cross_boundary: true,
        },
      ],
      activities: [],
      activity_windows: [],
    };
    (next2.routines ||= []).push(container2);
    entry = stepEntries(next2).find((e) => e.id === editor.id);
  }
  if (!entry || !next2.routines) throw new Error("Step could not be created");
  const container = next2.routines[entry.path[1]];
  const item = container.steps[entry.path[3]];
  item.actions ||= [];
  const isNew = !item.when;
  item.name = form.name.trim();
  if (isNew || !same(form.timing, original.timing))
    item.when = formWhen(form.timing);
  if (isNew || !same(form.days, original.days)) {
    item.days = [...form.days];
    if (form.days.some((d) => !(entry.container.days || days).includes(d))) {
      const container2 = copy(entry.container);
      container2.id = identifier(next2, `${editor.id}_schedule`);
      container2.name = item.name;
      container2.days = [...days];
      container2.steps = [item];
      container2.activities = [];
      container2.activity_windows = [];
      next2.routines[entry.path[1]].steps.splice(entry.path[3], 1);
      next2.routines.push(container2);
    }
  }
  const targetsChanged = !same(
    sorted(form.entities),
    sorted(original.entities),
  );
  const kindChanged = form.kind !== original.kind;
  const actionChanged = form.action !== original.action || kindChanged;
  const serviceChanged =
    form.service !== original.service || form.data !== original.data;
  const brightnessChanged = form.brightness !== original.brightness;
  if (form.kind !== "entities") {
    if (isNew || targetsChanged || kindChanged || serviceChanged) {
      const action2 = copy(item.actions[0] || { action: form.service });
      action2.action = form.kind === "scene" ? "scene.turn_on" : form.service;
      if (isNew || targetsChanged || kindChanged)
        action2.targets = { entities: [...form.entities] };
      action2.data =
        form.kind === "scene"
          ? kindChanged
            ? {}
            : action2.data || {}
          : JSON.parse(form.data);
      item.actions = [action2];
    }
  } else if (isNew || targetsChanged || actionChanged || brightnessChanged) {
    const action2 = copy(
      item.actions[0] || { action: form.action, targets: {}, data: {} },
    );
    const data = actionChanged ? {} : { ...action2.data };
    if (form.action === "turn_on" && (isNew || brightnessChanged)) {
      delete data.brightness;
      if (form.brightness === "") delete data.brightness_pct;
      else data.brightness_pct = Number(form.brightness);
    }
    action2.action = form.action;
    action2.data = data;
    if (
      !targetsChanged &&
      !isNew &&
      item.actions.length === 1 &&
      !(
        form.entities.some((e) => e.startsWith("switch.")) &&
        Object.keys(data).some((k) => k !== "transition")
      )
    ) {
      item.actions = [action2];
    } else {
      const lights = form.entities.filter((e) => e.startsWith("light."));
      const switches = form.entities.filter((e) => e.startsWith("switch."));
      item.actions = [];
      if (lights.length)
        item.actions.push({ ...action2, targets: { entities: lights }, data });
      if (switches.length)
        item.actions.push({
          ...action2,
          targets: { entities: switches },
          data: {},
        });
    }
  }
  const lighting = (next2.lighting ||= {});
  const managed2 = new Set(targetEntities(next2, lighting.managed_targets));
  const newLights = form.entities.filter(
    (e) =>
      form.kind === "entities" &&
      (isNew || targetsChanged || kindChanged) &&
      e.startsWith("light.") &&
      !managed2.has(e),
  );
  if (newLights.length) {
    lighting.managed_targets ||= { entities: [], groups: [] };
    lighting.managed_targets.entities = sorted([
      ...(lighting.managed_targets.entities || []),
      ...newLights,
    ]);
    const baselined = new Set(
      (lighting.baseline || []).flatMap((b) =>
        targetEntities(next2, b.targets),
      ),
    );
    const missing = newLights.filter((e) => !baselined.has(e));
    if (missing.length)
      (lighting.baseline ||= []).push({
        targets: { entities: missing },
        state: "off",
      });
  }
  return next2;
}
function dependentNames(program, id) {
  const paths = references(program, id);
  return stepEntries(program)
    .filter((e) => paths.some((p) => e.path.every((k, i) => p[i] === k)))
    .map((e) => e.name);
}
function timingSummary(entry, entries, t = (v) => v, sources = []) {
  if (!entry.when) return t("Repeated activity window");
  return timingExplanation(timingForm(entry.when), entries, t, sources, {
    includeHints: false,
  });
}
function timingExplanation(
  input,
  entries = [],
  t = (value) => value,
  sources = [],
  { includeHints = true } = {},
) {
  const time = {
    start: "",
    end: "",
    anchor: "",
    startOffset: "0s",
    endOffset: "",
    fallback: "",
    ...input,
  };
  if (time.mode === "absolute") {
    const valid = (value) =>
      /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
    const display = (value) =>
      value.replace(/:00$/, value.length === 8 ? "" : ":00");
    const seconds = (value) =>
      value
        .split(":")
        .reduce(
          (sum, part, index2) => sum + Number(part) * [3600, 60, 1][index2],
          0,
        );
    if (!valid(time.start) || (time.end && !valid(time.end)))
      return t("Choose valid start and end times.");
    if (!time.end)
      return `${t("Runs at")} ${display(time.start)}.${includeHints ? ` ${t("Add an end of window to introduce randomness.")}` : ""}`;
    if (seconds(time.end) === seconds(time.start))
      return `${t("Runs at")} ${display(time.start)}.${includeHints ? ` ${t("Start and end are the same, so the time is fixed.")}` : ""}`;
    const nextDay =
      seconds(time.end) < seconds(time.start) ? ` ${t("the next day")}` : "";
    return `${t("Runs at a random time between")} ${display(time.start)} ${t("and")} ${display(time.end)}${nextDay}.`;
  }
  if (Object.keys(offsetErrors(time)).length)
    return t("Enter valid offsets to see when this step runs.");
  if (!time.anchor) return t("Choose a step or event.");
  const step = time.anchor.startsWith("step:");
  const name = step
    ? `${entries.find((entry) => entry.id === time.anchor.slice(5))?.name || time.anchor.slice(5)} ${t("step")}`
    : time.anchor.startsWith("sun:")
      ? t(time.anchor.slice(4))
      : sources.find((source2) => source2.value === time.anchor)?.name ||
        time.anchor
          .slice(7)
          .replace(
            /:(start_time|end_time)$/,
            (_, attribute) =>
              ` \xB7 ${t(attribute === "start_time" ? "start" : "end")}`,
          );
  const low = minutes(time.startOffset),
    high = time.endOffset ? minutes(time.endOffset) : low;
  const duration = (offset) => {
    let remaining = Math.round(Math.abs(offset) * 60 * 1e6) / 1e6;
    const hours = Math.floor(remaining / 3600);
    remaining -= hours * 3600;
    const mins = Math.floor(remaining / 60);
    const seconds = Math.round((remaining - mins * 60) * 1e6) / 1e6;
    return [
      [hours, "hour", "hours"],
      [mins, "minute", "minutes"],
      [seconds, "second", "seconds"],
    ]
      .filter(([amount]) => amount)
      .map(
        ([amount, singular, plural]) =>
          `${amount} ${t(amount === 1 ? singular : plural)}`,
      )
      .join(" ");
  };
  const offsetLabel = (offset) =>
    `${duration(offset)} ${t(offset < 0 ? "before" : "after")}`;
  if (low === high)
    return low === 0
      ? `${t("Runs at the same time as")} ${name}.`
      : `${t("Runs")} ${offsetLabel(low)} ${name}.`;
  const anchorStart = step ? `${t("the start of")} ${name}` : name;
  if (low === 0)
    return `${t("Runs at a random time between")} ${anchorStart} ${t("and")} ${offsetLabel(high)} ${name}.`;
  if (high === 0)
    return `${t("Runs at a random time between")} ${offsetLabel(low)} ${name} ${t("and")} ${anchorStart}.`;
  const firstBound =
    Math.sign(low) === Math.sign(high) ? duration(low) : offsetLabel(low);
  return `${t("Runs at a random time between")} ${firstBound} ${t("and")} ${offsetLabel(high)} ${name}.`;
}

// custom_components/occupied/frontend/step-editor-controller.ts
function focusEditor(panel, key2) {
  const target = key2
    ? panel.shadowRoot.querySelector(`[data-builder-field="${key2}"]`)
    : panel.shadowRoot.querySelector('.routine-editor [aria-invalid="true"]') ||
      panel.shadowRoot.querySelector(".routine-editor h2");
  target?.focus();
}
function createStepEditorContext(panel) {
  const editor = panel.stepEditor,
    form = editor.form,
    time = form.timing,
    t = panel.t,
    editing = editor.existing;
  const refresh = (key2) => {
    panel.flush();
    focusEditor(panel, key2);
  };
  const changed = (key2) => {
    editor.changed = true;
    panel.version++;
    panel.validatedVersion = -1;
    delete editor.errors[key2];
    if (["startOffset", "endOffset"].includes(key2)) {
      const errors = offsetErrors(time);
      for (const offset of ["startOffset", "endOffset"]) {
        if (errors[offset]) editor.errors[offset] = errors[offset];
        else delete editor.errors[offset];
      }
    }
    panel.flush();
  };
  const submit = async () => {
    if (
      !editing &&
      editor.stage === 2 &&
      !form.name.trim() &&
      form.entities.length
    ) {
      const target = `${entityName(panel.catalog, form.entities[0])}${form.entities.length > 1 ? ` +${form.entities.length - 1}` : ""}`;
      form.name =
        form.kind === "entities"
          ? `${target} ${t(form.action === "turn_off" ? "off" : "on")}`
          : target;
    }
    editor.errors = editorErrors(
      panel.draft,
      editor,
      editing ? 2 : editor.stage,
    );
    if (Object.keys(editor.errors).length) return refresh();
    if (!editing && editor.stage < 2) {
      editor.stage++;
      return refresh();
    }
    try {
      const candidate = buildStep(panel.draft, editor);
      editor.candidatePath = required(
        stepEntries(candidate).find((entry) => entry.id === editor.id),
      ).path;
      if (panel.document?.source === "file") {
        panel.change([], candidate);
        panel.selectedStep = editor.id;
        panel.stepEditor = null;
        panel.renderView();
      } else await panel.save(candidate);
    } catch (error) {
      panel.fail(error);
    }
  };
  const cancel = () => {
    panel.stepEditor = null;
    panel.error = "";
    panel.issues = [];
    panel.version++;
    panel.renderView();
    panel.shadowRoot.getElementById(`step-card-${editor.id}`)?.focus();
  };
  const back = () => {
    editor.stage--;
    refresh();
  };
  return {
    panel,
    // New facades notify Svelte of in-place form and validation changes.
    editor: new Proxy(editor, {}),
    form: new Proxy(form, {}),
    time: new Proxy(time, {}),
    t,
    editing,
    refresh,
    changed,
    submit,
    cancel,
    back,
  };
}

// custom_components/occupied/frontend/steps.ts
function startStep(panel, entry, parent) {
  panel.stepEditor = stepEditor(panel.draft, entry, parent);
  panel.tab = "routines";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel);
}
function openStep(panel, entry) {
  if (panel.busy || panel.stepEditor?.id === entry.id) return;
  if (
    panel.stepEditor &&
    hasStepChanges(panel.stepEditor) &&
    !window.confirm(panel.t("Discard unsaved changes and open another step?"))
  )
    return;
  if (simpleStep(entry)) startStep(panel, entry);
  else {
    panel.stepEditor = null;
    panel.error = "";
    panel.issues = [];
    panel.selectedStep = panel.selectedStep === entry.id ? null : entry.id;
    panel.renderView();
  }
}
function actionSummary(entry, t) {
  const action2 = entry.actions?.[0]?.action || "";
  if (action2 === "scene.turn_on") return t("Activate scene");
  if (simpleStep(entry))
    return /^(?:(?:light|switch)\.)?turn_(on|off)$/.test(action2)
      ? t(action2.endsWith("turn_off") ? "Turn off" : "Turn on")
      : action2;
  return t("Custom actions");
}
function daySummary(selected, t) {
  if (selected.length === 7) return t("Every day");
  if (selected.join() === days.slice(0, 5).join()) return t("Weekdays");
  if (selected.join() === days.slice(5).join()) return t("Weekends");
  return selected.map((day) => t(day)).join(", ");
}
function stepTree(entries) {
  const seen2 = /* @__PURE__ */ new Set(),
    ordered = [];
  const append2 = (entry, depth) => {
    if (seen2.has(entry.id)) return;
    seen2.add(entry.id);
    ordered.push({ entry, depth });
    for (const child2 of entries)
      if (child2.when?.relative_to === entry.id) append2(child2, depth + 1);
  };
  const isRoot = (step) =>
    !step.when?.relative_to ||
    !entries.some((parent) => parent.id === step.when?.relative_to);
  for (const step of entries) if (isRoot(step)) append2(step, 0);
  for (const step of entries) append2(step, 0);
  return ordered;
}
function stepSymbol(entry) {
  if (entry.kind !== "steps") return "\u25F7";
  return entry.actions?.every((action2) => action2.action.endsWith("turn_off"))
    ? "\u25CB"
    : "\u25CF";
}

// custom_components/occupied/frontend/dom.ts
function properties(node, values) {
  const apply2 = (next2) => {
    for (const [key2, value] of Object.entries(next2)) {
      if (node[key2] !== value) node[key2] = value;
    }
  };
  apply2(values);
  return { update: apply2 };
}
function reference(node, callback) {
  callback(node);
  return {
    update(next2) {
      next2(node);
    },
  };
}
function validity(node, message) {
  node.setCustomValidity(message);
  return {
    update(next2) {
      node.setCustomValidity(next2);
    },
  };
}

// custom_components/occupied/frontend/DeleteStepDialog.svelte
var root = from_html(`<li> </li>`);
var root_1 = from_html(`<p> </p> <ul></ul> <p class="hint"> </p>`, 1);
var root_2 = from_html(`<p class="hint"> </p>`);
var root_3 = from_html(
  `<dialog class="step-delete-dialog" aria-labelledby="step-delete-title" aria-describedby="step-delete-description"><h2 id="step-delete-title"> </h2> <div id="step-delete-description"><p> </p> <!></div> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="danger"> </button></div></dialog>`,
);
function DeleteStepDialog($$anchor, $$props) {
  push($$props, true);
  let panel = prop($$props, "panel", 7);
  let t = user_derived(() => panel().t);
  let dependents = user_derived(() =>
    dependentNames(panel().draft, $$props.entry.id),
  );
  let dialog;
  onMount(() => {
    dialog.showModal();
    dialog.querySelector("button")?.focus();
  });
  var dialog_1 = root_3();
  var h2 = child(dialog_1);
  var text2 = only_child(h2, true);
  var div = sibling(h2, 2);
  var p = child(div);
  var text_1 = only_child(p, true);
  var node_1 = sibling(p, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment = root_1();
      var p_1 = first_child(fragment);
      var text_2 = only_child(p_1);
      var ul = sibling(p_1, 2);
      each(
        ul,
        21,
        () => get2(dependents),
        index,
        ($$anchor3, name) => {
          var li = root();
          var text_3 = only_child(li, true);
          template_effect(() => set_text(text_3, get2(name)));
          append($$anchor3, li);
        },
      );
      reset(ul);
      var p_2 = sibling(ul, 2);
      var text_4 = only_child(p_2, true);
      template_effect(
        ($0, $1) => {
          set_text(text_2, `${$0 ?? ""}:`);
          set_text(text_4, $1);
        },
        [
          () => get2(t)("Used by"),
          () => get2(t)("Change those relationships before deleting."),
        ],
      );
      append($$anchor2, fragment);
    };
    var alternate = ($$anchor2) => {
      var p_3 = root_2();
      var text_5 = only_child(p_3, true);
      template_effect(
        ($0) => set_text(text_5, $0),
        [() => get2(t)("This step will be removed when you save changes.")],
      );
      append($$anchor2, p_3);
    };
    if_block(node_1, ($$render) => {
      if (get2(dependents).length) $$render(consequent);
      else $$render(alternate, -1);
    });
  }
  reset(div);
  var div_1 = sibling(div, 2);
  var button = child(div_1);
  var text_6 = only_child(button, true);
  var button_1 = sibling(button, 2);
  var text_7 = only_child(button_1, true);
  reset(div_1);
  reset(dialog_1);
  action(
    dialog_1,
    ($$node, $$action_arg) => reference?.($$node, $$action_arg),
    () => (node) => {
      if (node) dialog = node;
    },
  );
  template_effect(
    ($0, $1, $2) => {
      set_text(text2, $0);
      set_text(text_1, $$props.entry.name);
      set_text(text_6, $1);
      button_1.disabled = get2(dependents).length > 0;
      set_text(text_7, $2);
    },
    [
      () => get2(t)("Delete step?"),
      () => get2(t)("Cancel"),
      () => get2(t)("Delete step"),
    ],
  );
  event("close", dialog_1, function (...$$args) {
    $$props.onClose?.apply(this, $$args);
  });
  delegated("click", button, () => dialog.close());
  delegated("click", button_1, () =>
    panel().attempt(() => {
      const current = stepEntries(panel().draft).find(
        (step) => step.id === $$props.entry.id,
      );
      if (!current) return dialog.close();
      const next2 = copy(panel().draft);
      removeResource(next2, current.path);
      dialog.close();
      panel().selectedStep = null;
      panel().stepEditor = null;
      panel().change([], next2, true);
    }),
  );
  append($$anchor, dialog_1);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/StepActions.svelte
var root2 = from_html(`<button type="button"> </button>`);
var root_12 = from_html(
  `<div class="step-editor-actions"><!> <button type="button" class="danger"> </button></div> <!>`,
  1,
);
function StepActions($$anchor, $$props) {
  push($$props, true);
  let deleteOpen = state(false);
  let trigger;
  function closeDeleteDialog() {
    flushSync(() => set2(deleteOpen, false));
    if (trigger.isConnected) trigger.focus();
  }
  var fragment = root_12();
  var div = first_child(fragment);
  var node = child(div);
  {
    var consequent = ($$anchor2) => {
      var button = root2();
      var text2 = only_child(button, true);
      template_effect(
        ($0, $1) => {
          button.disabled =
            $$props.panel.busy || !!$$props.panel.stepEditor?.changed;
          set_attribute2(button, "title", $0);
          set_text(text2, $1);
        },
        [
          () =>
            $$props.panel.stepEditor?.changed
              ? $$props.panel.t(
                  "Save or cancel your changes before adding a related step.",
                )
              : void 0,
          () => $$props.panel.t("Add related step"),
        ],
      );
      delegated("click", button, () =>
        startStep($$props.panel, null, $$props.entry),
      );
      append($$anchor2, button);
    };
    if_block(node, ($$render) => {
      if ($$props.entry.kind === "steps") $$render(consequent);
    });
  }
  var button_1 = sibling(node, 2);
  var text_1 = only_child(button_1, true);
  bind_this(
    button_1,
    ($$value) => (trigger = $$value),
    () => trigger,
  );
  reset(div);
  var node_1 = sibling(div, 2);
  {
    var consequent_1 = ($$anchor2) => {
      DeleteStepDialog($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get entry() {
          return $$props.entry;
        },
        onClose: closeDeleteDialog,
      });
    };
    if_block(node_1, ($$render) => {
      if (get2(deleteOpen)) $$render(consequent_1);
    });
  }
  template_effect(
    ($0) => {
      button_1.disabled = $$props.panel.busy;
      set_text(text_1, $0);
    },
    [() => $$props.panel.t("Delete step")],
  );
  delegated("click", button_1, () => flushSync(() => set2(deleteOpen, true)));
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/FieldError.svelte
var root3 = from_html(`<p class="error" role="alert"> </p>`);
function FieldError($$anchor, $$props) {
  push($$props, true);
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      var p = root3();
      var text2 = only_child(p, true);
      template_effect(() => {
        set_attribute2(p, "id", `routine-error-${$$props.key}`);
        set_attribute2(p, "data-builder-error", $$props.key);
        set_text(text2, $$props.errors[$$props.key]);
      });
      append($$anchor2, p);
    };
    if_block(node, ($$render) => {
      if ($$props.errors[$$props.key]) $$render(consequent);
    });
  }
  append($$anchor, fragment);
  pop();
}

// custom_components/occupied/frontend/EditorField.svelte
var root4 = from_html(`<div><label> </label> <!></div>`);
var root_13 = from_html(`<ha-selector></ha-selector>`, 2);
var root_22 = from_html(`<option> </option>`);
var root_32 = from_html(`<select></select>`);
var root_4 = from_html(`<textarea></textarea>`);
var root_5 = from_html(`<input/>`);
var root_6 = from_html(`<div class="field"><!> <!> <!></div>`);
function EditorField($$anchor, $$props) {
  push($$props, true);
  let options = prop($$props, "options", 19, () => ({}));
  let editor = user_derived(() => $$props.context.editor),
    t = user_derived(() => $$props.context.t),
    changed = user_derived(() => $$props.context.changed);
  let id = user_derived(() => `routine-${$$props.key}`);
  let invalid = user_derived(() =>
    get2(editor).errors[$$props.key] ? true : void 0,
  );
  let described = user_derived(() =>
    get2(editor).errors[$$props.key] ? `routine-error-${$$props.key}` : void 0,
  );
  let nativeTime = user_derived(() => options().type === "time");
  function input(event2) {
    const control = event2.currentTarget;
    if (get2(nativeTime)) {
      if (!isValueChangedEvent(event2)) return;
      control.value = event2.detail.value || "";
    }
    $$props.update(String(control.value ?? ""));
    get2(changed)($$props.key);
    if (options().render) focusEditor($$props.panel, $$props.key);
  }
  var div = root_6();
  var node = child(div);
  {
    var consequent = ($$anchor2) => {
      var div_1 = root4();
      var label_1 = child(div_1);
      var text2 = only_child(label_1, true);
      var node_1 = sibling(label_1, 2);
      snippet(node_1, () => $$props.trailing ?? noop);
      reset(div_1);
      template_effect(
        ($0) => {
          set_class(div_1, 1, clsx2($$props.trailing ? "field-label-row" : ""));
          set_attribute2(label_1, "for", get2(id));
          set_text(text2, $0);
        },
        [() => get2(t)($$props.label)],
      );
      append($$anchor2, div_1);
    };
    if_block(node, ($$render) => {
      if (!get2(nativeTime) && !options().hideLabel) $$render(consequent);
    });
  }
  var node_2 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var ha_selector = root_13();
      template_effect(() =>
        set_custom_element_data(ha_selector, "id", get2(id)),
      );
      template_effect(() =>
        set_custom_element_data(ha_selector, "data-builder-field", $$props.key),
      );
      template_effect(
        ($0) => set_custom_element_data(ha_selector, "aria-label", $0),
        [() => get2(t)($$props.label)],
      );
      template_effect(() =>
        set_custom_element_data(ha_selector, "aria-invalid", get2(invalid)),
      );
      template_effect(() =>
        set_custom_element_data(
          ha_selector,
          "aria-describedby",
          get2(described),
        ),
      );
      set_custom_element_data(ha_selector, "tabindex", "0");
      action(
        ha_selector,
        ($$node, $$action_arg) => properties?.($$node, $$action_arg),
        () => ({
          hass: $$props.panel._hass,
          selector: { time: {} },
          label: get2(t)($$props.label),
          required: !options().optional,
          value: $$props.value || void 0,
        }),
      );
      event("value-changed", ha_selector, input);
      append($$anchor2, ha_selector);
    };
    var consequent_2 = ($$anchor2) => {
      var select = root_32();
      each(
        select,
        21,
        () => options().choices,
        index,
        ($$anchor3, $$item) => {
          var $$array = user_derived(() => to_array(get2($$item), 2));
          let v = () => get2($$array)[0];
          let name = () => get2($$array)[1];
          var option = root_22();
          var text_1 = only_child(option, true);
          var option_value = {};
          template_effect(
            ($0) => {
              set_text(text_1, $0);
              if (option_value !== (option_value = v())) {
                option.value = (option.__value = option_value) ?? "";
              }
            },
            [() => get2(t)(name())],
          );
          append($$anchor3, option);
        },
      );
      reset(select);
      var select_value;
      init_select(select);
      template_effect(
        ($0) => {
          set_attribute2(select, "id", get2(id));
          set_attribute2(select, "data-builder-field", $$props.key);
          set_attribute2(select, "aria-invalid", get2(invalid));
          set_attribute2(select, "aria-describedby", get2(described));
          if (select_value !== (select_value = $0)) {
            ((select.value = (select.__value = select_value) ?? ""),
              select_option(select, select_value));
          }
        },
        [() => String($$props.value)],
      );
      delegated("change", select, input);
      append($$anchor2, select);
    };
    var consequent_3 = ($$anchor2) => {
      var textarea = root_4();
      remove_textarea_child(textarea);
      template_effect(
        ($0, $1) => {
          set_attribute2(textarea, "id", get2(id));
          set_attribute2(textarea, "data-builder-field", $$props.key);
          set_attribute2(textarea, "aria-label", $0);
          set_attribute2(textarea, "aria-invalid", get2(invalid));
          set_attribute2(textarea, "aria-describedby", get2(described));
          set_value(textarea, $1);
        },
        [
          () => (options().hideLabel ? get2(t)($$props.label) : void 0),
          () => String($$props.value),
        ],
      );
      delegated("input", textarea, input);
      append($$anchor2, textarea);
    };
    var alternate = ($$anchor2) => {
      var input_1 = root_5();
      remove_input_defaults(input_1);
      action(
        input_1,
        ($$node, $$action_arg) => validity?.($$node, $$action_arg),
        () =>
          ["startOffset", "endOffset"].includes($$props.key)
            ? get2(editor).errors[$$props.key] || ""
            : "",
      );
      template_effect(
        ($0, $1) => {
          set_attribute2(input_1, "id", get2(id));
          set_attribute2(input_1, "data-builder-field", $$props.key);
          set_attribute2(input_1, "type", options().type || "text");
          set_attribute2(input_1, "aria-label", $0);
          set_attribute2(input_1, "aria-invalid", get2(invalid));
          set_attribute2(input_1, "aria-describedby", get2(described));
          set_attribute2(input_1, "min", options().min);
          set_attribute2(input_1, "max", options().max);
          set_attribute2(input_1, "step", options().step);
          set_attribute2(input_1, "placeholder", options().placeholder);
          set_value(input_1, $1);
        },
        [
          () => (options().hideLabel ? get2(t)($$props.label) : void 0),
          () => String($$props.value),
        ],
      );
      delegated("input", input_1, input);
      append($$anchor2, input_1);
    };
    if_block(node_2, ($$render) => {
      if (get2(nativeTime)) $$render(consequent_1);
      else if (options().choices) $$render(consequent_2, 1);
      else if (options().multiline) $$render(consequent_3, 2);
      else $$render(alternate, -1);
    });
  }
  var node_3 = sibling(node_2, 2);
  {
    let $0 = user_derived(() => ({ ...get2(editor).errors }));
    FieldError(node_3, {
      get key() {
        return $$props.key;
      },
      get errors() {
        return get2($0);
      },
    });
  }
  reset(div);
  append($$anchor, div);
  pop();
}
delegate(["change", "input"]);

// custom_components/occupied/frontend/SourcePicker.svelte
var root5 = from_html(
  `<div class="field source-picker"><ha-generic-picker></ha-generic-picker> <!></div>`,
  2,
);
function SourcePicker($$anchor, $$props) {
  push($$props, true);
  let error = prop($$props, "error", 3, "");
  let items = user_derived(() => {
    const items2 = [];
    let group;
    for (const choice of $$props.choices) {
      if (group !== choice.group) {
        group = choice.group;
        items2.push($$props.t(group));
      }
      items2.push({
        id: choice.value,
        primary: $$props.t(choice.name),
        secondary: choice.entity_id,
        group: $$props.t(choice.group),
      });
    }
    return items2;
  });
  function valueRenderer(id) {
    const headline = document.createElement("span");
    headline.slot = "headline";
    headline.textContent = $$props.t(
      $$props.choices.find((choice) => choice.value === id)?.name || id,
    );
    return headline;
  }
  function select(event2) {
    if (!isValueChangedEvent(event2)) return;
    const next2 =
      typeof event2.detail.value === "string" ? event2.detail.value : "";
    if (next2 && !$$props.choices.some((choice) => choice.value === next2))
      return;
    const control = event2.currentTarget;
    control.value = next2 || void 0;
    $$props.onChange(next2);
  }
  var div = root5();
  var ha_generic_picker = child(div);
  set_custom_element_data(ha_generic_picker, "id", "routine-anchor");
  set_custom_element_data(ha_generic_picker, "data-builder-field", "anchor");
  template_effect(
    ($0) => set_custom_element_data(ha_generic_picker, "aria-label", $0),
    [() => $$props.t("Relative to")],
  );
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "aria-invalid",
      error() ? "true" : void 0,
    ),
  );
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "aria-describedby",
      error() ? "routine-error-anchor" : void 0,
    ),
  );
  set_custom_element_data(ha_generic_picker, "tabindex", "0");
  action(
    ha_generic_picker,
    ($$node, $$action_arg) => properties?.($$node, $$action_arg),
    () => ({
      hass: $$props.hass,
      value: $$props.value || void 0,
      label: $$props.t("Relative to"),
      searchLabel: $$props.t("Search steps or time sources"),
      placeholder: $$props.t("Choose a step or event"),
      notFoundLabel: $$props.t("No matching steps or time sources."),
      getItems: () => get2(items),
      searchKeys: ["primary", "secondary", "id", "group"],
      valueRenderer,
      allowCustomValue: false,
      noSort: true,
      required: true,
      invalid: !!error(),
      errorMessage: error(),
    }),
  );
  var node = sibling(ha_generic_picker, 2);
  {
    let $0 = user_derived(() => ({ anchor: error() }));
    FieldError(node, {
      key: "anchor",
      get errors() {
        return get2($0);
      },
    });
  }
  reset(div);
  event("value-changed", ha_generic_picker, select);
  append($$anchor, div);
  pop();
}

// custom_components/occupied/frontend/TimingEditor.svelte
var root6 = from_html(
  `<label class="timing-option"><input type="radio" name="step-timing-mode" data-builder-field="mode"/><span> </span></label>`,
);
var root_14 = from_html(
  `<!> <button type="button" class="text-button"> </button>`,
  1,
);
var root_23 = from_html(`<button type="button" class="text-button"> </button>`);
var root_33 = from_html(`<!> <!>`, 1);
var root_42 = from_html(`<p class="hint"> </p>`);
var root_52 = from_html(`<details><summary> </summary> <!></details>`);
var root_62 = from_html(`<!> <!> <!> <!> <!>`, 1);
var root_7 = from_html(
  `<div data-editor-section="time"><h3 id="routine-timing-heading"> </h3> <fieldset class="timing-options" aria-labelledby="routine-timing-heading"><div class="timing-option-row"></div> <!></fieldset> <!> <p class="hint" data-timing-explanation="" aria-live="polite"> </p> <!></div>`,
);
function TimingEditor($$anchor, $$props) {
  push($$props, true);
  let editor = user_derived(() => $$props.context.editor),
    form = user_derived(() => $$props.context.form),
    time = user_derived(() => $$props.context.time),
    t = user_derived(() => $$props.context.t),
    editing = user_derived(() => $$props.context.editing),
    refresh = user_derived(() => $$props.context.refresh),
    changed = user_derived(() => $$props.context.changed);
  let choices = user_derived(() => {
    $$props.context;
    let choices2 = timeSourceChoices(
      $$props.panel.draft,
      get2(editor).id,
      $$props.panel.catalog,
    );
    if (
      get2(time).anchor &&
      !choices2.some((choice) => choice.value === get2(time).anchor)
    )
      choices2 = [
        ...choices2,
        {
          value: get2(time).anchor,
          name: get2(time).anchor,
          group: "Unavailable sources",
        },
      ];
    return choices2;
  });
  var div = root_7();
  var h3 = child(div);
  var text2 = only_child(h3, true);
  var fieldset = sibling(h3, 2);
  var div_1 = child(fieldset);
  each(
    div_1,
    20,
    () => [
      ["absolute", "Absolute time"],
      ["relative", "Relative to"],
    ],
    index,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array($$item, 2));
      let value = () => get2($$array)[0];
      let label = () => get2($$array)[1];
      var label_1 = root6();
      var input = child(label_1);
      remove_input_defaults(input);
      var span = sibling(input);
      var text_1 = only_child(span, true);
      reset(label_1);
      template_effect(
        ($0) => {
          set_value(input, value());
          set_checked(input, get2(time).mode === value());
          set_text(text_1, $0);
        },
        [() => get2(t)(label())],
      );
      delegated("change", input, (event2) => {
        if (!event2.currentTarget.checked) return;
        get2(time).mode = value();
        if (value() === "relative" && !get2(time).anchor)
          get2(time).anchor = "sun:sunrise";
        get2(changed)("mode");
        $$props.panel.shadowRoot
          .querySelector('[data-builder-field="mode"]:checked')
          ?.focus();
      });
      append($$anchor2, label_1);
    },
  );
  reset(div_1);
  var node = sibling(div_1, 2);
  {
    let $0 = user_derived(() => ({ ...get2(editor).errors }));
    FieldError(node, {
      key: "mode",
      get errors() {
        return get2($0);
      },
    });
  }
  reset(fieldset);
  var node_1 = sibling(fieldset, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var fragment = root_33();
      var node_2 = first_child(fragment);
      EditorField(node_2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "start",
        label: "Start time window",
        get value() {
          return get2(time).start;
        },
        update: (value) => (get2(time).start = value),
        options: { type: "time", step: 1 },
      });
      var node_3 = sibling(node_2, 2);
      {
        var consequent = ($$anchor3) => {
          var fragment_1 = root_14();
          var node_4 = first_child(fragment_1);
          EditorField(node_4, {
            get panel() {
              return $$props.panel;
            },
            get context() {
              return $$props.context;
            },
            key: "end",
            label: "End of window (optional)",
            get value() {
              return get2(time).end;
            },
            update: (value) => (get2(time).end = value),
            options: { type: "time", step: 1, optional: true },
          });
          var button = sibling(node_4, 2);
          var text_2 = only_child(button, true);
          template_effect(
            ($0) => set_text(text_2, $0),
            [() => get2(t)("Remove end of window")],
          );
          delegated("click", button, () => {
            get2(time).end = "";
            get2(editor).showEndTime = false;
            get2(changed)("end");
            focusEditor($$props.panel, "start");
          });
          append($$anchor3, fragment_1);
        };
        var alternate = ($$anchor3) => {
          var button_1 = root_23();
          var text_3 = only_child(button_1, true);
          template_effect(
            ($0) => set_text(text_3, $0),
            [() => get2(t)("Add end of window")],
          );
          delegated("click", button_1, () => {
            get2(time).end = get2(time).start;
            get2(editor).showEndTime = true;
            get2(changed)("end");
            focusEditor($$props.panel, "end");
          });
          append($$anchor3, button_1);
        };
        if_block(node_3, ($$render) => {
          if (
            get2(time).end ||
            get2(editor).showEndTime ||
            get2(editor).errors.end
          )
            $$render(consequent);
          else $$render(alternate, -1);
        });
      }
      append($$anchor2, fragment);
    };
    var alternate_2 = ($$anchor2) => {
      var fragment_2 = root_62();
      var node_5 = first_child(fragment_2);
      SourcePicker(
        node_5,
        spread_props(() => ({
          hass: $$props.panel._hass,
          choices: get2(choices),
          value: get2(time).anchor,
          t: get2(t),
          error: get2(editor).errors.anchor,
          onChange: (value) => {
            get2(time).anchor = value;
            if (!get2(editor).existing && value.startsWith("step:")) {
              const parent = stepEntries($$props.panel.draft).find(
                (step) => step.id === value.slice(5),
              );
              if (parent) get2(form).days = [...parent.days];
            }
            get2(changed)("anchor");
            const picker = $$props.panel.shadowRoot.querySelector(
              '[data-builder-field="anchor"]',
            );
            if (picker && $$props.panel.shadowRoot.activeElement !== picker) {
              picker.focus();
            }
          },
        })),
      );
      var node_6 = sibling(node_5, 2);
      {
        var consequent_2 = ($$anchor3) => {
          var p = root_42();
          var text_4 = only_child(p, true);
          template_effect(
            ($0) => set_text(text_4, $0),
            [
              () =>
                get2(t)(
                  "Uses the time currently reported by Home Assistant. Time-only helpers repeat daily; dated sources run only on their reported date.",
                ),
            ],
          );
          append($$anchor3, p);
        };
        var d = user_derived(() => get2(time).anchor.startsWith("entity:"));
        if_block(node_6, ($$render) => {
          if (get2(d)) $$render(consequent_2);
        });
      }
      var node_7 = sibling(node_6, 2);
      EditorField(node_7, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "startOffset",
        label: "Start offset",
        get value() {
          return get2(time).startOffset;
        },
        update: (value) => (get2(time).startOffset = value),
        options: { placeholder: "30m or 1h" },
      });
      var node_8 = sibling(node_7, 2);
      {
        var consequent_3 = ($$anchor3) => {
          {
            const trailing = ($$anchor4) => {
              var button_2 = root_23();
              var text_5 = only_child(button_2, true);
              template_effect(
                ($0) => set_text(text_5, $0),
                [() => get2(t)("Remove end offset")],
              );
              delegated("click", button_2, () => {
                get2(time).endOffset = "";
                get2(editor).showEndOffset = false;
                get2(changed)("endOffset");
                focusEditor($$props.panel, "startOffset");
              });
              append($$anchor4, button_2);
            };
            EditorField($$anchor3, {
              get panel() {
                return $$props.panel;
              },
              get context() {
                return $$props.context;
              },
              key: "endOffset",
              label: "End offset (optional)",
              get value() {
                return get2(time).endOffset;
              },
              update: (value) => (get2(time).endOffset = value),
              options: {},
              trailing,
              $$slots: { trailing: true },
            });
          }
        };
        var alternate_1 = ($$anchor3) => {
          var button_3 = root_23();
          var text_6 = only_child(button_3, true);
          template_effect(
            ($0) => set_text(text_6, $0),
            [() => get2(t)("Add end offset")],
          );
          delegated("click", button_3, () => {
            get2(editor).showEndOffset = true;
            get2(refresh)("endOffset");
          });
          append($$anchor3, button_3);
        };
        if_block(node_8, ($$render) => {
          if (
            get2(time).endOffset ||
            get2(editor).showEndOffset ||
            get2(editor).errors.endOffset
          )
            $$render(consequent_3);
          else $$render(alternate_1, -1);
        });
      }
      var node_9 = sibling(node_8, 2);
      {
        var consequent_4 = ($$anchor3) => {
          var details = root_52();
          var summary = child(details);
          var text_7 = only_child(summary, true);
          var node_10 = sibling(summary, 2);
          EditorField(node_10, {
            get panel() {
              return $$props.panel;
            },
            get context() {
              return $$props.context;
            },
            key: "fallback",
            label: "Fallback time (optional)",
            get value() {
              return get2(time).fallback;
            },
            update: (value) => (get2(time).fallback = value),
            options: { type: "time", optional: true },
          });
          reset(details);
          template_effect(
            ($0) => {
              details.open =
                !!get2(time).fallback || !!get2(editor).errors.fallback;
              set_text(text_7, $0);
            },
            [() => get2(t)("If the sun event is unavailable")],
          );
          append($$anchor3, details);
        };
        var d_1 = user_derived(() => get2(time).anchor.startsWith("sun:"));
        if_block(node_9, ($$render) => {
          if (get2(d_1)) $$render(consequent_4);
        });
      }
      append($$anchor2, fragment_2);
    };
    if_block(node_1, ($$render) => {
      if (get2(time).mode === "absolute") $$render(consequent_1);
      else $$render(alternate_2, -1);
    });
  }
  var p_1 = sibling(node_1, 2);
  var text_8 = only_child(p_1, true);
  var node_11 = sibling(p_1, 2);
  {
    var consequent_5 = ($$anchor2) => {
      var p_2 = root_42();
      var text_9 = only_child(p_2, true);
      template_effect(
        ($0) => set_text(text_9, $0),
        [
          () =>
            get2(t)(
              "This program is managed by a file. Add changes to your draft, then export them from Settings.",
            ),
        ],
      );
      append($$anchor2, p_2);
    };
    if_block(node_11, ($$render) => {
      if ($$props.panel.document?.source === "file") $$render(consequent_5);
    });
  }
  reset(div);
  template_effect(
    ($0, $1) => {
      set_text(text2, $0);
      set_text(text_8, $1);
    },
    [
      () => get2(t)(get2(editing) ? "Timing" : "When should it happen?"),
      () =>
        timingExplanation(
          get2(time),
          stepEntries($$props.panel.draft),
          get2(t),
          $$props.panel.catalog.time_sources,
        ),
    ],
  );
  append($$anchor, div);
  pop();
}
delegate(["change", "click"]);

// custom_components/occupied/frontend/EntitiesEditor.svelte
var root7 = from_html(`<p class="hint"> </p>`);
var root_15 = from_html(
  `<div data-editor-section="entities"><!> <h3> </h3> <ha-selector></ha-selector> <!> <!></div>`,
  2,
);
function EntitiesEditor($$anchor, $$props) {
  push($$props, true);
  let editor = user_derived(() => $$props.context.editor),
    form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t),
    editing = user_derived(() => $$props.context.editing),
    changed = user_derived(() => $$props.context.changed);
  var div = root_15();
  var node = child(div);
  EditorField(node, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return $$props.context;
    },
    key: "kind",
    label: "Step type",
    get value() {
      return get2(form).kind;
    },
    update: (value) => {
      get2(form).kind = value;
      get2(form).entities = [];
    },
    options: {
      choices: [
        ["entities", "Lights and switches"],
        ["service", "Entity service action"],
        ["scene", "Home Assistant scene"],
      ],
      render: true,
    },
  });
  var h3 = sibling(node, 2);
  var text2 = only_child(h3, true);
  var ha_selector = sibling(h3, 2);
  set_class(ha_selector, 1, "entity-native-selector");
  set_custom_element_data(ha_selector, "data-builder-field", "entities");
  template_effect(
    ($0) => set_custom_element_data(ha_selector, "aria-label", $0),
    [() => get2(t)("Entities")],
  );
  template_effect(() =>
    set_custom_element_data(
      ha_selector,
      "aria-invalid",
      get2(editor).errors.entities ? "true" : void 0,
    ),
  );
  action(
    ha_selector,
    ($$node, $$action_arg) => properties?.($$node, $$action_arg),
    () => ({
      hass: $$props.panel._hass,
      selector: {
        entity: {
          multiple: get2(form).kind !== "scene",
          ...(get2(form).kind === "service"
            ? {}
            : {
                filter: {
                  domain:
                    get2(form).kind === "scene"
                      ? ["scene"]
                      : ["light", "switch"],
                },
              }),
        },
      },
      value:
        get2(form).kind === "scene"
          ? get2(form).entities[0] || ""
          : get2(form).entities,
      required: true,
      narrow: $$props.panel.hasAttribute("narrow"),
    }),
  );
  var node_1 = sibling(ha_selector, 2);
  {
    let $0 = user_derived(() => ({ ...get2(editor).errors }));
    FieldError(node_1, {
      key: "entities",
      get errors() {
        return get2($0);
      },
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent = ($$anchor2) => {
      var p = root7();
      var text_1 = only_child(p, true);
      template_effect(
        ($0) => set_text(text_1, $0),
        [
          () =>
            get2(t)(
              "This selection includes a custom entity. Select lights or switches for this step.",
            ),
        ],
      );
      append($$anchor2, p);
    };
    var d = user_derived(
      () =>
        get2(form).kind === "entities" &&
        get2(form).entities.some((id) => !/^(light|switch)\./.test(id)),
    );
    if_block(node_2, ($$render) => {
      if (get2(d)) $$render(consequent);
    });
  }
  reset(div);
  template_effect(
    ($0) => set_text(text2, $0),
    [
      () =>
        get2(t)(
          get2(editing) ? "Entities" : "Which entities should take part?",
        ),
    ],
  );
  event("value-changed", ha_selector, (event2) => {
    if (!isValueChangedEvent(event2)) return;
    event2.currentTarget.value = event2.detail.value;
    get2(form).entities = Array.isArray(event2.detail.value)
      ? event2.detail.value
      : event2.detail.value
        ? [event2.detail.value]
        : [];
    get2(changed)("entities");
  });
  append($$anchor, div);
  pop();
}

// custom_components/occupied/frontend/ActionEditor.svelte
var root8 = from_html(`<p> </p>`);
var root_16 = from_html(`<!> <!>`, 1);
var root_24 = from_html(`<!> <p class="hint"> </p>`, 1);
var root_34 = from_html(
  `<div data-editor-section="action"><h3> </h3> <!> <!></div>`,
);
function ActionEditor($$anchor, $$props) {
  push($$props, true);
  let form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t),
    editing = user_derived(() => $$props.context.editing);
  var div = root_34();
  var h3 = child(div);
  var text2 = only_child(h3, true);
  var node = sibling(h3, 2);
  {
    var consequent = ($$anchor2) => {
      var p = root8();
      var text_1 = only_child(p, true);
      template_effect(
        ($0) => set_text(text_1, $0),
        [() => get2(t)("Activate scene")],
      );
      append($$anchor2, p);
    };
    var consequent_1 = ($$anchor2) => {
      var fragment = root_16();
      var node_1 = first_child(fragment);
      EditorField(node_1, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "service",
        label: "Service (domain.service)",
        get value() {
          return get2(form).service;
        },
        update: (value) => (get2(form).service = value),
      });
      var node_2 = sibling(node_1, 2);
      EditorField(node_2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "data",
        label: "Service data (JSON)",
        get value() {
          return get2(form).data;
        },
        update: (value) => (get2(form).data = value),
        options: { multiline: true },
      });
      append($$anchor2, fragment);
    };
    var alternate = ($$anchor2) => {
      EditorField($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "action",
        label: "Action",
        get value() {
          return get2(form).action;
        },
        update: (value) => (get2(form).action = value),
        options: {
          choices: [
            ["turn_on", "Turn on"],
            ["turn_off", "Turn off"],
          ],
          render: true,
        },
      });
    };
    if_block(node, ($$render) => {
      if (get2(form).kind === "scene") $$render(consequent);
      else if (get2(form).kind === "service") $$render(consequent_1, 1);
      else $$render(alternate, -1);
    });
  }
  var node_3 = sibling(node, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var fragment_2 = root_24();
      var node_4 = first_child(fragment_2);
      EditorField(node_4, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "brightness",
        label: "Brightness (%)",
        get value() {
          return get2(form).brightness;
        },
        update: (value) => (get2(form).brightness = value),
        options: { type: "number", min: 1, max: 100 },
      });
      var p_1 = sibling(node_4, 2);
      var text_2 = only_child(p_1, true);
      template_effect(
        ($0) => set_text(text_2, $0),
        [
          () =>
            get2(t)(
              "Leave blank to use the default brightness. Applies to dimmable lights.",
            ),
        ],
      );
      append($$anchor2, fragment_2);
    };
    var d = user_derived(
      () =>
        get2(form).kind === "entities" &&
        get2(form).action === "turn_on" &&
        get2(form).entities.some(
          (id) =>
            $$props.panel.catalog.entities.find(
              (entity) => entity.entity_id === id,
            )?.dimmable,
        ),
    );
    if_block(node_3, ($$render) => {
      if (get2(d)) $$render(consequent_2);
    });
  }
  reset(div);
  template_effect(
    ($0) => set_text(text2, $0),
    [() => get2(t)(get2(editing) ? "Action" : "What should happen?")],
  );
  append($$anchor, div);
  pop();
}

// custom_components/occupied/frontend/StepEditor.svelte
var root9 = from_html(`<li> </li>`);
var root_17 = from_html(`<ol class="builder-steps"></ol>`);
var root_25 = from_html(`<div class="step-name-editor"><!></div>`);
var root_35 = from_html(`<button type="button"> </button>`);
var root_43 = from_html(
  `<section><h2 tabindex="-1"> </h2> <!> <!> <div class="editor-sections"><!><!><!></div> <!> <div class="builder-footer"><button type="button"> </button> <!> <button type="button" class="primary" data-routine-submit=""> </button></div></section>`,
);
function StepEditor($$anchor, $$props) {
  push($$props, true);
  let context = user_derived(() => {
    $$props.revision;
    return createStepEditorContext($$props.panel);
  });
  let editor = user_derived(() => get2(context).editor),
    form = user_derived(() => get2(context).form),
    t = user_derived(() => get2(context).t),
    editing = user_derived(() => get2(context).editing),
    submit = user_derived(() => get2(context).submit),
    cancel = user_derived(() => get2(context).cancel),
    back = user_derived(() => get2(context).back);
  var section = root_43();
  var h2 = child(section);
  var text2 = only_child(h2, true);
  var node = sibling(h2, 2);
  {
    var consequent = ($$anchor2) => {
      var ol = root_17();
      each(
        ol,
        20,
        () => ["Timing", "Entities", "Action"],
        index,
        ($$anchor3, label, index2) => {
          var li = root9();
          var text_1 = only_child(li);
          template_effect(
            ($0) => {
              set_attribute2(
                li,
                "aria-current",
                index2 === get2(editor).stage ? "step" : "false",
              );
              set_class(
                li,
                1,
                clsx2(index2 < get2(editor).stage ? "complete" : ""),
              );
              set_text(text_1, `${index2 + 1}. ${$0 ?? ""}`);
            },
            [() => get2(t)(label)],
          );
          append($$anchor3, li);
        },
      );
      reset(ol);
      template_effect(
        ($0) => set_attribute2(ol, "aria-label", $0),
        [() => get2(t)("Step setup")],
      );
      append($$anchor2, ol);
    };
    if_block(node, ($$render) => {
      if (!get2(editing)) $$render(consequent);
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var div = root_25();
      var node_2 = child(div);
      {
        let $0 = user_derived(() => ({
          hideLabel: true,
          placeholder: get2(editing)
            ? void 0
            : get2(t)("Optional, leave blank for auto-generated"),
        }));
        EditorField(node_2, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return get2(context);
          },
          key: "name",
          label: "Step name",
          get value() {
            return get2(form).name;
          },
          update: (value) => (get2(form).name = value),
          get options() {
            return get2($0);
          },
        });
      }
      reset(div);
      append($$anchor2, div);
    };
    if_block(node_1, ($$render) => {
      if (get2(editing) || get2(editor).stage === 0) $$render(consequent_1);
    });
  }
  var div_1 = sibling(node_1, 2);
  var node_3 = child(div_1);
  {
    var consequent_2 = ($$anchor2) => {
      TimingEditor($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return get2(context);
        },
      });
    };
    if_block(node_3, ($$render) => {
      if (get2(editing) || get2(editor).stage === 0) $$render(consequent_2);
    });
  }
  var node_4 = sibling(node_3);
  {
    var consequent_3 = ($$anchor2) => {
      EntitiesEditor($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return get2(context);
        },
      });
    };
    if_block(node_4, ($$render) => {
      if (get2(editing) || get2(editor).stage === 1) $$render(consequent_3);
    });
  }
  var node_5 = sibling(node_4);
  {
    var consequent_4 = ($$anchor2) => {
      ActionEditor($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return get2(context);
        },
      });
    };
    if_block(node_5, ($$render) => {
      if (get2(editing) || get2(editor).stage === 2) $$render(consequent_4);
    });
  }
  reset(div_1);
  var node_6 = sibling(div_1, 2);
  {
    var consequent_6 = ($$anchor2) => {
      const entry = user_derived(() =>
        stepEntries($$props.panel.draft).find(
          (item) => item.id === get2(editor).id,
        ),
      );
      var fragment_3 = comment();
      var node_7 = first_child(fragment_3);
      {
        var consequent_5 = ($$anchor3) => {
          StepActions($$anchor3, {
            get panel() {
              return $$props.panel;
            },
            get entry() {
              return get2(entry);
            },
          });
        };
        if_block(node_7, ($$render) => {
          if (get2(entry)) $$render(consequent_5);
        });
      }
      append($$anchor2, fragment_3);
    };
    if_block(node_6, ($$render) => {
      if (get2(editing)) $$render(consequent_6);
    });
  }
  var div_2 = sibling(node_6, 2);
  var button = child(div_2);
  var text_2 = only_child(button, true);
  var node_8 = sibling(button, 2);
  {
    var consequent_7 = ($$anchor2) => {
      var button_1 = root_35();
      var text_3 = only_child(button_1, true);
      template_effect(
        ($0) => {
          button_1.disabled = $$props.panel.busy;
          set_text(text_3, $0);
        },
        [() => get2(t)("Back")],
      );
      delegated("click", button_1, function (...$$args) {
        get2(back)?.apply(this, $$args);
      });
      append($$anchor2, button_1);
    };
    if_block(node_8, ($$render) => {
      if (!get2(editing) && get2(editor).stage > 0) $$render(consequent_7);
    });
  }
  var button_2 = sibling(node_8, 2);
  var text_4 = only_child(button_2, true);
  reset(div_2);
  reset(section);
  template_effect(
    ($0, $1, $2) => {
      set_class(
        section,
        1,
        clsx2(get2(editing) ? "routine-editor editing" : "routine-editor"),
      );
      set_text(text2, $0);
      button.disabled = $$props.panel.busy;
      set_text(text_2, $1);
      button_2.disabled = $$props.panel.busy || $$props.panel.stale;
      set_text(text_4, $2);
    },
    [
      () => get2(t)(get2(editing) ? "Edit step" : "Create step"),
      () => get2(t)("Cancel"),
      () =>
        get2(t)(
          !get2(editing) && get2(editor).stage < 2
            ? "Continue"
            : $$props.panel.document?.source === "file"
              ? "Add to draft"
              : "Save step",
        ),
    ],
  );
  delegated("click", button, function (...$$args) {
    get2(cancel)?.apply(this, $$args);
  });
  delegated("click", button_2, function (...$$args) {
    get2(submit)?.apply(this, $$args);
  });
  append($$anchor, section);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/StepsView.svelte
var root10 = from_html(
  `<button type="button" class="primary" data-create-routine=""> </button>`,
);
var root_18 = from_html(
  `<section class="routine-empty"><h2> </h2> <p class="hint"> </p> <p class="empty-steps"> </p> <button type="button" class="primary" data-create-routine=""> </button></section>`,
);
var root_26 = from_html(
  `<section class="routine-editor editing"><p class="hint"> </p> <!></section>`,
);
var root_36 = from_html(`<div><!></div>`);
var root_44 = from_html(
  `<div class="routine-card"><button type="button" class="routine-row"><span class="routine-symbol" aria-hidden="true"> </span> <span class="routine-row-content"><strong> </strong><span class="hint"> </span></span> <span class="routine-row-time"><span> </span><small> </small></span></button> <!></div>`,
);
var root_53 = from_html(
  `<div class="routine-layout"><div class="routine-list"></div></div> <button type="button" class="text-button"> </button>`,
  1,
);
var root_63 = from_html(
  `<div class="page-heading"><div><h2> </h2> <p class="hint"> </p></div> <!></div> <!>`,
  1,
);
function StepsView($$anchor, $$props) {
  push($$props, true);
  let data = user_derived(() => {
    $$props.revision;
    return {
      t: $$props.panel.t,
      entries: stepEntries($$props.panel.draft),
    };
  });
  let t = user_derived(() => get2(data).t),
    entries = user_derived(() => get2(data).entries);
  var fragment = root_63();
  var div = first_child(fragment);
  var div_1 = child(div);
  var h2 = child(div_1);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  reset(div_1);
  var node = sibling(div_1, 2);
  {
    var consequent = ($$anchor2) => {
      var button = root10();
      var text_2 = only_child(button, true);
      template_effect(
        ($0) => {
          button.disabled = !!$$props.panel.stepEditor;
          set_text(text_2, $0);
        },
        [() => get2(t)("Create step")],
      );
      delegated("click", button, () => startStep($$props.panel));
      append($$anchor2, button);
    };
    if_block(node, ($$render) => {
      if (get2(entries).length) $$render(consequent);
    });
  }
  reset(div);
  var node_1 = sibling(div, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var section = root_18();
      var h2_1 = child(section);
      var text_3 = only_child(h2_1, true);
      var p_1 = sibling(h2_1, 2);
      var text_4 = only_child(p_1, true);
      var p_2 = sibling(p_1, 2);
      var text_5 = only_child(p_2, true);
      var button_1 = sibling(p_2, 2);
      var text_6 = only_child(button_1, true);
      reset(section);
      template_effect(
        ($0, $1, $2, $3) => {
          set_text(text_3, $0);
          set_text(text_4, $1);
          set_text(text_5, $2);
          button_1.disabled = !!$$props.panel.stepEditor;
          set_text(text_6, $3);
        },
        [
          () => get2(t)("A little activity. A lived-in home."),
          () =>
            get2(t)(
              "Start with an entity action or a scene, then add whatever should happen next.",
            ),
          () =>
            get2(t)(
              "1. Set timing   \u2192   2. Select entities   \u2192   3. Choose an action",
            ),
          () => get2(t)("Create your first step"),
        ],
      );
      delegated("click", button_1, () => startStep($$props.panel));
      append($$anchor2, section);
    };
    var alternate_1 = ($$anchor2) => {
      var fragment_1 = root_53();
      var div_2 = first_child(fragment_1);
      var div_3 = child(div_2);
      each(
        div_3,
        21,
        () => stepTree(get2(entries)),
        ({ entry, depth }) => entry.id,
        ($$anchor3, $$item) => {
          let entry = () => get2($$item).entry;
          let depth = () => get2($$item).depth;
          const expanded = user_derived(
            () =>
              ($$props.panel.stepEditor?.existing &&
                $$props.panel.stepEditor.id === entry().id) ||
              (!$$props.panel.stepEditor &&
                !simpleStep(entry()) &&
                $$props.panel.selectedStep === entry().id),
          );
          var div_4 = root_44();
          var button_2 = child(div_4);
          var span = child(button_2);
          var text_7 = only_child(span, true);
          var span_1 = sibling(span, 2);
          var strong = child(span_1);
          var text_8 = only_child(strong, true);
          var span_2 = sibling(strong);
          var text_9 = only_child(span_2);
          reset(span_1);
          var span_3 = sibling(span_1, 2);
          var span_4 = child(span_3);
          var text_10 = only_child(span_4, true);
          var small = sibling(span_4);
          var text_11 = only_child(small, true);
          reset(span_3);
          reset(button_2);
          var node_2 = sibling(button_2, 2);
          {
            var consequent_3 = ($$anchor4) => {
              var div_5 = root_36();
              var node_3 = child(div_5);
              {
                var consequent_2 = ($$anchor5) => {
                  StepEditor($$anchor5, {
                    get panel() {
                      return $$props.panel;
                    },
                    get revision() {
                      return $$props.revision;
                    },
                  });
                };
                var alternate = ($$anchor5) => {
                  var section_1 = root_26();
                  var p_3 = child(section_1);
                  var text_12 = only_child(p_3, true);
                  var node_4 = sibling(p_3, 2);
                  StepActions(node_4, {
                    get panel() {
                      return $$props.panel;
                    },
                    get entry() {
                      return entry();
                    },
                  });
                  reset(section_1);
                  template_effect(
                    ($0) => set_text(text_12, $0),
                    [
                      () =>
                        get2(t)(
                          "Custom actions cannot be edited with the simple step editor.",
                        ),
                    ],
                  );
                  append($$anchor5, section_1);
                };
                if_block(node_3, ($$render) => {
                  if ($$props.panel.stepEditor) $$render(consequent_2);
                  else $$render(alternate, -1);
                });
              }
              reset(div_5);
              template_effect(() =>
                set_attribute2(div_5, "id", `step-editor-${entry().id}`),
              );
              append($$anchor4, div_5);
            };
            if_block(node_2, ($$render) => {
              if (get2(expanded)) $$render(consequent_3);
            });
          }
          reset(div_4);
          template_effect(
            ($0, $1, $2, $3, $4, $5) => {
              set_attribute2(div_4, "data-routine-id", entry().id);
              set_style(div_4, $0);
              set_attribute2(button_2, "id", `step-card-${entry().id}`);
              set_attribute2(button_2, "aria-label", entry().name);
              button_2.disabled =
                $$props.panel.busy ||
                (!!$$props.panel.stepEditor &&
                  $$props.panel.stepEditor.id === entry().id);
              set_attribute2(button_2, "aria-expanded", get2(expanded));
              set_attribute2(
                button_2,
                "aria-controls",
                `step-editor-${entry().id}`,
              );
              set_text(text_7, $1);
              set_text(text_8, entry().name);
              set_text(
                text_9,
                `${$2 ?? ""} \xB7
                ${$3 ?? ""}`,
              );
              set_text(text_10, $4);
              set_text(text_11, $5);
            },
            [
              () => `--depth:${Math.min(depth(), 3)}`,
              () => stepSymbol(entry()),
              () => actionSummary(entry(), get2(t)),
              () =>
                entry()
                  .entities.map((id) => entityName($$props.panel.catalog, id))
                  .join(", "),
              () =>
                timingSummary(
                  entry(),
                  get2(entries),
                  get2(t),
                  $$props.panel.catalog.time_sources,
                ),
              () => daySummary(entry().days, get2(t)),
            ],
          );
          delegated("click", button_2, () => openStep($$props.panel, entry()));
          append($$anchor3, div_4);
        },
      );
      reset(div_3);
      reset(div_2);
      var button_3 = sibling(div_2, 2);
      var text_13 = only_child(button_3, true);
      template_effect(
        ($0, $1) => {
          set_attribute2(div_3, "aria-label", $0);
          button_3.disabled = !!$$props.panel.stepEditor;
          set_text(text_13, $1);
        },
        [() => get2(t)("Your steps"), () => get2(t)("Preview schedule")],
      );
      delegated("click", button_3, () => {
        $$props.panel.navigate("preview");
        $$props.panel.runPreview();
      });
      append($$anchor2, fragment_1);
    };
    if_block(node_1, ($$render) => {
      if (!get2(entries).length) $$render(consequent_1);
      else $$render(alternate_1, -1);
    });
  }
  template_effect(
    ($0, $1) => {
      set_text(text2, $0);
      set_text(text_1, $1);
    },
    [
      () => get2(t)("Your steps"),
      () => get2(t)("Choose what happens, when it happens, and what follows."),
    ],
  );
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/SettingsView.svelte
var root11 = from_html(`<button type="button"> </button>`);
var root_19 = from_html(
  `<section><h2> </h2> <p class="hint"><!></p> <button type="button"> </button> <button type="button"> </button></section> <section><h2> </h2> <!></section>`,
  1,
);
function SettingsView($$anchor, $$props) {
  push($$props, true);
  const tools = [
    ["configuration", "Import, export and managed files"],
    ["timeline", "Execution history"],
    ["diagnostics", "Diagnostics"],
  ];
  let data = user_derived(() => {
    $$props.revision;
    const t2 = $$props.panel.t,
      dryRun2 = !!$$props.panel.status?.dry_run;
    return { t: t2, dryRun: dryRun2 };
  });
  let t = user_derived(() => get2(data).t),
    dryRun = user_derived(() => get2(data).dryRun);
  var fragment = root_19();
  var section = first_child(fragment);
  var h2 = child(section);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var node = child(p);
  {
    var consequent = ($$anchor2) => {
      var text_1 = text();
      template_effect(
        ($0) => set_text(text_1, $0),
        [() => get2(t)("Dry run is on. Devices are not controlled.")],
      );
      append($$anchor2, text_1);
    };
    var alternate = ($$anchor2) => {
      var text_2 = text();
      template_effect(
        ($0) => set_text(text_2, $0),
        [
          () =>
            get2(t)("Live mode controls devices when the simulation is on."),
        ],
      );
      append($$anchor2, text_2);
    };
    if_block(node, ($$render) => {
      if (get2(dryRun)) $$render(consequent);
      else $$render(alternate, -1);
    });
  }
  reset(p);
  var button = sibling(p, 2);
  var text_3 = only_child(button, true);
  var button_1 = sibling(button, 2);
  var text_4 = only_child(button_1, true);
  reset(section);
  var section_1 = sibling(section, 2);
  var h2_1 = child(section_1);
  var text_5 = only_child(h2_1, true);
  var node_1 = sibling(h2_1, 2);
  each(
    node_1,
    17,
    () => tools,
    index,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array(get2($$item), 2));
      let tab = () => get2($$array)[0];
      let label = () => get2($$array)[1];
      var button_2 = root11();
      var text_6 = only_child(button_2, true);
      template_effect(($0) => set_text(text_6, $0), [() => get2(t)(label())]);
      delegated("click", button_2, () => $$props.panel.navigate(tab()));
      append($$anchor2, button_2);
    },
  );
  reset(section_1);
  template_effect(
    ($0, $1, $2, $3) => {
      set_text(text2, $0);
      button.disabled = $$props.panel.busy;
      set_text(text_3, $1);
      set_text(text_4, $2);
      set_text(text_5, $3);
    },
    [
      () => get2(t)("Simulation"),
      () => get2(t)(get2(dryRun) ? "Use live mode" : "Use dry run"),
      () => get2(t)("Runtime details"),
      () => get2(t)("Tools"),
    ],
  );
  delegated("click", button, () =>
    $$props.panel.control("set_dry_run", { dry_run: !get2(dryRun) }),
  );
  delegated("click", button_1, () => $$props.panel.navigate("overview"));
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/timeline.ts
function stamp(value, zone) {
  if (!value) return "\u2014";
  try {
    return new Date(value).toLocaleString(void 0, {
      timeZone: zone && zone !== "home_assistant" ? zone : void 0,
    });
  } catch {
    return value;
  }
}
function timelineModel(doc, program, t = (text2) => text2) {
  const plan = doc.plan;
  if (!plan) return null;
  const labels = new Map(
    resources(program).map((resource) => [resource.id, resource.name]),
  );
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end),
    width = end - start;
  const position = (time) =>
    Math.max(0, Math.min(100, ((Date.parse(time) - start) / width) * 100));
  const lanes = /* @__PURE__ */ new Map();
  const lane = (id, mark) => {
    if (!lanes.has(id)) lanes.set(id, []);
    lanes.get(id).push(mark);
  };
  const bar = (kind, from, to, title) => ({
    className: "bar " + kind,
    title,
    style:
      "left:" +
      position(from) +
      "%;width:" +
      Math.max(0.25, position(to) - position(from)) +
      "%",
  });
  let drawn = 0;
  for (const interval of plan.intervals) {
    if (drawn++ >= 800) break;
    lane(
      interval.source_id,
      bar(
        interval.kind,
        interval.start,
        interval.end,
        `${labels.get(interval.source_id) || interval.source_id}: ${stamp(interval.start, plan.timezone)} \u2192 ${stamp(interval.end, plan.timezone)} \xB7 ${interval.resources.join(", ")}`,
      ),
    );
  }
  for (const [id, time] of Object.entries(plan.steps || {})) {
    if (drawn++ >= 800) break;
    lane(id, {
      className: "marker",
      title: `${labels.get(id) || id}: ${stamp(time, plan.timezone)}`,
      style: `left:${position(time)}%`,
      text: "\u25C6",
    });
  }
  for (const activity of doc.snapshot?.activities || []) {
    if (!activity.deadline) continue;
    const actualStart = new Date(
      Date.parse(activity.deadline) - activity.duration * 1e3,
    ).toISOString();
    if (Date.parse(activity.deadline) < start || Date.parse(actualStart) > end)
      continue;
    lane(
      activity.source_id,
      bar(
        "active",
        actualStart,
        activity.deadline,
        `${t("Runtime deadline")}: ${stamp(activity.deadline, plan.timezone)} \xB7 ${activity.phase}`,
      ),
    );
  }
  for (const [entity, handover] of Object.entries(
    doc.snapshot?.handover || {},
  )) {
    if (
      Date.parse(handover.deadline) < start ||
      Date.parse(handover.start) > end
    )
      continue;
    lane(
      entity,
      bar(
        "ramp",
        handover.start,
        handover.deadline,
        `${entity} \xB7 ${t("Handover")}: ${stamp(handover.start, plan.timezone)} \u2192 ${stamp(handover.deadline, plan.timezone)} \xB7 ${Math.round(handover.progress * 100)}% \xB7 ${JSON.stringify(handover.observed)} \u2192 ${JSON.stringify(handover.target)}`,
      ),
    );
  }
  return {
    plan,
    labels,
    start,
    width,
    lanes: [...lanes],
    drawn,
    events: doc.events || plan.events,
  };
}

// custom_components/occupied/frontend/OverviewView.svelte
var root12 = from_html(`<button type="button"> </button>`);
var root_110 = from_html(`<dt> </dt> <dd> </dd>`, 1);
var root_27 = from_html(`<p> </p>`);
var root_37 = from_html(`<p> </p> <progress max="1"></progress>`, 1);
var root_45 = from_html(`<p class="error"> </p>`);
var root_54 = from_html(
  `<section><h2> </h2> <div class="row"><button type="button"> </button> <button type="button"> </button> <!></div> <dl></dl></section> <section><h2> </h2> <!></section> <section><h2> </h2> <!> <!></section> <section><h2> </h2> <!></section> <!> <p> </p>`,
  1,
);
function OverviewView($$anchor, $$props) {
  push($$props, true);
  let data = user_derived(() => {
    $$props.revision;
    const t2 = $$props.panel.t,
      state3 = $$props.panel.status;
    const labels2 = new Map(
      resources($$props.panel.saved).map((resource) => [
        resource.id,
        resource.name,
      ]),
    );
    const fields2 = [
      ["Status", state3.status],
      ["Reason", state3.reason],
      [
        "Next action",
        stamp(state3.next_event, $$props.panel.document.timezone),
      ],
      ["Execution", state3.dry_run ? t2("Dry run") : t2("Live")],
      [
        "Saved revision",
        state3.source_revision?.slice(0, 12) ||
          $$props.panel.revision?.slice(0, 12),
      ],
      [
        "Steps",
        stepEntries($$props.panel.saved)
          .map((step) => step.name)
          .join(", ") || t2("None"),
      ],
      ["Yielded targets", (state3.yielded || []).join(", ") || t2("None")],
    ];
    return { t: t2, state: state3, labels: labels2, fields: fields2 };
  });
  let t = user_derived(() => get2(data).t),
    state2 = user_derived(() => get2(data).state),
    labels = user_derived(() => get2(data).labels),
    fields = user_derived(() => get2(data).fields);
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent_5 = ($$anchor2) => {
      var fragment_1 = root_54();
      var section = first_child(fragment_1);
      var h2 = child(section);
      var text2 = only_child(h2, true);
      var div = sibling(h2, 2);
      var button = child(div);
      var text_1 = only_child(button, true);
      var button_1 = sibling(button, 2);
      var text_2 = only_child(button_1, true);
      var node_1 = sibling(button_1, 2);
      {
        var consequent = ($$anchor3) => {
          var button_2 = root12();
          var text_3 = only_child(button_2, true);
          template_effect(
            ($0) => {
              button_2.disabled = $$props.panel.busy;
              set_text(text_3, $0);
            },
            [
              () =>
                get2(t)(
                  get2(state2).dry_run
                    ? "Select live execution"
                    : "Select dry run",
                ),
            ],
          );
          delegated("click", button_2, () =>
            $$props.panel.control("set_dry_run", {
              dry_run: !get2(state2).dry_run,
            }),
          );
          append($$anchor3, button_2);
        };
        if_block(node_1, ($$render) => {
          if (get2(state2).mode === "daily") $$render(consequent);
        });
      }
      reset(div);
      var dl = sibling(div, 2);
      each(
        dl,
        21,
        () => get2(fields),
        index,
        ($$anchor3, $$item) => {
          var $$array = user_derived(() => to_array(get2($$item), 2));
          let label = () => get2($$array)[0];
          let value = () => get2($$array)[1];
          var fragment_2 = root_110();
          var dt = first_child(fragment_2);
          var text_4 = only_child(dt, true);
          var dd = sibling(dt, 2);
          var text_5 = only_child(dd, true);
          template_effect(
            ($0) => {
              set_text(text_4, $0);
              set_text(text_5, value());
            },
            [() => get2(t)(label() || "")],
          );
          append($$anchor3, fragment_2);
        },
      );
      reset(dl);
      reset(section);
      var section_1 = sibling(section, 2);
      var h2_1 = child(section_1);
      var text_6 = only_child(h2_1, true);
      var node_2 = sibling(h2_1, 2);
      {
        var consequent_1 = ($$anchor3) => {
          var fragment_3 = comment();
          var node_3 = first_child(fragment_3);
          each(
            node_3,
            17,
            () => get2(state2).activities,
            index,
            ($$anchor4, activity) => {
              var p = root_27();
              var text_7 = only_child(p);
              template_effect(
                ($0, $1, $2, $3) =>
                  set_text(
                    text_7,
                    `${$0 ?? ""} \xB7
          ${get2(activity).phase ?? ""} \xB7 ${$1 ?? ""}:
          ${$2 ?? ""} \xB7
          ${$3 ?? ""}`,
                  ),
                [
                  () =>
                    get2(labels).get(get2(activity).source_id) ||
                    get2(activity).source_id,
                  () => get2(t)("Runtime deadline"),
                  () =>
                    stamp(
                      get2(activity).deadline,
                      $$props.panel.document.timezone,
                    ),
                  () => get2(activity).resources.join(", "),
                ],
              );
              append($$anchor4, p);
            },
          );
          append($$anchor3, fragment_3);
        };
        var alternate = ($$anchor3) => {
          var p_1 = root_27();
          var text_8 = only_child(p_1, true);
          template_effect(
            ($0) => set_text(text_8, $0),
            [() => get2(t)("None")],
          );
          append($$anchor3, p_1);
        };
        if_block(node_2, ($$render) => {
          if (get2(state2).activities?.length) $$render(consequent_1);
          else $$render(alternate, -1);
        });
      }
      reset(section_1);
      var section_2 = sibling(section_1, 2);
      var h2_2 = child(section_2);
      var text_9 = only_child(h2_2, true);
      var node_4 = sibling(h2_2, 2);
      each(
        node_4,
        17,
        () => Object.entries(get2(state2).handover || {}),
        index,
        ($$anchor3, $$item) => {
          var $$array_1 = user_derived(() => to_array(get2($$item), 2));
          let entity = () => get2($$array_1)[0];
          let handover = () => get2($$array_1)[1];
          var fragment_4 = root_37();
          var p_2 = first_child(fragment_4);
          var text_10 = only_child(p_2);
          var progress_1 = sibling(p_2, 2);
          template_effect(
            ($0, $1, $2, $3) => {
              set_text(
                text_10,
                `${entity() ?? ""} \xB7 ${$0 ?? ""} \xB7
        ${$1 ?? ""} \u2192
        ${$2 ?? ""}`,
              );
              set_attribute2(progress_1, "aria-label", entity());
              set_attribute2(progress_1, "data-start", handover().start);
              set_attribute2(progress_1, "data-deadline", handover().deadline);
              set_value(progress_1, $3);
            },
            [
              () => stamp(handover().deadline, $$props.panel.document.timezone),
              () => JSON.stringify(handover().observed),
              () => JSON.stringify(handover().target),
              () => progress(handover().start, handover().deadline),
            ],
          );
          append($$anchor3, fragment_4);
        },
      );
      var node_5 = sibling(node_4, 2);
      {
        var consequent_2 = ($$anchor3) => {
          var p_3 = root_27();
          var text_11 = only_child(p_3, true);
          template_effect(
            ($0) => set_text(text_11, $0),
            [() => get2(t)("None")],
          );
          append($$anchor3, p_3);
        };
        var d = user_derived(
          () => !Object.keys(get2(state2).handover || {}).length,
        );
        if_block(node_5, ($$render) => {
          if (get2(d)) $$render(consequent_2);
        });
      }
      reset(section_2);
      var section_3 = sibling(section_2, 2);
      var h2_3 = child(section_3);
      var text_12 = only_child(h2_3, true);
      var node_6 = sibling(h2_3, 2);
      {
        var consequent_3 = ($$anchor3) => {
          var fragment_5 = comment();
          var node_7 = first_child(fragment_5);
          each(
            node_7,
            17,
            () => get2(state2).events.slice(0, 30),
            index,
            ($$anchor4, event2) => {
              var p_4 = root_27();
              var text_13 = only_child(p_4);
              template_effect(
                ($0) =>
                  set_text(
                    text_13,
                    `${$0 ?? ""} \xB7 ${get2(event2).event ?? ""}
          \xB7 ${get2(event2).id ?? ""}`,
                  ),
                [
                  () =>
                    stamp(get2(event2).time, $$props.panel.document.timezone),
                ],
              );
              append($$anchor4, p_4);
            },
          );
          append($$anchor3, fragment_5);
        };
        var alternate_1 = ($$anchor3) => {
          var p_5 = root_27();
          var text_14 = only_child(p_5, true);
          template_effect(
            ($0) => set_text(text_14, $0),
            [() => get2(t)("None")],
          );
          append($$anchor3, p_5);
        };
        if_block(node_6, ($$render) => {
          if (get2(state2).events?.length) $$render(consequent_3);
          else $$render(alternate_1, -1);
        });
      }
      reset(section_3);
      var node_8 = sibling(section_3, 2);
      {
        var consequent_4 = ($$anchor3) => {
          var p_6 = root_45();
          var text_15 = only_child(p_6, true);
          template_effect(() => set_text(text_15, get2(state2).last_error));
          append($$anchor3, p_6);
        };
        if_block(node_8, ($$render) => {
          if (get2(state2).last_error) $$render(consequent_4);
        });
      }
      var p_7 = sibling(node_8, 2);
      var text_16 = only_child(p_7, true);
      template_effect(
        ($0, $1, $2, $3, $4, $5, $6) => {
          set_text(text2, $0);
          button.disabled = $$props.panel.busy;
          set_text(text_1, $1);
          button_1.disabled = $$props.panel.busy;
          set_text(text_2, $2);
          set_text(text_6, $3);
          set_text(text_9, $4);
          set_text(text_12, $5);
          set_text(text_16, $6);
        },
        [
          () => get2(t)("Overview"),
          () => get2(t)(get2(state2).enabled ? "Disable" : "Enable"),
          () => get2(t)(get2(state2).paused ? "Resume" : "Pause"),
          () => get2(t)("Active activities"),
          () => get2(t)("Lighting convergence"),
          () => get2(t)("Upcoming actions"),
          () =>
            get2(t)(
              "Home Assistant runs the program while this panel is closed. Draft edits and previews do not control devices.",
            ),
        ],
      );
      delegated("click", button, () =>
        $$props.panel.control(get2(state2).enabled ? "stop" : "start"),
      );
      delegated("click", button_1, () =>
        $$props.panel.control(get2(state2).paused ? "resume" : "pause"),
      );
      append($$anchor2, fragment_1);
    };
    if_block(node, ($$render) => {
      if (get2(state2)) $$render(consequent_5);
    });
  }
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/Timeline.svelte
var root13 = from_html(`<span> </span>`);
var root_111 = from_html(`<span tabindex="0"> </span>`);
var root_28 = from_html(
  `<div class="lane"><span class="lane-label"> </span> <div class="track"></div></div>`,
);
var root_38 = from_html(`<p> </p>`);
var root_46 = from_html(`<th scope="col"> </th>`);
var root_55 = from_html(`<td> </td>`);
var root_64 = from_html(`<tr></tr>`);
var root_72 = from_html(
  `<section><h2> </h2> <p class="hint"> </p> <p> </p> <div class="timeline" role="img"><div class="ruler"></div> <!></div> <!> <input type="search"/> <div><div class="table-wrap"><table><thead><tr></tr></thead><tbody></tbody></table></div> <div class="row"><button type="button"> </button> <span> </span> <button type="button"> </button></div></div> <!></section>`,
);
function Timeline($$anchor, $$props) {
  push($$props, true);
  let t = prop($$props, "t", 3, (text2) => text2);
  let model = user_derived(() =>
    timelineModel($$props.doc, $$props.program, t()),
  );
  let query = state("");
  let page = state(0);
  let filtered = user_derived(
    () =>
      get2(model)?.events.filter(
        (event2) =>
          JSON.stringify(event2).toLowerCase().includes(get2(query)) ||
          (get2(model)?.labels.get(event2.source_id) || "")
            .toLowerCase()
            .includes(get2(query)),
      ) ?? [],
  );
  let currentPage = user_derived(() =>
    Math.max(
      0,
      Math.min(get2(page), Math.ceil(get2(filtered).length / 50) - 1),
    ),
  );
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent_1 = ($$anchor2) => {
      const computed_const = user_derived(() => {
        return get2(model);
      });
      var section = root_72();
      var h2 = child(section);
      var text_1 = only_child(h2);
      var p = sibling(h2, 2);
      var text_2 = only_child(p, true);
      var p_1 = sibling(p, 2);
      var text_3 = only_child(p_1);
      var div = sibling(p_1, 2);
      var div_1 = child(div);
      each(
        div_1,
        20,
        () => Array.from({ length: 7 }),
        index,
        ($$anchor3, _, n) => {
          var span = root13();
          set_style(span, `left:${(n / 6) * 100}%`);
          var text_4 = only_child(span, true);
          template_effect(
            ($0) => set_text(text_4, $0),
            [
              () =>
                stamp(
                  new Date(
                    get2(computed_const).start +
                      (get2(computed_const).width * n) / 6,
                  ).toISOString(),
                  get2(computed_const).plan.timezone,
                ),
            ],
          );
          append($$anchor3, span);
        },
      );
      reset(div_1);
      var node_1 = sibling(div_1, 2);
      each(
        node_1,
        17,
        () => get2(computed_const).lanes,
        index,
        ($$anchor3, $$item) => {
          var $$array = user_derived(() => to_array(get2($$item), 2));
          let id = () => get2($$array)[0];
          let marks = () => get2($$array)[1];
          var div_2 = root_28();
          var span_1 = child(div_2);
          var text_5 = only_child(span_1, true);
          var div_3 = sibling(span_1, 2);
          each(div_3, 21, marks, index, ($$anchor4, mark) => {
            var span_2 = root_111();
            var text_6 = only_child(span_2, true);
            template_effect(() => {
              set_class(span_2, 1, clsx2(get2(mark).className));
              set_attribute2(span_2, "title", get2(mark).title);
              set_style(span_2, get2(mark).style);
              set_text(text_6, get2(mark).text || "");
            });
            append($$anchor4, span_2);
          });
          reset(div_3);
          reset(div_2);
          template_effect(
            ($0) => set_text(text_5, $0),
            [() => get2(computed_const).labels.get(id()) || id()],
          );
          append($$anchor3, div_2);
        },
      );
      reset(div);
      var node_2 = sibling(div, 2);
      {
        var consequent = ($$anchor3) => {
          var p_2 = root_38();
          var text_7 = only_child(p_2, true);
          template_effect(
            ($0) => set_text(text_7, $0),
            [
              () =>
                t()(
                  "Diagram limited to 800 marks; all events remain available in the table and export.",
                ),
            ],
          );
          append($$anchor3, p_2);
        };
        if_block(node_2, ($$render) => {
          if (get2(computed_const).drawn > 800) $$render(consequent);
        });
      }
      var input = sibling(node_2, 2);
      var div_4 = sibling(input, 2);
      var div_5 = child(div_4);
      var table = child(div_5);
      var thead = child(table);
      var tr = child(thead);
      each(
        tr,
        20,
        () => [
          "Planned time",
          "Source",
          "Action",
          "Targets",
          "Outcome / actual time",
        ],
        index,
        ($$anchor3, label) => {
          var th = root_46();
          var text_8 = only_child(th, true);
          template_effect(($0) => set_text(text_8, $0), [() => t()(label)]);
          append($$anchor3, th);
        },
      );
      reset(tr);
      reset(thead);
      var tbody = sibling(thead);
      each(
        tbody,
        21,
        () =>
          get2(filtered).slice(
            get2(currentPage) * 50,
            get2(currentPage) * 50 + 50,
          ),
        index,
        ($$anchor3, event2) => {
          var tr_1 = root_64();
          each(
            tr_1,
            21,
            () => [
              stamp(get2(event2).time, get2(computed_const).plan.timezone),
              `${get2(computed_const).labels.get(get2(event2).source_id) || get2(event2).source_id} \xB7 ${get2(event2).kind}`,
              get2(event2).action.action,
              get2(event2).action.targets.entities.join(", "),
              `${get2(event2).outcome || t()("Preview only")} \xB7 ${stamp(get2(event2).actual_time || get2(event2).dispatch_time, get2(computed_const).plan.timezone)}`,
            ],
            index,
            ($$anchor4, value) => {
              var td = root_55();
              var text_9 = only_child(td, true);
              template_effect(() => set_text(text_9, get2(value)));
              append($$anchor4, td);
            },
          );
          reset(tr_1);
          append($$anchor3, tr_1);
        },
      );
      reset(tbody);
      reset(table);
      reset(div_5);
      var div_6 = sibling(div_5, 2);
      var button = child(div_6);
      var text_10 = only_child(button, true);
      var span_3 = sibling(button, 2);
      var text_11 = only_child(span_3);
      var button_1 = sibling(span_3, 2);
      var text_12 = only_child(button_1, true);
      reset(div_6);
      reset(div_4);
      var node_3 = sibling(div_4, 2);
      each(
        node_3,
        17,
        () => $$props.doc.issues || get2(computed_const).plan.issues || [],
        index,
        ($$anchor3, issue) => {
          var p_3 = root_38();
          var text_13 = only_child(p_3);
          template_effect(() => {
            set_class(
              p_3,
              1,
              clsx2(get2(issue).severity === "warning" ? "hint" : "error"),
            );
            set_text(
              text_13,
              `${get2(issue).code ?? ""}: ${get2(issue).message ?? ""}`,
            );
          });
          append($$anchor3, p_3);
        },
      );
      reset(section);
      template_effect(
        ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) => {
          set_text(
            text_1,
            `${get2(computed_const).plan.simulation_date ?? ""} \xB7 ${get2(computed_const).plan.timezone ?? ""}`,
          );
          set_text(text_2, $0);
          set_text(
            text_3,
            `${$1 ?? ""}: ${$2 ?? ""} \xB7 ${$3 ?? ""}: ${$4 ?? ""}`,
          );
          set_attribute2(div, "aria-label", $5);
          set_attribute2(input, "placeholder", $6);
          set_attribute2(input, "aria-label", $7);
          button.disabled = get2(currentPage) === 0;
          set_text(text_10, $8);
          set_text(
            text_11,
            `${get2(filtered).length ?? ""}
          ${$9 ?? ""} \xB7 ${get2(currentPage) + 1}/${$10 ?? ""}`,
          );
          button_1.disabled =
            (get2(currentPage) + 1) * 50 >= get2(filtered).length;
          set_text(text_12, $11);
        },
        [
          () =>
            t()(
              "Markers are sampled steps; bars are planned activity/window intervals. Runtime end deadlines and handover ramps are shown separately. Times use the plan timezone.",
            ),
          () => t()("Behavior revision"),
          () => get2(computed_const).plan.behavior_hash.slice(0, 12),
          () => t()("Plan revision"),
          () =>
            get2(computed_const).plan.source_revision?.slice(0, 12) || "\u2014",
          () =>
            `${t()("Timeline")} ${get2(computed_const).plan.simulation_date}`,
          () => t()("Filter events"),
          () => t()("Filter events"),
          () => t()("Previous"),
          () => t()("events"),
          () => Math.max(1, Math.ceil(get2(filtered).length / 50)),
          () => t()("Next"),
        ],
      );
      delegated("input", input, (event2) => {
        set2(query, event2.currentTarget.value.toLowerCase(), true);
        set2(page, 0);
      });
      delegated("click", button, () => set2(page, get2(currentPage) - 1));
      delegated("click", button_1, () => set2(page, get2(currentPage) + 1));
      append($$anchor2, section);
    };
    var alternate = ($$anchor2) => {
      var p_4 = root_38();
      var text_14 = only_child(p_4, true);
      template_effect(
        ($0) => set_text(text_14, $0),
        [
          () =>
            t()(
              "No saved plan for this date. Saving or viewing a preview does not replay past actions.",
            ),
        ],
      );
      append($$anchor2, p_4);
    };
    if_block(node, ($$render) => {
      if (get2(model)) $$render(consequent_1);
      else $$render(alternate, -1);
    });
  }
  append($$anchor, fragment);
  pop();
}
delegate(["input", "click"]);

// custom_components/occupied/frontend/PreviewView.svelte
var root14 = from_html(`<label class="field"> <input/></label>`);
var root_112 = from_html(`<button type="button"> </button>`);
var root_29 = from_html(`<section><h2> </h2> <pre> </pre></section>`);
var root_39 = from_html(
  `<section><h2> </h2> <p class="hint"> </p> <!> <details><summary> </summary> <!><!><!></details> <button type="button"> </button><button type="button"> </button> <!></section> <!> <!>`,
  1,
);
function PreviewView($$anchor, $$props) {
  push($$props, true);
  const previewField = ($$anchor2, key2 = noop, label = noop, type = noop) => {
    var label_1 = root14();
    var text2 = child(label_1, true);
    var input = sibling(text2);
    remove_input_defaults(input);
    reset(label_1);
    template_effect(
      ($0, $1) => {
        set_text(text2, $0);
        set_attribute2(input, "type", type());
        set_attribute2(input, "min", key2() === "days" ? 1 : void 0);
        set_attribute2(input, "max", key2() === "days" ? 31 : void 0);
        set_value(input, $1);
      },
      [
        () => get2(t)(label()),
        () => String(panel().previewSettings[key2()] ?? ""),
      ],
    );
    delegated("input", input, (event2) => {
      const value = event2.currentTarget.value;
      if (key2() === "days") panel().previewSettings.days = Number(value);
      else panel().previewSettings[key2()] = value;
    });
    append($$anchor2, label_1);
  };
  let panel = prop($$props, "panel", 7);
  let data = user_derived(() => {
    $$props.revision;
    const t2 = panel().t;
    return { t: t2 };
  });
  let t = user_derived(() => get2(data).t);
  var fragment = root_39();
  var section = first_child(fragment);
  var h2 = child(section);
  var text_1 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_2 = only_child(p, true);
  var node = sibling(p, 2);
  previewField(
    node,
    () => "date",
    () => "Date",
    () => "date",
  );
  var details = sibling(node, 2);
  var summary = child(details);
  var text_3 = only_child(summary, true);
  var node_1 = sibling(summary, 2);
  previewField(
    node_1,
    () => "days",
    () => "Days",
    () => "number",
  );
  var node_2 = sibling(node_1);
  previewField(
    node_2,
    () => "seed",
    () => "Seed",
    () => "text",
  );
  var node_3 = sibling(node_2);
  previewField(
    node_3,
    () => "at",
    () => "Projection instant (ISO time with offset, optional)",
    () => "text",
  );
  reset(details);
  var button = sibling(details, 2);
  var text_4 = only_child(button, true);
  var button_1 = sibling(button);
  var text_5 = only_child(button_1, true);
  var node_4 = sibling(button_1, 2);
  {
    var consequent = ($$anchor2) => {
      var button_2 = root_112();
      var text_6 = only_child(button_2, true);
      template_effect(
        ($0) => set_text(text_6, $0),
        [() => get2(t)("Download")],
      );
      delegated("click", button_2, () =>
        download(
          "occupied-preview.json",
          JSON.stringify(panel().preview, null, 2),
        ),
      );
      append($$anchor2, button_2);
    };
    if_block(node_4, ($$render) => {
      if (panel().preview) $$render(consequent);
    });
  }
  reset(section);
  var node_5 = sibling(section, 2);
  each(
    node_5,
    17,
    () => panel().preview?.plans || [],
    index,
    ($$anchor2, plan) => {
      {
        let $0 = user_derived(() => ({ plan: get2(plan) }));
        Timeline($$anchor2, {
          get doc() {
            return get2($0);
          },
          get program() {
            return panel().previewProgram;
          },
          get t() {
            return get2(t);
          },
        });
      }
    },
  );
  var node_6 = sibling(node_5, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var section_1 = root_29();
      var h2_1 = child(section_1);
      var text_7 = only_child(h2_1, true);
      var pre = sibling(h2_1, 2);
      var text_8 = only_child(pre, true);
      reset(section_1);
      template_effect(
        ($0, $1) => {
          set_text(text_7, $0);
          set_text(text_8, $1);
        },
        [
          () => get2(t)("Projected handover endpoints"),
          () => JSON.stringify(panel().preview.handover, null, 2),
        ],
      );
      append($$anchor2, section_1);
    };
    if_block(node_6, ($$render) => {
      if (panel().preview?.handover) $$render(consequent_1);
    });
  }
  template_effect(
    ($0, $1, $2, $3, $4) => {
      set_text(text_1, $0);
      set_text(text_2, $1);
      set_text(text_3, $2);
      set_text(text_4, $3);
      set_text(text_5, $4);
    },
    [
      () => get2(t)("Preview schedule"),
      () =>
        get2(t)(
          "See how your steps could play out. Previewing never controls devices or changes the running schedule.",
        ),
      () => get2(t)("Preview options"),
      () => get2(t)("Run preview"),
      () => get2(t)("Reroll preview"),
    ],
  );
  delegated("click", button, () => panel().runPreview());
  delegated("click", button_1, () => {
    panel().previewSettings.seed = crypto.randomUUID();
    panel().runPreview();
  });
  append($$anchor, fragment);
  pop();
}
delegate(["input", "click"]);

// custom_components/occupied/frontend/ConfigurationView.svelte
var root15 = from_html(`<p> </p>`);
var root_113 = from_html(`<p class="error"> <!> </p>`);
var root_210 = from_html(
  `<button type="button"> </button> <button type="button"> </button> <!> <!>`,
  1,
);
var root_310 = from_html(
  `<section><h2> </h2> <p class="hint"> </p> <p> </p> <input type="text" placeholder="occupied/house.yaml"/> <button type="button"> </button> <!></section> <section><h2> </h2> <p class="hint"> </p> <input type="file" accept=".yaml,.yml,.json"/> <textarea rows="18" style="width:100%"></textarea> <button type="button"> </button><button type="button"> </button><button type="button"> </button></section>`,
  1,
);
function ConfigurationView($$anchor, $$props) {
  push($$props, true);
  let panel = prop($$props, "panel", 7);
  let data = user_derived(() => {
    $$props.revision;
    const t2 = panel().t,
      source3 = panel().document.configuration_source || {
        mode: panel().document.source || "gui",
        status: "ready",
      };
    return { t: t2, source: source3 };
  });
  let t = user_derived(() => get2(data).t),
    source2 = user_derived(() => get2(data).source);
  var fragment = root_310();
  var section = first_child(fragment);
  var h2 = child(section);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var p_1 = sibling(p, 2);
  var text_2 = only_child(p_1);
  var input = sibling(p_1, 2);
  remove_input_defaults(input);
  var button = sibling(input, 2);
  var text_3 = only_child(button, true);
  var node = sibling(button, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var fragment_1 = root_210();
      var button_1 = first_child(fragment_1);
      var text_4 = only_child(button_1, true);
      var button_2 = sibling(button_1, 2);
      var text_5 = only_child(button_2, true);
      var node_1 = sibling(button_2, 2);
      {
        var consequent = ($$anchor3) => {
          var p_2 = root15();
          var text_6 = only_child(p_2);
          template_effect(
            ($0, $1) =>
              set_text(
                text_6,
                `${$0 ?? ""}:
        ${$1 ?? ""}`,
              ),
            [
              () => get2(t)("Observed file hash"),
              () => get2(source2).observed_hash.slice(0, 16),
            ],
          );
          append($$anchor3, p_2);
        };
        if_block(node_1, ($$render) => {
          if (get2(source2).observed_hash) $$render(consequent);
        });
      }
      var node_2 = sibling(node_1, 2);
      each(
        node_2,
        17,
        () => get2(source2).issues || [],
        index,
        ($$anchor3, issue) => {
          var p_3 = root_113();
          var text_7 = child(p_3, true);
          var node_3 = sibling(text_7);
          {
            var consequent_1 = ($$anchor4) => {
              var text_8 = text();
              template_effect(
                ($0) => set_text(text_8, $0),
                [() => ` \xB7 ${get2(t)("Line")} ${get2(issue).line}`],
              );
              append($$anchor4, text_8);
            };
            var alternate = ($$anchor4) => {
              var text_9 = text();
              text_9.nodeValue = "";
              append($$anchor4, text_9);
            };
            if_block(node_3, ($$render) => {
              if (get2(issue).line) $$render(consequent_1);
              else $$render(alternate, -1);
            });
          }
          var text_10 = sibling(node_3);
          reset(p_3);
          template_effect(() => {
            set_text(text_7, get2(issue).path || "$");
            set_text(
              text_10,
              `:
        ${get2(issue).message ?? ""}`,
            );
          });
          append($$anchor3, p_3);
        },
      );
      template_effect(
        ($0, $1) => {
          button_1.disabled = panel().busy;
          set_text(text_4, $0);
          button_2.disabled =
            panel().busy || get2(source2).has_valid_program === false;
          set_text(text_5, $1);
        },
        [
          () => get2(t)("Reload managed file"),
          () => get2(t)("Copy saved program to GUI storage"),
        ],
      );
      delegated("click", button_1, () => panel().reloadManaged());
      delegated("click", button_2, () => panel().selectSource("gui"));
      append($$anchor2, fragment_1);
    };
    if_block(node, ($$render) => {
      if (get2(source2).mode === "file") $$render(consequent_2);
    });
  }
  reset(section);
  var section_1 = sibling(section, 2);
  var h2_1 = child(section_1);
  var text_11 = only_child(h2_1, true);
  var p_4 = sibling(h2_1, 2);
  var text_12 = only_child(p_4, true);
  var input_1 = sibling(p_4, 2);
  var textarea = sibling(input_1, 2);
  remove_textarea_child(textarea);
  var button_3 = sibling(textarea, 2);
  var text_13 = only_child(button_3, true);
  var button_4 = sibling(button_3);
  var text_14 = only_child(button_4, true);
  var button_5 = sibling(button_4);
  var text_15 = only_child(button_5, true);
  reset(section_1);
  template_effect(
    ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      set_text(
        text_2,
        `${$2 ?? ""} \xB7
    ${(get2(source2).status || "ready") ?? ""}`,
      );
      set_attribute2(input, "aria-label", $3);
      set_value(
        input,
        panel().sourcePath ??
          get2(source2).config_file ??
          "occupied/house.yaml",
      );
      button.disabled = panel().busy;
      set_text(text_3, $4);
      set_text(text_11, $5);
      set_text(text_12, $6);
      set_attribute2(input_1, "aria-label", $7);
      set_attribute2(textarea, "aria-label", $8);
      set_value(textarea, panel().yaml);
      set_text(text_13, $9);
      set_text(text_14, $10);
      set_text(text_15, $11);
    },
    [
      () => get2(t)("Configuration source"),
      () =>
        get2(t)(
          get2(source2).mode === "file"
            ? "The managed file is read only. You can edit, validate and preview a temporary draft; export it and update the file to apply those changes."
            : "GUI storage is authoritative. Importing YAML creates a draft snapshot. Selecting a managed file below changes the saved program explicitly.",
        ),
      () =>
        get2(t)(get2(source2).mode === "file" ? "Managed file" : "GUI storage"),
      () => get2(t)("Relative managed-file path"),
      () => get2(t)("Use managed file"),
      () => get2(t)("Occupied YAML import/export"),
      () =>
        get2(t)(
          "Import replaces only the draft. Export normalizes the draft. Comments are not retained. Importing a local file does not select it as the managed source.",
        ),
      () => get2(t)("Choose configuration file"),
      () => get2(t)("Occupied YAML"),
      () => get2(t)("Import as draft"),
      () => get2(t)("Export YAML"),
      () => get2(t)("Download"),
    ],
  );
  delegated(
    "input",
    input,
    (event2) => (panel().sourcePath = event2.currentTarget.value),
  );
  delegated("click", button, () =>
    panel().selectSource(
      "file",
      panel().sourcePath ?? get2(source2).config_file ?? "occupied/house.yaml",
    ),
  );
  delegated("change", input_1, async (event2) => {
    const file = event2.currentTarget.files?.[0];
    if (file) {
      panel().yaml = await file.text();
      panel().flush();
    }
  });
  delegated(
    "input",
    textarea,
    (event2) => (panel().yaml = event2.currentTarget.value),
  );
  delegated("click", button_3, () => panel().importYaml());
  delegated("click", button_4, () => panel().exportYaml());
  delegated("click", button_5, () =>
    download("occupied.yaml", panel().yaml, "text/yaml"),
  );
  append($$anchor, fragment);
  pop();
}
delegate(["input", "click", "change"]);

// custom_components/occupied/frontend/DiagnosticsView.svelte
var root16 = from_html(`<button type="button"> </button> <pre> </pre>`, 1);
var root_114 = from_html(`<pre> </pre>`);
var root_211 = from_html(
  `<section><h2> </h2> <p class="hint"> </p> <label><input type="checkbox"/> </label> <button type="button"> </button> <!></section> <section><h2> </h2> <!></section>`,
  1,
);
function DiagnosticsView($$anchor, $$props) {
  push($$props, true);
  let panel = prop($$props, "panel", 7);
  let data = user_derived(() => {
    $$props.revision;
    const t2 = panel().t;
    return { t: t2 };
  });
  let t = user_derived(() => get2(data).t);
  var fragment = root_211();
  var section = first_child(fragment);
  var h2 = child(section);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var label = sibling(p, 2);
  var input = child(label);
  remove_input_defaults(input);
  var text_2 = sibling(input, 1, true);
  reset(label);
  var button = sibling(label, 2);
  var text_3 = only_child(button, true);
  var node = sibling(button, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment_1 = root16();
      var button_1 = first_child(fragment_1);
      var text_4 = only_child(button_1, true);
      var pre = sibling(button_1, 2);
      var text_5 = only_child(pre, true);
      template_effect(
        ($0, $1) => {
          set_text(text_4, $0);
          set_text(text_5, $1);
        },
        [
          () => get2(t)("Download"),
          () => JSON.stringify(panel().diagnostics, null, 2),
        ],
      );
      delegated("click", button_1, () =>
        download(
          "occupied-diagnostics.json",
          JSON.stringify(panel().diagnostics, null, 2),
        ),
      );
      append($$anchor2, fragment_1);
    };
    if_block(node, ($$render) => {
      if (panel().diagnostics) $$render(consequent);
    });
  }
  reset(section);
  var section_1 = sibling(section, 2);
  var h2_1 = child(section_1);
  var text_6 = only_child(h2_1, true);
  var node_1 = sibling(h2_1, 2);
  each(
    node_1,
    17,
    () => (panel().status?.outcomes || []).slice(-50).reverse(),
    index,
    ($$anchor2, item) => {
      var pre_1 = root_114();
      var text_7 = only_child(pre_1, true);
      template_effect(
        ($0) => set_text(text_7, $0),
        [() => JSON.stringify(get2(item))],
      );
      append($$anchor2, pre_1);
    },
  );
  reset(section_1);
  template_effect(
    ($0, $1, $2, $3, $4) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      set_checked(input, panel().includeSensitive);
      set_text(text_2, $2);
      set_text(text_3, $3);
      set_text(text_6, $4);
    },
    [
      () => get2(t)("Diagnostics"),
      () =>
        get2(t)(
          "Default exports contain counts and runtime status. Include household details explicitly to export entities, sampled plans, observations and outcomes. Credential fields remain redacted.",
        ),
      () => get2(t)("Include household details"),
      () => get2(t)("Refresh"),
      () => get2(t)("Recent runtime outcomes"),
    ],
  );
  delegated(
    "change",
    input,
    (event2) => (panel().includeSensitive = event2.currentTarget.checked),
  );
  delegated("click", button, () => panel().loadDiagnostics());
  append($$anchor, fragment);
  pop();
}
delegate(["change", "click"]);

// custom_components/occupied/frontend/TimelineView.svelte
var root17 = from_html(`<option> </option>`);
var root_115 = from_html(
  `<section><h2> </h2> <p class="hint"> </p> <select></select> <button type="button"> </button><button type="button"> </button></section> <!>`,
  1,
);
function TimelineView($$anchor, $$props) {
  push($$props, true);
  let panel = prop($$props, "panel", 7);
  let data = user_derived(() => {
    $$props.revision;
    const t2 = panel().t;
    return { t: t2 };
  });
  let t = user_derived(() => get2(data).t);
  var fragment = root_115();
  var section = first_child(fragment);
  var h2 = child(section);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var select = sibling(p, 2);
  each(
    select,
    21,
    () => panel().actual?.dates || [],
    index,
    ($$anchor2, date) => {
      var option = root17();
      var text_2 = only_child(option, true);
      var option_value = {};
      template_effect(() => {
        set_text(text_2, get2(date));
        if (option_value !== (option_value = get2(date))) {
          option.value = (option.__value = option_value) ?? "";
        }
      });
      append($$anchor2, option);
    },
  );
  reset(select);
  var select_value;
  init_select(select);
  var button = sibling(select, 2);
  var text_3 = only_child(button, true);
  var button_1 = sibling(button);
  var text_4 = only_child(button_1, true);
  reset(section);
  var node = sibling(section, 2);
  {
    var consequent = ($$anchor2) => {
      Timeline($$anchor2, {
        get doc() {
          return panel().actual;
        },
        get program() {
          return panel().saved;
        },
        get t() {
          return get2(t);
        },
      });
    };
    if_block(node, ($$render) => {
      if (panel().actual) $$render(consequent);
    });
  }
  template_effect(
    ($0, $1, $2, $3, $4) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      set_attribute2(select, "aria-label", $2);
      if (
        select_value !==
        (select_value =
          panel().timelineDate || panel().actual?.plan?.simulation_date || "")
      ) {
        ((select.value = (select.__value = select_value) ?? ""),
          select_option(select, select_value));
      }
      set_text(text_3, $3);
      set_text(text_4, $4);
    },
    [
      () => get2(t)("Actual timeline"),
      () =>
        get2(t)(
          "This view reads saved runtime plans and dispatch outcomes. It never samples a replacement plan.",
        ),
      () => get2(t)("Saved simulation date"),
      () => get2(t)("Refresh"),
      () => get2(t)("Download"),
    ],
  );
  delegated("change", select, (event2) => {
    panel().timelineDate = event2.currentTarget.value;
    panel().loadTimeline();
  });
  delegated("click", button, () => panel().loadTimeline());
  delegated("click", button_1, () =>
    download("occupied-timeline.json", JSON.stringify(panel().actual, null, 2)),
  );
  append($$anchor, fragment);
  pop();
}
delegate(["change", "click"]);

// custom_components/occupied/frontend/App.svelte
var root18 = from_html(
  `<span id="badge" class="badge" aria-live="polite"> <!></span> <button type="button" class="text-button"> </button>`,
  1,
);
var root_116 = from_html(
  `<button type="button" class="primary"> </button> <button type="button"> </button>`,
  1,
);
var root_212 = from_html(`<button type="button"> </button>`);
var root_311 = from_html(`<div id="toolbar" class="toolbar"><!> <!></div>`);
var root_47 = from_html(`<p> </p>`);
var root_56 = from_html(`<button type="button" class="text-button"> </button>`);
var root_65 = from_html(`<p class="error"> </p> <p class="error"> </p>`, 1);
var root_73 = from_html(
  `<main><header><div><h1>Occupied</h1> <p id="house"> </p></div> <div id="runtime" class="row"><!></div></header> <!> <div id="notice" class="banner" role="status"> </div> <div id="error" class="error" role="alert"> </div> <nav aria-label="Occupied"></nav> <div id="secondary-nav"><!></div> <div id="issues"></div> <div id="view"><!></div></main>`,
);
function App($$anchor, $$props) {
  push($$props, true);
  const $updates = () => store_get($$props.updates, "$updates", $$stores);
  const [$$stores, $$cleanup] = setup_stores();
  const runtimeControls = ($$anchor2) => {
    var fragment = comment();
    var node = first_child(fragment);
    {
      var consequent_1 = ($$anchor3) => {
        const state3 = user_derived(() => get2(panel).status);
        const label = user_derived(() =>
          get2(state3).paused
            ? "Paused"
            : !get2(state3).enabled
              ? "Off"
              : get2(state3).active
                ? "Running"
                : "Waiting",
        );
        const schedulable = user_derived(() =>
          resources(get2(panel).saved).some((resource) =>
            ["step", "activity", "window"].includes(resource.kind),
          ),
        );
        var fragment_1 = root18();
        var span = first_child(fragment_1);
        var text_1 = child(span, true);
        var node_1 = sibling(text_1);
        {
          var consequent = ($$anchor4) => {
            var text_2 = text();
            template_effect(
              ($0) => set_text(text_2, $0),
              [() => ` \xB7 ${get2(t)("Dry run")}`],
            );
            append($$anchor4, text_2);
          };
          var alternate = ($$anchor4) => {
            var text_3 = text();
            text_3.nodeValue = "";
            append($$anchor4, text_3);
          };
          if_block(node_1, ($$render) => {
            if (get2(state3).dry_run) $$render(consequent);
            else $$render(alternate, -1);
          });
        }
        reset(span);
        var button = sibling(span, 2);
        var text_4 = only_child(button, true);
        template_effect(
          ($0, $1) => {
            set_attribute2(span, "title", get2(state3).reason || "");
            set_text(text_1, $0);
            button.disabled =
              get2(panel).busy ||
              !!get2(panel).stepEditor ||
              (!get2(state3).enabled && !get2(schedulable));
            set_text(text_4, $1);
          },
          [
            () => get2(t)(get2(label)),
            () =>
              get2(t)(
                get2(state3).enabled
                  ? "Turn off simulation"
                  : "Turn on simulation",
              ),
          ],
        );
        delegated("click", button, () =>
          get2(panel).control(get2(state3).enabled ? "stop" : "start"),
        );
        append($$anchor3, fragment_1);
      };
      if_block(node, ($$render) => {
        if (get2(panel).status) $$render(consequent_1);
      });
    }
    append($$anchor2, fragment);
  };
  const toolbar = ($$anchor2) => {
    const unsaved = user_derived(
      () => get2(panel).dirty && !get2(panel).stepEditor,
    );
    var div = root_311();
    var node_2 = child(div);
    {
      var consequent_2 = ($$anchor3) => {
        var fragment_4 = root_116();
        var button_1 = first_child(fragment_4);
        var text_5 = only_child(button_1, true);
        var button_2 = sibling(button_1, 2);
        var text_6 = only_child(button_2, true);
        template_effect(
          ($0, $1) => {
            button_1.disabled =
              get2(panel).busy ||
              get2(panel).document?.source === "file" ||
              get2(panel).stale;
            set_text(text_5, $0);
            button_2.disabled = get2(panel).busy || !get2(panel).draft;
            set_text(text_6, $1);
          },
          [() => get2(t)("Save changes"), () => get2(t)("Discard edits")],
        );
        delegated("click", button_1, () => get2(panel).save());
        delegated("click", button_2, () => get2(panel).discardEdits());
        append($$anchor3, fragment_4);
      };
      if_block(node_2, ($$render) => {
        if (get2(unsaved)) $$render(consequent_2);
      });
    }
    var node_3 = sibling(node_2, 2);
    {
      var consequent_3 = ($$anchor3) => {
        var button_3 = root_212();
        var text_7 = only_child(button_3, true);
        template_effect(
          ($0) => {
            button_3.disabled = get2(panel).busy;
            set_text(text_7, $0);
          },
          [() => get2(t)("Reload saved program")],
        );
        delegated("click", button_3, () => get2(panel).reloadSaved(true));
        append($$anchor3, button_3);
      };
      if_block(node_3, ($$render) => {
        if (get2(panel).stale) $$render(consequent_3);
      });
    }
    reset(div);
    template_effect(() =>
      set_attribute2(div, "hidden", !get2(unsaved) && !get2(panel).stale),
    );
    append($$anchor2, div);
  };
  const renderIssue = ($$anchor2, item = noop, primary2 = noop) => {
    const className = user_derived(() =>
      item().severity === "warning" ? "hint" : "error",
    );
    const text2 = user_derived(() =>
      primary2()
        ? item().message
        : `${item().severity || "error"} \xB7 ${item().path || "$"}: ${item().message}`,
    );
    var fragment_5 = comment();
    var node_4 = first_child(fragment_5);
    {
      var consequent_4 = ($$anchor3) => {
        var button_4 = root_212();
        var text_8 = only_child(button_4, true);
        template_effect(() => {
          set_class(button_4, 1, clsx2(get2(className)));
          set_text(text_8, get2(text2));
        });
        delegated("click", button_4, () => get2(panel).focusIssue(item()));
        append($$anchor3, button_4);
      };
      var alternate_1 = ($$anchor3) => {
        var p = root_47();
        var text_9 = only_child(p, true);
        template_effect(() => {
          set_class(p, 1, clsx2(get2(className)));
          set_text(text_9, get2(text2));
        });
        append($$anchor3, p);
      };
      if_block(node_4, ($$render) => {
        if (get2(panel).stepEditor) $$render(consequent_4);
        else $$render(alternate_1, -1);
      });
    }
    append($$anchor2, fragment_5);
  };
  let panel = user_derived(() => {
    $updates();
    return new Proxy($$props.panel, {
      get(target, key2) {
        const value = Reflect.get(target, key2, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
  let revision = user_derived($updates);
  let state2 = user_derived(() => {
    get2(revision);
    return {
      t: get2(panel).t,
      notices: get2(panel).notices(),
      primary: primaryTabs.some(([id]) => id === get2(panel).tab),
    };
  });
  let t = user_derived(() => get2(state2).t),
    notices = user_derived(() => get2(state2).notices),
    primary = user_derived(() => get2(state2).primary);
  const primaryTabs = [
    ["routines", "Your steps"],
    ["settings", "Settings"],
  ];
  var main = root_73();
  var header = child(main);
  var div_1 = child(header);
  var p_1 = sibling(child(div_1), 2);
  var text_10 = only_child(p_1, true);
  reset(div_1);
  var div_2 = sibling(div_1, 2);
  var node_5 = child(div_2);
  runtimeControls(node_5);
  reset(div_2);
  reset(header);
  var node_6 = sibling(header, 2);
  toolbar(node_6);
  var div_3 = sibling(node_6, 2);
  var text_11 = only_child(div_3, true);
  var div_4 = sibling(div_3, 2);
  var text_12 = only_child(div_4, true);
  var nav = sibling(div_4, 2);
  each(
    nav,
    21,
    () => primaryTabs,
    index,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array(get2($$item), 2));
      let id = () => get2($$array)[0];
      let label = () => get2($$array)[1];
      var button_5 = root_212();
      var text_13 = only_child(button_5, true);
      template_effect(
        ($0) => {
          set_attribute2(button_5, "data-tab", id());
          set_attribute2(
            button_5,
            "aria-current",
            get2(panel).tab === id() ? "page" : "false",
          );
          button_5.disabled = !!get2(panel).stepEditor;
          set_text(text_13, $0);
        },
        [() => get2(t)(label())],
      );
      delegated("click", button_5, () => get2(panel).navigate(id()));
      append($$anchor2, button_5);
    },
  );
  reset(nav);
  var div_5 = sibling(nav, 2);
  var node_7 = child(div_5);
  {
    var consequent_5 = ($$anchor2) => {
      var button_6 = root_56();
      var text_14 = only_child(button_6, true);
      template_effect(
        ($0) => set_text(text_14, $0),
        [
          () =>
            get2(t)(
              get2(panel).tab === "preview"
                ? "Back to steps"
                : "Back to settings",
            ),
        ],
      );
      delegated("click", button_6, () =>
        get2(panel).navigate(
          get2(panel).tab === "preview" ? "routines" : "settings",
        ),
      );
      append($$anchor2, button_6);
    };
    if_block(node_7, ($$render) => {
      if (!get2(primary)) $$render(consequent_5);
    });
  }
  reset(div_5);
  var div_6 = sibling(div_5, 2);
  each(
    div_6,
    21,
    () => get2(panel).issues,
    index,
    ($$anchor2, issue) => {
      renderIssue(
        $$anchor2,
        () => get2(issue),
        () => get2(primary),
      );
    },
  );
  reset(div_6);
  var div_7 = sibling(div_6, 2);
  var node_8 = child(div_7);
  key(
    node_8,
    () => get2(panel).tab,
    ($$anchor2) => {
      var fragment_7 = comment();
      var node_9 = first_child(fragment_7);
      {
        const failed = ($$anchor3, error = noop) => {
          var fragment_8 = root_65();
          var p_2 = first_child(fragment_8);
          var text_15 = only_child(p_2, true);
          var p_3 = sibling(p_2, 2);
          var text_16 = only_child(p_3, true);
          template_effect(
            ($0, $1) => {
              set_text(text_15, $0);
              set_text(text_16, $1);
            },
            [
              () => errorMessage(error()),
              () =>
                get2(t)(
                  "This draft cannot be shown. Discard edits or import a corrected program from Settings.",
                ),
            ],
          );
          append($$anchor3, fragment_8);
        };
        boundary(node_9, { failed }, ($$anchor3) => {
          var fragment_9 = comment();
          var node_10 = first_child(fragment_9);
          {
            var consequent_7 = ($$anchor4) => {
              var fragment_10 = comment();
              var node_11 = first_child(fragment_10);
              {
                var consequent_6 = ($$anchor5) => {
                  var button_7 = root_212();
                  var text_17 = only_child(button_7, true);
                  template_effect(
                    ($0) => set_text(text_17, $0),
                    [() => get2(t)("Retry")],
                  );
                  delegated("click", button_7, () => get2(panel).retry());
                  append($$anchor5, button_7);
                };
                if_block(node_11, ($$render) => {
                  if (get2(panel).error && !get2(panel)._loading)
                    $$render(consequent_6);
                });
              }
              append($$anchor4, fragment_10);
            };
            var consequent_8 = ($$anchor4) => {
              StepEditor($$anchor4, {
                get panel() {
                  return get2(panel);
                },
                get revision() {
                  return get2(revision);
                },
              });
            };
            var consequent_9 = ($$anchor4) => {
              StepsView($$anchor4, {
                get panel() {
                  return get2(panel);
                },
                get revision() {
                  return get2(revision);
                },
              });
            };
            var consequent_10 = ($$anchor4) => {
              SettingsView($$anchor4, {
                get panel() {
                  return get2(panel);
                },
                get revision() {
                  return get2(revision);
                },
              });
            };
            var consequent_11 = ($$anchor4) => {
              OverviewView($$anchor4, {
                get panel() {
                  return get2(panel);
                },
                get revision() {
                  return get2(revision);
                },
              });
            };
            var consequent_12 = ($$anchor4) => {
              PreviewView($$anchor4, {
                get panel() {
                  return get2(panel);
                },
                get revision() {
                  return get2(revision);
                },
              });
            };
            var consequent_13 = ($$anchor4) => {
              ConfigurationView($$anchor4, {
                get panel() {
                  return get2(panel);
                },
                get revision() {
                  return get2(revision);
                },
              });
            };
            var consequent_14 = ($$anchor4) => {
              DiagnosticsView($$anchor4, {
                get panel() {
                  return get2(panel);
                },
                get revision() {
                  return get2(revision);
                },
              });
            };
            var consequent_15 = ($$anchor4) => {
              TimelineView($$anchor4, {
                get panel() {
                  return get2(panel);
                },
                get revision() {
                  return get2(panel).viewRevision;
                },
              });
            };
            if_block(node_10, ($$render) => {
              if (!get2(panel).draft) $$render(consequent_7);
              else if (
                get2(panel).stepEditor &&
                !get2(panel).stepEditor.existing
              )
                $$render(consequent_8, 1);
              else if (get2(panel).tab === "routines")
                $$render(consequent_9, 2);
              else if (get2(panel).tab === "settings")
                $$render(consequent_10, 3);
              else if (get2(panel).tab === "overview")
                $$render(consequent_11, 4);
              else if (get2(panel).tab === "preview")
                $$render(consequent_12, 5);
              else if (get2(panel).tab === "configuration")
                $$render(consequent_13, 6);
              else if (get2(panel).tab === "diagnostics")
                $$render(consequent_14, 7);
              else if (get2(panel).tab === "timeline")
                $$render(consequent_15, 8);
            });
          }
          append($$anchor3, fragment_9);
        });
      }
      append($$anchor2, fragment_7);
    },
  );
  reset(div_7);
  reset(main);
  template_effect(
    ($0) => {
      set_text(text_10, $0);
      set_attribute2(div_3, "hidden", !get2(notices));
      set_text(text_11, get2(notices));
      set_attribute2(div_4, "hidden", !get2(panel).error);
      set_text(text_12, get2(panel).error);
    },
    [() => get2(panel).draft?.name || get2(t)("Loading household\u2026")],
  );
  append($$anchor, main);
  pop();
  $$cleanup();
}
delegate(["click"]);

// custom_components/occupied/frontend/ha-controls.ts
async function loadHaControls() {
  if (
    customElements.get("ha-selector") &&
    customElements.get("ha-generic-picker")
  )
    return;
  await customElements.whenDefined("partial-panel-resolver");
  const resolver = document.createElement("partial-panel-resolver");
  await resolver
    ._getRoutes([{ url_path: "config", component_name: "config" }])
    .routes.config.load();
  await customElements.whenDefined("ha-panel-config");
  const config = document.createElement("ha-panel-config");
  await config.routerOptions.routes.automation.load();
  await Promise.all([
    customElements.whenDefined("ha-selector"),
    customElements.whenDefined("ha-generic-picker"),
  ]);
}

// custom_components/occupied/frontend/occupied-panel.ts
var OccupiedPanel = class extends HTMLElement {
  // Program state
  draft;
  saved;
  document;
  status;
  catalog = { entities: [], services: {} };
  revision = "";
  stale = false;
  dirty = false;
  // Draft edits bump version; validatedVersion records the last valid one.
  version = 0;
  validatedVersion = -1;
  issues = [];
  error = "";
  busy = false;
  // Incremented on reload/disconnect so late responses are discarded.
  epoch = 0;
  // View state
  tab = "routines";
  t = translator("en");
  stepEditor = null;
  selectedStep = null;
  actual;
  timelineDate = "";
  preview;
  previewProgram;
  previewVersion;
  previewSettings = {
    date: "",
    days: 7,
    seed: "preview-1",
    at: "",
  };
  sourcePath;
  yaml = "";
  includeSensitive = false;
  diagnostics;
  _hass;
  _loading = false;
  _panel;
  _loadedEntry = null;
  _timer;
  _timelineTimer = null;
  _timelineLoading = false;
  _subscriptionEpoch = 0;
  _unsubscribe = null;
  _subscribing = false;
  viewRevision = 0;
  updates = writable(0);
  updateRevision = 0;
  component;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  set hass(value) {
    const changed = this._hass?.connection !== value?.connection;
    this._hass = value;
    this.t = translator(value?.language);
    for (const selector of this.shadowRoot.querySelectorAll(
      "ha-selector,ha-generic-picker",
    ))
      selector.hass = value;
    if (changed) {
      this._disposeSubscription();
      this._subscribe();
    }
    this._load();
  }
  set panel(value) {
    this._panel = value;
    this._load();
  }
  set narrow(value) {
    this.toggleAttribute("narrow", !!value);
  }
  connectedCallback() {
    if (!this.component) {
      const style = document.createElement("style");
      style.textContent = styles;
      this.shadowRoot.append(style);
      this.component = mount(App, {
        target: this.shadowRoot,
        props: { panel: this, updates: this.updates },
      });
      this.flush();
    }
    this._load();
    window.addEventListener("beforeunload", this._beforeUnload);
    this._timer = setInterval(() => {
      for (const bar of this.shadowRoot.querySelectorAll(
        "progress[data-start]",
      ))
        bar.value = progress(bar.dataset.start, bar.dataset.deadline);
    }, 1e3);
  }
  disconnectedCallback() {
    if (this.component) {
      void unmount(this.component);
      this.component = void 0;
    }
    this.shadowRoot.replaceChildren();
    this.epoch++;
    this._loadedEntry = null;
    this._loading = false;
    this._disposeSubscription();
    clearInterval(this._timer);
    if (this._timelineTimer) clearTimeout(this._timelineTimer);
    window.removeEventListener("beforeunload", this._beforeUnload);
  }
  _beforeUnload = (event2) => {
    if (this.dirty || this.stepEditor?.changed) {
      event2.preventDefault();
      event2.returnValue = "";
    }
  };
  // --- Backend connection -------------------------------------------------
  ws(type, data = {}) {
    return this._hass.callWS({
      type: `occupied/${type}`,
      config_entry_id: this._loadedEntry,
      ...data,
    });
  }
  _disposeSubscription() {
    this._subscriptionEpoch++;
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._subscribing = false;
  }
  async _subscribe() {
    if (
      !this.isConnected ||
      !this._loadedEntry ||
      !this._hass?.connection ||
      this._unsubscribe ||
      this._subscribing
    )
      return;
    this._subscribing = true;
    const epoch = this._subscriptionEpoch;
    try {
      const unsubscribe = await this._hass.connection.subscribeMessage(
        (snapshot2) => {
          if (epoch === this._subscriptionEpoch && this.isConnected)
            this._onSnapshot(snapshot2);
        },
        { type: "occupied/subscribe", config_entry_id: this._loadedEntry },
      );
      if (epoch !== this._subscriptionEpoch || !this.isConnected) unsubscribe();
      else this._unsubscribe = unsubscribe;
    } catch (error) {
      if (epoch === this._subscriptionEpoch) this.fail(error);
    } finally {
      if (epoch === this._subscriptionEpoch) this._subscribing = false;
    }
  }
  _onSnapshot(snapshot2) {
    this.status = snapshot2;
    if (snapshot2.configuration_source && this.document) {
      this.document.configuration_source = snapshot2.configuration_source;
      this.document.source = snapshot2.configuration_source.mode;
    }
    this.stale = !!(
      snapshot2.source_revision &&
      this.revision &&
      snapshot2.source_revision !== this.revision
    );
    this.flush();
    if (this.tab === "timeline" && !this._timelineTimer)
      this._timelineTimer = setTimeout(() => {
        this._timelineTimer = null;
        this.loadTimeline();
      }, 1e3);
    if (this.stale && !this.dirty && !this.busy && !this.stepEditor)
      this.reloadSaved();
  }
  async _load() {
    const entry = this._panel?.config?.config_entry_id;
    if (
      !this.isConnected ||
      !this._hass ||
      !entry ||
      this._loading ||
      this._loadedEntry === entry
    )
      return;
    this._loading = true;
    this._disposeSubscription();
    const epoch = ++this.epoch;
    this._loadedEntry = entry;
    try {
      const [doc, catalog, status] = await Promise.all([
        this.ws("program"),
        this.ws("catalog"),
        this.ws("status"),
        loadHaControls(),
      ]);
      if (epoch !== this.epoch) return;
      this.adopt(doc);
      this.resetDraft();
      this.catalog = catalog;
      this.status = status;
      this.previewSettings.date = doc.simulation_date;
      this.error = "";
      this.renderView();
      this._subscribe();
    } catch (error) {
      if (epoch === this.epoch) {
        this._loadedEntry = null;
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) this._loading = false;
    }
  }
  // --- Rendering ----------------------------------------------------------
  /** Commit Svelte updates before callers focus a newly rendered field. */
  flush() {
    if (this.component)
      flushSync(() => this.updates.set(++this.updateRevision));
  }
  renderView() {
    this.viewRevision++;
    if (this.tab === "timeline") void this.loadTimeline();
    this.flush();
  }
  navigate(tab) {
    if (this.stepEditor) return;
    this.tab = tab;
    this.renderView();
  }
  retry() {
    void this._load();
  }
  notices() {
    const t = this.t;
    return [
      this.stale
        ? t(
            "The saved program changed. Your draft is preserved; reload the saved program before saving.",
          )
        : this.dirty && !this.stepEditor
          ? t("Unsaved edits")
          : "",
      this.document?.source === "file"
        ? t(
            "Managed file is authoritative. Export draft changes to your file, then reload.",
          )
        : "",
      this.document?.configuration_source?.status === "error"
        ? t("File error: see Configuration or Home Assistant Repairs")
        : "",
      this.previewVersion != null &&
      this.previewVersion !== this.version &&
      this.tab === "preview"
        ? t("Preview belongs to an earlier draft")
        : "",
    ]
      .filter(Boolean)
      .join(" \xB7 ");
  }
  // --- Draft editing ------------------------------------------------------
  /** Record the saved program from a backend document. */
  adopt(doc) {
    this.document = doc;
    this.saved = doc.program;
    this.revision = doc.revision;
    this.stale = false;
  }
  /** Replace the draft with the saved program, dropping local edits. */
  resetDraft() {
    this.draft = copy(this.saved);
    this.dirty = !!this.document.needs_apply;
    this.version++;
    this.validatedVersion = -1;
    this.issues = [];
  }
  discardEdits() {
    this.resetDraft();
    this.error = "";
    this.renderView();
  }
  change(path, value, rerender = false) {
    if (!path.length) this.draft = value;
    else set(this.draft, path, value);
    this.edited(rerender);
  }
  edited(rerender = false) {
    this.version++;
    this.dirty = true;
    this.validatedVersion = -1;
    if (rerender) this.renderView();
    else this.flush();
  }
  fail(error) {
    this.error = errorMessage(error);
    this.flush();
  }
  attempt(action2) {
    try {
      action2();
    } catch (error) {
      this.fail(error);
    }
  }
  /** Run one backend action at a time; failures are shown, not thrown. */
  async run(action2) {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    this.flush();
    const epoch = this.epoch;
    try {
      return await action2(epoch);
    } catch (error) {
      if (epoch === this.epoch) {
        if (isRevisionConflict(error)) this.stale = true;
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this.busy = false;
        this.flush();
      }
    }
  }
  showIssues(result) {
    this.issues = result.issues || [];
    this.flush();
    if (result.valid === false && !this.issues.length)
      this.fail(
        this.t("Preview contains infeasible dates. Review timeline issues."),
      );
  }
  /** Show a backend issue on the step editor field it belongs to. */
  focusIssue(issue) {
    const editor = this.stepEditor;
    if (!editor) return;
    const path = issue.model_path || [],
      prefix = editor.candidatePath || [];
    if (!prefix.length || !prefix.every((key2, i) => path[i] === key2)) {
      this.fail(
        this.t(
          "Finish or cancel this step to edit other configuration issues.",
        ),
      );
      return;
    }
    const field = editorField(path.slice(prefix.length), editor.form);
    editor.errors[field] = issue.message;
    editor.stage = editorStage(field);
    this.renderView();
    this.shadowRoot
      .querySelector('.routine-editor [aria-invalid="true"]')
      ?.focus();
  }
  // --- Backend actions ----------------------------------------------------
  validate() {
    const version = this.version,
      draft = copy(this.draft);
    return this.run(async (epoch) => {
      const result = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch || version !== this.version) return;
      this.showIssues(result);
      if (result.valid) this.validatedVersion = version;
    });
  }
  save(candidate) {
    if (this.document?.source === "file" || this.stale) return;
    const version = this.version,
      draft = copy(candidate || this.draft),
      expected = this.revision,
      editor = this.stepEditor,
      submittedForm = editor ? copy(editor.form) : null;
    return this.run(async (epoch) => {
      const validation = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch) return;
      if (version !== this.version) {
        this.fail(
          this.t(
            "Your changes are kept. Save again to include the latest edits.",
          ),
        );
        return;
      }
      this.showIssues(validation);
      if (!validation.valid) {
        if (editor && this.issues.length)
          this.focusIssue(
            this.issues.find((i) => i.severity !== "warning") || this.issues[0],
          );
        return;
      }
      this.validatedVersion = version;
      const result = await this.ws("save", {
        program: draft,
        expected_revision: expected,
      });
      if (epoch !== this.epoch) return;
      if (!result.valid) return this.showIssues(result);
      this.adopt({ ...this.document, ...result, needs_apply: false });
      if (editor && this.stepEditor === editor) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.selectedStep = editor.id;
        editor.existing = true;
        editor.original = submittedForm;
        if (version !== this.version) {
          this.fail(
            this.t("Earlier changes saved. Your newer edits are still open."),
          );
          return;
        }
        this.stepEditor = null;
      }
      if (version === this.version) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.renderView();
        if (editor)
          this.shadowRoot
            .getElementById(`step-card-${editor.id}`)
            ?.focus({ preventScroll: true });
      } else this.dirty = true;
    });
  }
  async reloadSaved(discard = false) {
    if (this.busy || ((this.dirty || this.stepEditor) && !discard)) return;
    const version = this.version;
    return this.run(async (epoch) => {
      const doc = await this.ws("program");
      if (epoch !== this.epoch || version !== this.version) return;
      this.adopt(doc);
      this.resetDraft();
      this.stepEditor = null;
      this.renderView();
    });
  }
  control(service, data = {}) {
    return this.run(async () => {
      await this._hass.callService("occupied", service, {
        config_entry_id: this._loadedEntry,
        ...data,
      });
      this.status = await this.ws("status");
    });
  }
  async loadTimeline() {
    if (this._timelineLoading) return;
    this._timelineLoading = true;
    const epoch = this.epoch;
    try {
      const doc = await this.ws(
        "timeline",
        this.timelineDate ? { date: this.timelineDate } : {},
      );
      if (epoch !== this.epoch) return;
      this.actual = doc;
      if (this.tab === "timeline") {
        this.viewRevision++;
        this.flush();
      }
    } catch (error) {
      if (epoch === this.epoch) this.fail(error);
    } finally {
      this._timelineLoading = false;
    }
  }
  runPreview() {
    const version = this.version,
      draft = copy(this.draft),
      options = { ...this.previewSettings };
    if (!options.at) delete options.at;
    return this.run(async (epoch) => {
      const result = await this.ws("preview", { program: draft, ...options });
      if (epoch !== this.epoch) return;
      this.preview = result;
      this.previewVersion = version;
      this.previewProgram = draft;
      this.showIssues(result);
    });
  }
  loadDiagnostics() {
    return this.run(async (epoch) => {
      const result = await this.ws("diagnostics", {
        include_sensitive: this.includeSensitive,
      });
      if (epoch === this.epoch) this.diagnostics = result;
    });
  }
  selectSource(source2, config_file) {
    return this.run(async (epoch) => {
      const result = await this.ws("source", {
        source: source2,
        ...(config_file ? { config_file } : {}),
        expected_revision: this.revision,
      });
      if (epoch !== this.epoch) return;
      if (!result.valid) return this.showIssues(result);
      this.adopt({ ...this.document, ...result });
      this.validatedVersion = -1;
      if (!this.dirty) this.draft = copy(result.program);
      this.renderView();
    });
  }
  reloadManaged() {
    return this.run(async (epoch) => {
      const result = await this.ws("reload");
      const doc = await this.ws("program");
      if (epoch !== this.epoch) return;
      this.document = doc;
      this.saved = doc.program;
      this.stale = doc.revision !== this.revision;
      if (!this.dirty) {
        this.revision = doc.revision;
        this.draft = copy(doc.program);
        this.stale = false;
      }
      if (!result.valid) this.showIssues(result);
      this.renderView();
    });
  }
  importYaml() {
    const version = this.version;
    return this.run(async (epoch) => {
      const result = await this.ws("validate", { program: this.yaml });
      if (epoch !== this.epoch || version !== this.version) return;
      this.showIssues(result);
      if (result.valid) {
        this.draft = result.program;
        this.edited(true);
      }
    });
  }
  exportYaml() {
    return this.run(async (epoch) => {
      const result = await this.ws("export", { program: copy(this.draft) });
      if (epoch !== this.epoch) return;
      this.showIssues(result);
      if (result.valid) this.yaml = result.yaml;
    });
  }
};
function isRevisionConflict(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "revision_conflict"
  );
}
function editorField(tail, form) {
  const has = (key2) => tail.includes(key2),
    head2 = tail[0];
  if (head2 === "name" || head2 === "days") return head2;
  if (head2 === "actions") {
    if (has("targets")) return "entities";
    if (form.kind === "service") return has("data") ? "data" : "service";
    return form.kind === "scene" ? "entities" : "brightness";
  }
  if (has("relative_to") || has("sun")) return "anchor";
  if (has("fallback")) return "fallback";
  if (form.timing.mode === "absolute") return has("latest") ? "end" : "start";
  return has("max") ? "endOffset" : "startOffset";
}
function editorStage(field) {
  if (field === "entities") return 1;
  return ["name", "brightness", "service", "data"].includes(field) ? 2 : 0;
}
if (!customElements.get("occupied-panel"))
  customElements.define("occupied-panel", OccupiedPanel);
export { OccupiedPanel };
