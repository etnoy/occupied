// Generated from live-preview.ts by pnpm run build. Do not edit.
export function liveRunning(session) {
  return (
    !!session && ["ready", "executing", "stopping"].includes(session.state)
  );
}
export function liveSessionStatus(session) {
  if (session.state === "ready") {
    return session.cursor === 0 ? "Ready to start" : "Ready for next event";
  }
  const labels = {
    completed: "Day complete",
    executing: "Running…",
    stopping: "Stopping…",
    stopped: "Stopped",
    interrupted: "Interrupted",
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
    return "Dispatched";
  }
  return succeeded > 0 ? "Partial success" : "Event failed or interrupted";
}
