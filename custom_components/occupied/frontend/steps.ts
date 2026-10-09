import type { OccupiedPanel } from "./occupied-panel.js";
import type { StepEntry, Translate } from "./types.js";
import { html, nothing, render, repeat, ref } from "./lit.js";
import { copy, days, duplicate, removeResource } from "./model.js";
import {
  stepEntries,
  simpleStep,
  stepEditor,
  dependentNames,
  timingSummary,
} from "./step-model.js";
import { focusEditor } from "./step-editor.js";
import { entityName } from "./util.js";

export function startStep(
  panel: OccupiedPanel,
  entry?: StepEntry | null,
  parent?: StepEntry,
) {
  panel.stepEditor = stepEditor(panel.draft, entry, parent);
  panel.tab = "routines";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel);
}
function actionSummary(entry: StepEntry, t: Translate) {
  const action = entry.actions?.[0]?.action || "";
  if (action === "scene.turn_on") return t("Activate scene");
  if (simpleStep(entry))
    return /^(?:(?:light|switch)\.)?turn_(on|off)$/.test(action)
      ? t(action.endsWith("turn_off") ? "Turn off" : "Turn on")
      : action;
  return t("Custom actions");
}
function daySummary(selected: string[], t: Translate) {
  if (selected.length === 7) return t("Every day");
  if (selected.join() === days.slice(0, 5).join()) return t("Weekdays");
  if (selected.join() === days.slice(5).join()) return t("Weekends");
  return selected.map((day) => t(day)).join(", ");
}
/** Order steps depth-first so related steps follow the step they depend on. */
function stepTree(entries: StepEntry[]) {
  const seen = new Set<string>(),
    ordered: { entry: StepEntry; depth: number }[] = [];
  const append = (entry: StepEntry, depth: number) => {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    ordered.push({ entry, depth });
    for (const child of entries)
      if (child.when?.relative_to === entry.id) append(child, depth + 1);
  };
  const isRoot = (step: StepEntry) =>
    !step.when?.relative_to ||
    !entries.some((parent) => parent.id === step.when?.relative_to);
  for (const step of entries) if (isRoot(step)) append(step, 0);
  // Cycles have no root; list any remaining steps at the top level.
  for (const step of entries) append(step, 0);
  return ordered;
}
function stepSymbol(entry: StepEntry) {
  if (entry.kind !== "steps") return "◷";
  return entry.actions?.every((action) => action.action.endsWith("turn_off"))
    ? "○"
    : "●";
}
function confirmDeleteStep(
  panel: OccupiedPanel,
  entry: StepEntry,
  trigger: HTMLButtonElement,
) {
  const t = panel.t,
    dependents = dependentNames(panel.draft, entry.id);
  const host = document.createElement("div");
  let dialog: HTMLDialogElement;
  render(
    html`<dialog
      ${ref((node) => {
        if (node) dialog = node as HTMLDialogElement;
      })}
      class="step-delete-dialog"
      aria-labelledby="step-delete-title"
      aria-describedby="step-delete-description"
      @close=${() => {
        render(nothing, host);
        host.remove();
        if (trigger.isConnected) trigger.focus();
      }}
    >
      <h2 id="step-delete-title">${t("Delete step?")}</h2>
      <div id="step-delete-description">
        <p>${entry.name}</p>
        ${dependents.length
          ? html`<p>${t("Used by")}:</p>
              <ul>
                ${dependents.map((name) => html`<li>${name}</li>`)}
              </ul>
              <p class="hint">
                ${t("Change those relationships before deleting.")}
              </p>`
          : html`<p class="hint">
              ${t("This step will be removed when you save changes.")}
            </p>`}
      </div>
      <div class="step-delete-actions">
        <button type="button" @click=${() => dialog.close()}>
          ${t("Cancel")}
        </button>
        <button
          type="button"
          class="danger"
          .disabled=${dependents.length > 0}
          @click=${() =>
            panel.attempt(() => {
              const current = stepEntries(panel.draft).find(
                (step) => step.id === entry.id,
              );
              if (!current) return dialog.close();
              const next = copy(panel.draft);
              removeResource(next, current.path);
              dialog.close();
              panel.selectedStep = null;
              panel.change([], next, true);
            })}
        >
          ${t("Delete step")}
        </button>
      </div>
    </dialog>`,
    host,
  );
  panel.shadowRoot.append(host);
  dialog!.showModal();
  dialog!.querySelector<HTMLButtonElement>("button")?.focus();
}
function stepMenu(panel: OccupiedPanel, entry: StepEntry) {
  const t = panel.t,
    // Steps the simple editor cannot represent can only be copied or removed.
    editable = simpleStep(entry),
    related = entry.kind === "steps";
  let menu: HTMLElement, trigger: HTMLButtonElement;
  const native = "showPopover" in HTMLElement.prototype;
  const close = () => {
    if (native && menu.matches(":popover-open")) menu.hidePopover();
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };
  const action = (label: string, run: () => unknown, danger = false) =>
    html`<button
      type="button"
      role="menuitem"
      class=${danger ? "danger" : ""}
      @click=${() => {
        close();
        run();
      }}
    >
      ${t(label)}
    </button>`;
  return html`<button
      ${ref((node) => {
        if (node) trigger = node as HTMLButtonElement;
      })}
      type="button"
      class="step-menu-trigger"
      data-step-menu=${entry.id}
      aria-label=${`${t("More options")}: ${entry.name}`}
      aria-haspopup="menu"
      aria-expanded="false"
      aria-controls=${`step-actions-${entry.id}`}
      @click=${() => {
        if (trigger.getAttribute("aria-expanded") === "true") return close();
        panel.selectedStep = entry.id;
        for (const other of panel.shadowRoot.querySelectorAll<HTMLElement>(
          ".step-menu",
        ))
          if (other !== menu && !other.hidden) {
            if (native && other.matches(":popover-open")) other.hidePopover();
            other.hidden = true;
            other.previousElementSibling?.setAttribute(
              "aria-expanded",
              "false",
            );
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
      ${ref((node) => {
        if (node) menu = node as HTMLElement;
      })}
      id=${`step-actions-${entry.id}`}
      class="step-menu"
      role="menu"
      aria-label=${`${t("More options")}: ${entry.name}`}
      hidden
      popover=${native ? "auto" : nothing}
      @toggle=${(event: ToggleEvent) => {
        if (event.newState === "closed") {
          menu.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
        }
      }}
      @keydown=${(event: KeyboardEvent) => {
        const buttons = [
            ...menu.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
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
      ${editable ? action("Edit step", () => startStep(panel, entry)) : nothing}
      ${related
        ? action("Add related step", () => startStep(panel, null, entry))
        : nothing}
      ${editable || related ? html`<hr role="separator" />` : nothing}
      ${action("Duplicate", () => {
        const next = copy(panel.draft),
          item = duplicate(next, entry.path);
        panel.selectedStep = item.id;
        panel.change([], next, true);
      })}
      ${action("Delete", () => confirmDeleteStep(panel, entry, trigger), true)}
    </div>`;
}
export function renderSteps(panel: OccupiedPanel) {
  const t = panel.t,
    entries = stepEntries(panel.draft);
  return html`<div class="page-heading">
      <div>
        <h2>${t("Your steps")}</h2>
        <p class="hint">
          ${t("Choose what happens, when it happens, and what follows.")}
        </p>
      </div>
      ${entries.length
        ? html`<button
            type="button"
            class="primary"
            data-create-routine
            @click=${() => startStep(panel)}
          >
            ${t("Create step")}
          </button>`
        : nothing}
    </div>
    ${!entries.length
      ? html`<section class="routine-empty">
          <h2>${t("A little activity. A lived-in home.")}</h2>
          <p class="hint">
            ${t(
              "Start with an entity action or a scene, then add whatever should happen next.",
            )}
          </p>
          <p class="empty-steps">
            ${t(
              "1. Set timing   →   2. Select entities   →   3. Choose an action",
            )}
          </p>
          <button
            type="button"
            class="primary"
            data-create-routine
            @click=${() => startStep(panel)}
          >
            ${t("Create your first step")}
          </button>
        </section>`
      : html` <div class="routine-layout">
            <div class="routine-list" aria-label=${t("Your steps")}>
              ${repeat(
                stepTree(entries),
                ({ entry }) => entry.id,
                ({ entry, depth }) =>
                  html` <div
                    class="routine-row"
                    role="group"
                    aria-label=${entry.name}
                    data-routine-id=${entry.id}
                    style=${`--depth:${Math.min(depth, 3)}`}
                  >
                    <span class="routine-symbol" aria-hidden="true"
                      >${stepSymbol(entry)}</span
                    >
                    <span class="routine-row-content"
                      ><strong>${entry.name}</strong
                      ><span class="hint"
                        >${actionSummary(entry, t)} ·
                        ${entry.entities
                          .map((id) => entityName(panel.catalog, id))
                          .join(", ")}</span
                      ></span
                    >
                    <span class="routine-row-time"
                      ><span
                        >${timingSummary(
                          entry,
                          entries,
                          t,
                          panel.catalog.time_sources,
                        )}</span
                      ><small>${daySummary(entry.days, t)}</small></span
                    >${stepMenu(panel, entry)}
                  </div>`,
              )}
            </div>
          </div>
          <button
            type="button"
            class="text-button"
            @click=${() => {
              panel.navigate("preview");
              panel.runPreview();
            }}
          >
            ${t("Preview schedule")}
          </button>`}`;
}
