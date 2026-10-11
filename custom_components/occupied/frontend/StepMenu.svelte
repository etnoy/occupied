<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { StepEntry } from "./types.js";
  import { reference } from "./dom.js";
  import { copy, duplicate } from "./model.js";
  import { startStep } from "./steps.js";
  import { simpleStep } from "./step-model.js";

  import DeleteStepDialog from "./DeleteStepDialog.svelte";
  import { flushSync } from "svelte";
  let { panel, entry }: { panel: OccupiedPanel; entry: StepEntry } = $props();
  let t = $derived(panel.t);
  let editable = $derived(simpleStep(entry));
  let related = $derived(entry.kind === "steps");
  let menu: HTMLElement, trigger: HTMLButtonElement;
  const native = "showPopover" in HTMLElement.prototype;
  const close = () => {
    if (native && menu.matches(":popover-open")) menu.hidePopover();
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };

  let deleteOpen = $state(false);
  function confirmDeleteStep() {
    flushSync(() => (deleteOpen = true));
  }
  function closeDeleteDialog() {
    flushSync(() => (deleteOpen = false));
    if (trigger.isConnected) trigger.focus();
  }
</script>

{#snippet action(label: string, run: () => unknown, danger = false)}
  <button
    type="button"
    role="menuitem"
    class={danger ? "danger" : ""}
    onclick={() => {
      close();
      run();
    }}
  >
    {t(label)}
  </button>
{/snippet}
<button
  use:reference={(node) => {
    if (node) trigger = node as HTMLButtonElement;
  }}
  type="button"
  class="step-menu-trigger"
  data-step-menu={entry.id}
  aria-label={`${t("More options")}: ${entry.name}`}
  aria-haspopup="menu"
  aria-expanded="false"
  aria-controls={`step-actions-${entry.id}`}
  onclick={() => {
    if (trigger.getAttribute("aria-expanded") === "true") return close();
    panel.selectedStep = entry.id;
    for (const other of panel.shadowRoot.querySelectorAll<HTMLElement>(
      ".step-menu",
    ))
      if (other !== menu && !other.hidden) {
        if (native && other.matches(":popover-open")) other.hidePopover();
        other.hidden = true;
        other.previousElementSibling?.setAttribute("aria-expanded", "false");
      }
    menu.hidden = false;
    if (native) menu.showPopover();
    const rect = trigger.getBoundingClientRect();
    menu.style.left = `${Math.max(12, Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 12))}px`;
    menu.style.top = `${Math.max(12, Math.min(rect.bottom + 6, innerHeight - menu.offsetHeight - 12))}px`;
    trigger.setAttribute("aria-expanded", "true");
    menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }}
>
  ⋮
</button>
<div
  use:reference={(node) => {
    if (node) menu = node as HTMLElement;
  }}
  id={`step-actions-${entry.id}`}
  class="step-menu"
  role="menu"
  tabindex="-1"
  aria-label={`${t("More options")}: ${entry.name}`}
  hidden
  popover={native ? "auto" : undefined}
  ontoggle={(event: ToggleEvent) => {
    if (event.newState === "closed") {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
  }}
  onkeydown={(event: KeyboardEvent) => {
    const buttons = [
        ...menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
      ],
      current = buttons.indexOf(
        panel.shadowRoot.activeElement as HTMLButtonElement,
      );
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (current +
                (event.key === "ArrowDown" ? 1 : -1) +
                buttons.length) %
              buttons.length;
      buttons[next]?.focus();
    } else if (["Escape", "Tab"].includes(event.key)) {
      if (event.key === "Escape") event.preventDefault();
      close();
      trigger.focus();
    }
  }}
>
  {#if editable}
    {@render action("Edit step", () => startStep(panel, entry))}
  {/if}
  {#if related}
    {@render action("Add related step", () => startStep(panel, null, entry))}
  {/if}
  {#if editable || related}
    <hr />
  {/if}
  {@render action("Duplicate", () => {
    const next = copy(panel.draft),
      item = duplicate(next, entry.path);
    panel.selectedStep = item.id;
    panel.change([], next, true);
  })}
  {@render action("Delete", confirmDeleteStep, true)}
</div>

{#if deleteOpen}
  <DeleteStepDialog {panel} {entry} onClose={closeDeleteDialog} />
{/if}
