import { button, el, section, details, Forms } from "./forms.js";
import {
  copy,
  get,
  newItem,
  resources,
  parentSteps,
  around,
  removeResource,
  duplicate,
} from "./model.js";

export function editView(panel, root) {
  const f = new Forms(panel),
    p = panel.draft,
    t = (x) => panel.t(x);
  const advanced = (parent, path, title = "Advanced configuration") => {
    const node = details(parent, t(title));
    node.append(
      el(
        "p",
        t(
          "All fields are available here as Occupied JSON. Validate changes before saving.",
        ),
        { class: "hint" },
      ),
    );
    f.json(node, path, title);
    node.append(button(t("Refresh forms"), () => panel.renderView()));
  };
  const identity = (parent, path, kind) => {
    f.text(parent, [...path, "name"], "Name");
    f.text(parent, [...path, "description"], "Description", { optional: true });
    const item = get(p, path),
      row = el("div", null, { class: "row" });
    row.append(el("code", item.id));
    const input = el("input", null, {
      "aria-label": t("New identifier"),
      placeholder: "new_identifier",
      pattern: "[a-z][a-z0-9_-]*",
    });
    row.append(
      input,
      button(t("Migrate identifier"), () =>
        panel.migrate(kind, item.id, input.value),
      ),
    );
    parent.append(row);
    parent.append(
      el(
        "small",
        t(
          "Names are labels. Identifiers are stable; migration rewrites typed references.",
        ),
      ),
    );
  };
  const itemMeta = (parent, path) => {
    f.weekdays(parent, [...path, "days"], true);
    const box = details(parent, t("Probability and boundary policies"));
    f.number(box, [...path, "probability"], "Probability", {
      optional: true,
      min: 0,
      max: 1,
    });
    f.select(
      box,
      [...path, "time_distribution"],
      "Time distribution",
      ["uniform", "triangular"],
      { optional: true },
    );
    f.select(box, [...path, "missing_anchor"], "Missing dependency", [
      "error",
      "skip",
    ]);
    f.text(
      box,
      [...path, "allow_cross_boundary"],
      "Allow crossing the simulation day boundary",
      { type: "checkbox" },
    );
  };
  const stepChoices = (child) =>
    parentSteps(p, child).map((s) => [s.id, `${s.name} · ${s.id}`]);
  const when = (parent, path, child) => {
    const value = get(p, path) || {},
      mode = value.sun_range ? "sun" : value.relative_to ? "relative" : "clock";
    const box = el("fieldset");
    box.append(el("legend", t("Start time")));
    const select = el("select", null, { "aria-label": t("Time anchor") });
    for (const k of ["clock", "sun", "relative"])
      select.append(el("option", t(k), { value: k }));
    select.value = mode;
    select.addEventListener("change", () => {
      panel.change(
        path,
        select.value === "sun"
          ? { sun_range: { sun: "sunset", offset_range: { fixed: "0s" } } }
          : select.value === "relative"
            ? {
                relative_to: stepChoices(child)[0]?.[0] || "",
                offset_range: { fixed: "30m" },
              }
            : { clock_range: { earliest: "20:00", latest: "20:00" } },
      );
      panel.renderView();
    });
    box.append(select);
    if (mode === "clock") {
      f.text(box, [...path, "clock_range", "earliest"], "Earliest", {
        type: "time",
        step: 1,
      });
      f.text(box, [...path, "clock_range", "latest"], "Latest", {
        type: "time",
        step: 1,
      });
      f.text(box, [...path, "clock_range", "mode"], "Triangular peak", {
        type: "time",
        step: 1,
        optional: true,
      });
      f.text(
        box,
        [...path, "clock_range", "cross_midnight"],
        "Cross midnight",
        { type: "checkbox" },
      );
      const approx = details(box, t("Around a time")),
        clock = el("input", null, {
          type: "time",
          "aria-label": t("Approximate time"),
        }),
        spread = el("input", null, {
          type: "number",
          min: 0,
          max: 719,
          "aria-label": t("Minutes either side"),
        });
      clock.value = "20:00";
      spread.value = "15";
      approx.append(
        clock,
        spread,
        button(t("Use approximate time"), () => {
          panel.attempt(() => {
            panel.change(path, {
              clock_range: around(clock.value, Number(spread.value)),
            });
            panel.renderView();
          });
        }),
      );
    } else if (mode === "sun") {
      f.select(box, [...path, "sun_range", "sun"], "Sun event", [
        "sunrise",
        "sunset",
      ]);
      f.range(box, [...path, "sun_range", "offset_range"], "Sun offset");
      f.text(
        box,
        [...path, "sun_range", "fallback"],
        "Clock fallback when sun event is absent",
        { optional: true, type: "time", step: 1 },
      );
    } else {
      f.select(box, [...path, "relative_to"], "After step", stepChoices(child));
      f.range(box, [...path, "offset_range"], "Relative offset");
    }
    f.select(
      box,
      [...path, "distribution"],
      "Anchor distribution",
      ["uniform", "triangular"],
      { optional: true },
    );
    parent.append(box);
  };
  const anchor = (parent, path, title) => {
    const a = get(p, path) || {},
      mode = a.step ? "step" : a.sun ? "sun" : "clock",
      box = el("fieldset");
    box.append(el("legend", t(title)));
    const selector = el("select", null, {
      "aria-label": t(title) + " " + t("Anchor"),
    });
    for (const k of ["clock", "sun", "step"])
      selector.append(el("option", t(k), { value: k }));
    selector.value = mode;
    selector.addEventListener("change", () => {
      panel.change(
        path,
        selector.value === "sun"
          ? { sun: "sunset" }
          : selector.value === "step"
            ? { step: stepChoices()[0]?.[0] || "" }
            : { clock: "18:00" },
      );
      panel.renderView();
    });
    box.append(selector);
    if (mode === "clock")
      f.text(box, [...path, "clock"], "Clock time", { type: "time", step: 1 });
    if (mode === "sun") {
      f.select(box, [...path, "sun"], "Sun event", ["sunrise", "sunset"]);
      f.text(
        box,
        [...path, "fallback"],
        "Clock fallback when sun event is absent",
        { optional: true, type: "time", step: 1 },
      );
    }
    if (mode === "step")
      f.select(box, [...path, "step"], "Step", stepChoices());
    f.text(box, [...path, "offset"], "Offset", {
      optional: true,
      placeholder: "0s",
    });
    if (mode !== "step")
      f.number(
        box,
        [...path, "day_offset"],
        "Following simulation day (0 or 1)",
        { optional: true, min: 0, max: 1, step: 1 },
      );
    parent.append(box);
  };
  const between = (parent, path) => {
    anchor(parent, [...path, "start"], "Window start");
    anchor(parent, [...path, "end"], "Window end");
    f.text(parent, [...path, "cross_midnight"], "Cross midnight", {
      type: "checkbox",
    });
  };
  const conditions = (parent, path, title) => {
    f.list(
      parent,
      path,
      title,
      () => ({ condition: "state", entity_id: "", state: ["armed_away"] }),
      (box, cp, condition) => {
        const selector = el("select", null, {
          "aria-label": t("Condition type"),
        });
        for (const k of ["state", "and", "or", "not"])
          selector.append(el("option", t(k), { value: k }));
        selector.value = condition.condition;
        selector.addEventListener("change", () => {
          panel.change(
            cp,
            selector.value === "state"
              ? { condition: "state", entity_id: "", state: ["armed_away"] }
              : { condition: selector.value, conditions: [] },
          );
          panel.renderView();
        });
        box.append(selector);
        if (condition.condition === "state") {
          const multi = Array.isArray(condition.entity_id);
          box.append(
            button(
              t(multi ? "Use one entity" : "Use multiple entities"),
              () => {
                panel.change(
                  [...cp, "entity_id"],
                  multi
                    ? condition.entity_id[0] || ""
                    : [condition.entity_id].filter(Boolean),
                );
                panel.renderView();
              },
            ),
          );
          f.entities(box, [...cp, "entity_id"], "Condition entity", multi);
          f.text(box, [...cp, "state"], "Exact allowed states", {
            list: true,
            multiline: true,
            help: "One exact state per line. A state containing spaces remains one state.",
          });
          f.text(box, [...cp, "attribute"], "Observed attribute (optional)", {
            optional: true,
          });
          f.select(box, [...cp, "match"], "Entity match", ["all", "any"], {
            optional: true,
          });
        } else conditions(box, [...cp, "conditions"], "Nested conditions");
      },
    );
  };
  const handover = (parent, path, partial = true) => {
    f.text(parent, [...path, "duration"], "Handover duration", {
      optional: partial,
      placeholder: "10m",
    });
    f.select(
      parent,
      [...path, "dimming"],
      "Dimming",
      ["auto", "stepped_only"],
      { optional: partial },
    );
    f.text(parent, [...path, "step_interval"], "Stepped fade interval", {
      optional: partial,
      placeholder: "30s",
    });
    const box = details(parent, t("Handover policies"));
    f.select(
      box,
      [...path, "target"],
      "Convergence target",
      ["projected_state_at_completion"],
      { optional: partial },
    );
    f.select(
      box,
      [...path, "non_dimmable"],
      "On/off light behavior",
      ["stagger"],
      { optional: partial },
    );
    f.select(
      box,
      [...path, "cancel_behavior"],
      "Cancel a fade",
      ["hold_current"],
      { optional: partial },
    );
  };
  const defaults = (parent, path, partial) => {
    f.select(
      parent,
      [...path, "time_distribution"],
      "Time distribution",
      ["uniform", "triangular"],
      { optional: partial },
    );
    f.number(parent, [...path, "probability"], "Probability", {
      optional: partial,
      min: 0,
      max: 1,
    });
    f.select(
      parent,
      [...path, "target_order"],
      "Target order",
      ["ordered", "shuffled"],
      { optional: partial },
    );
    f.range(parent, [...path, "stagger"], "Target stagger", {
      optional: partial,
    });
    const win = details(parent, t("Random window defaults"));
    f.range(win, [...path, "activity_windows", "on_duration"], "On duration", {
      optional: partial,
    });
    f.text(win, [...path, "activity_windows", "min_gap"], "Minimum gap", {
      optional: partial,
      placeholder: "0s",
    });
    f.select(
      win,
      [...path, "activity_windows", "overlap"],
      "Allow overlap",
      [
        ["false", "No"],
        ["true", "Yes"],
      ],
      { optional: partial, boolean: true },
    );
    f.select(
      win,
      [...path, "activity_windows", "target_mode"],
      "Target mode",
      ["all", "one", "subset", "weighted_subset"],
      { optional: partial },
    );
    const act = details(parent, t("Timed activity defaults"));
    f.range(act, [...path, "activities", "duration"], "Duration", {
      optional: true,
    });
    f.select(
      act,
      [...path, "activities", "stop_behavior"],
      "Stop behavior",
      ["end_if_owned", "leave_running"],
      { optional: partial },
    );
    if (!partial) {
      const h = details(parent, t("Default handover"));
      handover(h, [...path, "handover"], false);
    }
  };
  const actions = (parent, path, title) =>
    f.list(
      parent,
      path,
      title,
      () => ({
        action: "turn_on",
        targets: { groups: [], entities: [] },
        data: {},
      }),
      (box, ap, action) => {
        const services = Object.entries(panel.catalog.services).flatMap(
          ([domain, list]) =>
            Object.keys(list).map((name) => `${domain}.${name}`),
        );
        const actionInput = f.text(
          box,
          [...ap, "action"],
          "Service or typed action",
          {
            suggestions: [
              "turn_on",
              "turn_off",
              "safety_off",
              "event.fire",
              ...services,
            ],
          },
        );
        actionInput.addEventListener("change", () => panel.renderView());
        f.targets(box, [...ap, "targets"]);
        const data = details(box, t("Service data"));
        data.open = true;
        if (["turn_on", "light.turn_on"].includes(action.action)) {
          f.number(
            data,
            [...ap, "data", "brightness_pct"],
            "Brightness percent",
            { optional: true, min: 0, max: 100 },
          );
          f.number(data, [...ap, "data", "brightness"], "Brightness (0–255)", {
            optional: true,
            min: 0,
            max: 255,
            step: 1,
          });
          f.number(
            data,
            [...ap, "data", "color_temp_kelvin"],
            "Color temperature (K)",
            { optional: true, min: 1, step: 1 },
          );
          f.number(
            data,
            [...ap, "data", "transition"],
            "Native transition seconds",
            { optional: true, min: 0 },
          );
          f.json(data, [...ap, "data", "hs_color"], "Hue/saturation pair", {
            optional: true,
          });
          f.json(data, [...ap, "data", "rgb_color"], "RGB triplet", {
            optional: true,
          });
        } else {
          const [domain, service] = action.action.split("."),
            fields = panel.catalog.services[domain]?.[service]?.fields || {};
          for (const [key, description] of Object.entries(fields)) {
            if (key === "entity_id") continue;
            f.text(data, [...ap, "data", key], description.name || key, {
              optional: true,
              selector: description.selector,
              help: description.description,
            });
          }
          if (action.action === "event.fire") {
            f.text(data, [...ap, "data", "event_type"], "Event type");
            f.json(data, [...ap, "data", "event_data"], "Event data", {
              initial: {},
            });
          }
        }
        f.json(data, [...ap, "data"], "Advanced service data", { initial: {} });
        const advancedAction = details(box, t("Dispatch and resources"));
        f.entities(advancedAction, [...ap, "resources"], "Declared resources");
        f.select(
          advancedAction,
          [...ap, "target_order"],
          "Target order",
          ["ordered", "shuffled"],
          { optional: true },
        );
        f.range(advancedAction, [...ap, "stagger"], "Target stagger", {
          optional: true,
        });
        f.text(
          advancedAction,
          [...ap, "replay_safe"],
          "Replay safe (allow one bounded retry)",
          { type: "checkbox" },
        );
      },
    );
  const activity = (parent, path, item) => {
    when(parent, [...path, "when"], item.id);
    f.range(parent, [...path, "duration"], "Duration", { optional: true });
    f.entities(parent, [...path, "resources"], "Exclusive resources");
    const preset = details(parent, t("Harmony television preset")),
      remote = el("select", null, { "aria-label": t("Remote") });
    remote.append(el("option", t("Choose a remote"), { value: "" }));
    for (const e of panel.catalog.entities.filter((x) => x.domain === "remote"))
      remote.append(el("option", e.name, { value: e.entity_id }));
    const activityName = el("input", null, {
      "aria-label": t("Remote activity"),
      placeholder: "Watch TV",
    });
    activityName.value = "Watch TV";
    const list = el("datalist", null, { id: `activities-${item.id}` });
    activityName.setAttribute("list", list.id);
    remote.addEventListener("change", () => {
      list.replaceChildren(
        ...(
          panel.catalog.entities.find((e) => e.entity_id === remote.value)
            ?.activities || []
        ).map((name) => el("option", null, { value: name })),
      );
    });
    preset.append(
      remote,
      activityName,
      list,
      button(t("Use TV preset"), () => {
        if (!remote.value || !activityName.value)
          return panel.fail(t("Choose a remote and activity name"));
        panel.change(path, {
          ...item,
          when: { clock_range: around("20:00", 15) },
          duration: { fixed: "45m" },
          resources: [remote.value],
          on_start: [
            {
              action: "remote.turn_on",
              targets: { entities: [remote.value] },
              data: { activity: activityName.value },
            },
          ],
          on_end: [
            {
              action: "remote.turn_off",
              targets: { entities: [remote.value] },
            },
          ],
          start_conditions: [
            { condition: "state", entity_id: remote.value, state: "off" },
          ],
          ownership_conditions: [
            {
              condition: "state",
              entity_id: remote.value,
              attribute: "current_activity",
              state: activityName.value,
            },
          ],
          stop_behavior: "end_if_owned",
        });
        panel.renderView();
      }),
    );
    actions(parent, [...path, "on_start"], "Start actions");
    actions(parent, [...path, "on_end"], "End actions");
    conditions(parent, [...path, "start_conditions"], "Start conditions");
    conditions(
      parent,
      [...path, "ownership_conditions"],
      "Ownership conditions",
    );
    f.select(
      parent,
      [...path, "stop_behavior"],
      "Stop behavior",
      ["end_if_owned", "leave_running"],
      { optional: true },
    );
    const bound = details(parent, t("Keep the activity within a window"));
    if (item.within) {
      between(bound, [...path, "within"]);
      bound.append(
        button(t("Remove window constraint"), () => {
          panel.change([...path, "within"], undefined);
          panel.renderView();
        }),
      );
    } else
      bound.append(
        button(t("Add window constraint"), () => {
          panel.change([...path, "within"], {
            start: { clock: "18:00" },
            end: { clock: "23:00" },
          });
          panel.renderView();
        }),
      );
  };
  const window = (parent, path) => {
    const item = get(p, path) || {};
    between(parent, [...path, "between"]);
    f.range(parent, [...path, "cycles"], "Cycle count", { count: true });
    const generic = !!(item.on_start?.length || item.on_end?.length);
    if (generic) {
      actions(parent, [...path, "on_start"], "Start actions");
      actions(parent, [...path, "on_end"], "End actions");
      parent.append(
        button(t("Use light/switch targets instead"), () => {
          panel.change([...path, "on_start"], []);
          panel.change([...path, "on_end"], []);
          panel.change([...path, "targets"], { groups: [], entities: [] });
          panel.renderView();
        }),
      );
    } else {
      f.targets(parent, [...path, "targets"]);
      parent.append(
        button(t("Use generic start/end actions"), () => {
          panel.change([...path, "targets"], { groups: [], entities: [] });
          panel.change([...path, "data"], {});
          panel.change([...path, "target_mode"], undefined);
          panel.change([...path, "subset_size"], undefined);
          panel.change([...path, "weights"], undefined);
          const sceneAction = {
            action: "scene.turn_on",
            targets: { entities: [] },
            data: {},
          };
          panel.change([...path, "on_start"], [{ ...sceneAction }]);
          panel.change([...path, "on_end"], [{ ...sceneAction }]);
          panel.renderView();
        }),
      );
    }
    f.range(parent, [...path, "on_duration"], "On duration", {
      optional: true,
    });
    f.text(parent, [...path, "min_gap"], "Minimum gap", {
      optional: true,
      placeholder: "0s",
    });
    f.select(
      parent,
      [...path, "overlap"],
      "Allow overlap",
      [
        ["false", "No"],
        ["true", "Yes"],
      ],
      { optional: true, boolean: true },
    );
    if (!generic) {
      f.select(
        parent,
        [...path, "target_mode"],
        "Target mode",
        ["all", "one", "subset", "weighted_subset"],
        { optional: true },
      );
      f.range(parent, [...path, "subset_size"], "Subset size", {
        count: true,
        optional: true,
      });
      f.json(parent, [...path, "weights"], "Entity weights", { initial: {} });
    }
    f.number(
      parent,
      [...path, "max_simultaneous"],
      "Maximum simultaneous intervals",
      { optional: true, min: 1, max: 1000, step: 1 },
    );
    if (!generic)
      f.json(parent, [...path, "data"], "Light-on service data", {
        initial: {},
      });
  };
  const collection = (parent, path, kind, render) => {
    const values = get(p, path) || [],
      nav = el("div", null, { class: "resource-nav" });
    values.forEach((item, i) =>
      nav.append(
        button(item.name, () => {
          panel.selection.set(JSON.stringify(path), i);
          panel.renderView();
        }),
      ),
    );
    nav.append(
      button(`${t("Add")} ${t(kind)}`, () => {
        const item = newItem(p, kind);
        if (!get(p, path)) panel.change(path, []);
        get(p, path).push(item);
        panel.selection.set(JSON.stringify(path), get(p, path).length - 1);
        panel.edited(true);
      }),
    );
    parent.append(nav);
    const i = Math.min(
      panel.selection.get(JSON.stringify(path)) || 0,
      values.length - 1,
    );
    if (i < 0) {
      parent.append(el("p", t("Add an item to begin.")));
      return;
    }
    const itemPath = [...path, i],
      box = section(parent, values[i].name),
      toolbar = el("div", null, { class: "row" });
    toolbar.append(
      button(t("Duplicate"), () =>
        panel.attempt(() => {
          duplicate(p, itemPath);
          panel.selection.set(JSON.stringify(path), values.length - 1);
          panel.edited(true);
        }),
      ),
      button(t("Delete"), () =>
        panel.attempt(() => {
          removeResource(p, itemPath);
          panel.edited(true);
        }),
      ),
    );
    box.append(toolbar);
    identity(box, itemPath, kind);
    render(box, itemPath, values[i]);
    advanced(box, itemPath);
  };
  if (panel.tab === "settings") {
    const box = section(
      root,
      t("Settings"),
      t(
        "Choose when Occupied may run. Home Assistant supplies your location and timezone.",
      ),
    );
    conditions(box, ["activation", "conditions"], "Only run when");
    box.append(
      el(
        "p",
        t(
          "With no conditions, turning on the simulation allows it to run. All configured conditions must match.",
        ),
        { class: "hint" },
      ),
    );
    const execution = section(root, t("Simulation"));
    execution.append(
      el(
        "p",
        panel.status?.dry_run
          ? t("Dry run is on. Devices are not controlled.")
          : t("Live mode controls devices when the simulation is on."),
        { class: "hint" },
      ),
    );
    const dry = button(
      t(panel.status?.dry_run ? "Use live mode" : "Use dry run"),
      () =>
        panel
          .control("set_dry_run", { dry_run: !panel.status?.dry_run })
          .then(() => panel.renderView()),
    );
    dry.disabled = panel.busy;
    execution.append(
      dry,
      button(t("Runtime details"), () => {
        panel.tab = "overview";
        panel.renderView();
      }),
    );
    const advancedBox = details(root, t("Advanced settings"));
    advancedBox.append(
      el(
        "p",
        t(
          "Existing custom routines and installation settings remain available here.",
        ),
        { class: "hint" },
      ),
    );
    const select = el("select", null, {
      "aria-label": t("Advanced settings section"),
    });
    for (const [value, label] of [
      ["configuration", "Import, export and managed files"],
      ["advanced_routines", "Custom steps and activities"],
      ["groups", "Reusable entity groups"],
      ["household", "Household and location"],
      ["handover", "Lighting handover"],
      ["defaults", "Defaults and policies"],
      ["timeline", "Execution history"],
      ["diagnostics", "Diagnostics"],
    ])
      select.append(el("option", t(label), { value }));
    advancedBox.append(
      select,
      button(t("Open"), () => {
        panel.tab = select.value;
        panel.renderView();
      }),
    );
  } else if (panel.tab === "household") {
    const box = section(
      root,
      t("Household"),
      t(
        "Create or import an Occupied program. Permission starts disabled. Save applies the draft; enabling permits execution when all activation conditions pass.",
      ),
    );
    f.text(box, ["name"], "Name");
    f.text(box, ["description"], "Description", { optional: true });
    f.text(box, ["timezone"], "Timezone", {
      placeholder: "home_assistant",
      help: "Use home_assistant or an IANA timezone, such as Europe/Stockholm.",
    });
    f.text(box, ["day_boundary"], "Simulation day boundary", {
      type: "time",
      step: 1,
    });
    const loc = details(box, t("Override Home Assistant location"));
    if (p.location) {
      for (const key of ["latitude", "longitude", "elevation"])
        f.number(loc, ["location", key], key);
      loc.append(
        button(t("Use Home Assistant location"), () => {
          panel.change(["location"], undefined);
          panel.renderView();
        }),
      );
    } else
      loc.append(
        button(t("Set location"), () => {
          panel.change(["location"], {
            latitude: 0,
            longitude: 0,
            elevation: 0,
          });
          panel.renderView();
        }),
      );
    conditions(root, ["activation", "conditions"], "Activation conditions");
    root.append(
      el(
        "p",
        t(
          "Use exact native state lists. All top-level conditions must pass; unknown and unavailable block activation.",
        ),
      ),
    );
    const start = section(
        root,
        t("Quick start"),
        t(
          "Add a light group, evening on and bedtime off routines. These are editable draft settings.",
        ),
      ),
      lights = el("textarea", null, {
        "aria-label": t("Quick start light entities"),
        placeholder: "light.living_room\nlight.hall",
      });
    start.append(
      lights,
      button(t("Add evening template"), () =>
        panel.attempt(() => {
          const entities = lights.value
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);
          if (!entities.length) throw new Error(t("Choose at least one light"));
          const group = newItem(p, "group");
          group.name = "Evening lights";
          group.entities = entities;
          p.groups.push(group);
          const routine = newItem(p, "routine");
          routine.name = "Evening";
          p.routines.push(routine);
          const on = newItem(p, "step");
          on.name = "Evening on";
          on.actions[0].targets = { groups: [group.id] };
          on.when = { clock_range: { earliest: "18:00", latest: "18:30" } };
          routine.steps.push(on);
          const off = newItem(p, "step");
          off.name = "Bedtime";
          off.when = { clock_range: { earliest: "22:30", latest: "23:00" } };
          off.actions = [
            { action: "safety_off", targets: { groups: [group.id] } },
          ];
          routine.steps.push(off);
          p.lighting.managed_targets.groups.push(group.id);
          p.lighting.baseline.push({
            targets: { groups: [group.id] },
            state: "off",
          });
          panel.edited(true);
        }),
      ),
    );
  } else if (panel.tab === "groups") {
    collection(root, ["groups"], "group", (box, path, group) => {
      f.entities(box, [...path, "entities"], "Entities");
      const list = el("ul");
      for (const id of group.entities) {
        const e = panel.catalog.entities.find((x) => x.entity_id === id);
        list.append(
          el(
            "li",
            `${e?.name || id} · ${e?.area || "—"} · ${e ? (e.dimmable ? t("Dimmable") : t("On/off")) : t("Unresolved")} · ${e?.transition ? t("Native fade") : t("Stepped fallback")}`,
          ),
        );
      }
      box.append(list);
      const h = details(box, t("Group handover overrides"));
      handover(h, [...path, "handover"]);
    });
  } else if (panel.tab === "advanced_routines") {
    collection(root, ["routines"], "routine", (box, path) => {
      f.weekdays(box, [...path, "days"]);
      f.number(box, [...path, "probability"], "Probability", {
        min: 0,
        max: 1,
      });
      const d = details(box, t("Routine defaults"));
      defaults(d, [...path, "defaults"], true);
      collection(box, [...path, "steps"], "step", (b, ip, item) => {
        itemMeta(b, ip);
        when(b, [...ip, "when"], item.id);
        actions(b, [...ip, "actions"], "Actions");
      });
      collection(box, [...path, "activities"], "activity", (b, ip, item) => {
        itemMeta(b, ip);
        activity(b, ip, item);
      });
      collection(box, [...path, "activity_windows"], "window", (b, ip) => {
        itemMeta(b, ip);
        window(b, ip);
      });
    });
  } else if (panel.tab === "handover") {
    const box = section(
      root,
      t("Lighting handover"),
      t(
        "Converge observed lighting toward the projected state at completion. Only declared managed lights with baselines participate.",
      ),
    );
    f.targets(box, ["lighting", "managed_targets"]);
    f.number(
      box,
      ["lighting", "default_brightness_pct"],
      "Default brightness percent",
      { min: 1, max: 100 },
    );
    handover(box, ["lighting", "handover"]);
    f.list(
      root,
      ["lighting", "baseline"],
      "Baselines",
      () => ({ targets: { groups: [], entities: [] }, state: "off" }),
      (b, path, baseline) => {
        f.targets(b, [...path, "targets"]);
        f.select(b, [...path, "state"], "Baseline state", ["off", "on"], {
          rerender: true,
        });
        if (baseline.state === "on")
          f.number(b, [...path, "brightness_pct"], "Brightness percent", {
            optional: true,
            min: 1,
            max: 100,
          });
        advanced(b, path, "Advanced baseline color");
      },
    );
    for (const group of p.groups) {
      const box = details(
        root,
        `${group.name} · ${t("Group handover overrides")}`,
      );
      handover(box, ["groups", p.groups.indexOf(group), "handover"]);
    }
  } else if (panel.tab === "defaults") {
    defaults(section(root, t("Household defaults")), ["defaults"], false);
    const policy = section(root, t("Policies and constraints"));
    f.select(
      policy,
      ["policies", "lighting_stop_behavior"],
      "Lighting on stop",
      ["leave_states", "turn_off_owned"],
    );
    f.select(policy, ["policies", "manual_override"], "Outside control", [
      "yield_entity_until_next_activation",
      "authoritative_simulation",
    ]);
    f.select(policy, ["policies", "late_start"], "Late start", ["future_only"]);
    f.number(
      policy,
      ["constraints", "max_simultaneous_groups"],
      "Maximum simultaneous groups",
      { optional: true, min: 1, max: 1000, step: 1 },
    );
    f.number(
      policy,
      ["constraints", "generation_attempts"],
      "Bounded generation attempts",
      { min: 1, max: 256, step: 1 },
    );
  }
  // Explicit escape hatch for future schema fields and uncommon native service payloads.
  if (["household", "defaults", "handover"].includes(panel.tab))
    advanced(root, [], "Advanced full program");
}
