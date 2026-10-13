# Program fixtures

These configurations deliberately combine unusual schedules and payloads for regression tests. User-facing examples belong in `examples/`.

- `gui-house.yaml` covers mixed light/switch control, all six solar events, time helpers, timestamp sensors, both calendar attributes, chains across midnight, independent weekdays, disabled parents, optional titles, Unicode, scenes, and nested opaque service data.
- `scheduling-edge-cases.yaml` covers duplicate weekdays and entities, equal timing bounds, zero and negative offsets, forward references, disjoint weekdays, second precision, and occurrences crossing the source date boundary.

The editor API tests compare YAML and JSON validation and previews. The fixture tests round-trip every step through the shipped JavaScript editor and check scheduling and normalization outcomes. Keep the small `program_dict` fixture in `conftest.py` for focused unit tests; use these files for combined-feature coverage.
