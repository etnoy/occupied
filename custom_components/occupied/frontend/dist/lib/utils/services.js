// Generated from custom_components/occupied/frontend/src/lib/utils/services.ts by pnpm run build. Do not edit.
export function serviceOptions(catalog, entities, current = "") {
  const values = new Set([
    "homeassistant.turn_on",
    "homeassistant.turn_off",
    "homeassistant.toggle",
  ]);
  for (const [domain, services] of Object.entries(catalog.services)) {
    for (const [service, description] of Object.entries(services)) {
      const target = description.target?.entity;
      if (!target) {
        continue;
      }
      const filters = Array.isArray(target) ? target : [target];
      if (
        entities.every((entity) =>
          filters.some((filter) => {
            const domains = filter.domain;
            return (
              !domains ||
              (Array.isArray(domains) ? domains : [domains]).includes(
                entity.split(".", 1)[0],
              )
            );
          }),
        )
      ) {
        values.add(`${domain}.${service}`);
      }
    }
  }
  if (current) {
    values.add(current);
  }
  return [...values]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => {
      const [domain, service] = value.split(".", 2);
      const name = catalog.services[domain]?.[service]?.name;
      return { value, label: name ? `${value} — ${name}` : value };
    });
}
export function serviceExample(description) {
  return Object.fromEntries(
    Object.entries(description?.fields || {})
      .filter(([, field]) => field.required && field.example !== undefined)
      .map(([key, field]) => [key, structuredClone(field.example)]),
  );
}
export function emptyServiceData(data) {
  try {
    const value = JSON.parse(data);
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    );
  } catch {
    return false;
  }
}
