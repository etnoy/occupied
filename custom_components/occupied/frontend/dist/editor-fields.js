// Generated from editor-fields.ts by pnpm run build. Do not edit.
import { isValueChangedEvent } from "./util.js";
import { html, nothing, ifDefined, live, ref } from "./lit.js";
export function createEditorFields(panel, changed, focus) {
  const editor = panel.stepEditor,
    t = panel.t;
  const error = (key) =>
    editor.errors[key]
      ? html`<p
          class="error"
          id=${`routine-error-${key}`}
          data-builder-error=${key}
          role="alert"
        >
          ${editor.errors[key]}
        </p>`
      : nothing;
  const field = (key, label, value, update, options = {}) => {
    const id = `routine-${key}`,
      invalid = ifDefined(editor.errors[key] ? "true" : undefined),
      described = ifDefined(
        editor.errors[key] ? `routine-error-${key}` : undefined,
      );
    const nativeTime =
      options.type === "time" &&
      customElements.get("ha-selector") &&
      customElements.get("ha-selector-time") &&
      customElements.get("ha-time-input");
    const input = (event) => {
      const control = event.currentTarget;
      if (nativeTime) {
        if (!isValueChangedEvent(event)) return;
        control.value = event.detail.value || "";
      }
      update(String(control.value ?? ""));
      changed(key);
      if (options.render) focus(key);
    };
    const timeSelector = () =>
      html`<ha-selector
        id=${id}
        data-builder-field=${key}
        aria-label=${t(label)}
        aria-invalid=${invalid}
        aria-describedby=${described}
        .hass=${panel._hass}
        .selector=${{ time: {} }}
        .label=${t(label)}
        .required=${!options.optional}
        .value=${value || undefined}
        tabindex="0"
        @value-changed=${input}
      ></ha-selector>`;
    const selectControl = () =>
      html`<select
        id=${id}
        data-builder-field=${key}
        aria-invalid=${invalid}
        aria-describedby=${described}
        .value=${live(String(value))}
        @change=${input}
      >
        ${(options.choices ?? []).map(
          ([v, name]) => html`<option value=${v}>${t(name)}</option>`,
        )}
      </select>`;
    const textareaControl = () =>
      html`<textarea
        id=${id}
        data-builder-field=${key}
        aria-label=${ifDefined(options.hideLabel ? t(label) : undefined)}
        aria-invalid=${invalid}
        aria-describedby=${described}
        .value=${live(String(value))}
        @input=${input}
      ></textarea>`;
    const inputControl = () =>
      html`<input
        id=${id}
        data-builder-field=${key}
        type=${options.type || "text"}
        aria-label=${ifDefined(options.hideLabel ? t(label) : undefined)}
        aria-invalid=${invalid}
        aria-describedby=${described}
        min=${ifDefined(options.min)}
        max=${ifDefined(options.max)}
        step=${ifDefined(options.step)}
        placeholder=${ifDefined(options.placeholder)}
        .value=${live(String(value))}
        @input=${input}
        ${ref((node) => {
          if (node && ["startOffset", "endOffset"].includes(key))
            node.setCustomValidity(editor.errors[key] || "");
        })}
      />`;
    const control = () => {
      if (nativeTime) return timeSelector();
      if (options.choices) return selectControl();
      if (options.multiline) return textareaControl();
      return inputControl();
    };
    return html`<div class="field">
      ${!nativeTime && !options.hideLabel
        ? html`<div class=${options.trailing ? "field-label-row" : ""}>
            <label for=${id}>${t(label)}</label>${options.trailing || nothing}
          </div>`
        : nothing}
      ${control()} ${error(key)}
    </div>`;
  };
  return { field, error };
}
