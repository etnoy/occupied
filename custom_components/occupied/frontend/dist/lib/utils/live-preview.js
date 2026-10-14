// Generated from custom_components/occupied/frontend/src/lib/utils/live-preview.ts by pnpm run build. Do not edit.
export function liveRunning(session) {
  return (
    !!session && ["ready", "executing", "stopping"].includes(session.state)
  );
}
export function liveSessionStatus(session) {
  if (session.state === "ready") {
    return session.cursor === 0 ? "ready_to_start" : "ready_for_next_event";
  }
  const labels = {
    completed: "day_complete",
    executing: "running",
    stopping: "stopping",
    stopped: "stopped",
    interrupted: "interrupted",
  };
  return labels[session.state];
}
export function mergeLiveSession(previous, incoming) {
  if (!incoming || previous?.id !== incoming.id) {
    return incoming;
  }
  if (incoming.cursor < previous.cursor) {
    return previous;
  }
  const states = [
    "ready",
    "executing",
    "stopping",
    "completed",
    "stopped",
    "interrupted",
  ];
  if (
    incoming.cursor === previous.cursor &&
    states.indexOf(incoming.state) < states.indexOf(previous.state)
  ) {
    return previous;
  }
  const terminal = new Set(["completed", "stopped", "interrupted"]);
  if (terminal.has(previous.state) && !terminal.has(incoming.state)) {
    return previous;
  }
  return {
    ...incoming,
    outcomes: { ...previous.outcomes, ...incoming.outcomes },
  };
}
export function eventLiveResult(event, session) {
  if (!session || !event.group_id) {
    return;
  }
  const outcome = event.id ? session.outcomes[event.id] : undefined;
  const current =
    session.next_group?.id === event.group_id && liveRunning(session);
  return { current, outcome };
}
export function lastGroupResult(session) {
  const outcomes = Object.values(session.outcomes).filter(
    (outcome) => outcome.group_id === session.last_group_id,
  );
  if (outcomes.length === 0) {
    return "";
  }
  const succeeded = outcomes.filter(
    (outcome) => outcome.status === "dispatched",
  ).length;
  if (succeeded === outcomes.length) {
    return "dispatched_label";
  }
  return succeeded > 0 ? "partial_success" : "event_failed_or_interrupted";
}
