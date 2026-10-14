<script lang="ts">
  import { flushSync } from "svelte";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { StepEntry } from "./types.js";
  import type { StepEditorContext } from "./step-editor-controller.js";
  import { startStep } from "./steps.js";
  import DeleteStepDialog from "./DeleteStepDialog.svelte";
  import AdvancedStepSettings from "./AdvancedStepSettings.svelte";

  let {
    panel,
    entry,
    context,
  }: {
    panel: OccupiedPanel;
    entry?: StepEntry;
    context?: StepEditorContext;
  } = $props();

  let menuOpen = $state(false);
  let deleteOpen = $state(false);
  let advancedOpen = $state(false);
  let trigger: HTMLButtonElement;
  let menu: HTMLDivElement;

  let menuId = $derived(`step-actions-${entry?.id || context?.editor.id}`);

  function closeDialog() {
    flushSync(() => {
      deleteOpen = false;
      advancedOpen = false;
    });
    if (trigger.isConnected) {
      trigger.focus();
    }
  }

  function closeMenu(restoreFocus = true) {
    menu.hidePopover();
    menuOpen = false;
    if (restoreFocus) {
      trigger.focus();
    }
  }

  function positionMenu() {
    if (!menu.matches(":popover-open")) {
      return;
    }
    const anchor = trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const above = anchor.top - bounds.height - 8;
    const top = above >= 16 ? above : anchor.bottom + 8;
    menu.style.left = `${Math.max(16, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 16))}px`;
    menu.style.top = `${Math.max(16, Math.min(top, window.innerHeight - bounds.height - 16))}px`;
  }

  function openMenu(last = false) {
    menu.showPopover();
    menuOpen = true;
    positionMenu();
    const items = [
      ...menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    ];
    (last ? items.at(-1) : items[0])?.focus({ preventScroll: true });
  }

  function menuKeydown(event: KeyboardEvent) {
    const items = [
      ...menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    ];
    const index = items.indexOf(
      panel.shadowRoot.activeElement as HTMLButtonElement,
    );
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      let next =
        (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
        items.length;
      if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = items.length - 1;
      }
      items[next]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "Tab") {
      closeMenu();
    }
  }
</script>

<svelte:window onresize={positionMenu} onscroll={positionMenu} />

<div class="step-editor-actions">
  <button
    bind:this={trigger}
    type="button"
    class="icon-button"
    class:error={!!context?.editor.errors.days}
    aria-label={panel.t("step_actions")}
    title={panel.t("step_actions")}
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    aria-controls={menuId}
    aria-describedby={context?.editor.errors.days
      ? "step-error-days"
      : undefined}
    data-builder-field="days"
    disabled={panel.busy}
    onclick={() => (menuOpen ? closeMenu() : openMenu())}
    onkeydown={(event) => {
      if (!(event.key === "ArrowDown" || event.key === "ArrowUp")) {
        return;
      }

      event.preventDefault();
      openMenu(event.key === "ArrowUp");
    }}
  >
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
      />
    </svg>
  </button>
  <div
    bind:this={menu}
    id={menuId}
    class="step-actions-menu"
    popover="auto"
    role="menu"
    tabindex="-1"
    aria-label={panel.t("step_actions")}
    ontoggle={(event) => (menuOpen = event.newState === "open")}
    onkeydown={menuKeydown}
  >
    {#if context}
      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        disabled={panel.busy}
        onclick={() => {
          closeMenu();
          if (!context) {
            return;
          }
          context.form.enabled = !context.form.enabled;
          context.changed("enabled");
        }}
      >
        {panel.t(context.form.enabled ? "disable" : "enable")}
      </button>
    {/if}
    {#if entry}
      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        disabled={panel.busy}
        onclick={() => {
          closeMenu();
          if (entry) {
            startStep(panel, null, entry);
          }
        }}
      >
        {panel.t("add_related_step")}
      </button>
    {/if}
    {#if context}
      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        disabled={panel.busy}
        onclick={() => {
          closeMenu(false);
          flushSync(() => (advancedOpen = true));
        }}
      >
        {panel.t("advanced_settings")}
      </button>
    {/if}
    {#if entry}
      <div role="separator"></div>
      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        class="danger"
        disabled={panel.busy}
        onclick={() => {
          closeMenu(false);
          flushSync(() => (deleteOpen = true));
        }}
      >
        {panel.t("delete_step")}
      </button>
    {/if}
  </div>
</div>
{#if deleteOpen && entry}
  <DeleteStepDialog {panel} {entry} onClose={closeDialog} />
{/if}
{#if advancedOpen && context}
  <AdvancedStepSettings {panel} {context} onClose={closeDialog} />
{/if}
