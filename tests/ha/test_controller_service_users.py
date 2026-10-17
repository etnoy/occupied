"""Normal users can control the same controller through entities and services."""

import pytest
from homeassistant.auth.const import GROUP_ID_USER
from homeassistant.core import Context


@pytest.mark.parametrize("service", ["start", "stop", "pause", "resume"])
async def test_normal_user_can_call_controller_services(
    hass, entry, devices, service, hass_owner_user
):
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    engine = entry.runtime_data
    user = await hass.auth.async_create_user("Household member", group_ids=[GROUP_ID_USER])
    assert not user.is_admin
    if service == "stop":
        await engine.async_set_enabled(True)
    elif service == "resume":
        await engine.async_set_paused(True)
    await hass.services.async_call(
        "occupied",
        service,
        {"config_entry_id": entry.entry_id},
        blocking=True,
        context=Context(user_id=user.id),
    )
    if service in {"start", "stop"}:
        assert engine.enabled is (service == "start")
    else:
        assert engine.paused is (service == "pause")
