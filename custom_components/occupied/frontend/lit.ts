// The build bundles this module locally: HA never fetches npm modules or a CDN.
export {
  LitElement,
  css,
  html,
  nothing,
  render,
  type TemplateResult,
} from "lit";
export { html as staticHtml, unsafeStatic } from "lit/static-html.js";
export { ref } from "lit/directives/ref.js";
export { ifDefined } from "lit/directives/if-defined.js";
export { repeat } from "lit/directives/repeat.js";
export { live } from "lit/directives/live.js";
export { Directive, directive } from "lit/directive.js";
