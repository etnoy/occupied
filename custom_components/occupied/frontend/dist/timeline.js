// Generated from timeline.ts by pnpm run build. Do not edit.
import { html, render, ref, nothing } from "./lit.js";
import { resources } from "./model.js";
export function stamp(value, zone) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      timeZone: zone && zone !== "home_assistant" ? zone : undefined,
    });
  } catch {
    return value;
  }
}
export function timeline(doc, program, t = (text) => text) {
  const plan = doc.plan;
  if (!plan)
    return html`<p>
      ${t(
        "No saved plan for this date. Saving or viewing a preview does not replay past actions.",
      )}
    </p>`;
  const labels = new Map(
    resources(program).map((resource) => [resource.id, resource.name]),
  );
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end),
    width = end - start;
  const position = (time) =>
    Math.max(0, Math.min(100, ((Date.parse(time) - start) / width) * 100));
  const lanes = new Map();
  const lane = (id, mark) => {
    if (!lanes.has(id)) lanes.set(id, []);
    lanes.get(id).push(mark);
  };
  const bar = (kind, from, to, title) =>
    html`<span
      class=${`bar ${kind}`}
      tabindex="0"
      title=${title}
      style=${`left:${position(from)}%;width:${Math.max(0.25, position(to) - position(from))}%`}
    ></span>`;
  let drawn = 0;
  for (const interval of plan.intervals) {
    if (drawn++ >= 800) break;
    lane(
      interval.source_id,
      bar(
        interval.kind,
        interval.start,
        interval.end,
        `${labels.get(interval.source_id) || interval.source_id}: ${stamp(interval.start, plan.timezone)} → ${stamp(interval.end, plan.timezone)} · ${interval.resources.join(", ")}`,
      ),
    );
  }
  for (const [id, time] of Object.entries(plan.steps || {})) {
    if (drawn++ >= 800) break;
    lane(
      id,
      html`<span
        class="marker"
        tabindex="0"
        title=${`${labels.get(id) || id}: ${stamp(time, plan.timezone)}`}
        style=${`left:${position(time)}%`}
        >◆</span
      >`,
    );
  }
  for (const activity of doc.snapshot?.activities || []) {
    if (!activity.deadline) continue;
    const actualStart = new Date(
      Date.parse(activity.deadline) - activity.duration * 1000,
    ).toISOString();
    if (Date.parse(activity.deadline) < start || Date.parse(actualStart) > end)
      continue;
    lane(
      activity.source_id,
      bar(
        "active",
        actualStart,
        activity.deadline,
        `${t("Runtime deadline")}: ${stamp(activity.deadline, plan.timezone)} · ${activity.phase}`,
      ),
    );
  }
  for (const [entity, handover] of Object.entries(
    doc.snapshot?.handover || {},
  )) {
    if (
      Date.parse(handover.deadline) < start ||
      Date.parse(handover.start) > end
    )
      continue;
    lane(
      entity,
      bar(
        "ramp",
        handover.start,
        handover.deadline,
        `${entity} · ${t("Handover")}: ${stamp(handover.start, plan.timezone)} → ${stamp(handover.deadline, plan.timezone)} · ${Math.round(handover.progress * 100)}% · ${JSON.stringify(handover.observed)} → ${JSON.stringify(handover.target)}`,
      ),
    );
  }
  const events = doc.events || plan.events;
  let query = "",
    page = 0,
    table;
  const draw = () => {
    const filtered = events.filter(
      (event) =>
        JSON.stringify(event).toLowerCase().includes(query) ||
        (labels.get(event.source_id) || "").toLowerCase().includes(query),
    );
    page = Math.max(0, Math.min(page, Math.ceil(filtered.length / 50) - 1));
    render(
      html`<div class="table-wrap">
          <table>
            <thead>
              <tr>
                ${[
                  "Planned time",
                  "Source",
                  "Action",
                  "Targets",
                  "Outcome / actual time",
                ].map((label) => html`<th scope="col">${t(label)}</th>`)}
              </tr>
            </thead>
            <tbody>
              ${filtered.slice(page * 50, page * 50 + 50).map(
                (event) =>
                  html`<tr>
                    ${[
                      stamp(event.time, plan.timezone),
                      `${labels.get(event.source_id) || event.source_id} · ${event.kind}`,
                      event.action.action,
                      event.action.targets.entities.join(", "),
                      `${event.outcome || t("Preview only")} · ${stamp(event.actual_time || event.dispatch_time, plan.timezone)}`,
                    ].map((value) => html`<td>${value}</td>`)}
                  </tr>`,
              )}
            </tbody>
          </table>
        </div>
        <div class="row">
          <button
            type="button"
            .disabled=${page === 0}
            @click=${() => {
              page--;
              draw();
            }}
          >
            ${t("Previous")}</button
          ><span
            >${filtered.length} ${t("events")} ·
            ${page + 1}/${Math.max(1, Math.ceil(filtered.length / 50))}</span
          ><button
            type="button"
            .disabled=${(page + 1) * 50 >= filtered.length}
            @click=${() => {
              page++;
              draw();
            }}
          >
            ${t("Next")}
          </button>
        </div>`,
      table,
    );
  };
  return html`<section>
    <h2>${plan.simulation_date} · ${plan.timezone}</h2>
    <p class="hint">
      ${t(
        "Markers are sampled steps; bars are planned activity/window intervals. Runtime end deadlines and handover ramps are shown separately. Times use the plan timezone.",
      )}
    </p>
    <p>
      ${t("Behavior revision")}: ${plan.behavior_hash.slice(0, 12)} ·
      ${t("Plan revision")}: ${plan.source_revision?.slice(0, 12) || "—"}
    </p>
    <div
      class="timeline"
      role="img"
      aria-label=${`${t("Timeline")} ${plan.simulation_date}`}
    >
      <div class="ruler">
        ${Array.from(
          { length: 7 },
          (_, n) =>
            html`<span style=${`left:${(n / 6) * 100}%`}
              >${stamp(
                new Date(start + (width * n) / 6).toISOString(),
                plan.timezone,
              )}</span
            >`,
        )}
      </div>
      ${[...lanes].map(
        ([id, marks]) =>
          html`<div class="lane">
            <span class="lane-label">${labels.get(id) || id}</span>
            <div class="track">${marks}</div>
          </div>`,
      )}
    </div>
    ${drawn > 800
      ? html`<p>
          ${t(
            "Diagram limited to 800 marks; all events remain available in the table and export.",
          )}
        </p>`
      : nothing}
    <input
      type="search"
      placeholder=${t("Filter events")}
      aria-label=${t("Filter events")}
      @input=${(event) => {
        query = event.currentTarget.value.toLowerCase();
        page = 0;
        draw();
      }}
    />
    <div
      ${ref((node) => {
        if (node) {
          table = node;
          draw();
        }
      })}
    ></div>
    ${(doc.issues || plan.issues || []).map(
      (issue) =>
        html`<p class=${issue.severity === "warning" ? "hint" : "error"}>
          ${issue.code}: ${issue.message}
        </p>`,
    )}
  </section>`;
}
