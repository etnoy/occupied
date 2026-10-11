import "svelte/elements";

declare module "svelte/elements" {
  interface HTMLAttributes<T extends EventTarget> {
    "onvalue-changed"?: (event: Event & { currentTarget: T }) => void;
  }
}
