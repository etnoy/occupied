import type {
  HomeAssistant,
  TimeSource,
  Translate,
  PickerItem,
  HaGenericPicker,
  SourcePickerState,
} from "./types.js";
import { el } from "./forms.js";

// HA's generic picker accepts custom items, unlike an entity-only selector.
export function sourcePicker(
  parent: HTMLElement,
  {
    hass,
    choices,
    value,
    t,
    onChange,
  }: {
    hass: HomeAssistant;
    choices: TimeSource[];
    value: string;
    t: Translate;
    onChange: (value: string) => void;
  },
) {
  const box = el("div", null, { class: "field source-picker" });
  const native = !!customElements.get("ha-generic-picker");
  const control = Object.assign(
    el(native ? "ha-generic-picker" : "input", null, {
      id: "routine-anchor",
      "data-builder-field": "anchor",
      "aria-label": t("Relative to"),
    }),
    {
      sourceChoices: choices,
      selectedValue: value,
      suppressNextOpen: false,
      invalid: false,
      errorMessage: "",
    },
  );
  const select = (next: string) => {
    if (next && !choices.some((choice) => choice.value === next)) return;
    control.selectedValue = next;
    if (native) control.value = next || undefined;
    onChange(next);
  };
  control.addEventListener("value-changed", (event) => {
    if (event instanceof CustomEvent && event.detail && "value" in event.detail)
      select(typeof event.detail.value === "string" ? event.detail.value : "");
  });
  if (native) {
    const picker = control as HaGenericPicker & SourcePickerState;
    const items: (string | PickerItem)[] = [];
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
    picker.hass = hass;
    picker.label = t("Relative to");
    picker.searchLabel = t("Search steps or time sources");
    picker.placeholder = t("Choose a step or event");
    picker.notFoundLabel = t("No matching steps or time sources.");
    picker.getItems = () => items;
    picker.searchKeys = ["primary", "secondary", "id", "group"];
    picker.valueRenderer = (id) =>
      el("span", t(choices.find((choice) => choice.value === id)?.name || id), {
        slot: "headline",
      });
    picker.allowCustomValue = false;
    picker.noSort = true;
    picker.required = true;
    picker.value = value || undefined;
    picker.tabIndex = 0;
    box.append(picker);
  } else {
    const picker = control as HTMLInputElement & SourcePickerState;
    // A working live-results control while HA's optional component is unloaded.
    box.append(el("label", t("Relative to"), { for: picker.id }), picker);
    const results = el("div", null, {
      id: "relative-source-results",
      class: "source-results",
      role: "listbox",
      "aria-label": t("Steps and time sources"),
      hidden: "",
    });
    const status = el("small", "", {
      "aria-live": "polite",
      "data-source-status": "",
    });
    picker.type = "search";
    picker.placeholder = t("Search steps or time sources");
    picker.setAttribute("role", "combobox");
    picker.setAttribute("aria-autocomplete", "list");
    picker.setAttribute("aria-controls", results.id);
    picker.setAttribute("aria-expanded", "false");
    const selectedName = () =>
      t(
        choices.find((choice) => choice.value === picker.selectedValue)?.name ||
          picker.selectedValue ||
          "",
      );
    picker.value = selectedName();
    let matches: TimeSource[] = [],
      active = -1;
    const close = () => {
      results.hidden = true;
      picker.setAttribute("aria-expanded", "false");
      picker.removeAttribute("aria-activedescendant");
      status.textContent = "";
    };
    const highlight = () => {
      for (const [index, option] of [
        ...results.querySelectorAll('[role="option"]'),
      ].entries()) {
        option.setAttribute("aria-selected", String(index === active));
        if (index === active) {
          picker.setAttribute("aria-activedescendant", option.id);
          option.scrollIntoView({ block: "nearest" });
        }
      }
    };
    const show = (query = "") => {
      matches = choices.filter((choice) =>
        `${t(choice.name)} ${t(choice.group)} ${choice.entity_id || ""} ${choice.value}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      );
      active = -1;
      picker.removeAttribute("aria-activedescendant");
      results.replaceChildren();
      let group;
      for (const [index, choice] of matches.entries()) {
        if (group !== choice.group) {
          group = choice.group;
          results.append(
            el("div", t(group), {
              class: "source-group",
              role: "presentation",
            }),
          );
        }
        const option = el("div", null, {
          id: `source-option-${index}`,
          role: "option",
          "aria-selected": "false",
          "data-source-value": choice.value,
        });
        option.append(el("strong", t(choice.name)));
        if (choice.entity_id) option.append(el("small", choice.entity_id));
        // Keep input focus until selection; works with mouse and touch.
        option.addEventListener("pointerdown", (event) =>
          event.preventDefault(),
        );
        option.addEventListener("click", () => select(choice.value));
        results.append(option);
      }
      status.textContent = matches.length
        ? `${matches.length} ${t("matching sources")}`
        : t("No matching steps or time sources.");
      if (!matches.length)
        results.append(el("p", status.textContent, { class: "hint" }));
      results.hidden = false;
      picker.setAttribute("aria-expanded", "true");
    };
    picker.addEventListener("focus", () => {
      if (picker.suppressNextOpen) {
        picker.suppressNextOpen = false;
        return;
      }
      show();
    });
    picker.addEventListener("input", () => show(picker.value));
    picker.addEventListener("blur", () => {
      picker.value = selectedName();
      close();
    });
    picker.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        if (results.hidden) show();
        if (!matches.length) return;
        active =
          (active + (event.key === "ArrowDown" ? 1 : -1) + matches.length) %
          matches.length;
        highlight();
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (!results.hidden && matches[active]) select(matches[active].value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        picker.value = selectedName();
        close();
      }
    });
    box.append(results, status);
  }
  parent.append(box);
  return control;
}
