<script lang="ts" generics="T extends { id: string; name: string }">
  import { onDestroy, tick, type Snippet } from "svelte";
  import type { Translate } from "../../types.js";
  import {
    applyActivityOrder,
    moveActivity,
    readActivityOrder,
    writeActivityOrder,
  } from "../../utils/activity-order.js";

  let {
    entries,
    storageKey,
    label,
    disabled = false,
    t,
    children,
  }: {
    entries: T[];
    storageKey: string;
    label: string;
    disabled?: boolean;
    t: Translate;
    children: Snippet<[T]>;
  } = $props();

  const instructionsId = $props.id();

  let preference = $state<{ key: string; order: string[] | null } | null>(null);

  let order = $derived(
    preference?.key === storageKey
      ? preference.order
      : readActivityOrder(storageKey),
  );
  let sorted = $derived(applyActivityOrder(entries, order));
  let list: HTMLDivElement;
  let dragging = $state<string | null>(null);

  let remaining = $derived(sorted.filter((entry) => entry.id !== dragging));

  let target = $state<number | null>(null);
  let announcement = $state("");
  let cancelDrag: (() => void) | null = null;

  onDestroy(() => cancelDrag?.());

  function save(next: string[] | null) {
    preference = { key: storageKey, order: next };
    writeActivityOrder(storageKey, next);
  }

  async function move(id: string, index: number) {
    const ids = sorted.map((entry) => entry.id);
    const next = moveActivity(ids, id, index);
    if (next.every((item, position) => item === ids[position])) {
      return;
    }
    save(next);
    const entry = entries.find((item) => item.id === id)!;
    announcement = t("activity_moved")
      .replace("{name}", () => entry.name)
      .replace("{position}", () => String(next.indexOf(id) + 1))
      .replace("{total}", () => String(next.length));
    await tick();
    const row = [...list.querySelectorAll<HTMLElement>(".activity-item")].find(
      (item) => item.dataset.activityId === id,
    );
    row
      ?.querySelector<HTMLButtonElement>(".activity-drag-handle")
      ?.focus({ preventScroll: true });
  }

  function keydown(event: KeyboardEvent, id: string) {
    if (event.key === "Escape" && cancelDrag) {
      event.preventDefault();
      cancelDrag();

      return;
    }
    if (cancelDrag) {
      return;
    }
    const index = sorted.findIndex((entry) => entry.id === id);
    const targets: Record<string, number> = {
      ArrowUp: index - 1,
      ArrowDown: index + 1,
      Home: 0,
      End: sorted.length - 1,
    };
    if (disabled || targets[event.key] === undefined) {
      return;
    }
    event.preventDefault();
    void move(id, targets[event.key]);
  }

  function scrollContainer(element: HTMLElement): HTMLElement {
    let current: HTMLElement | null = element;
    while (current) {
      if (
        current.scrollHeight > current.clientHeight &&
        /auto|scroll/.test(getComputedStyle(current).overflowY)
      ) {
        return current;
      }
      const root = current.getRootNode();
      current =
        current.assignedSlot ||
        current.parentElement ||
        (root instanceof ShadowRoot ? (root.host as HTMLElement) : null);
    }

    return document.scrollingElement as HTMLElement;
  }

  function startDrag(event: PointerEvent, id: string) {
    if (
      disabled ||
      sorted.length < 2 ||
      event.button !== 0 ||
      !event.isPrimary
    ) {
      return;
    }
    cancelDrag?.();
    const handle = event.currentTarget as HTMLButtonElement;
    const scroller = scrollContainer(handle);
    const initialY = event.clientY;
    const initialKey = storageKey;
    const initialIds = sorted.map((entry) => entry.id);
    let clientY = initialY;
    let frame = 0;
    handle.setPointerCapture(event.pointerId);
    const updateTarget = () => {
      const rows = [
        ...list.querySelectorAll<HTMLElement>(".activity-item"),
      ].filter((row) => row.dataset.activityId !== id);
      const index = rows.findIndex((row) => {
        const rect = row.getBoundingClientRect();

        return clientY < rect.top + rect.height / 2;
      });
      target = index === -1 ? rows.length : index;
    };
    const autoScroll = () => {
      const rect = scroller.getBoundingClientRect();
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      if (clientY < top + 48) {
        scroller.scrollTop -= 12;
      } else if (clientY > bottom - 48) {
        scroller.scrollTop += 12;
      }
      updateTarget();
      frame = requestAnimationFrame(autoScroll);
    };
    const update = (pointer: PointerEvent) => {
      if (pointer.pointerId !== event.pointerId) {
        return;
      }
      clientY = pointer.clientY;
      if (!dragging && Math.abs(clientY - initialY) < 6) {
        return;
      }
      dragging = id;
      updateTarget();
      if (!frame) {
        frame = requestAnimationFrame(autoScroll);
      }
    };
    const finish = (commit: boolean) => {
      const index = target;
      cancelAnimationFrame(frame);
      cancelDrag = null;
      dragging = null;
      target = null;
      handle.removeEventListener("pointermove", update);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      handle.removeEventListener("lostpointercapture", stop);
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }
      if (
        commit &&
        index !== null &&
        !disabled &&
        storageKey === initialKey &&
        initialIds.every((item, position) => item === sorted[position]?.id) &&
        initialIds.length === sorted.length
      ) {
        void move(id, index);
      }
    };
    const stop = (pointer: PointerEvent) => {
      if (pointer.pointerId === event.pointerId) {
        finish(pointer.type === "pointerup" && dragging === id);
      }
    };
    cancelDrag = () => finish(false);
    handle.addEventListener("pointermove", update);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
    handle.addEventListener("lostpointercapture", stop);
  }
</script>

<div class="activity-order-toolbar">
  <span class="hint" title={t("chronological_order_hint")}
    >{t(order ? "manual_order" : "chronological_order")}</span
  >
  {#if order}
    <button type="button" {disabled} onclick={() => save(null)}
      >{t("reset_chronological_order")}</button
    >
  {/if}
</div>
<span id={instructionsId} class="visually-hidden"
  >{t("reorder_activity_hint")}</span
>
<div class="visually-hidden" role="status" aria-live="polite">
  {announcement}
</div>
<div class="step-list" aria-label={label} bind:this={list}>
  {#each sorted as entry (entry.id)}
    {@const remainingIndex = remaining.findIndex(
      (item) => item.id === entry.id,
    )}
    <div
      class="activity-item"
      class:activity-dragging={dragging === entry.id}
      class:activity-drop-before={dragging !== entry.id &&
        target === remainingIndex}
      class:activity-drop-after={dragging !== entry.id &&
        remainingIndex === remaining.length - 1 &&
        target === sorted.length - 1}
      data-activity-id={entry.id}
    >
      <button
        type="button"
        class="activity-drag-handle"
        aria-label={t("reorder_activity").replace("{name}", () => entry.name)}
        aria-describedby={instructionsId}
        title={t("reorder_activity_hint")}
        disabled={disabled || sorted.length < 2}
        onpointerdown={(event) => startDrag(event, entry.id)}
        onkeydown={(event) => keydown(event, entry.id)}
      >
        <ha-icon icon="mdi:drag" aria-hidden="true"></ha-icon>
      </button>
      {@render children(entry)}
    </div>
  {/each}
</div>
