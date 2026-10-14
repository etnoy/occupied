import test from "node:test";
import assert from "node:assert/strict";
import {
  eventLiveResult,
  lastGroupResult,
  liveRunning,
  mergeLiveSession,
} from "@occupied/live-preview.js";
import type { LivePreviewSession } from "@occupied/types.js";

function sessionFixture(): LivePreviewSession {
  return {
    id: "session",
    user_id: "owner",
    state: "ready",
    date: "2026-10-06",
    source_revision: "frozen",
    plan_fingerprint: "fingerprint",
    cursor: 0,
    total: 2,
    simulated_time: null,
    in_flight: null,
    last_group_id: null,
    next_group: {
      id: "day:step:first",
      time: "2026-10-06T08:00:00Z",
      title: "First",
      kind: "step",
      calls: [],
    },
    detail: "Ready to start",
    paused: true,
    earlier_revision: false,
    storage_failed: false,
    outcomes: {},
  };
}

void test("session updates preserve earlier call results and reject cursor regression", () => {
  const previous = {
    ...sessionFixture(),
    cursor: 1,
    outcomes: {
      first: { group_id: "first", status: "dispatched", detail: "done" },
    },
  };
  const incoming = {
    ...sessionFixture(),
    cursor: 2,
    state: "completed" as const,
    outcomes: {
      second: { group_id: "second", status: "failed", detail: "error" },
    },
  };
  const merged = mergeLiveSession(previous, incoming)!;
  assert.equal(Object.keys(merged.outcomes).length, 2);
  assert.equal(mergeLiveSession(merged, previous), merged);
  assert.equal(
    mergeLiveSession(merged, { ...incoming, state: "executing" }),
    merged,
  );
  assert.equal(mergeLiveSession(merged, null), null);
  const executing = { ...sessionFixture(), state: "executing" as const };
  assert.equal(mergeLiveSession(executing, sessionFixture()), executing);
  const newSession = { ...sessionFixture(), id: "new" };
  assert.equal(mergeLiveSession(merged, newSession), newSession);
});

void test("partial success and interrupted events are never reported as wholly successful", () => {
  const session = sessionFixture();
  session.last_group_id = "first";
  session.outcomes = {
    a: { group_id: "first", status: "dispatched", detail: "done" },
    b: { group_id: "first", status: "uncertain", detail: "timed out" },
  };
  assert.equal(lastGroupResult(session), "Partial success");
  session.outcomes.a.status = "failed";
  assert.equal(lastGroupResult(session), "Event failed or interrupted");
  session.outcomes.a.status = session.outcomes.b.status = "dispatched";
  assert.equal(lastGroupResult(session), "Dispatched");
});

void test("timeline status follows occurrence identity regardless of filtering", () => {
  const session = sessionFixture();
  const event = {
    id: "call",
    group_id: session.next_group!.id,
    time: "now",
    source_id: "first",
    kind: "step",
    action: { action: "light.turn_on", entities: ["light.a"] },
  };
  assert.equal(eventLiveResult(event, session)?.current, true);
  session.outcomes.call = {
    group_id: event.group_id,
    status: "failed",
    detail: "unavailable",
  };
  assert.equal(eventLiveResult(event, session)?.outcome?.status, "failed");
  session.state = "stopped";
  assert.equal(eventLiveResult(event, session)?.current, false);
  assert.equal(liveRunning(session), false);
});
