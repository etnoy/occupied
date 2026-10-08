import { button, el, section, details } from "./forms.js";
import { copy, days, duplicate, parentSteps, removeResource } from "./model.js";
import {
  routineEntries,
  simpleRoutine,
  routineEditor,
  editorErrors,
  buildRoutine,
  dependentNames,
  timingSummary,
} from "./routine-model.js";

export function startRoutine(panel, entry, parent) {
  panel.routineEditor = routineEditor(panel.draft, entry, parent);
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
function daySummary(selected, t) {
  if (selected.length === 7) return t("Every day");
  if (selected.join() === days.slice(0, 5).join()) return t("Weekdays");
  if (selected.join() === days.slice(5).join()) return t("Weekends");
  return selected.map((d) => t(d)).join(", ");
}
function advancedRoutine(panel, entry) {
  panel.tab = "advanced_routines";
  panel.selection.set('["routines"]', entry.path[1]);
  panel.selection.set(JSON.stringify(entry.path.slice(0, 3)), entry.path[3]);
  panel.renderView();
}
export function renderRoutines(panel, root) {
  if (panel.routineEditor) return renderEditor(panel, root);
  const t = panel.t,
    entries = routineEntries(panel.draft);
  const heading = el("div", null, { class: "page-heading" });
  const title = el("div");
  title.append(
    el("p", t("MAKE IT FEEL LIKE HOME"), { class: "eyebrow" }),
    el("h2", t("Your routines")),
    el("p", t("Choose what happens, when it happens, and what follows."), {
      class: "hint",
    }),
  );
  heading.append(title);
  if (entries.length)
    heading.append(
      button(t("Create routine"), () => startRoutine(panel), {
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
          "Start with a light or switch. Give it a routine, then add whatever should happen next.",
        ),
        { class: "hint" },
      ),
      el(
        "p",
        t("1. Select entities   →   2. Choose an action   →   3. Set a time"),
        { class: "empty-steps" },
      ),
      button(t("Create your first routine"), () => startRoutine(panel), {
        class: "primary",
        "data-create-routine": "",
      }),
    );
    return;
  }
  const layout = el("div", null, { class: "routine-layout" }),
    list = el("div", null, {
      class: "routine-list",
      "aria-label": t("Your routines"),
    });
  const selected = entries.find((e) => e.id === panel.selectedRoutine);
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
        panel.selectedRoutine = entry.id;
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
        `${simpleRoutine(entry) ? t(entry.actions[0].action.endsWith("turn_off") ? "Turn off" : "Turn on") : t("Custom actions")} · ${entry.entities.map((id) => entityName(panel, id)).join(", ")}`,
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
    const action = selected.actions?.[0]?.action;
    info.append(
      el(
        "p",
        simpleRoutine(selected)
          ? t(action?.endsWith("turn_off") ? "Turn off" : "Turn on")
          : t("Custom routine"),
        { class: "eyebrow" },
      ),
    );
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
        button(
          t("Add related routine"),
          () => startRoutine(panel, null, selected),
          { class: "primary" },
        ),
      );
    controls.append(
      button(
        t(
          simpleRoutine(selected)
            ? "Edit routine"
            : "Edit in Advanced settings",
        ),
        () =>
          simpleRoutine(selected)
            ? startRoutine(panel, selected)
            : advancedRoutine(panel, selected),
      ),
    );
    info.append(controls);
    const more = details(info, t("More options"));
    more.append(
      button(t("Duplicate"), () => {
        const next = copy(panel.draft),
          item = duplicate(next, selected.path);
        panel.selectedRoutine = item.id;
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
          panel.selectedRoutine = null;
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
    if (simpleRoutine(selected))
      more.append(
        button(t("Advanced settings"), () => advancedRoutine(panel, selected)),
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
  const editor = panel.routineEditor,
    form = editor.form,
    t = panel.t,
    editing = editor.editing;
  const shell = section(
    root,
    t(editor.existing ? "Edit routine" : "Create routine"),
  );
  shell.className = editing ? "routine-editor editing" : "routine-editor";
  shell.querySelector("h2").tabIndex = -1;
  const steps = el("ol", null, {
    class: "builder-steps",
    "aria-label": t("Routine setup"),
  });
  ["Entities", "Action", "Time"].forEach((label, i) =>
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
  const field = (parent, key, label, value, update, options = {}) => {
    const box = el("div", null, { class: "field" }),
      id = `routine-${key}`;
    box.append(el("label", t(label), { for: id }));
    const input = el(options.choices ? "select" : "input", null, {
      id,
      type: options.type || "text",
      "data-builder-field": key,
      min: options.min,
      max: options.max,
      step: options.step,
    });
    for (const [v, name] of options.choices || [])
      input.append(el("option", t(name), { value: v }));
    input.value = value;
    if (editor.errors[key]) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", `routine-error-${key}`);
    }
    input.addEventListener(options.choices ? "change" : "input", () => {
      update(input.value);
      changed(key);
      if (options.render) rerender(key);
    });
    box.append(input);
    error(box, key);
    parent.append(box);
    return input;
  };
  if (editing || editor.stage === 0) {
    const entitySection = el("div", null, {
      "data-editor-section": "entities",
    });
    sections.append(entitySection);
    entitySection.append(
      el("h3", t(editing ? "Entities" : "Which entities should take part?")),
      el(
        "p",
        t("Select one or more lights and switches. Search by name or room."),
        { class: "hint" },
      ),
    );
    const count = el("p", "", {
      class: "selection-count",
      "aria-live": "polite",
    });
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
      const catalog = panel.catalog.entities.filter((e) =>
        /^(light|switch)\./.test(e.entity_id),
      );
      for (const id of form.entities)
        if (!catalog.some((e) => e.entity_id === id))
          catalog.push({ entity_id: id, name: id, state: "unavailable" });
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
            ? [...new Set([...form.entities, entity.entity_id])]
            : form.entities.filter((e) => e !== entity.entity_id);
          changed("entities");
          count.textContent = `${form.entities.length} ${t("selected")}`;
          if (editing) {
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
        list.append(
          el("p", t("No matching lights or switches."), { class: "hint" }),
        );
    };
    search.addEventListener("input", () => {
      editor.search = search.value;
      draw();
    });
    draw();
    entitySection.append(search, count, list);
    error(entitySection, "entities");
    if (form.entities.some((e) => !/^(light|switch)\./.test(e)))
      entitySection.append(
        el(
          "p",
          t(
            "This selection includes a custom entity. Select lights or switches for this routine.",
          ),
          { class: "hint" },
        ),
      );
  }
  if (editing || editor.stage === 1) {
    const actionSection = el("div", null, { "data-editor-section": "action" });
    sections.append(actionSection);
    actionSection.append(
      el("h3", t(editing ? "Action" : "What should happen?")),
      el("p", form.entities.map((id) => entityName(panel, id)).join(", "), {
        class: "hint",
      }),
    );
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
    field(actionSection, "name", "Routine name", form.name, (v) => {
      form.name = v;
    });
    if (
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
  if (editing || editor.stage === 2) {
    const timingSection = el("div", null, { "data-editor-section": "time" });
    sections.append(timingSection);
    const time = form.timing;
    timingSection.append(
      el("h3", t(editing ? "Time" : "When should it happen?")),
      el("p", form.name, { class: "hint" }),
    );
    field(
      timingSection,
      "mode",
      "Timing",
      time.mode,
      (v) => {
        time.mode = v;
        if (v === "sun") time.offset = 0;
        if (v === "relative" && !time.parent) {
          const parent = parentSteps(panel.draft, editor.id)[0];
          time.parent = parent?.id || "";
          if (parent)
            form.days = [
              ...routineEntries(panel.draft).find((e) => e.id === parent.id)
                .days,
            ];
        }
      },
      {
        choices: [
          ["clock", "At a time"],
          ["sun", "Sunrise or sunset"],
          ["relative", "Before or after a routine"],
        ],
        render: true,
      },
    );
    if (time.mode === "clock")
      field(
        timingSection,
        "time",
        "Time",
        time.time,
        (v) => {
          time.time = v;
        },
        { type: "time", step: 1 },
      );
    else {
      if (time.mode === "relative") {
        const parents = parentSteps(panel.draft, editor.id);
        field(
          timingSection,
          "parent",
          "Related routine",
          time.parent,
          (v) => {
            time.parent = v;
          },
          {
            choices: [
              ["", "Choose a routine"],
              ...parents.map((e) => [e.id, e.name]),
            ],
          },
        );
        timingSection.append(
          el(
            "p",
            t(
              "Follows the routine’s scheduled time, including its daily variation.",
            ),
            { class: "hint" },
          ),
        );
      } else
        field(
          timingSection,
          "sun",
          "Sun event",
          time.sun,
          (v) => {
            time.sun = v;
          },
          {
            choices: [
              ["sunset", "Sunset"],
              ["sunrise", "Sunrise"],
            ],
          },
        );
      const row = el("div", null, { class: "timing-offset" });
      field(
        row,
        "offset",
        "Minutes",
        time.offset,
        (v) => {
          time.offset = v;
        },
        { type: "number", min: 0, max: 10080, step: 1 },
      );
      field(
        row,
        "direction",
        "Before or after",
        time.direction,
        (v) => {
          time.direction = v;
        },
        {
          choices: [
            ["after", "After"],
            ["before", "Before"],
          ],
        },
      );
      timingSection.append(row);
    }
    const variance = details(timingSection, t("Add time variation"));
    variance.open = Number(time.variation) > 0 || !!editor.errors.variation;
    field(
      variance,
      "variation",
      "Minutes either side",
      time.variation,
      (v) => {
        time.variation = v;
      },
      { type: "number", min: 0, max: 719, step: 1 },
    );
    variance.append(
      el(
        "p",
        t("For example, 15 means up to 15 minutes earlier or later each day."),
        { class: "hint" },
      ),
    );
    const chosenDays = form.days.join();
    const preset = editor.customDays
      ? "custom"
      : chosenDays === days.join()
        ? "all"
        : chosenDays === days.slice(0, 5).join()
          ? "weekdays"
          : chosenDays === days.slice(5).join()
            ? "weekends"
            : "custom";
    field(
      timingSection,
      "days",
      "Repeat",
      preset,
      (v) => {
        editor.customDays = v === "custom";
        if (v !== "custom")
          form.days =
            v === "all"
              ? [...days]
              : v === "weekdays"
                ? days.slice(0, 5)
                : days.slice(5);
      },
      {
        choices: [
          ["all", "Every day"],
          ["weekdays", "Weekdays"],
          ["weekends", "Weekends"],
          ["custom", "Choose days"],
        ],
        render: true,
      },
    );
    if (preset === "custom") {
      const checks = el("div", null, { class: "checks" });
      for (const day of days) {
        const label = el("label", null, { class: "check" }),
          input = el("input", null, { type: "checkbox" });
        input.checked = form.days.includes(day);
        input.addEventListener("change", () => {
          form.days = days.filter((d) =>
            d === day ? input.checked : form.days.includes(d),
          );
          changed("days");
        });
        label.append(input, document.createTextNode(t(day)));
        checks.append(label);
      }
      timingSection.append(checks);
    }
    if (time.mode === "sun") {
      const fallback = details(
        timingSection,
        t("If the sun event is unavailable"),
      );
      field(
        fallback,
        "fallback",
        "Fallback time (optional)",
        time.fallback,
        (v) => {
          time.fallback = v;
        },
        { type: "time" },
      );
    }
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
    panel.routineEditor = null;
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
          : "Save routine",
    ),
    async () => {
      editor.errors = editorErrors(
        panel.draft,
        editor,
        editing ? 2 : editor.stage,
      );
      if (Object.keys(editor.errors).length) return rerender();
      if (!editing && editor.stage < 2) {
        if (editor.stage === 0 && !form.name)
          form.name = `${entityName(panel, form.entities[0])}${form.entities.length > 1 ? ` +${form.entities.length - 1}` : ""} ${t("on")}`;
        editor.stage++;
        return rerender();
      }
      try {
        const candidate = buildRoutine(panel.draft, editor);
        editor.candidatePath = routineEntries(candidate).find(
          (e) => e.id === editor.id,
        ).path;
        if (panel.document?.source === "file") {
          panel.change([], candidate);
          panel.selectedRoutine = editor.id;
          panel.routineEditor = null;
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
