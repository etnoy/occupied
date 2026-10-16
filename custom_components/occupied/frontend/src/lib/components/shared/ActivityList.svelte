<script lang="ts" generics="T extends { id: string; name: string }">
  import { onDestroy, tick, type Snippet } from "svelte";
  import type { Translate } from "../../types.js";
  import {
    applyActivityOrder,
    activityTree,
    moveActivityInTree,
    type ActivityNode,
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
    parentId,
    createAction,
  }: {
    entries: T[];
    storageKey: string;
    label: string;
    disabled?: boolean;
    t: Translate;
    children: Snippet<[T, Snippet]>;
    createAction?: Snippet;
    parentId?: (entry: T) => string | undefined;
  } = $props();

  const instructionsId = $props.id();

  let preference = $state<{ key: string; order: string[] | null } | null>(null);

  let order = $derived(
    preference?.key === storageKey
      ? preference.order
      : readActivityOrder(storageKey),
  );
  let sorted = $derived(applyActivityOrder(entries, order));
  let tree = $derived(activityTree(sorted, parentId));
  let list: HTMLDivElement;
  let dragging = $state<string | null>(null);

  let target = $state<number | null>(null);
  let announcement = $state("");
  let cancelDrag: (() => void) | null = null;

  onDestroy(() => cancelDrag?.());

  function save(next: string[] | null) {
    preference = { key: storageKey, order: next };
    writeActivityOrder(storageKey, next);
  }

  async function move(id: string, index: number, siblings: ActivityNode<T>[]) {
    const next = moveActivityInTree(tree, id, index);
    const current = moveActivityInTree(tree, "", 0);
    if (next.every((item, position) => item === current[position])) {
      return;
    }
    save(next);
    const entry = entries.find((item) => item.id === id)!;
    announcement = t("activity_moved")
      .replace("{name}", () => entry.name)
      .replace("{position}", () =>
        String(Math.max(0, Math.min(index, siblings.length - 1)) + 1),
      )
      .replace("{total}", () => String(siblings.length));
    await tick();
    const row = [...list.querySelectorAll<HTMLElement>(".activity-item")].find(
      (item) => item.dataset.activityId === id,
    );
    row
      ?.querySelector<HTMLButtonElement>(".activity-drag-handle")
      ?.focus({ preventScroll: true });
  }

  function keydown(
    event: KeyboardEvent,
    id: string,
    siblings: ActivityNode<T>[],
  ) {
    if (event.key === "Escape" && cancelDrag) {
      event.preventDefault();
      cancelDrag();

      return;
    }
    if (cancelDrag) {
      return;
    }
    const index = siblings.findIndex((node) => node.entry.id === id);
    const targets: Record<string, number> = {
      ArrowUp: index - 1,
      ArrowDown: index + 1,
      Home: 0,
      End: siblings.length - 1,
    };
    if (disabled || targets[event.key] === undefined) {
      return;
    }
    event.preventDefault();
    void move(id, targets[event.key], siblings);
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

  function startDrag(
    event: PointerEvent,
    id: string,
    siblings: ActivityNode<T>[],
  ) {
    if (
      disabled ||
      siblings.length < 2 ||
      event.button !== 0 ||
      !event.isPrimary
    ) {
      return;
    }
    cancelDrag?.();
    const handle = event.currentTarget as HTMLButtonElement;
    const group = handle.closest(".activity-item")!.parentElement!;
    const scroller = scrollContainer(handle);
    const initialY = event.clientY;
    const initialKey = storageKey;
    const initialTree = tree;
    const initialIds = sorted.map((entry) => entry.id);
    let clientY = initialY;
    let frame = 0;
    handle.setPointerCapture(event.pointerId);
    const updateTarget = () => {
      const rows = [
        ...group.querySelectorAll<HTMLElement>(":scope > .activity-item"),
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
        tree === initialTree &&
        initialIds.every((item, position) => item === sorted[position]?.id) &&
        initialIds.length === sorted.length
      ) {
        void move(id, index, siblings);
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

<span id={instructionsId} class="visually-hidden"
  >{t("reorder_activity_hint")}</span
>
<div class="visually-hidden" role="status" aria-live="polite">
  {announcement}
</div>
{#snippet group(nodes: ActivityNode<T>[])}
  {@const remaining = nodes.filter((node) => node.entry.id !== dragging)}
  {#each nodes as node (node.entry.id)}
    {@const entry = node.entry}
    {@const remainingIndex = remaining.findIndex(
      (item) => item.entry.id === entry.id,
    )}
    {@const activeGroup = nodes.some((item) => item.entry.id === dragging)}
    <div
      class="activity-item"
      class:activity-dragging={dragging === entry.id}
      class:activity-drop-before={activeGroup &&
        dragging !== entry.id &&
        target === remainingIndex}
      class:activity-drop-after={activeGroup &&
        dragging !== entry.id &&
        remainingIndex === remaining.length - 1 &&
        target === nodes.length - 1}
      data-activity-id={entry.id}
    >
      {#snippet dragHandle()}
        <button
          type="button"
          class="activity-drag-handle"
          aria-label={t("reorder_activity").replace("{name}", () => entry.name)}
          aria-describedby={instructionsId}
          title={t("reorder_activity_hint")}
          disabled={disabled || nodes.length < 2}
          onpointerdown={(event) => startDrag(event, entry.id, nodes)}
          onkeydown={(event) => keydown(event, entry.id, nodes)}
        >
          <ha-icon icon="mdi:drag" aria-hidden="true"></ha-icon>
        </button>
      {/snippet}
      {@render children(entry, dragHandle)}
      {#if node.children.length}
        <div class="activity-children">
          {@render group(node.children)}
        </div>
      {/if}
    </div>
  {/each}
{/snippet}

<div class="step-list" aria-label={label} bind:this={list}>
  {@render group(tree)}
</div>

{#if createAction || order}
  <div class="activity-list-actions">
    {@render createAction?.()}
    {#if order}
      <button
        type="button"
        class="activity-reset-order"
        {disabled}
        onclick={() => save(null)}>{t("reset_chronological_order")}</button
      >
    {/if}
  </div>
{/if}
