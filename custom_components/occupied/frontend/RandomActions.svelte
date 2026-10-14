<script lang="ts">
  import { flushSync } from "svelte";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { RandomEditorContext } from "./random-editor-controller.js";
  import DeleteRandomDialog from "./DeleteRandomDialog.svelte";
  import AdvancedRandomSettings from "./AdvancedRandomSettings.svelte";

  let {
    panel,
    context,
    advancedOpen = $bindable(false),
    advancedTrigger = $bindable(),
  }: {
    panel: OccupiedPanel;
    context: RandomEditorContext;
    advancedOpen?: boolean;
    advancedTrigger?: HTMLButtonElement;
  } = $props();

  let menuOpen = $state(false);
  let deleteOpen = $state(false);
  let trigger: HTMLButtonElement;
  let menu: HTMLDivElement;

  let menuId = $derived(`random-actions-${context.editor.id}`);

  function closeDialog() {
    const focusTarget =
      advancedOpen && advancedTrigger ? advancedTrigger : trigger;
    flushSync(() => {
      deleteOpen = false;
      advancedOpen = false;
    });
    if (focusTarget.isConnected) {
      focusTarget.focus();
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
    aria-label={panel.t("Random event actions")}
    title={panel.t("Random event actions")}
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    aria-controls={menuId}
    data-random-actions
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
    aria-label={panel.t("Random event actions")}
    ontoggle={(event) => (menuOpen = event.newState === "open")}
    onkeydown={menuKeydown}
  >
    <button
      type="button"
      role="menuitem"
      tabindex="-1"
      disabled={panel.busy}
      onclick={() => {
        closeMenu();
        context.form.enabled = !context.form.enabled;
        context.changed("enabled");
      }}
    >
      {panel.t(context.form.enabled ? "Disable" : "Enable")}
    </button>
    {#if context.editor.existing}
      <div role="separator"></div>
      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        class="danger"
        disabled={panel.busy || panel.stale}
        onclick={() => {
          closeMenu(false);
          flushSync(() => (deleteOpen = true));
        }}
      >
        {panel.t("Delete random event")}
      </button>
    {/if}
  </div>
</div>
{#if deleteOpen}
  <DeleteRandomDialog {panel} onClose={closeDialog} />
{/if}
{#if advancedOpen}
  <AdvancedRandomSettings {panel} {context} onClose={closeDialog} />
{/if}
