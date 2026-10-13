import type { Catalog } from "./types.js";

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

export function isValueChangedEvent(
  event: Event,
): event is HTMLElementEventMap["value-changed"] {
  return (
    "detail" in event &&
    typeof event.detail === "object" &&
    event.detail !== null &&
    "value" in event.detail
  );
}

export function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Required editor element or value is missing");
  }
  return value;
}

export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function entityName(catalog: Catalog, id: string) {
  return catalog.entities.find((entity) => entity.entity_id === id)?.name || id;
}
