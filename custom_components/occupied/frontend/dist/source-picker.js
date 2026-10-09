// Generated from source-picker.ts by pnpm run build. Do not edit.
import { isValueChangedEvent } from "./util.js";
import { html, render, ref, ifDefined, nothing } from "./lit.js";
export function sourcePicker({
  hass,
  choices,
  value,
  t,
  onChange,
  error = "",
}) {
  const select = (event) => {
    if (!isValueChangedEvent(event)) return;
    const next =
      typeof event.detail.value === "string" ? event.detail.value : "";
    if (next && !choices.some((choice) => choice.value === next)) return;
    const control = event.currentTarget;
    control.selectedValue = next;
    control.value = next || undefined;
    onChange(next);
  };
  const message = error
    ? html`<p
        class="error"
        id="routine-error-anchor"
        data-builder-error="anchor"
        role="alert"
      >
        ${error}
      </p>`
    : nothing;
  if (customElements.get("ha-generic-picker")) {
    const items = [];
    let group;
    for (const choice of choices) {
      if (group !== choice.group) {
        group = choice.group;
        items.push(t(group));
      }
      items.push({
        id: choice.value,
        primary: t(choice.name),
        secondary: choice.entity_id,
        group: t(choice.group),
      });
    }
    return html`<div class="field source-picker">
      <ha-generic-picker
        id="routine-anchor"
        data-builder-field="anchor"
        aria-label=${t("Relative to")}
        aria-invalid=${ifDefined(error ? "true" : undefined)}
        aria-describedby=${ifDefined(
          error ? "routine-error-anchor" : undefined,
        )}
        .hass=${hass}
        .sourceChoices=${choices}
        .selectedValue=${value}
        .value=${value || undefined}
        .label=${t("Relative to")}
        .searchLabel=${t("Search steps or time sources")}
        .placeholder=${t("Choose a step or event")}
        .notFoundLabel=${t("No matching steps or time sources.")}
        .getItems=${() => items}
        .searchKeys=${["primary", "secondary", "id", "group"]}
        .valueRenderer=${(id) => {
          // HA's renderer contract takes an HTMLElement, rather than a template.
          const headline = document.createElement("span");
          headline.slot = "headline";
          render(
            html`${t(choices.find((choice) => choice.value === id)?.name || id)}`,
            headline,
          );
          return headline;
        }}
        .allowCustomValue=${false}
        .noSort=${true}
        .required=${true}
        .invalid=${!!error}
        .errorMessage=${error}
        tabindex="0"
        @value-changed=${select}
      >
      </ha-generic-picker
      >${message}
    </div>`;
  }
  let picker;
  let results;
  let status;
  let matches = [],
    active = -1,
    open = false;
  const selectedName = () =>
    t(
      choices.find((choice) => choice.value === picker.selectedValue)?.name ||
        picker.selectedValue ||
        "",
    );
  const draw = () => {
    results.hidden = !open;
    picker.setAttribute("aria-expanded", String(open));
    if (active >= 0 && open)
      picker.setAttribute("aria-activedescendant", `source-option-${active}`);
    else picker.removeAttribute("aria-activedescendant");
    const text = matches.length
      ? `${matches.length} ${t("matching sources")}`
      : t("No matching steps or time sources.");
    render(
      html`${matches.map(
        (choice, index) =>
          html` ${index === 0 || matches[index - 1].group !== choice.group
              ? html`<div class="source-group" role="presentation">
                  ${t(choice.group)}
                </div>`
              : nothing}
            <div
              id=${`source-option-${index}`}
              role="option"
              aria-selected=${String(index === active)}
              data-source-value=${choice.value}
              @pointerdown=${(event) => event.preventDefault()}
              @click=${() => {
                close();
                onChange(choice.value);
              }}
            >
              <strong>${t(choice.name)}</strong>${choice.entity_id
                ? html`<small>${choice.entity_id}</small>`
                : nothing}
            </div>`,
      )}${!matches.length ? html`<p class="hint">${text}</p>` : nothing}`,
      results,
    );
    status.textContent = open ? text : "";
    if (open && active >= 0)
      results
        .querySelector(`#source-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  };
  const show = (query = "") => {
    matches = choices.filter((choice) =>
      `${t(choice.name)} ${t(choice.group)} ${choice.entity_id || ""} ${choice.value}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    );
    active = -1;
    open = true;
    draw();
  };
  const close = () => {
    open = false;
    active = -1;
    picker.value = selectedName();
    draw();
  };
  return html`<div class="field source-picker">
    <label for="routine-anchor">${t("Relative to")}</label>
    <input
      ${ref((node) => {
        if (node) picker = node;
      })}
      id="routine-anchor"
      type="search"
      data-builder-field="anchor"
      aria-label=${t("Relative to")}
      placeholder=${t("Search steps or time sources")}
      role="combobox"
      aria-autocomplete="list"
      aria-controls="relative-source-results"
      aria-expanded="false"
      aria-invalid=${ifDefined(error ? "true" : undefined)}
      aria-describedby=${ifDefined(error ? "routine-error-anchor" : undefined)}
      .sourceChoices=${choices}
      .selectedValue=${value}
      .invalid=${!!error}
      .errorMessage=${error}
      .value=${t(
        choices.find((choice) => choice.value === value)?.name || value || "",
      )}
      @value-changed=${select}
      @focus=${() => {
        if (picker.suppressNextOpen) picker.suppressNextOpen = false;
        else show();
      }}
      @input=${() => show(picker.value)}
      @blur=${close}
      @keydown=${(event) => {
        if (["ArrowDown", "ArrowUp"].includes(event.key)) {
          event.preventDefault();
          if (!open) show();
          if (!matches.length) return;
          active =
            (active + (event.key === "ArrowDown" ? 1 : -1) + matches.length) %
            matches.length;
          draw();
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (open && matches[active]) {
            const next = matches[active].value;
            close();
            onChange(next);
          }
        } else if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    />
    <div
      ${ref((node) => {
        if (node) results = node;
      })}
      id="relative-source-results"
      class="source-results"
      role="listbox"
      aria-label=${t("Steps and time sources")}
      hidden
    ></div>
    <small
      ${ref((node) => {
        if (node) status = node;
      })}
      aria-live="polite"
      data-source-status
    ></small
    >${message}
  </div>`;
}
