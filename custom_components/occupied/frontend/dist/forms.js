// Generated from forms.ts by pnpm run build. Do not edit.
import { errorMessage, isValueChangedEvent } from "./util.js";
import { get, set, copy, days } from "./model.js";
import { html, nothing, ifDefined, live, render, ref } from "./lit.js";
import { layout, section, button, currentValue } from "./form-layout.js";
export class Forms {
  panel;
  constructor(panel) {
    this.panel = panel;
  }
  field(parent, path, label, options = {}) {
    const panel = this.panel,
      value = get(panel.draft, path),
      key = JSON.stringify(path),
      id = `occupied-field-${path.map(String).join("-") || "program"}`;
    const invalid = ifDefined(panel.localErrors.has(key) ? "true" : undefined),
      help = ifDefined(options.help ? id + "-help" : undefined);
    const changed = (next) => {
      panel.change(path, next);
      options.onInput?.();
    };
    const onInput = (event) => {
      const control = event.currentTarget,
        text = control.value;
      let next = text;
      try {
        if (options.json) {
          panel.raw.set(key, text);
          next = text.trim()
            ? JSON.parse(text)
            : options.optional
              ? undefined
              : copy(options.initial ?? {});
          if (
            !path.length &&
            (!next || typeof next !== "object" || Array.isArray(next))
          )
            throw new Error("The program must be a JSON object");
        } else if (options.list)
          next = text
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);
        else if (options.type === "number") {
          if (!next && options.optional) next = undefined;
          else {
            next = Number(next);
            if (!Number.isFinite(next)) throw new Error("Enter a number");
          }
        } else if (options.optional && next === "") next = undefined;
        panel.localErrors.delete(key);
        control.removeAttribute("aria-invalid");
        changed(next);
      } catch (error) {
        panel.localErrors.set(key, `${label}: ${errorMessage(error)}`);
        control.setAttribute("aria-invalid", "true");
        panel.edited();
      }
    };
    let control;
    if (options.selector && customElements.get("ha-selector"))
      control = html`<ha-selector
        id=${id}
        aria-label=${label}
        aria-invalid=${invalid}
        aria-describedby=${help}
        .hass=${panel._hass}
        .selector=${options.selector}
        .value=${currentValue(() => get(panel.draft, path))}
        .label=${label}
        .required=${!options.optional}
        .narrow=${panel.hasAttribute("narrow")}
        @value-changed=${(event) => {
          if (!isValueChangedEvent(event)) return;
          event.currentTarget.value = event.detail.value;
          changed(event.detail.value);
        }}
      ></ha-selector>`;
    else if (options.choices) {
      const choices = options.choices.map((choice) =>
        typeof choice === "string" ? [choice, choice] : choice,
      );
      if (
        value != null &&
        !choices.some((choice) => String(choice[0]) === String(value))
      )
        choices.push([String(value), String(value)]);
      control = html`<select
        id=${id}
        aria-invalid=${invalid}
        aria-describedby=${help}
        .value=${currentValue(() =>
          live(
            get(panel.draft, path) == null
              ? ""
              : String(get(panel.draft, path)),
          ),
        )}
        @change=${(event) => {
          const selected = event.currentTarget.value;
          let next = selected === "" && options.optional ? undefined : selected;
          if (options.boolean && next !== undefined) next = next === "true";
          changed(next);
          if (options.rerender) panel.renderView();
          options.onChange?.();
        }}
      >
        ${options.optional
          ? html`<option value="">${panel.t("Inherit")}</option>`
          : nothing}${choices.map(
          ([v, name]) =>
            html`<option value=${String(v)}>${panel.t(name)}</option>`,
        )}
      </select>`;
    } else if (options.type === "checkbox")
      control = html`<input
        type="checkbox"
        id=${id}
        aria-invalid=${invalid}
        aria-describedby=${help}
        .checked=${currentValue(() => !!get(panel.draft, path))}
        @change=${(event) => {
          changed(event.currentTarget.checked);
          if (options.rerender) panel.renderView();
          options.onChange?.();
        }}
      />`;
    else {
      const text = () => {
        const value = get(panel.draft, path);
        return options.json
          ? (panel.raw.get(key) ??
              JSON.stringify(value ?? options.initial ?? {}, null, 2))
          : options.list
            ? (Array.isArray(value)
                ? value
                : value == null
                  ? []
                  : [value]
              ).join("\n")
            : String(value ?? "");
      };
      const change = () => options.onChange?.();
      control =
        options.json || options.multiline
          ? html`<textarea
              id=${id}
              rows=${options.json ? 5 : 3}
              data-json-path=${ifDefined(options.json ? key : undefined)}
              aria-invalid=${invalid}
              aria-describedby=${help}
              placeholder=${ifDefined(options.placeholder)}
              .value=${currentValue(() => live(text()))}
              @input=${onInput}
              @change=${change}
            ></textarea>`
          : html`<input
              id=${id}
              type=${options.type || "text"}
              min=${ifDefined(options.min)}
              max=${ifDefined(options.max)}
              step=${ifDefined(options.step)}
              placeholder=${ifDefined(options.placeholder)}
              list=${ifDefined(
                options.suggestions ? id + "-options" : undefined,
              )}
              aria-invalid=${invalid}
              aria-describedby=${help}
              .value=${currentValue(() => live(text()))}
              @input=${onInput}
              @change=${change}
            />`;
    }
    const template = html`<div class="field" data-path=${key}>
      <label for=${id}>${label}</label> ${options.suggestions
        ? html`<datalist id=${id + "-options"}>
            ${options.suggestions.map(
              (suggestion) =>
                html`<option
                  value=${typeof suggestion === "string"
                    ? suggestion
                    : suggestion[0]}
                  label=${typeof suggestion === "string"
                    ? suggestion
                    : suggestion[1]}
                ></option>`,
            )}
          </datalist>`
        : nothing}
      ${control}${options.help
        ? html`<small id=${id + "-help"}>${panel.t(options.help)}</small>`
        : nothing}
    </div>`;
    parent.append(template);
    return template;
  }
  text(parent, path, label, opts = {}) {
    return this.field(parent, path, this.panel.t(label), opts);
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
      suggestions: this.panel.catalog.entities.map((entity) => [
        entity.entity_id,
        `${entity.name} · ${entity.area || entity.domain}`,
      ]),
      help: "Fallback: one exact entity ID per line.",
    };
    if (customElements.get("ha-selector"))
      return this.text(parent, path, label, options);
    const t = this.panel.t;
    let query = "",
      picker,
      selected,
      manual;
    const selectedIds = () => {
      const value = get(this.panel.draft, path);
      return Array.isArray(value) ? value : value ? [value] : [];
    };
    const sync = () => {
      const input = manual.querySelector("input,textarea");
      if (input)
        input.value = multiple
          ? selectedIds().join("\n")
          : selectedIds()[0] || "";
      draw();
    };
    const draw = () =>
      render(
        html`${selectedIds().map((id) => {
          const entity = this.panel.catalog.entities.find(
            (entity) => entity.entity_id === id,
          );
          return html`<li>
            <span
              >${entity?.name || id} ·
              ${entity?.area || entity?.domain || t("Unresolved")} </span
            ><button
              type="button"
              @click=${() => {
                this.panel.change(
                  path,
                  multiple ? selectedIds().filter((next) => next !== id) : "",
                );
                sync();
              }}
            >
              ${t("Remove")}
            </button>
          </li>`;
        })}`,
        selected,
      );
    const filter = () => {
      const entities = this.panel.catalog.entities.filter((entity) =>
        `${entity.name} ${entity.area || ""} ${entity.entity_id}`
          .toLowerCase()
          .includes(query),
      );
      render(
        html`${entities.length
          ? entities
              .slice(0, 100)
              .map(
                (entity) =>
                  html`<option value=${entity.entity_id}>
                    ${entity.name} · ${entity.area || entity.domain} ·
                    ${entity.entity_id}
                  </option>`,
              )
          : html`<option value="">${t("No matching entities")}</option>`}`,
        picker,
      );
    };
    const fields = layout("div");
    this.text(fields, path, label, { ...options, onInput: draw });
    const template = html`<fieldset>
      <legend>${t(label)}</legend>
      <div class="row">
        <input
          type="search"
          aria-label=${`${t("Find entity")} · ${t(label)}`}
          placeholder=${t("Filter by name, area or entity ID")}
          @input=${(event) => {
            query = event.currentTarget.value.toLowerCase();
            filter();
          }}
        />
        <select
          ${ref((node) => {
            if (node) {
              picker = node;
              filter();
            }
          })}
          aria-label=${`${t("Available entities")} · ${t(label)}`}
        ></select>
        <button
          type="button"
          @click=${() => {
            if (picker.value) {
              this.panel.change(
                path,
                multiple
                  ? [...new Set([...selectedIds(), picker.value])]
                  : picker.value,
              );
              sync();
            }
          }}
        >
          ${t(multiple ? "Add entity" : "Use entity")}
        </button>
      </div>
      <details
        ${ref((node) => {
          if (node) manual = node;
        })}
      >
        <summary>${t("Exact entity IDs")}</summary>
        ${fields.template()}
      </details>
      <ul
        ${ref((node) => {
          if (node) {
            selected = node;
            draw();
          }
        })}
      ></ul>
    </fieldset>`;
    parent.append(template);
    return template;
  }
  range(parent, path, label, { optional = false, count = false } = {}) {
    const value = get(this.panel.draft, path),
      node = layout("fieldset");
    const mode = !value
      ? optional
        ? "inherit"
        : "fixed"
      : value.fixed != null
        ? "fixed"
        : "range";
    node.append(
      html`<legend>${this.panel.t(label)}</legend>
        <select
          aria-label=${this.panel.t(label) + " " + this.panel.t("Mode")}
          .value=${mode}
          @change=${(event) => {
            const next = event.currentTarget.value;
            this.panel.change(
              path,
              next === "inherit"
                ? undefined
                : next === "fixed"
                  ? { fixed: count ? 1 : "45m" }
                  : { min: count ? 1 : "5m", max: count ? 3 : "60m" },
              true,
            );
          }}
        >
          ${[
            ...(optional ? [["inherit", "Inherit"]] : []),
            ["fixed", "Fixed"],
            ["range", "Range"],
          ].map(
            ([id, text]) =>
              html`<option value=${id}>${this.panel.t(text)}</option>`,
          )}
        </select>`,
    );
    if (value)
      for (const key of value.fixed != null
        ? ["fixed"]
        : ["min", "max", ...(!count ? ["mode"] : [])])
        this.text(
          node,
          [...path, key],
          {
            fixed: "Value",
            min: "Minimum",
            max: "Maximum",
            mode: "Triangular peak",
          }[key],
          {
            optional: key === "mode",
            type: count ? "number" : "text",
            min: count ? 0 : undefined,
            step: count ? 1 : undefined,
            placeholder: count ? "1" : "45m",
            help: count
              ? undefined
              : "Use h/m/s units; signed offsets are allowed.",
          },
        );
    parent.append(node);
  }
  targets(parent, path) {
    const box = layout("fieldset");
    box.append(html`<legend>${this.panel.t("Targets")}</legend>`);
    this.entities(box, [...path, "entities"], "Entities");
    box.append(
      html`<p>${this.panel.t("Groups")}</p>
        <div class="checks" data-path=${JSON.stringify([...path, "groups"])}>
          ${(this.panel.draft.groups || []).map(
            (group) =>
              html`<label
                ><input
                  type="checkbox"
                  .checked=${currentValue(() =>
                    (get(this.panel.draft, [...path, "groups"]) || []).includes(
                      group.id,
                    ),
                  )}
                  @change=${(event) => {
                    const selected = new Set(
                      get(this.panel.draft, [...path, "groups"]) || [],
                    );
                    event.currentTarget.checked
                      ? selected.add(group.id)
                      : selected.delete(group.id);
                    this.panel.change([...path, "groups"], [...selected]);
                  }}
                />${group.name}</label
              >`,
          )}
        </div>`,
    );
    parent.append(box);
  }
  weekdays(parent, path, optional = false) {
    parent.append(
      html`<fieldset>
        <legend>${this.panel.t("Weekdays")}</legend>
        ${optional
          ? button(this.panel.t("Inherit routine days"), () =>
              this.panel.change(path, undefined, true),
            )
          : nothing}
        ${days.map(
          (day) =>
            html`<label class="check"
              ><input
                type="checkbox"
                .checked=${currentValue(() => {
                  const selected = get(this.panel.draft, path);
                  return selected == null || selected.includes(day);
                })}
                @change=${(event) => {
                  const next = new Set(get(this.panel.draft, path) || days);
                  event.currentTarget.checked
                    ? next.add(day)
                    : next.delete(day);
                  this.panel.change(path, [...next]);
                }}
              />${this.panel.t(day)}</label
            >`,
        )}
      </fieldset>`,
    );
  }
  list(parent, path, title, create, renderItem) {
    const box = section(parent, this.panel.t(title));
    for (const [index, value] of (
      get(this.panel.draft, path) || []
    ).entries()) {
      const item = layout("article"),
        toolbar = layout("div", null, { class: "row" });
      toolbar.append(
        html`<h3>${this.panel.t(title)} ${index + 1}</h3>`,
        button(this.panel.t("Remove"), () => {
          get(this.panel.draft, path).splice(index, 1);
          this.panel.edited(true);
        }),
      );
      if (index)
        toolbar.append(
          button(
            "↑",
            () => {
              const values = get(this.panel.draft, path);
              [values[index - 1], values[index]] = [
                values[index],
                values[index - 1],
              ];
              this.panel.edited(true);
            },
            { "aria-label": this.panel.t("Move up") },
          ),
        );
      item.append(toolbar);
      renderItem(item, [...path, index], value);
      box.append(item);
    }
    box.append(
      button(`${this.panel.t("Add")} ${this.panel.t(title)}`, () => {
        set(this.panel.draft, path, [
          ...(get(this.panel.draft, path) || []),
          create(),
        ]);
        this.panel.edited(true);
      }),
    );
  }
}
