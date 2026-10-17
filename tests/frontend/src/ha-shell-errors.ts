// Historical HA shells can reject their own setup toast and navigation animations.
// Keep these exceptions narrow so panel failures always reach the smoke assertion.
export function expectedHaShellError(
  error: Error,
  panelStarted: boolean,
): boolean {
  if (
    error.name === "AbortError" &&
    error.message === "Transition was skipped. New ViewTransition started"
  ) {
    return true;
  }
  const stack = error.stack ?? "";

  return (
    !panelStarted &&
    error.name === "InvalidStateError" &&
    error.message ===
      "Failed to execute 'showPopover' on 'HTMLElement': Invalid on disconnected popover elements." &&
    stack.includes(
      "._showToastPopover (http://127.0.0.1:18123/frontend_latest/",
    ) &&
    !stack.includes("/occupied_static/")
  );
}
