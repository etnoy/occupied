import type { ActionForm, Catalog, FieldErrors } from "../types.js";

export function remoteActivities(
  catalog: Pick<Catalog, "entities"> | null,
  entities: string[],
): string[] {
  if (entities.length === 0 || !catalog) {
    return [];
  }
  const lists = entities.map(
    (id) =>
      catalog.entities.find((entity) => entity.entity_id === id)
        ?.activity_list || [],
  );

  return [...new Set(lists[0])]
    .filter((name) =>
      lists.every((list) =>
        list.some((item) => item.toLowerCase() === name.toLowerCase()),
      ),
    )
    .sort((a, b) => a.localeCompare(b));
}

export function remoteErrors(form: ActionForm): FieldErrors {
  if (form.kind !== "remote") {
    return {};
  }
  const errors: FieldErrors = {};
  if (form.entities.some((entity) => !entity.startsWith("remote."))) {
    errors.entities = "remote_entities_error";
  }
  if (!["remote.turn_on", "remote.turn_off"].includes(form.service)) {
    errors.service = "remote_command_error";
  }

  return errors;
}
