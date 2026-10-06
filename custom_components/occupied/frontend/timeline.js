import { button, el, section } from "./forms.js";
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
export function timeline(parent, doc, program, t = (x) => x) {
  const plan = doc.plan;
  if (!plan) {
    parent.append(
      el(
        "p",
        t(
          "No saved plan for this date. Saving or viewing a preview does not replay past actions.",
        ),
      ),
    );
    return;
  }
  const labels = new Map(resources(program).map((x) => [x.id, x.name]));
  const box = section(
    parent,
    `${plan.simulation_date} · ${plan.timezone}`,
    t(
      "Markers are sampled steps; bars are planned activity/window intervals. Runtime end deadlines and handover ramps are shown separately. Times use the plan timezone.",
    ),
  );
  box.append(
    el(
      "p",
      `${t("Behavior revision")}: ${plan.behavior_hash.slice(0, 12)} · ${t("Plan revision")}: ${plan.source_revision?.slice(0, 12) || "—"}`,
    ),
  );
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end),
    width = end - start;
  const position = (time) =>
    Math.max(0, Math.min(100, ((Date.parse(time) - start) / width) * 100));
  const chart = el("div", null, {
    class: "timeline",
    role: "img",
    "aria-label": `${t("Timeline")} ${plan.simulation_date}`,
  });
  const ruler = el("div", null, { class: "ruler" });
  for (let n = 0; n <= 6; n++) {
    const label = el(
      "span",
      stamp(new Date(start + (width * n) / 6).toISOString(), plan.timezone),
    );
    label.style.left = `${(n / 6) * 100}%`;
    ruler.append(label);
  }
  chart.append(ruler);
  const laneMap = new Map();
  const lane = (id) => {
    if (!laneMap.has(id)) {
      const row = el("div", null, { class: "lane" }),
        label = el("span", labels.get(id) || id, { class: "lane-label" }),
        track = el("div", null, { class: "track" });
      row.append(label, track);
      chart.append(row);
      laneMap.set(id, track);
    }
    return laneMap.get(id);
  };
  let drawn = 0;
  for (const interval of plan.intervals) {
    if (drawn++ >= 800) break;
    const mark = el("span", null, {
      class: `bar ${interval.kind}`,
      tabindex: "0",
      title: `${labels.get(interval.source_id) || interval.source_id}: ${stamp(interval.start, plan.timezone)} → ${stamp(interval.end, plan.timezone)} · ${interval.resources.join(", ")}`,
    });
    mark.style.left = `${position(interval.start)}%`;
    mark.style.width = `${Math.max(0.25, position(interval.end) - position(interval.start))}%`;
    lane(interval.source_id).append(mark);
  }
  for (const [id, time] of Object.entries(plan.steps || {})) {
    if (drawn++ >= 800) break;
    const mark = el("span", "◆", {
      class: "marker",
      tabindex: "0",
      title: `${labels.get(id) || id}: ${stamp(time, plan.timezone)}`,
    });
    mark.style.left = `${position(time)}%`;
    lane(id).append(mark);
  }
  for (const activity of doc.snapshot?.activities || []) {
    const actualStart = activity.deadline
      ? new Date(
          Date.parse(activity.deadline) - activity.duration * 1000,
        ).toISOString()
      : null;
    if (
      !activity.deadline ||
      Date.parse(activity.deadline) < start ||
      Date.parse(actualStart) > end
    )
      continue;
    const mark = el("span", null, {
      class: "bar active",
      tabindex: "0",
      title: `${t("Runtime deadline")}: ${stamp(activity.deadline, plan.timezone)} · ${activity.phase}`,
    });
    mark.style.left = `${position(actualStart)}%`;
    mark.style.width = `${Math.max(0.25, position(activity.deadline) - position(actualStart))}%`;
    lane(activity.source_id).append(mark);
  }
  for (const [entity, h] of Object.entries(doc.snapshot?.handover || {})) {
    if (Date.parse(h.deadline) < start || Date.parse(h.start) > end) continue;
    const mark = el("span", null, {
      class: "bar ramp",
      tabindex: "0",
      title: `${entity} · ${t("Handover")}: ${stamp(h.start, plan.timezone)} → ${stamp(h.deadline, plan.timezone)} · ${Math.round(h.progress * 100)}% · ${JSON.stringify(h.observed)} → ${JSON.stringify(h.target)}`,
    });
    mark.style.left = `${position(h.start)}%`;
    mark.style.width = `${Math.max(0.25, position(h.deadline) - position(h.start))}%`;
    lane(entity).append(mark);
  }
  box.append(chart);
  if (drawn > 800)
    box.append(
      el(
        "p",
        t(
          "Diagram limited to 800 marks; all events remain available in the table and export.",
        ),
      ),
    );
  const events = doc.events || plan.events,
    filter = el("input", null, {
      type: "search",
      placeholder: t("Filter events"),
      "aria-label": t("Filter events"),
    }),
    tableWrap = el("div", null, { class: "table-wrap" }),
    controls = el("div", null, { class: "row" });
  let page = 0;
  const draw = () => {
    const filtered = events.filter(
      (e) =>
        JSON.stringify(e).toLowerCase().includes(filter.value.toLowerCase()) ||
        (labels.get(e.source_id) || "")
          .toLowerCase()
          .includes(filter.value.toLowerCase()),
    );
    page = Math.max(0, Math.min(page, Math.ceil(filtered.length / 50) - 1));
    const table = el("table"),
      head = el("tr");
    for (const label of [
      "Planned time",
      "Source",
      "Action",
      "Targets",
      "Outcome / actual time",
    ])
      head.append(el("th", t(label), { scope: "col" }));
    const thead = el("thead");
    thead.append(head);
    table.append(thead);
    const body = el("tbody");
    for (const event of filtered.slice(page * 50, page * 50 + 50)) {
      const row = el("tr");
      for (const value of [
        stamp(event.time, plan.timezone),
        `${labels.get(event.source_id) || event.source_id} · ${event.kind}`,
        event.action.action,
        event.action.targets.entities.join(", "),
        `${event.outcome || t("Preview only")} · ${stamp(event.actual_time || event.dispatch_time, plan.timezone)}`,
      ])
        row.append(el("td", value));
      body.append(row);
    }
    table.append(body);
    tableWrap.replaceChildren(table);
    const back = button(t("Previous"), () => {
        page--;
        draw();
      }),
      next = button(t("Next"), () => {
        page++;
        draw();
      });
    back.disabled = page === 0;
    next.disabled = (page + 1) * 50 >= filtered.length;
    controls.replaceChildren(
      back,
      el(
        "span",
        `${filtered.length} ${t("events")} · ${page + 1}/${Math.max(1, Math.ceil(filtered.length / 50))}`,
      ),
      next,
    );
  };
  filter.addEventListener("input", () => {
    page = 0;
    draw();
  });
  box.append(filter, tableWrap, controls);
  draw();
  const issues = doc.issues || plan.issues;
  for (const issue of issues || [])
    box.append(
      el("p", `${issue.code}: ${issue.message}`, {
        class: issue.severity === "warning" ? "hint" : "error",
      }),
    );
}
