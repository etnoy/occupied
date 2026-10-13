// Generated from util.ts by pnpm run build. Do not edit.
export function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}
export function isValueChangedEvent(event) {
  return (
    "detail" in event &&
    typeof event.detail === "object" &&
    event.detail !== null &&
    "value" in event.detail
  );
}
export function required(value) {
  if (value == null) {
    throw new Error("Required editor element or value is missing");
  }
  return value;
}
export function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function entityName(catalog, id) {
  return catalog.entities.find((entity) => entity.entity_id === id)?.name || id;
}
