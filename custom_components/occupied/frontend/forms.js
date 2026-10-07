import { get, set, copy } from "./model.js";
let serial = 0;
export function el(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  for (const [k, v] of Object.entries(attrs))
    if (v !== undefined) node.setAttribute(k, v);
  return node;
}
export function button(label, action, attrs = {}) {
  const node = el("button", label, { type: "button", ...attrs });
  node.addEventListener("click", action);
  return node;
}
export function section(parent, title, help) {
  const node = el("section");
  node.append(el("h2", title));
  if (help) node.append(el("p", help, { class: "hint" }));
  parent.append(node);
  return node;
}
export function details(parent, title) {
  const node = el("details");
  node.append(el("summary", title));
  parent.append(node);
  return node;
}
export class Forms {
  constructor(panel) {
    this.p = panel;
  }
  field(parent, path, label, options = {}) {
    const panel = this.p,
      value = get(panel.draft, path),
      key = JSON.stringify(path);
    const wrap = el("div", null, { class: "field", "data-path": key });
    const id = `occupied-field-${++serial}`,
      caption = el("label", label, { for: id });
    wrap.append(caption);
    let input;
    // Public panel contract; optional private selector is used only when already registered.
    if (options.selector && customElements.get("ha-selector")) {
      input = el("ha-selector", null, { id });
      input.hass = panel._hass;
      input.selector = options.selector;
      input.value = value;
      input.label = label;
      input.required = !options.optional;
      input.narrow = panel.hasAttribute("narrow");
      input.setAttribute("aria-label", label);
      input.addEventListener("value-changed", (e) => {
        if (!e.detail || !("value" in e.detail)) return;
        // Native pickers emit changes without updating their ha-selector
        // wrapper. Feed the value back before the next hass update renders it.
        input.value = e.detail.value;
        panel.change(path, e.detail.value);
      });
    } else if (options.choices) {
      input = el("select", null, { id });
      if (options.optional)
        input.append(el("option", panel.t("Inherit"), { value: "" }));
      const choices = options.choices.map((x) =>
        typeof x === "string" ? [x, x] : x,
      );
      if (value != null && !choices.some((x) => String(x[0]) === String(value)))
        choices.push([value, String(value)]);
      for (const [v, name] of choices)
        input.append(el("option", panel.t(name), { value: String(v) }));
      input.value = value == null ? "" : String(value);
      input.addEventListener("change", () => {
        let next =
          input.value === "" && options.optional ? undefined : input.value;
        if (options.boolean && next !== undefined) next = next === "true";
        panel.change(path, next);
        if (options.rerender) panel.renderView();
      });
    } else if (options.type === "checkbox") {
      input = el("input", null, { type: "checkbox", id });
      input.checked = !!value;
      input.addEventListener("change", () => {
        panel.change(path, input.checked);
        if (options.rerender) panel.renderView();
      });
    } else {
      input = el(
        options.json || options.multiline ? "textarea" : "input",
        null,
        { id, type: options.type || "text" },
      );
      if (options.json)
        input.value =
          panel.raw.get(key) ??
          JSON.stringify(value ?? options.initial ?? {}, null, 2);
      else if (options.list)
        input.value = (
          Array.isArray(value) ? value : value == null ? [] : [value]
        ).join("\n");
      else input.value = value ?? "";
      if (options.json || options.list) input.rows = options.json ? 5 : 3;
      if (options.json) input.dataset.jsonPath = key;
      if (options.min != null) input.min = options.min;
      if (options.max != null) input.max = options.max;
      if (options.step != null) input.step = options.step;
      if (options.placeholder) input.placeholder = options.placeholder;
      if (options.suggestions) {
        const list = el("datalist", null, { id: id + "-options" });
        for (const suggestion of options.suggestions)
          list.append(
            el("option", null, {
              value:
                typeof suggestion === "string" ? suggestion : suggestion[0],
              label:
                typeof suggestion === "string" ? suggestion : suggestion[1],
            }),
          );
        input.setAttribute("list", list.id);
        wrap.append(list);
      }
      input.addEventListener("input", () => {
        let next = input.value;
        try {
          if (options.json) {
            panel.raw.set(key, next);
            next = next.trim()
              ? JSON.parse(next)
              : options.optional
                ? undefined
                : copy(options.initial ?? {});
            if (
              !path.length &&
              (!next || typeof next !== "object" || Array.isArray(next))
            )
              throw new Error("The program must be a JSON object");
          } else if (options.list)
            next = next
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean);
          else if (options.type === "number") {
            if (!next && options.optional) next = undefined;
            else {
              next = Number(next);
              if (!Number.isFinite(next)) throw new Error("Enter a number");
            }
          } else if (options.optional && next === "") next = undefined;
          panel.localErrors.delete(key);
          input.removeAttribute("aria-invalid");
          panel.change(path, next);
        } catch (error) {
          panel.localErrors.set(key, `${label}: ${error.message}`);
          input.setAttribute("aria-invalid", "true");
          panel.edited();
        }
      });
    }
    wrap.append(input);
    if (options.help) {
      const hint = el("small", panel.t(options.help), { id: id + "-help" });
      wrap.append(hint);
      input.setAttribute("aria-describedby", hint.id);
    }
    if (panel.localErrors.has(key)) input.setAttribute("aria-invalid", "true");
    parent.append(wrap);
    return input;
  }
  text(parent, path, label, opts = {}) {
    return this.field(parent, path, this.p.t(label), opts);
  }
  number(parent, path, label, opts = {}) {
    return this.text(parent, path, label, {
      type: "number",
      step: "any",
      ...opts,
    });
  }
  select(parent, path, label, choices, opts = {}) {
    return this.text(parent, path, label, { choices, ...opts });
  }
  json(parent, path, label, opts = {}) {
    return this.text(parent, path, label, { json: true, ...opts });
  }
  entities(parent, path, label, multiple = true) {
    const options = {
      list: multiple,
      multiline: multiple,
      selector: { entity: { multiple } },
      suggestions: this.p.catalog.entities.map((x) => [
        x.entity_id,
        `${x.name} · ${x.area || x.domain}`,
      ]),
      help: "Fallback: one exact entity ID per line.",
    };
    if (customElements.get("ha-selector"))
      return this.text(parent, path, label, options);
    const box = el("fieldset"),
      search = el("input", null, {
        type: "search",
        "aria-label": `${this.p.t("Find entity")} · ${this.p.t(label)}`,
        placeholder: this.p.t("Filter by name, area or entity ID"),
      });
    const picker = el("select", null, {
      "aria-label": `${this.p.t("Available entities")} · ${this.p.t(label)}`,
    });
    const selected = el("ul");
    const manual = details(box, this.p.t("Exact entity IDs"));
    const input = this.text(manual, path, label, options);
    const draw = () => {
      const value = get(this.p.draft, path),
        ids = Array.isArray(value) ? value : value ? [value] : [];
      selected.replaceChildren();
      for (const id of ids) {
        const entity = this.p.catalog.entities.find((x) => x.entity_id === id),
          row = el("li");
        row.append(
          el(
            "span",
            `${entity?.name || id} · ${entity?.area || entity?.domain || this.p.t("Unresolved")} `,
          ),
          button(this.p.t("Remove"), () => {
            this.p.change(path, multiple ? ids.filter((x) => x !== id) : "");
            sync();
          }),
        );
        selected.append(row);
      }
    };
    const sync = () => {
      const value = get(this.p.draft, path);
      input.value = multiple ? (value || []).join("\n") : value || "";
      draw();
    };
    const filter = () => {
      picker.replaceChildren();
      const value = search.value.toLowerCase();
      const entities = this.p.catalog.entities.filter((x) =>
        `${x.name} ${x.area || ""} ${x.entity_id}`
          .toLowerCase()
          .includes(value),
      );
      for (const entity of entities.slice(0, 100))
        picker.append(
          el(
            "option",
            `${entity.name} · ${entity.area || entity.domain} · ${entity.entity_id}`,
            { value: entity.entity_id },
          ),
        );
      if (!entities.length)
        picker.append(
          el("option", this.p.t("No matching entities"), { value: "" }),
        );
    };
    search.addEventListener("input", filter);
    input.addEventListener("input", draw);
    const row = el("div", null, { class: "row" });
    row.append(
      search,
      picker,
      button(this.p.t(multiple ? "Add entity" : "Use entity"), () => {
        if (picker.value) {
          this.p.change(
            path,
            multiple
              ? [...new Set([...(get(this.p.draft, path) || []), picker.value])]
              : picker.value,
          );
          sync();
        }
      }),
    );
    box.prepend(row);
    box.prepend(el("legend", this.p.t(label)));
    box.append(selected);
    parent.append(box);
    filter();
    draw();
    return input;
  }
  range(parent, path, label, { optional = false, count = false } = {}) {
    const value = get(this.p.draft, path),
      node = el("fieldset");
    node.append(el("legend", this.p.t(label)));
    const mode = el("select", null, {
      "aria-label": this.p.t(label) + " " + this.p.t("Mode"),
    });
    for (const [id, text] of [
      ...(optional ? [["inherit", "Inherit"]] : []),
      ["fixed", "Fixed"],
      ["range", "Range"],
    ])
      mode.append(el("option", this.p.t(text), { value: id }));
    mode.value = !value
      ? optional
        ? "inherit"
        : "fixed"
      : value.fixed != null
        ? "fixed"
        : "range";
    node.append(mode);
    mode.addEventListener("change", () => {
      this.p.change(
        path,
        mode.value === "inherit"
          ? undefined
          : mode.value === "fixed"
            ? { fixed: count ? 1 : "45m" }
            : { min: count ? 1 : "5m", max: count ? 3 : "60m" },
      );
      this.p.renderView();
    });
    if (value) {
      for (const k of value.fixed != null
        ? ["fixed"]
        : ["min", "max", ...(!count ? ["mode"] : [])]) {
        this.text(
          node,
          [...path, k],
          {
            fixed: "Value",
            min: "Minimum",
            max: "Maximum",
            mode: "Triangular peak",
          }[k],
          {
            optional: k === "mode",
            type: count ? "number" : "text",
            min: count ? 0 : undefined,
            step: count ? 1 : undefined,
            placeholder: count ? "1" : "45m",
            help: count
              ? undefined
              : "Use h/m/s units; signed offsets are allowed.",
          },
        );
      }
    }
    parent.append(node);
  }
  targets(parent, path) {
    const box = el("fieldset");
    box.append(el("legend", this.p.t("Targets")));
    this.entities(box, [...path, "entities"], "Entities");
    const groupBox = el("div", null, {
      class: "checks",
      "data-path": JSON.stringify([...path, "groups"]),
    });
    for (const group of this.p.draft.groups || []) {
      const label = el("label"),
        input = el("input", null, { type: "checkbox" });
      input.checked = (get(this.p.draft, [...path, "groups"]) || []).includes(
        group.id,
      );
      input.addEventListener("change", () => {
        const selected = new Set(get(this.p.draft, [...path, "groups"]) || []);
        input.checked ? selected.add(group.id) : selected.delete(group.id);
        this.p.change([...path, "groups"], [...selected]);
      });
      label.append(input, document.createTextNode(group.name));
      groupBox.append(label);
    }
    box.append(el("p", this.p.t("Groups")), groupBox);
    parent.append(box);
  }
  weekdays(parent, path, optional = false) {
    const box = el("fieldset");
    box.append(el("legend", this.p.t("Weekdays")));
    if (optional)
      box.append(
        button(this.p.t("Inherit routine days"), () => {
          this.p.change(path, undefined);
          this.p.renderView();
        }),
      );
    const selected = get(this.p.draft, path);
    for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
      const label = el("label", null, { class: "check" }),
        input = el("input", null, { type: "checkbox" });
      input.checked = selected == null ? true : selected.includes(day);
      input.addEventListener("change", () => {
        const next = new Set(
          get(this.p.draft, path) || [
            "mon",
            "tue",
            "wed",
            "thu",
            "fri",
            "sat",
            "sun",
          ],
        );
        input.checked ? next.add(day) : next.delete(day);
        this.p.change(path, [...next]);
      });
      label.append(input, document.createTextNode(this.p.t(day)));
      box.append(label);
    }
    parent.append(box);
  }
  list(parent, path, title, create, render) {
    const box = section(parent, this.p.t(title));
    for (const [i, value] of (get(this.p.draft, path) || []).entries()) {
      const item = el("article"),
        toolbar = el("div", null, { class: "row" });
      toolbar.append(
        el("h3", `${this.p.t(title)} ${i + 1}`),
        button(this.p.t("Remove"), () => {
          get(this.p.draft, path).splice(i, 1);
          this.p.edited(true);
        }),
      );
      if (i)
        toolbar.append(
          button(
            "↑",
            () => {
              const list = get(this.p.draft, path);
              [list[i - 1], list[i]] = [list[i], list[i - 1]];
              this.p.edited(true);
            },
            { "aria-label": this.p.t("Move up") },
          ),
        );
      item.append(toolbar);
      render(item, [...path, i], value);
      box.append(item);
    }
    box.append(
      button(`${this.p.t("Add")} ${this.p.t(title)}`, () => {
        set(this.p.draft, path, [...(get(this.p.draft, path) || []), create()]);
        this.p.edited(true);
      }),
    );
  }
}
