import { button, el, section, details } from "./forms.js";
import { copy, days, duplicate, parentSteps, removeResource } from "./model.js";
import {
  stepEntries,
  simpleStep,
  stepEditor,
  editorErrors,
  offsetErrors,
  buildStep,
  dependentNames,
  timingSummary,
} from "./step-model.js";

export function startStep(panel, entry, parent) {
  panel.stepEditor = stepEditor(panel.draft, entry, parent);
  panel.tab = "routines";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel);
}
function focusEditor(panel) {
  const root = panel.shadowRoot;
  const target =
    root.querySelector('.routine-editor [aria-invalid="true"]') ||
    root.querySelector(".routine-editor h2");
  target?.focus();
}
function entityName(panel, id) {
  return panel.catalog.entities.find((e) => e.entity_id === id)?.name || id;
}
function actionSummary(entry, t) {
  const action = entry.actions?.[0]?.action;
  if (action === "scene.turn_on") return t("Activate scene");
  if (simpleStep(entry)) {
    if (/^(?:(?:light|switch)\.)?turn_(on|off)$/.test(action))
      return t(action.endsWith("turn_off") ? "Turn off" : "Turn on");
    return action;
  }
  return t("Custom actions");
}
function daySummary(selected, t) {
  if (selected.length === 7) return t("Every day");
  if (selected.join() === days.slice(0, 5).join()) return t("Weekdays");
  if (selected.join() === days.slice(5).join()) return t("Weekends");
  return selected.map((d) => t(d)).join(", ");
}
function advancedStep(panel, entry) {
  panel.tab = "advanced_routines";
  panel.selection.set('["routines"]', entry.path[1]);
  panel.selection.set(JSON.stringify(entry.path.slice(0, 3)), entry.path[3]);
  panel.renderView();
}
export function renderSteps(panel, root) {
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
  const selected = entries.find((e) => e.id === panel.selectedStep);
  // Keep related items adjacent without depending on saved list order. The seen
  // set also makes malformed imported drafts safe to inspect.
  const seen = new Set(),
    ordered = [];
  function append(entry, depth) {
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
        !entries.some((p) => p.id === e.when.relative_to),
    )
    .forEach((e) => append(e, 0));
  entries.forEach((e) => append(e, 0));
  for (const { entry, depth } of ordered) {
    const row = button(
      "",
      () => {
        panel.selectedStep = entry.id;
        panel.renderView();
        panel.shadowRoot.querySelector(".routine-detail h2")?.focus();
      },
      {
        class: `routine-row${selected?.id === entry.id ? " selected" : ""}`,
        "aria-pressed": String(selected?.id === entry.id),
        "data-routine-id": entry.id,
      },
    );
    row.style.setProperty("--depth", Math.min(depth, 3));
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
      el("span", timingSummary(entry, entries, t)),
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
    list.append(row);
  }
  layout.append(list);
  if (selected) {
    const info = section(layout, selected.name);
    info.className = "routine-detail";
    info.querySelector("h2").tabIndex = -1;
    info.append(
      el("p", timingSummary(selected, entries, t)),
      el("p", daySummary(selected.days, t), { class: "hint" }),
    );
    info.append(el("p", actionSummary(selected, t), { class: "eyebrow" }));
    const entities = el("ul", null, { class: "entity-summary" });
    for (const id of selected.entities)
      entities.append(el("li", entityName(panel, id)));
    info.append(entities);
    if (selected.actions?.[0]?.data?.brightness_pct != null)
      info.append(
        el(
          "p",
          `${t("Brightness")}: ${selected.actions[0].data.brightness_pct}%`,
        ),
      );
    const controls = el("div", null, { class: "routine-detail-actions" });
    if (selected.kind === "steps")
      controls.append(
        button(t("Add related step"), () => startStep(panel, null, selected), {
          class: "primary",
        }),
      );
    controls.append(
      button(
        t(simpleStep(selected) ? "Edit step" : "Edit in Advanced settings"),
        () =>
          simpleStep(selected)
            ? startStep(panel, selected)
            : advancedStep(panel, selected),
      ),
    );
    info.append(controls);
    const more = details(info, t("More options"));
    more.append(
      button(t("Duplicate"), () => {
        const next = copy(panel.draft),
          item = duplicate(next, selected.path);
        panel.selectedStep = item.id;
        panel.change([], next);
        panel.renderView();
      }),
    );
    const dependents = dependentNames(panel.draft, selected.id);
    const remove = button(
      t("Delete"),
      () =>
        panel.attempt(() => {
          const next = copy(panel.draft);
          removeResource(next, selected.path);
          panel.selectedStep = null;
          panel.change([], next);
          panel.renderView();
        }),
      { class: "danger" },
    );
    remove.disabled = dependents.length > 0;
    more.append(remove);
    if (dependents.length)
      more.append(
        el(
          "p",
          `${t("Used by")}: ${dependents.join(", ")}. ${t("Change those relationships before deleting.")}`,
          { class: "hint" },
        ),
      );
    if (simpleStep(selected))
      more.append(
        button(t("Advanced settings"), () => advancedStep(panel, selected)),
      );
  }
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

function renderEditor(panel, root) {
  const editor = panel.stepEditor,
    form = editor.form,
    t = panel.t,
    // `existing` controls the title and is the source of truth for edit mode.
    // Keeping a second `editing` flag can make a mixed or restored editor state
    // show the create wizard inside an edit flow.
    editing = editor.existing;
  const shell = section(root, t(editor.existing ? "Edit step" : "Create step"));
  shell.className = editing ? "routine-editor editing" : "routine-editor";
  shell.querySelector("h2").tabIndex = -1;
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
  const changed = (key) => {
    editor.changed = true;
    panel.version++;
    panel.validatedVersion = -1;
    delete editor.errors[key];
    shell.querySelector(`[data-builder-error="${key}"]`)?.remove();
    shell
      .querySelector(`[data-builder-field="${key}"]`)
      ?.removeAttribute("aria-invalid");
    panel.toolbar();
    if (["startOffset", "endOffset"].includes(key)) validateOffsets();
  };
  const rerender = (key) => {
    panel.renderView();
    if (key)
      panel.shadowRoot.querySelector(`[data-builder-field="${key}"]`)?.focus();
    else focusEditor(panel);
  };
  const error = (parent, key) => {
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
      const input = shell.querySelector(`[data-builder-field="${key}"]`);
      if (!input) continue;
      const message = errors[key];
      shell.querySelector(`[data-builder-error="${key}"]`)?.remove();
      input.setCustomValidity(message || "");
      if (message) {
        editor.errors[key] = message;
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", `routine-error-${key}`);
        error(input.closest(".field"), key);
      } else {
        delete editor.errors[key];
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    }
  };
  const field = (parent, key, label, value, update, options = {}) => {
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
      input.append(el("option", t(name), { value: v }));
    input.value = value;
    if (nativeTime) {
      input.hass = panel._hass;
      input.selector = { time: {} };
      input.label = t(label);
      input.required = !options.optional;
      input.value = value || undefined;
      input.setAttribute("aria-label", t(label));
      input.tabIndex = 0;
    }
    if (editor.errors[key]) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", `routine-error-${key}`);
    }
    input.addEventListener(
      nativeTime ? "value-changed" : options.choices ? "change" : "input",
      (event) => {
        if (nativeTime) {
          if (!event.detail || !("value" in event.detail)) return;
          input.value = event.detail.value || "";
        }
        update(input.value);
        changed(key);
        if (options.render) rerender(key);
      },
    );
    if (["startOffset", "endOffset"].includes(key)) {
      input.addEventListener("blur", validateOffsets);
      input.setCustomValidity(editor.errors[key] || "");
    }
    box.append(input);
    error(box, key);
    parent.append(box);
    return input;
  };
  const nameSection = el("div", null, { class: "step-name-editor" });
  shell.insertBefore(nameSection, sections);
  field(nameSection, "name", "Step name", form.name, (v) => {
    form.name = v;
  });
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
        if (!event.detail || !("value" in event.detail)) return;
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
              const picker = panel.shadowRoot.querySelector(".entity-picker");
              picker.scrollTop = scrollTop;
              [...picker.querySelectorAll("input")]
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
    field(
      timingSection,
      "mode",
      "Timing",
      time.mode,
      (v) => {
        time.mode = v;
        if (v === "relative" && !time.anchor) time.anchor = "sun:sunrise";
      },
      {
        choices: [
          ["absolute", "Absolute time"],
          ["relative", "Relative to"],
        ],
        render: true,
      },
    );
    if (time.mode === "absolute") {
      field(
        timingSection,
        "start",
        time.end || editor.showEndTime ? "Start of window" : "Start time",
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
              editor.showEndTime = true;
              rerender("end");
            },
            { class: "text-button" },
          ),
        );
      timingSection.append(
        el(
          "p",
          t(
            "Leave the end blank for a fixed start time. An end before the start crosses midnight.",
          ),
          { class: "hint" },
        ),
      );
    } else {
      field(
        timingSection,
        "anchor",
        "Relative to",
        time.anchor,
        (v) => {
          time.anchor = v;
          if (!editor.existing && v.startsWith("step:")) {
            const parent = stepEntries(panel.draft).find(
              (e) => e.id === v.slice(5),
            );
            if (parent) form.days = [...parent.days];
          }
        },
        {
          choices: [
            ["", "Choose a step or event"],
            ["sun:sunrise", "Sunrise"],
            ["sun:sunset", "Sunset"],
            ...parentSteps(panel.draft, editor.id).map((e) => [
              `step:${e.id}`,
              e.name,
            ]),
          ],
          render: true,
        },
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
        field(
          timingSection,
          "endOffset",
          "End offset (optional)",
          time.endOffset,
          (v) => {
            time.endOffset = v;
          },
          { placeholder: "1h30m" },
        );
        timingSection.append(
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
      timingSection.append(
        el(
          "p",
          t(
            "Use 10s or 20m for a delay, or -30m for an earlier start. Leave the end blank for a fixed offset.",
          ),
          { class: "hint" },
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
        t(
          "With an end value, the start is chosen uniformly at random between the two bounds.",
        ),
        { class: "hint" },
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
      editor.errors = editorErrors(
        panel.draft,
        editor,
        editing ? 2 : editor.stage,
      );
      if (Object.keys(editor.errors).length) return rerender();
      if (!editing && editor.stage < 2) {
        if (editor.stage === 1 && !form.name)
          form.name = `${entityName(panel, form.entities[0])}${form.entities.length > 1 ? ` +${form.entities.length - 1}` : ""}${form.kind === "entities" ? ` ${t("on")}` : ""}`;
        editor.stage++;
        return rerender();
      }
      try {
        const candidate = buildStep(panel.draft, editor);
        editor.candidatePath = stepEntries(candidate).find(
          (e) => e.id === editor.id,
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
