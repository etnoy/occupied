"""Resolve and manually test an editor action without saving a program."""

from homeassistant.core import Context

from .actions import ServiceWaitTimeout, dispatch_service, service_payload
from .editor import installed_issues
from .planner import resolve_actions
from .validation import validate_program


async def async_preview_action(hass, source, *, execute=False, user_id=None):
    # Use the same validation and resolution as scheduled actions, independently
    # of incomplete timing, frequency, or other actions in the open editor.
    program = await hass.async_add_executor_job(
        validate_program,
        {
            "schema_version": 1,
            "name": "Action preview",
            "steps": {"preview": {**source, "timing": {"absolute_time": {"start": "00:00"}}}},
        },
    )
    issues = installed_issues(hass, program)
    if any(
        issue.severity == "error" or issue.code in {"service_missing", "entity_unavailable"}
        for issue in issues
    ):
        return {"valid": False, "issues": [issue.to_dict() for issue in issues]}

    actions = resolve_actions(program.steps["preview"])
    calls = [{"action": action.action, "data": service_payload(hass, action)} for action in actions]
    result = {"valid": True, "calls": calls, "outcomes": []}
    if not execute:
        return result

    context = Context(user_id=user_id)
    for index, (action, call) in enumerate(zip(actions, calls, strict=True)):
        try:
            await dispatch_service(hass, action, context, data=call["data"])
        except Exception as err:
            result["outcomes"].append(
                {
                    "status": "uncertain" if isinstance(err, ServiceWaitTimeout) else "failed",
                    "detail": str(err),
                }
            )
            result["outcomes"].extend({"status": "skipped"} for _ in actions[index + 1 :])
            break
        result["outcomes"].append({"status": "dispatched"})
    return result
