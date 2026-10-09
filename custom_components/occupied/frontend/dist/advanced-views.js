// Generated from advanced-views.ts by pnpm run build. Do not edit.
import { solarEvents } from "./step-model.js";
import { Forms } from "./forms.js";
import { button, layout, section, details } from "./form-layout.js";
import { html, ref, render } from "./lit.js";
import {
  get,
  set,
  newItem,
  parentSteps,
  around,
  removeResource,
  duplicate,
} from "./model.js";
const distributions = ["uniform", "triangular"];
const targetOrders = ["ordered", "shuffled"];
const targetModes = ["all", "one", "subset", "weighted_subset"];
const stopBehaviors = ["end_if_owned", "leave_running"];
const yesNo = [
  ["false", "No"],
  ["true", "Yes"],
];
const advancedSections = [
  ["configuration", "Import, export and managed files"],
  ["advanced_routines", "Custom steps and activities"],
  ["groups", "Reusable entity groups"],
  ["household", "Household and location"],
  ["handover", "Lighting handover"],
  ["defaults", "Defaults and policies"],
  ["timeline", "Execution history"],
  ["diagnostics", "Diagnostics"],
];
// Pages that end with the raw JSON escape hatch for the whole program.
const fullProgramPages = ["household", "defaults", "handover"];
export function editView(panel) {
  return new AdvancedEditor(panel).render();
}
// Templates built here keep small pieces of local state (pending identifiers,
// preset choices) in closures. The panel rebuilds them only on renderView().
class AdvancedEditor {
  panel;
  f;
  program;
  constructor(panel) {
    this.panel = panel;
    this.f = new Forms(panel);
    this.program = panel.draft;
  }
  t = (text) => this.panel.t(text);
  render() {
    const root = layout("div");
    switch (this.panel.tab) {
      case "settings":
        this.settingsPage(root);
        break;
      case "household":
        this.householdPage(root);
        break;
      case "groups":
        this.groupsPage(root);
        break;
      case "advanced_routines":
        this.routinesPage(root);
        break;
      case "handover":
        this.handoverPage(root);
        break;
      case "defaults":
        this.defaultsPage(root);
        break;
    }
    // Explicit escape hatch for future schema fields and uncommon native service payloads.
    if (fullProgramPages.includes(this.panel.tab))
      this.advanced(root, [], "Advanced full program");
    return root.template();
  }
  /** Set several fields below path at once, then rebuild the view. */
  patch(path, values) {
    for (const [key, value] of Object.entries(values))
      set(this.panel.draft, [...path, key], value);
    this.panel.edited(true);
  }
  modeSelect(label, mode, modes, choose) {
    return html`<select
      aria-label=${label}
      .value=${mode}
      @change=${(event) => choose(event.currentTarget.value)}
    >
      ${modes.map(
        (value) => html`<option value=${value}>${this.t(value)}</option>`,
      )}
    </select>`;
  }
  stepChoices(child) {
    return parentSteps(this.program, child).map((s) => [
      s.id,
      `${s.name} · ${s.id}`,
    ]);
  }
  // --- Reusable sections --------------------------------------------------
  advanced(parent, path, title = "Advanced configuration") {
    const node = details(parent, this.t(title));
    node.append(
      layout(
        "p",
        this.t(
          "All fields are available here as Occupied JSON. Validate changes before saving.",
        ),
        { class: "hint" },
      ),
    );
    this.f.json(node, path, title);
    node.append(button(this.t("Refresh forms"), () => this.panel.renderView()));
  }
  identity(parent, path, kind) {
    const { f, t } = this;
    f.text(parent, [...path, "name"], "Name");
    f.text(parent, [...path, "description"], "Description", { optional: true });
    const item = get(this.program, path),
      row = layout("div", null, { class: "row" });
    row.append(layout("code", item.id));
    let identifier = "";
    row.append(
      html`<input
        aria-label=${t("New identifier")}
        placeholder="new_identifier"
        pattern="[a-z][a-z0-9_-]*"
        @input=${(event) => (identifier = event.currentTarget.value)}
      />`,
      button(t("Migrate identifier"), () =>
        this.panel.migrate(kind, item.id, identifier),
      ),
    );
    parent.append(row);
    parent.append(
      layout(
        "small",
        t(
          "Names are labels. Identifiers are stable; migration rewrites typed references.",
        ),
      ),
    );
  }
  itemMeta(parent, path) {
    const { f, t } = this;
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
      distributions,
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
  }
  when(parent, path, child) {
    const { f, t } = this;
    const value = get(this.program, path) || {},
      mode = value.entity_range
        ? "entity"
        : value.sun_range
          ? "sun"
          : value.relative_to
            ? "relative"
            : "clock";
    const box = layout("fieldset");
    box.append(layout("legend", t("Start time")));
    box.append(
      this.modeSelect(
        t("Time anchor"),
        mode,
        ["clock", "sun", "relative", "entity"],
        (next) =>
          this.panel.change(
            path,
            next === "entity"
              ? {
                  entity_range: {
                    entity_id: "",
                    offset_range: { fixed: "0s" },
                  },
                }
              : next === "sun"
                ? {
                    sun_range: { sun: "sunset", offset_range: { fixed: "0s" } },
                  }
                : next === "relative"
                  ? {
                      relative_to: this.stepChoices(child)[0]?.[0] || "",
                      offset_range: { fixed: "30m" },
                    }
                  : { clock_range: { earliest: "20:00", latest: "20:00" } },
            true,
          ),
      ),
    );
    if (mode === "clock") {
      const time = { type: "time", step: 1 };
      f.text(box, [...path, "clock_range", "earliest"], "Earliest", time);
      f.text(box, [...path, "clock_range", "latest"], "Latest", time);
      f.text(box, [...path, "clock_range", "mode"], "Triangular peak", {
        ...time,
        optional: true,
      });
      f.text(
        box,
        [...path, "clock_range", "cross_midnight"],
        "Cross midnight",
        { type: "checkbox" },
      );
      const approx = details(box, t("Around a time"));
      let clock = "20:00",
        spread = "15";
      approx.append(
        html`<input
            type="time"
            aria-label=${t("Approximate time")}
            .value=${clock}
            @input=${(event) => (clock = event.currentTarget.value)}
          />
          <input
            type="number"
            min="0"
            max="719"
            aria-label=${t("Minutes either side")}
            .value=${spread}
            @input=${(event) => (spread = event.currentTarget.value)}
          />`,
        button(t("Use approximate time"), () =>
          this.panel.attempt(() =>
            this.panel.change(
              path,
              { clock_range: around(clock, Number(spread)) },
              true,
            ),
          ),
        ),
      );
    } else if (mode === "sun") {
      f.select(box, [...path, "sun_range", "sun"], "Sun event", solarEvents);
      f.range(box, [...path, "sun_range", "offset_range"], "Sun offset");
      f.text(
        box,
        [...path, "sun_range", "fallback"],
        "Clock fallback when sun event is absent",
        { optional: true, type: "time", step: 1 },
      );
    } else if (mode === "entity") {
      f.entities(
        box,
        [...path, "entity_range", "entity_id"],
        "Time source",
        false,
      );
      f.select(
        box,
        [...path, "entity_range", "attribute"],
        "Calendar time",
        ["start_time", "end_time"],
        { optional: true },
      );
      f.range(
        box,
        [...path, "entity_range", "offset_range"],
        "Relative offset",
      );
    } else {
      f.select(
        box,
        [...path, "relative_to"],
        "After step",
        this.stepChoices(child),
      );
      f.range(box, [...path, "offset_range"], "Relative offset");
    }
    f.select(
      box,
      [...path, "distribution"],
      "Anchor distribution",
      distributions,
      { optional: true },
    );
    parent.append(box);
  }
  anchor(parent, path, title) {
    const { f, t } = this;
    const value = get(this.program, path) || {},
      mode = value.step ? "step" : value.sun ? "sun" : "clock",
      box = layout("fieldset");
    box.append(layout("legend", t(title)));
    box.append(
      this.modeSelect(
        t(title) + " " + t("Anchor"),
        mode,
        ["clock", "sun", "step"],
        (next) =>
          this.panel.change(
            path,
            next === "sun"
              ? { sun: "sunset" }
              : next === "step"
                ? { step: this.stepChoices()[0]?.[0] || "" }
                : { clock: "18:00" },
            true,
          ),
      ),
    );
    if (mode === "clock")
      f.text(box, [...path, "clock"], "Clock time", { type: "time", step: 1 });
    if (mode === "sun") {
      f.select(box, [...path, "sun"], "Sun event", solarEvents);
      f.text(
        box,
        [...path, "fallback"],
        "Clock fallback when sun event is absent",
        { optional: true, type: "time", step: 1 },
      );
    }
    if (mode === "step")
      f.select(box, [...path, "step"], "Step", this.stepChoices());
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
  }
  between(parent, path) {
    this.anchor(parent, [...path, "start"], "Window start");
    this.anchor(parent, [...path, "end"], "Window end");
    this.f.text(parent, [...path, "cross_midnight"], "Cross midnight", {
      type: "checkbox",
    });
  }
  conditions(parent, path, title) {
    const { f, t } = this;
    const stateCondition = () => ({
      condition: "state",
      entity_id: "",
      state: ["armed_away"],
    });
    f.list(parent, path, title, stateCondition, (box, cp, condition) => {
      box.append(
        this.modeSelect(
          t("Condition type"),
          condition.condition,
          ["state", "and", "or", "not"],
          (next) =>
            this.panel.change(
              cp,
              next === "state"
                ? stateCondition()
                : { condition: next, conditions: [] },
              true,
            ),
        ),
      );
      if (condition.condition !== "state") {
        this.conditions(box, [...cp, "conditions"], "Nested conditions");
        return;
      }
      const multi = Array.isArray(condition.entity_id);
      box.append(
        button(t(multi ? "Use one entity" : "Use multiple entities"), () =>
          this.panel.change(
            [...cp, "entity_id"],
            multi
              ? condition.entity_id?.[0] || ""
              : [condition.entity_id].filter(Boolean),
            true,
          ),
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
    });
  }
  handover(parent, path, partial = true) {
    const { f, t } = this;
    const optional = { optional: partial };
    f.text(parent, [...path, "duration"], "Handover duration", {
      ...optional,
      placeholder: "10m",
    });
    f.select(
      parent,
      [...path, "dimming"],
      "Dimming",
      ["auto", "stepped_only"],
      optional,
    );
    f.text(parent, [...path, "step_interval"], "Stepped fade interval", {
      ...optional,
      placeholder: "30s",
    });
    const box = details(parent, t("Handover policies"));
    f.select(
      box,
      [...path, "target"],
      "Convergence target",
      ["projected_state_at_completion"],
      optional,
    );
    f.select(
      box,
      [...path, "non_dimmable"],
      "On/off light behavior",
      ["stagger"],
      optional,
    );
    f.select(
      box,
      [...path, "cancel_behavior"],
      "Cancel a fade",
      ["hold_current"],
      optional,
    );
  }
  defaults(parent, path, partial) {
    const { f, t } = this;
    const optional = { optional: partial };
    f.select(
      parent,
      [...path, "time_distribution"],
      "Time distribution",
      distributions,
      optional,
    );
    f.number(parent, [...path, "probability"], "Probability", {
      ...optional,
      min: 0,
      max: 1,
    });
    f.select(
      parent,
      [...path, "target_order"],
      "Target order",
      targetOrders,
      optional,
    );
    f.range(parent, [...path, "stagger"], "Target stagger", optional);
    const windows = details(parent, t("Random window defaults"));
    const windowPath = [...path, "activity_windows"];
    f.range(windows, [...windowPath, "on_duration"], "On duration", optional);
    f.text(windows, [...windowPath, "min_gap"], "Minimum gap", {
      ...optional,
      placeholder: "0s",
    });
    f.select(windows, [...windowPath, "overlap"], "Allow overlap", yesNo, {
      ...optional,
      boolean: true,
    });
    f.select(
      windows,
      [...windowPath, "target_mode"],
      "Target mode",
      targetModes,
      optional,
    );
    const activities = details(parent, t("Timed activity defaults"));
    f.range(activities, [...path, "activities", "duration"], "Duration", {
      optional: true,
    });
    f.select(
      activities,
      [...path, "activities", "stop_behavior"],
      "Stop behavior",
      stopBehaviors,
      optional,
    );
    if (!partial)
      this.handover(
        details(parent, t("Default handover")),
        [...path, "handover"],
        false,
      );
  }
  actions(parent, path, title) {
    const { f, t } = this;
    const catalog = this.panel.catalog;
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
        const services = Object.entries(catalog.services).flatMap(
          ([domain, list]) =>
            Object.keys(list).map((name) => `${domain}.${name}`),
        );
        f.text(box, [...ap, "action"], "Service or typed action", {
          onChange: () => this.panel.renderView(),
          suggestions: [
            "turn_on",
            "turn_off",
            "safety_off",
            "event.fire",
            ...services,
          ],
        });
        f.targets(box, [...ap, "targets"]);
        const data = details(box, t("Service data"));
        data.open = true;
        const dataPath = [...ap, "data"];
        if (["turn_on", "light.turn_on"].includes(action.action)) {
          f.number(
            data,
            [...dataPath, "brightness_pct"],
            "Brightness percent",
            {
              optional: true,
              min: 0,
              max: 100,
            },
          );
          f.number(data, [...dataPath, "brightness"], "Brightness (0–255)", {
            optional: true,
            min: 0,
            max: 255,
            step: 1,
          });
          f.number(
            data,
            [...dataPath, "color_temp_kelvin"],
            "Color temperature (K)",
            { optional: true, min: 1, step: 1 },
          );
          f.number(
            data,
            [...dataPath, "transition"],
            "Native transition seconds",
            { optional: true, min: 0 },
          );
          f.json(data, [...dataPath, "hs_color"], "Hue/saturation pair", {
            optional: true,
          });
          f.json(data, [...dataPath, "rgb_color"], "RGB triplet", {
            optional: true,
          });
        } else {
          const [domain, service] = action.action.split("."),
            fields = catalog.services[domain]?.[service]?.fields || {};
          for (const [key, description] of Object.entries(fields)) {
            if (key === "entity_id") continue;
            f.text(data, [...dataPath, key], description.name || key, {
              optional: true,
              selector: description.selector,
              help: description.description,
            });
          }
          if (action.action === "event.fire") {
            f.text(data, [...dataPath, "event_type"], "Event type");
            f.json(data, [...dataPath, "event_data"], "Event data", {
              initial: {},
            });
          }
        }
        f.json(data, dataPath, "Advanced service data", { initial: {} });
        const dispatch = details(box, t("Dispatch and resources"));
        f.entities(dispatch, [...ap, "resources"], "Declared resources");
        f.select(
          dispatch,
          [...ap, "target_order"],
          "Target order",
          targetOrders,
          {
            optional: true,
          },
        );
        f.range(dispatch, [...ap, "stagger"], "Target stagger", {
          optional: true,
        });
        f.text(
          dispatch,
          [...ap, "replay_safe"],
          "Replay safe (allow one bounded retry)",
          { type: "checkbox" },
        );
      },
    );
  }
  activity(parent, path, item) {
    const { f, t } = this;
    this.when(parent, [...path, "when"], item.id);
    f.range(parent, [...path, "duration"], "Duration", { optional: true });
    f.entities(parent, [...path, "resources"], "Exclusive resources");
    this.harmonyPreset(
      details(parent, t("Harmony television preset")),
      path,
      item,
    );
    this.actions(parent, [...path, "on_start"], "Start actions");
    this.actions(parent, [...path, "on_end"], "End actions");
    this.conditions(parent, [...path, "start_conditions"], "Start conditions");
    this.conditions(
      parent,
      [...path, "ownership_conditions"],
      "Ownership conditions",
    );
    f.select(
      parent,
      [...path, "stop_behavior"],
      "Stop behavior",
      stopBehaviors,
      {
        optional: true,
      },
    );
    const bound = details(parent, t("Keep the activity within a window"));
    if (item.within) {
      this.between(bound, [...path, "within"]);
      bound.append(
        button(t("Remove window constraint"), () =>
          this.panel.change([...path, "within"], undefined, true),
        ),
      );
    } else
      bound.append(
        button(t("Add window constraint"), () =>
          this.panel.change(
            [...path, "within"],
            { start: { clock: "18:00" }, end: { clock: "23:00" } },
            true,
          ),
        ),
      );
  }
  harmonyPreset(box, path, item) {
    const { t } = this,
      catalog = this.panel.catalog;
    let remote = "",
      activityName = "Watch TV",
      list;
    box.append(
      html`<select
          aria-label=${t("Remote")}
          @change=${(event) => {
            remote = event.currentTarget.value;
            const activities =
              catalog.entities.find((entity) => entity.entity_id === remote)
                ?.activities || [];
            render(
              html`${activities.map(
                (name) => html`<option value=${name}></option>`,
              )}`,
              list,
            );
          }}
        >
          <option value="">${t("Choose a remote")}</option>
          ${catalog.entities
            .filter((entity) => entity.domain === "remote")
            .map(
              (entity) =>
                html`<option value=${entity.entity_id}>${entity.name}</option>`,
            )}
        </select>
        <input
          aria-label=${t("Remote activity")}
          placeholder="Watch TV"
          list=${`activities-${item.id}`}
          .value=${activityName}
          @input=${(event) => (activityName = event.currentTarget.value)}
        />
        <datalist
          id=${`activities-${item.id}`}
          ${ref((node) => {
            if (node) list = node;
          })}
        ></datalist>`,
      button(t("Use TV preset"), () => {
        if (!remote || !activityName)
          return this.panel.fail(t("Choose a remote and activity name"));
        this.panel.change(
          path,
          {
            ...item,
            when: { clock_range: around("20:00", 15) },
            duration: { fixed: "45m" },
            resources: [remote],
            on_start: [
              {
                action: "remote.turn_on",
                targets: { entities: [remote] },
                data: { activity: activityName },
              },
            ],
            on_end: [
              { action: "remote.turn_off", targets: { entities: [remote] } },
            ],
            start_conditions: [
              { condition: "state", entity_id: remote, state: "off" },
            ],
            ownership_conditions: [
              {
                condition: "state",
                entity_id: remote,
                attribute: "current_activity",
                state: activityName,
              },
            ],
            stop_behavior: "end_if_owned",
          },
          true,
        );
      }),
    );
  }
  activityWindow(parent, path) {
    const { f, t } = this;
    const item = get(this.program, path) || {};
    this.between(parent, [...path, "between"]);
    f.range(parent, [...path, "cycles"], "Cycle count", { count: true });
    const generic = !!(item.on_start?.length || item.on_end?.length);
    if (generic) {
      this.actions(parent, [...path, "on_start"], "Start actions");
      this.actions(parent, [...path, "on_end"], "End actions");
      parent.append(
        button(t("Use light/switch targets instead"), () =>
          this.patch(path, {
            on_start: [],
            on_end: [],
            targets: { groups: [], entities: [] },
          }),
        ),
      );
    } else {
      f.targets(parent, [...path, "targets"]);
      parent.append(
        button(t("Use generic start/end actions"), () => {
          const sceneAction = () => ({
            action: "scene.turn_on",
            targets: { entities: [] },
            data: {},
          });
          this.patch(path, {
            targets: { groups: [], entities: [] },
            data: {},
            target_mode: undefined,
            subset_size: undefined,
            weights: undefined,
            on_start: [sceneAction()],
            on_end: [sceneAction()],
          });
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
    f.select(parent, [...path, "overlap"], "Allow overlap", yesNo, {
      optional: true,
      boolean: true,
    });
    if (!generic) {
      f.select(parent, [...path, "target_mode"], "Target mode", targetModes, {
        optional: true,
      });
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
  }
  /** A list of named resources with a selector, CRUD toolbar and editor. */
  collection(parent, path, kind, renderItem) {
    const { panel, program, t } = this,
      key = JSON.stringify(path),
      values = get(program, path) || [],
      select = (index) => panel.selection.set(key, index),
      nav = layout("div", null, { class: "resource-nav" });
    values.forEach((item, i) =>
      nav.append(
        button(item.name, () => {
          select(i);
          panel.renderView();
        }),
      ),
    );
    nav.append(
      button(`${t("Add")} ${t(kind)}`, () => {
        const item = newItem(program, kind);
        if (!get(program, path)) panel.change(path, []);
        const list = get(program, path);
        list.push(item);
        select(list.length - 1);
        panel.edited(true);
      }),
    );
    parent.append(nav);
    const i = Math.min(panel.selection.get(key) || 0, values.length - 1);
    if (i < 0) {
      parent.append(layout("p", t("Add an item to begin.")));
      return;
    }
    const itemPath = [...path, i],
      box = section(parent, values[i].name),
      toolbar = layout("div", null, { class: "row" });
    toolbar.append(
      button(t("Duplicate"), () =>
        panel.attempt(() => {
          duplicate(program, itemPath);
          select(values.length - 1);
          panel.edited(true);
        }),
      ),
      button(t("Delete"), () =>
        panel.attempt(() => {
          removeResource(program, itemPath);
          panel.edited(true);
        }),
      ),
    );
    box.append(toolbar);
    this.identity(box, itemPath, kind);
    renderItem(box, itemPath, values[i]);
    this.advanced(box, itemPath);
  }
  // --- Pages --------------------------------------------------------------
  settingsPage(root) {
    const { panel, t } = this;
    const box = section(
      root,
      t("Settings"),
      t(
        "Choose when Occupied may run. Home Assistant supplies your location and timezone.",
      ),
    );
    this.conditions(box, ["activation", "conditions"], "Only run when");
    box.append(
      layout(
        "p",
        t(
          "With no conditions, turning on the simulation allows it to run. All configured conditions must match.",
        ),
        { class: "hint" },
      ),
    );
    const dryRun = !!panel.status?.dry_run;
    const execution = section(root, t("Simulation"));
    execution.append(
      layout(
        "p",
        dryRun
          ? t("Dry run is on. Devices are not controlled.")
          : t("Live mode controls devices when the simulation is on."),
        { class: "hint" },
      ),
      button(
        t(dryRun ? "Use live mode" : "Use dry run"),
        () =>
          panel
            .control("set_dry_run", { dry_run: !dryRun })
            .then(() => panel.renderView()),
        { disabled: panel.busy ? "" : undefined },
      ),
      button(t("Runtime details"), () => panel.navigate("overview")),
    );
    const advancedBox = details(root, t("Advanced settings"));
    advancedBox.append(
      layout(
        "p",
        t(
          "Existing custom routines and installation settings remain available here.",
        ),
        { class: "hint" },
      ),
    );
    let selected = "configuration";
    advancedBox.append(
      html`<select
        aria-label=${t("Advanced settings section")}
        @change=${(event) => (selected = event.currentTarget.value)}
      >
        ${advancedSections.map(
          ([value, label]) => html`<option value=${value}>${t(label)}</option>`,
        )}
      </select>`,
      button(t("Open"), () => panel.navigate(selected)),
    );
  }
  householdPage(root) {
    const { panel, program: p, f, t } = this;
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
    const location = details(box, t("Override Home Assistant location"));
    if (p.location) {
      for (const key of ["latitude", "longitude", "elevation"])
        f.number(location, ["location", key], key);
      location.append(
        button(t("Use Home Assistant location"), () =>
          panel.change(["location"], undefined, true),
        ),
      );
    } else
      location.append(
        button(t("Set location"), () =>
          panel.change(
            ["location"],
            { latitude: 0, longitude: 0, elevation: 0 },
            true,
          ),
        ),
      );
    this.conditions(
      root,
      ["activation", "conditions"],
      "Activation conditions",
    );
    root.append(
      layout(
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
    );
    let lights;
    start.append(
      html`<textarea
        ${ref((node) => {
          if (node) lights = node;
        })}
        aria-label=${t("Quick start light entities")}
        placeholder="light.living_room
light.hall"
      ></textarea>`,
      button(t("Add evening template"), () =>
        panel.attempt(() => {
          const entities = lights.value
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);
          if (!entities.length) throw new Error(t("Choose at least one light"));
          addEveningTemplate(p, entities);
          panel.edited(true);
        }),
      ),
    );
  }
  groupsPage(root) {
    const { f, t } = this,
      catalog = this.panel.catalog;
    this.collection(root, ["groups"], "group", (box, path, group) => {
      f.entities(box, [...path, "entities"], "Entities");
      const list = layout("ul");
      for (const id of group.entities) {
        const e = catalog.entities.find((x) => x.entity_id === id);
        const capability = e
          ? e.dimmable
            ? t("Dimmable")
            : t("On/off")
          : t("Unresolved");
        const fade = e?.transition ? t("Native fade") : t("Stepped fallback");
        list.append(
          layout(
            "li",
            `${e?.name || id} · ${e?.area || "—"} · ${capability} · ${fade}`,
          ),
        );
      }
      box.append(list);
      this.handover(details(box, t("Group handover overrides")), [
        ...path,
        "handover",
      ]);
    });
  }
  routinesPage(root) {
    const { f, t } = this;
    this.collection(root, ["routines"], "routine", (box, path) => {
      f.weekdays(box, [...path, "days"]);
      f.number(box, [...path, "probability"], "Probability", {
        min: 0,
        max: 1,
      });
      this.defaults(
        details(box, t("Routine defaults")),
        [...path, "defaults"],
        true,
      );
      this.collection(box, [...path, "steps"], "step", (b, ip, item) => {
        this.itemMeta(b, ip);
        this.when(b, [...ip, "when"], item.id);
        this.actions(b, [...ip, "actions"], "Actions");
      });
      this.collection(
        box,
        [...path, "activities"],
        "activity",
        (b, ip, item) => {
          this.itemMeta(b, ip);
          this.activity(b, ip, item);
        },
      );
      this.collection(box, [...path, "activity_windows"], "window", (b, ip) => {
        this.itemMeta(b, ip);
        this.activityWindow(b, ip);
      });
    });
  }
  handoverPage(root) {
    const { program: p, f, t } = this;
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
    this.handover(box, ["lighting", "handover"]);
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
        this.advanced(b, path, "Advanced baseline color");
      },
    );
    (p.groups || []).forEach((group, index) =>
      this.handover(
        details(root, `${group.name} · ${t("Group handover overrides")}`),
        ["groups", index, "handover"],
      ),
    );
  }
  defaultsPage(root) {
    const { f, t } = this;
    this.defaults(section(root, t("Household defaults")), ["defaults"], false);
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
}
/** Add a light group with evening-on and bedtime-off steps to the program. */
function addEveningTemplate(p, entities) {
  const group = newItem(p, "group");
  group.name = "Evening lights";
  group.entities = entities;
  (p.groups ||= []).push(group);
  const routine = newItem(p, "routine");
  routine.name = "Evening";
  (p.routines ||= []).push(routine);
  const on = newItem(p, "step");
  on.name = "Evening on";
  on.actions[0].targets = { groups: [group.id] };
  on.when = { clock_range: { earliest: "18:00", latest: "18:30" } };
  routine.steps.push(on);
  const off = newItem(p, "step");
  off.name = "Bedtime";
  off.when = { clock_range: { earliest: "22:30", latest: "23:00" } };
  off.actions = [{ action: "safety_off", targets: { groups: [group.id] } }];
  routine.steps.push(off);
  ((p.lighting ||= {}).managed_targets ||= {}).groups ||= [];
  p.lighting.managed_targets.groups.push(group.id);
  (p.lighting.baseline ||= []).push({
    targets: { groups: [group.id] },
    state: "off",
  });
}
