import type { Attributes } from "./types.js";
import {
  Directive,
  directive,
  html,
  staticHtml,
  unsafeStatic,
  ifDefined,
  nothing,
  type TemplateResult,
} from "./lit.js";

// Schema-built forms may retain their template between controller updates.
// Read the current draft when Lit commits a binding, rather than capturing an
// older value that could overwrite an HA selector after value-changed.
class CurrentValue extends Directive {
  override render(read: () => unknown) {
    return read();
  }
}
export const currentValue = directive(CurrentValue);

// Advanced forms are assembled from a field schema. These groups collect
// templates only; Lit owns all of their DOM and event listeners.
export class FormLayout {
  private readonly children: (FormLayout | TemplateResult | string)[] = [];
  open = false;
  constructor(
    private readonly tag = "div",
    private readonly text: string | number | null = null,
    private readonly attrs: Attributes = {},
  ) {}
  append(...children: (FormLayout | TemplateResult | string)[]) {
    this.children.push(...children);
  }
  template(): TemplateResult {
    const tag = unsafeStatic(this.tag);
    return staticHtml`<${tag} class=${ifDefined(this.attrs.class)} role=${ifDefined(this.attrs.role)} aria-label=${ifDefined(this.attrs["aria-label"])} data-path=${ifDefined(this.attrs["data-path"])} .open=${this.open}>${this.text ?? nothing}${this.children.map((child) => (child instanceof FormLayout ? child.template() : child))}</${tag}>`;
  }
}
export function layout(
  tag: string,
  text?: string | number | null,
  attrs: Attributes = {},
) {
  return new FormLayout(tag, text, attrs);
}
export function button(
  label: string,
  action: (event: MouseEvent) => unknown,
  attrs: Attributes = {},
) {
  return html`<button
    type="button"
    class=${ifDefined(attrs.class)}
    aria-label=${ifDefined(attrs["aria-label"])}
    .disabled=${attrs.disabled !== undefined}
    @click=${action}
  >
    ${label}
  </button>`;
}
export function section(parent: FormLayout, title: string, help?: string) {
  const node = layout("section");
  node.append(html`<h2>${title}</h2>`);
  if (help) node.append(html`<p class="hint">${help}</p>`);
  parent.append(node);
  return node;
}
export function details(parent: FormLayout, title: string) {
  const node = layout("details");
  node.append(html`<summary>${title}</summary>`);
  parent.append(node);
  return node;
}
