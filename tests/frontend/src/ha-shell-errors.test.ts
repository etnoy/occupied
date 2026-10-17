import test from "node:test";
import assert from "node:assert/strict";
import { expectedHaShellError } from "./ha-shell-errors.js";

const toastMessage =
  "Failed to execute 'showPopover' on 'HTMLElement': Invalid on disconnected popover elements.";
const nativeStack =
  "InvalidStateError: toast\n    at c._showToastPopover (http://127.0.0.1:18123/frontend_latest/8672.js:5:3942)";

for (const [name, message, stack, panelStarted, expected] of [
  ["InvalidStateError", toastMessage, nativeStack, false, true],
  ["InvalidStateError", toastMessage, nativeStack, true, false],
  [
    "InvalidStateError",
    toastMessage,
    nativeStack +
      "\n at open (http://127.0.0.1:18123/occupied_static/v/occupied-panel.js:1:1)",
    false,
    false,
  ],
  [
    "InvalidStateError",
    "A different popover failure",
    nativeStack,
    false,
    false,
  ],
  [
    "AbortError",
    "Transition was skipped. New ViewTransition started",
    "",
    true,
    true,
  ],
  ["AbortError", "A request was aborted", "", true, false],
] as const) {
  void test(`HA shell error ${name}, panel=${panelStarted}, message=${message}, expected=${expected}`, () => {
    const error: Error = { name, message, stack };
    assert.equal(expectedHaShellError(error, panelStarted), expected);
  });
}
