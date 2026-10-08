import type { OccupiedPanel } from "./occupied-panel.js";
import type {
  StepEntry,
  Translate,
  Attributes,
  FieldOptions,
  HaSelector,
  SourcePickerState,
} from "./types.js";
import { required } from "./types.js";
import { sourcePicker } from "./source-picker.js";
import { button, el, section, details } from "./forms.js";
import { copy, days, duplicate, removeResource } from "./model.js";
import {
  stepEntries,
  simpleStep,
  stepEditor,
  editorErrors,
  offsetErrors,
  buildStep,
  dependentNames,
  timingSummary,
  timingExplanation,
  timeSourceChoices,
} from "./step-model.js";

export function startStep(
  panel: OccupiedPanel,
  entry?: StepEntry | null,
  parent?: StepEntry,
) {
  panel.stepEditor = stepEditor(panel.draft, entry, parent);
  panel.tab = "routines";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel);
}
function focusEditor(panel: OccupiedPanel) {
  const root = panel.shadowRoot;
  const target =
    root.querySelector<HTMLElement>('.routine-editor [aria-invalid="true"]') ||
    root.querySelector<HTMLElement>(".routine-editor h2");
  target?.focus();
}
function entityName(panel: OccupiedPanel, id: string) {
  return panel.catalog.entities.find((e) => e.entity_id === id)?.name || id;
}
function actionSummary(entry: StepEntry, t: Translate) {
  const action = entry.actions?.[0]?.action || "";
  if (action === "scene.turn_on") return t("Activate scene");
  if (simpleStep(entry)) {
    if (/^(?:(?:light|switch)\.)?turn_(on|off)$/.test(action))
      return t(action.endsWith("turn_off") ? "Turn off" : "Turn on");
    return action;
  }
  return t("Custom actions");
}
function daySummary(selected: string[], t: Translate) {
  if (selected.length === 7) return t("Every day");
  if (selected.join() === days.slice(0, 5).join()) return t("Weekdays");
  if (selected.join() === days.slice(5).join()) return t("Weekends");
  return selected.map((d) => t(d)).join(", ");
}
function advancedStep(panel: OccupiedPanel, entry: StepEntry) {
  panel.tab = "advanced_routines";
  panel.selection.set('["routines"]', entry.path[1]);
  panel.selection.set(JSON.stringify(entry.path.slice(0, 3)), entry.path[3]);
  panel.renderView();
}
function confirmDeleteStep(
  panel: OccupiedPanel,
  entry: StepEntry,
  trigger: HTMLButtonElement,
) {
  const t = panel.t;
  const dialog = el("dialog", null, {
    class: "step-delete-dialog",
    "aria-labelledby": "step-delete-title",
    "aria-describedby": "step-delete-description",
  });
  dialog.append(el("h2", t("Delete step?"), { id: "step-delete-title" }));
  const description = el("div", null, { id: "step-delete-description" });
  description.append(el("p", entry.name));
  const dependents = dependentNames(panel.draft, entry.id);
  if (dependents.length) {
    description.append(el("p", `${t("Used by")}:`));
    const list = el("ul");
    for (const name of dependents) list.append(el("li", name));
    description.append(
      list,
      el("p", t("Change those relationships before deleting."), {
        class: "hint",
      }),
    );
  } else {
    description.append(
      el("p", t("This step will be removed when you save changes."), {
        class: "hint",
      }),
    );
  }
  dialog.append(description);
  const actions = el("div", null, { class: "step-delete-actions" });
  const cancel = button(t("Cancel"), () => dialog.close());
  const confirm = button(
    t("Delete step"),
    () =>
      panel.attempt(() => {
        const current = stepEntries(panel.draft).find(
          (step) => step.id === entry.id,
        );
        if (!current) return dialog.close();
        const next = copy(panel.draft);
        removeResource(next, current.path);
        dialog.close();
        panel.selectedStep = null;
        panel.change([], next);
        panel.renderView();
      }),
    { class: "danger" },
  );
  confirm.disabled = dependents.length > 0;
  actions.append(cancel, confirm);
  dialog.append(actions);
  dialog.addEventListener(
    "close",
    () => {
      dialog.remove();
      if (trigger.isConnected) trigger.focus();
    },
    { once: true },
  );
  panel.shadowRoot.append(dialog);
  dialog.showModal();
  cancel.focus();
}
function stepMenu(panel: OccupiedPanel, row: HTMLElement, entry: StepEntry) {
  const t = panel.t;
  const menu = el("div", null, {
    id: `step-actions-${entry.id}`,
    class: "step-menu",
    role: "menu",
    "aria-label": `${t("More options")}: ${entry.name}`,
    hidden: "",
  });
  const native = typeof menu.showPopover === "function";
  if (native) menu.setAttribute("popover", "auto");
  const trigger = button(
    "⋮",
    () => {
      if (trigger.getAttribute("aria-expanded") === "true") {
        close();
        return;
      }
      panel.selectedStep = entry.id;
      for (const other of panel.shadowRoot.querySelectorAll<HTMLElement>(
        ".step-menu",
      ))
        if (other !== menu && !other.hidden) {
          if (native && other.matches(":popover-open")) other.hidePopover();
          other.hidden = true;
          other.previousElementSibling?.setAttribute("aria-expanded", "false");
        }
      menu.hidden = false;
      if (native) menu.showPopover();
      const rect = trigger.getBoundingClientRect();
      menu.style.left = `${Math.max(12, Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 12))}px`;
      menu.style.top = `${Math.max(12, Math.min(rect.bottom + 6, innerHeight - menu.offsetHeight - 12))}px`;
      trigger.setAttribute("aria-expanded", "true");
      menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    },
    {
      class: "step-menu-trigger",
      "data-step-menu": entry.id,
      "aria-label": `${t("More options")}: ${entry.name}`,
      "aria-haspopup": "menu",
      "aria-expanded": "false",
      "aria-controls": menu.id,
    },
  );
  function close() {
    if (native && menu.matches(":popover-open")) menu.hidePopover();
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }
  menu.addEventListener("toggle", (event) => {
    if (event.newState === "closed") {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
  });
  menu.addEventListener("keydown", (event) => {
    const buttons = [
      ...menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    ];
    const current = buttons.indexOf(
      panel.shadowRoot.activeElement as HTMLButtonElement,
    );
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (current +
                (event.key === "ArrowDown" ? 1 : -1) +
                buttons.length) %
              buttons.length;
      buttons[next]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
      trigger.focus();
    } else if (event.key === "Tab") {
      close();
      trigger.focus();
    }
  });
  const action = (
    label: string,
    run: () => unknown,
    attrs: Attributes = {},
  ) => {
    const item = button(
      t(label),
      () => {
        close();
        run();
      },
      { role: "menuitem", ...attrs },
    );
    menu.append(item);
    return item;
  };
  action(simpleStep(entry) ? "Edit step" : "Edit in Advanced settings", () =>
    simpleStep(entry) ? startStep(panel, entry) : advancedStep(panel, entry),
  );
  if (entry.kind === "steps")
    action("Add related step", () => startStep(panel, null, entry));
  menu.append(el("hr", null, { role: "separator" }));
  action("Duplicate", () => {
    const next = copy(panel.draft),
      item = duplicate(next, entry.path);
    panel.selectedStep = item.id;
    panel.change([], next);
    panel.renderView();
  });
  action("Delete", () => confirmDeleteStep(panel, entry, trigger), {
    class: "danger",
  });
  if (simpleStep(entry))
    action("Advanced settings", () => advancedStep(panel, entry));
  row.append(trigger, menu);
}

export function renderSteps(panel: OccupiedPanel, root: HTMLElement) {
  if (panel.stepEditor) return renderEditor(panel, root);
  const t = panel.t,
    entries = stepEntries(panel.draft);
  const heading = el("div", null, { class: "page-heading" });
  const title = el("div");
  title.append(
    el("h2", t("Your steps")),
    el("p", t("Choose what happens, when it happens, and what follows."), {
      class: "hint",
    }),
  );
  heading.append(title);
  if (entries.length)
    heading.append(
      button(t("Create step"), () => startStep(panel), {
        class: "primary",
        "data-create-routine": "",
      }),
    );
  root.append(heading);
  if (!entries.length) {
    const empty = section(root, t("A little activity. A lived-in home."));
    empty.className = "routine-empty";
    empty.append(
      el(
        "p",
        t(
          "Start with an entity action or a scene, then add whatever should happen next.",
        ),
        { class: "hint" },
      ),
      el(
        "p",
        t("1. Set timing   →   2. Select entities   →   3. Choose an action"),
        { class: "empty-steps" },
      ),
      button(t("Create your first step"), () => startStep(panel), {
        class: "primary",
        "data-create-routine": "",
      }),
    );
    return;
  }
  const layout = el("div", null, { class: "routine-layout" }),
    list = el("div", null, {
      class: "routine-list",
      "aria-label": t("Your steps"),
    });
  // Keep related items adjacent without depending on saved list order. The seen
  // set also makes malformed imported drafts safe to inspect.
  const seen = new Set(),
    ordered: { entry: StepEntry; depth: number }[] = [];
  function append(entry: StepEntry, depth: number) {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    ordered.push({ entry, depth });
    entries
      .filter((e) => e.when?.relative_to === entry.id)
      .forEach((e) => append(e, depth + 1));
  }
  entries
    .filter(
      (e) =>
        !e.when?.relative_to ||
        !entries.some((p) => p.id === e.when?.relative_to),
    )
    .forEach((e) => append(e, 0));
  entries.forEach((e) => append(e, 0));
  for (const { entry, depth } of ordered) {
    const row = el("div", null, {
      class: "routine-row",
      role: "group",
      "aria-label": entry.name,
      "data-routine-id": entry.id,
    });
    row.style.setProperty("--depth", String(Math.min(depth, 3)));
    const content = el("span", null, { class: "routine-row-content" });
    content.append(
      el("strong", entry.name),
      el(
        "span",
        `${actionSummary(entry, t)} · ${entry.entities.map((id) => entityName(panel, id)).join(", ")}`,
        { class: "hint" },
      ),
    );
    const timing = el("span", null, { class: "routine-row-time" });
    timing.append(
      el("span", timingSummary(entry, entries, t, panel.catalog.time_sources)),
      el("small", daySummary(entry.days, t)),
    );
    row.append(
      el(
        "span",
        entry.kind !== "steps"
          ? "◷"
          : entry.actions?.every((a) => a.action.endsWith("turn_off"))
            ? "○"
            : "●",
        { class: "routine-symbol", "aria-hidden": "true" },
      ),
      content,
      timing,
    );
    stepMenu(panel, row, entry);
    list.append(row);
  }
  layout.append(list);
  root.append(layout);
  root.append(
    button(
      t("Preview schedule"),
      () => {
        panel.tab = "preview";
        panel.renderView();
        panel.runPreview();
      },
      { class: "text-button" },
    ),
  );
}

function renderEditor(panel: OccupiedPanel, root: HTMLElement) {
  const editor = panel.stepEditor!,
    form = editor.form,
    t = panel.t,
    // `existing` controls the title and is the source of truth for edit mode.
    // Keeping a second `editing` flag can make a mixed or restored editor state
    // show the create wizard inside an edit flow.
    editing = editor.existing;
  const shell = section(root, t(editor.existing ? "Edit step" : "Create step"));
  shell.className = editing ? "routine-editor editing" : "routine-editor";
  required(shell.querySelector<HTMLElement>("h2")).tabIndex = -1;
  const steps = el("ol", null, {
    class: "builder-steps",
    "aria-label": t("Step setup"),
  });
  ["Timing", "Entities", "Action"].forEach((label, i) =>
    steps.append(
      el("li", `${i + 1}. ${t(label)}`, {
        "aria-current": i === editor.stage ? "step" : "false",
        class: i < editor.stage ? "complete" : "",
      }),
    ),
  );
  if (!editing) shell.append(steps);
  const sections = el("div", null, { class: "editor-sections" });
  shell.append(sections);
  const changed = (key: string) => {
    editor.changed = true;
    panel.version++;
    panel.validatedVersion = -1;
    delete editor.errors[key];
    shell.querySelector<HTMLElement>(`[data-builder-error="${key}"]`)?.remove();
    shell
      .querySelector<HTMLElement>(`[data-builder-field="${key}"]`)
      ?.removeAttribute("aria-invalid");
    panel.toolbar();
    if (["startOffset", "endOffset"].includes(key)) validateOffsets();
    const explanation = shell.querySelector<HTMLElement>(
      "[data-timing-explanation]",
    );
    if (explanation)
      explanation.textContent = timingExplanation(
        form.timing,
        stepEntries(panel.draft),
        t,
        panel.catalog.time_sources,
      );
  };
  const rerender = (key?: string) => {
    panel.renderView();
    if (key)
      panel.shadowRoot
        .querySelector<HTMLElement>(`[data-builder-field="${key}"]`)
        ?.focus();
    else focusEditor(panel);
  };
  const error = (parent: HTMLElement, key: string) => {
    if (editor.errors[key])
      parent.append(
        el("p", editor.errors[key], {
          class: "error",
          id: `routine-error-${key}`,
          "data-builder-error": key,
          role: "alert",
        }),
      );
  };
  const validateOffsets = () => {
    const errors = offsetErrors(form.timing);
    for (const key of ["startOffset", "endOffset"]) {
      const input = shell.querySelector<HTMLInputElement>(
        `[data-builder-field="${key}"]`,
      );
      if (!input) continue;
      const message = errors[key];
      shell
        .querySelector<HTMLElement>(`[data-builder-error="${key}"]`)
        ?.remove();
      input.setCustomValidity(message || "");
      if (message) {
        editor.errors[key] = message;
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", `routine-error-${key}`);
        error(required(input.closest<HTMLElement>(".field")), key);
      } else {
        delete editor.errors[key];
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    }
  };
  const field = (
    parent: HTMLElement,
    key: string,
    label: string,
    value: string | number,
    update: (value: string) => void,
    options: FieldOptions & { render?: boolean } = {},
  ) => {
    const box = el("div", null, { class: "field" }),
      id = `routine-${key}`;
    // The selector wrapper alone may be registered while its time picker is
    // unavailable. Keep a usable browser control until the full picker is loaded.
    const nativeTime =
      options.type === "time" &&
      customElements.get("ha-selector") &&
      customElements.get("ha-selector-time") &&
      customElements.get("ha-time-input");
    if (!nativeTime) box.append(el("label", t(label), { for: id }));
    const input = el(
      nativeTime
        ? "ha-selector"
        : options.choices
          ? "select"
          : options.multiline
            ? "textarea"
            : "input",
      null,
      {
        id,
        type: options.type || "text",
        "data-builder-field": key,
        min: options.min,
        max: options.max,
        step: options.step,
        placeholder: options.placeholder,
      },
    );
    for (const [v, name] of options.choices || [])
      input.append(el("option", t(String(name)), { value: String(v) }));
    input.value = String(value);
    if (nativeTime) {
      const selector = input as HaSelector;
      selector.hass = panel._hass;
      selector.selector = { time: {} };
      selector.label = t(label);
      selector.required = !options.optional;
      selector.value = value || undefined;
      selector.setAttribute("aria-label", t(label));
      selector.tabIndex = 0;
    }
    if (editor.errors[key]) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", `routine-error-${key}`);
    }
    input.addEventListener(
      nativeTime ? "value-changed" : options.choices ? "change" : "input",
      (event) => {
        if (nativeTime) {
          if (
            !(event instanceof CustomEvent) ||
            !event.detail ||
            !("value" in event.detail)
          )
            return;
          input.value = event.detail.value || "";
        }
        update(String(input.value ?? ""));
        changed(key);
        if (options.render) rerender(key);
      },
    );
    if (["startOffset", "endOffset"].includes(key)) {
      input.addEventListener("blur", validateOffsets);
      (input as HTMLInputElement).setCustomValidity(editor.errors[key] || "");
    }
    box.append(input);
    error(box, key);
    parent.append(box);
    return input;
  };
  if (editing || editor.stage === 0) {
    const nameSection = el("div", null, { class: "step-name-editor" });
    shell.insertBefore(nameSection, sections);
    field(
      nameSection,
      "name",
      "Step name",
      form.name,
      (v) => {
        form.name = v;
      },
      {
        placeholder: editing
          ? undefined
          : t("Optional, leave blank for auto-generated"),
      },
    );
  }
  if (editing || editor.stage === 1) {
    const entitySection = el("div", null, {
      "data-editor-section": "entities",
    });
    sections.append(entitySection);
    field(
      entitySection,
      "kind",
      "Step type",
      form.kind,
      (v) => {
        form.kind = v;
        form.entities = [];
        changed("entities");
      },
      {
        choices: [
          ["entities", "Lights and switches"],
          ["service", "Entity service action"],
          ["scene", "Home Assistant scene"],
        ],
        render: true,
      },
    );
    entitySection.append(
      el("h3", t(editing ? "Entities" : "Which entities should take part?")),
      el(
        "p",
        t(
          form.kind === "scene"
            ? "Select a scene to activate."
            : "Select one or more entities. Search by name or room.",
        ),
        { class: "hint" },
      ),
    );
    const count = el("p", "", {
      class: "selection-count",
      "aria-live": "polite",
    });
    count.textContent = `${form.entities.length} ${t("selected")}`;
    if (customElements.get("ha-selector")) {
      const selector = el("ha-selector", null, {
        class: "entity-native-selector",
        "data-builder-field": "entities",
        "aria-label": t("Entities"),
      });
      selector.hass = panel._hass;
      selector.selector = {
        entity: {
          multiple: form.kind !== "scene",
          ...(form.kind === "service"
            ? {}
            : {
                filter: {
                  domain:
                    form.kind === "scene" ? ["scene"] : ["light", "switch"],
                },
              }),
        },
      };
      selector.value =
        form.kind === "scene" ? form.entities[0] || "" : [...form.entities];
      selector.label = t("Entities");
      selector.required = true;
      selector.narrow = panel.hasAttribute("narrow");
      if (editor.errors.entities) selector.setAttribute("aria-invalid", "true");
      selector.addEventListener("value-changed", (event) => {
        if (
          !(event instanceof CustomEvent) ||
          !event.detail ||
          !("value" in event.detail)
        )
          return;
        selector.value = event.detail.value;
        form.entities = Array.isArray(event.detail.value)
          ? event.detail.value
          : event.detail.value
            ? [event.detail.value]
            : [];
        changed("entities");
        count.textContent = `${form.entities.length} ${t("selected")}`;
      });
      entitySection.append(count, selector);
    } else {
      const search = el("input", null, {
        type: "search",
        placeholder: t("Search entities or rooms"),
        "aria-label": t("Search entities or rooms"),
        class: "entity-search",
      });
      search.value = editor.search || "";
      const list = el("div", null, {
        class: "entity-picker",
        "data-builder-field": "entities",
        role: "group",
        "aria-label": t("Entities"),
        tabindex: -1,
      });
      if (editor.errors.entities) list.setAttribute("aria-invalid", "true");
      const draw = () => {
        count.textContent = `${form.entities.length} ${t("selected")}`;
        list.replaceChildren();
        const selected = new Set(form.entities);
        const catalog = panel.catalog.entities.filter(
          (e) =>
            form.kind === "service" ||
            (form.kind === "scene" ? /^scene\./ : /^(light|switch)\./).test(
              e.entity_id,
            ),
        );
        for (const id of form.entities)
          if (!catalog.some((e) => e.entity_id === id))
            catalog.push({ entity_id: id, name: id, state: "unavailable" });
        catalog.sort(
          (a, b) =>
            Number(selected.has(b.entity_id)) -
            Number(selected.has(a.entity_id)),
        );
        const query = search.value.toLowerCase();
        const filtered = catalog.filter((e) =>
          `${e.name} ${e.area || ""} ${e.entity_id}`
            .toLowerCase()
            .includes(query),
        );
        for (const entity of filtered) {
          const label = el("label", null, { class: "entity-option" });
          const check = el("input", null, {
            type: "checkbox",
            value: entity.entity_id,
          });
          check.checked = form.entities.includes(entity.entity_id);
          check.addEventListener("change", () => {
            form.entities = check.checked
              ? form.kind === "scene"
                ? [entity.entity_id]
                : [...new Set([...form.entities, entity.entity_id])]
              : form.entities.filter((e) => e !== entity.entity_id);
            changed("entities");
            count.textContent = `${form.entities.length} ${t("selected")}`;
            if (editing || form.kind === "scene") {
              const scrollTop = list.scrollTop;
              panel.renderView();
              const picker = required(
                panel.shadowRoot.querySelector<HTMLElement>(".entity-picker"),
              );
              picker.scrollTop = scrollTop;
              [...picker.querySelectorAll<HTMLInputElement>("input")]
                .find((input) => input.value === entity.entity_id)
                ?.focus({ preventScroll: true });
            }
          });
          const text = el("span");
          text.append(
            el("strong", entity.name || entity.entity_id),
            el(
              "small",
              [
                entity.area,
                entity.entity_id,
                entity.state === "unavailable" ? t("Unavailable") : "",
              ]
                .filter(Boolean)
                .join(" · "),
            ),
          );
          label.append(check, text);
          list.append(label);
        }
        if (!filtered.length)
          list.append(el("p", t("No matching entities."), { class: "hint" }));
      };
      search.addEventListener("input", () => {
        editor.search = search.value;
        draw();
      });
      draw();
      entitySection.append(search, count, list);
    }
    error(entitySection, "entities");
    if (
      form.kind === "entities" &&
      form.entities.some((e) => !/^(light|switch)\./.test(e))
    )
      entitySection.append(
        el(
          "p",
          t(
            "This selection includes a custom entity. Select lights or switches for this step.",
          ),
          { class: "hint" },
        ),
      );
  }
  if (editing || editor.stage === 2) {
    const actionSection = el("div", null, { "data-editor-section": "action" });
    sections.append(actionSection);
    actionSection.append(
      el("h3", t(editing ? "Action" : "What should happen?")),
      el("p", form.entities.map((id) => entityName(panel, id)).join(", "), {
        class: "hint",
      }),
    );
    if (form.kind === "scene")
      actionSection.append(el("p", t("Activate scene")));
    else if (form.kind === "service") {
      field(
        actionSection,
        "service",
        "Service (domain.service)",
        form.service,
        (v) => {
          form.service = v;
        },
      );
      field(
        actionSection,
        "data",
        "Service data (JSON)",
        form.data,
        (v) => {
          form.data = v;
        },
        { multiline: true },
      );
    } else
      field(
        actionSection,
        "action",
        "Action",
        form.action,
        (v) => {
          form.action = v;
        },
        {
          choices: [
            ["turn_on", "Turn on"],
            ["turn_off", "Turn off"],
          ],
          render: true,
        },
      );
    if (
      form.kind === "entities" &&
      form.action === "turn_on" &&
      form.entities.some(
        (id) =>
          panel.catalog.entities.find((e) => e.entity_id === id)?.dimmable,
      )
    ) {
      field(
        actionSection,
        "brightness",
        "Brightness (%)",
        form.brightness,
        (v) => {
          form.brightness = v;
        },
        { type: "number", min: 1, max: 100 },
      );
      actionSection.append(
        el(
          "p",
          t(
            "Leave blank to use the default brightness. Applies to dimmable lights.",
          ),
          { class: "hint" },
        ),
      );
    }
  }
  if (editing || editor.stage === 0) {
    const timingSection = el("div", null, { "data-editor-section": "time" });
    sections.prepend(timingSection);
    const time = form.timing;
    timingSection.append(
      el("h3", t(editing ? "Timing" : "When should it happen?")),
    );
    const timingOptions = el("fieldset", null, { class: "timing-options" });
    timingOptions.append(el("legend", t("Timing")));
    const choices = el("div", null, { class: "timing-option-row" });
    for (const [value, label] of [
      ["absolute", "Absolute time"],
      ["relative", "Relative to"],
    ]) {
      const option = el("label", null, { class: "timing-option" });
      const radio = el("input", null, {
        type: "radio",
        name: "step-timing-mode",
        value,
        "data-builder-field": "mode",
      });
      radio.checked = time.mode === value;
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        time.mode = value;
        if (value === "relative" && !time.anchor) time.anchor = "sun:sunrise";
        changed("mode");
        panel.renderView();
        panel.shadowRoot
          .querySelector<HTMLElement>('[data-builder-field="mode"]:checked')
          ?.focus();
      });
      option.append(radio, el("span", t(label)));
      choices.append(option);
    }
    timingOptions.append(choices);
    error(timingOptions, "mode");
    timingSection.append(timingOptions);
    if (time.mode === "absolute") {
      field(
        timingSection,
        "start",
        "Start time window",
        time.start,
        (v) => {
          time.start = v;
        },
        { type: "time", step: 1 },
      );
      if (time.end || editor.showEndTime || editor.errors.end) {
        field(
          timingSection,
          "end",
          "End of window (optional)",
          time.end,
          (v) => {
            time.end = v;
          },
          { type: "time", step: 1, optional: true },
        );
        timingSection.append(
          button(
            t("Remove end of window"),
            () => {
              time.end = "";
              editor.showEndTime = false;
              changed("end");
              rerender("start");
            },
            { class: "text-button" },
          ),
        );
      } else
        timingSection.append(
          button(
            t("Add end of window"),
            () => {
              time.end = time.start;
              editor.showEndTime = true;
              changed("end");
              rerender("end");
            },
            { class: "text-button" },
          ),
        );
    } else {
      const choices = timeSourceChoices(panel.draft, editor.id, panel.catalog);
      // Keep a saved reference visible even if HA temporarily removes its entity.
      if (
        time.anchor &&
        !choices.some((choice) => choice.value === time.anchor)
      )
        choices.push({
          value: time.anchor,
          name: time.anchor,
          group: "Unavailable sources",
        });
      const picker = sourcePicker(timingSection, {
        hass: panel._hass,
        choices,
        value: time.anchor,
        t,
        onChange: (value) => {
          time.anchor = value;
          if (!editor.existing && value.startsWith("step:")) {
            const parent = stepEntries(panel.draft).find(
              (step) => step.id === value.slice(5),
            );
            if (parent) form.days = [...parent.days];
          }
          changed("anchor");
          panel.renderView();
          const next = panel.shadowRoot.querySelector<
            HTMLElement & SourcePickerState
          >('[data-builder-field="anchor"]');
          if (next) {
            next.suppressNextOpen = true;
            next.focus();
          }
        },
      });
      if (editor.errors.anchor) {
        picker.setAttribute("aria-invalid", "true");
        picker.setAttribute("aria-describedby", "routine-error-anchor");
        picker.invalid = true;
        picker.errorMessage = editor.errors.anchor;
        error(required(picker.closest<HTMLElement>(".field")), "anchor");
      }
      if (time.anchor.startsWith("entity:"))
        timingSection.append(
          el(
            "p",
            t(
              "Uses the time currently reported by Home Assistant. Time-only helpers repeat daily; dated sources run only on their reported date.",
            ),
            { class: "hint" },
          ),
        );
      field(
        timingSection,
        "startOffset",
        "Start offset",
        time.startOffset,
        (v) => {
          time.startOffset = v;
        },
        { placeholder: "30m or 1h" },
      );
      if (time.endOffset || editor.showEndOffset || editor.errors.endOffset) {
        const endInput = field(
          timingSection,
          "endOffset",
          "End offset (optional)",
          time.endOffset,
          (v) => {
            time.endOffset = v;
          },
        );
        const endBox = required(endInput.closest<HTMLElement>(".field"));
        const heading = el("div", null, { class: "field-label-row" });
        heading.append(required(endBox.querySelector<HTMLElement>("label")));
        heading.append(
          button(
            t("Remove end offset"),
            () => {
              time.endOffset = "";
              editor.showEndOffset = false;
              changed("endOffset");
              rerender("startOffset");
            },
            { class: "text-button" },
          ),
        );
        endBox.prepend(heading);
      } else
        timingSection.append(
          button(
            t("Add end offset"),
            () => {
              editor.showEndOffset = true;
              rerender("endOffset");
            },
            { class: "text-button" },
          ),
        );
      if (time.anchor.startsWith("sun:")) {
        const fallback = details(
          timingSection,
          t("If the sun event is unavailable"),
        );
        fallback.open = !!time.fallback || !!editor.errors.fallback;
        field(
          fallback,
          "fallback",
          "Fallback time (optional)",
          time.fallback,
          (v) => {
            time.fallback = v;
          },
          { type: "time", optional: true },
        );
      }
    }
    timingSection.append(
      el(
        "p",
        timingExplanation(
          time,
          stepEntries(panel.draft),
          t,
          panel.catalog.time_sources,
        ),
        {
          class: "hint",
          "data-timing-explanation": "",
          "aria-live": "polite",
        },
      ),
    );
    if (panel.document?.source === "file")
      timingSection.append(
        el(
          "p",
          t(
            "This program is managed by a file. Add changes to your draft, then export them from Advanced settings.",
          ),
          { class: "hint" },
        ),
      );
  }
  const footer = el("div", null, { class: "builder-footer" });
  const cancel = button(t("Cancel"), () => {
    panel.stepEditor = null;
    panel.error = "";
    panel.issues = [];
    panel.version++;
    panel.renderView();
  });
  cancel.disabled = panel.busy;
  footer.append(cancel);
  if (!editing && editor.stage > 0) {
    const back = button(t("Back"), () => {
      editor.stage--;
      rerender();
    });
    back.disabled = panel.busy;
    footer.append(back);
  }
  const next = button(
    t(
      !editing && editor.stage < 2
        ? "Continue"
        : panel.document?.source === "file"
          ? "Add to draft"
          : "Save step",
    ),
    async () => {
      if (
        !editing &&
        editor.stage === 2 &&
        !form.name.trim() &&
        form.entities.length
      ) {
        const target = `${entityName(panel, form.entities[0])}${form.entities.length > 1 ? ` +${form.entities.length - 1}` : ""}`;
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
      if (Object.keys(editor.errors).length) return rerender();
      if (!editing && editor.stage < 2) {
        editor.stage++;
        return rerender();
      }
      try {
        const candidate = buildStep(panel.draft, editor);
        editor.candidatePath = required(
          stepEntries(candidate).find((e) => e.id === editor.id),
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
    },
    { class: "primary", "data-routine-submit": "" },
  );
  next.disabled = panel.busy || panel.stale;
  footer.append(next);
  shell.append(footer);
}
