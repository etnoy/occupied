"""Admin instance discovery and declared device overlap warnings."""

from .const import DOMAIN

INSTANCE_SIGNAL = "occupied_instances_changed"


def program_entities(program):
    from .models import controlled_entities

    return set(controlled_entities(program))


def controlled_entities(engine):
    if hasattr(engine, "program"):
        return program_entities(engine.program)
    return {
        engine.config[key] for key in ("light_entity", "remote_entity") if engine.config.get(key)
    }


def instance_documents(hass):
    documents = []
    targets = {}
    for entry in hass.config_entries.async_entries(DOMAIN):
        engine = getattr(entry, "runtime_data", None)
        loaded = engine is not None and not engine.closed
        manager = getattr(engine, "source_manager", None) if loaded else None
        documents.append(
            {
                "config_entry_id": entry.entry_id,
                "name": engine.config["name"] if loaded else entry.title,
                "loaded": loaded,
                "state": entry.state.value,
                "source": manager.mode if manager else entry.data.get("source", "gui"),
                "source_status": manager.status if manager else None,
                "status": engine.status if loaded else "unloaded",
                "enabled": engine.enabled if loaded else False,
                "paused": engine.paused if loaded else False,
                "active": engine.active if loaded else False,
                "overlaps": [],
            }
        )
        targets[entry.entry_id] = controlled_entities(engine) if loaded else set()
    for document in documents:
        for other in documents:
            if other is document:
                continue
            shared = targets[document["config_entry_id"]] & targets[other["config_entry_id"]]
            if shared:
                document["overlaps"].append(
                    {
                        "config_entry_id": other["config_entry_id"],
                        "name": other["name"],
                        "entities": sorted(shared),
                    }
                )
    return documents
