// Generated from custom-action.ts by pnpm run build. Do not edit.
export function actionTargets(source) {
  if (!source) {
    return [];
  }
  if (source.actions) {
    return [
      ...new Set(source.actions.flatMap((action) => actionTargets(action))),
    ];
  }
  return Array.isArray(source.entities)
    ? source.entities
    : Object.keys(source.entities || {});
}
// Emit readable YAML; strict parsing and semantic validation belong to the backend.
export function actionYaml(value, level = 0) {
  const pad = "  ".repeat(level);
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== "object" || item === null)) {
      return JSON.stringify(value);
    }
    return value
      .map((item) => {
        const lines = actionYaml(item, level + 1).split("\n");
        return `${pad}- ${lines[0].trimStart()}${lines.length > 1 ? "\n" + lines.slice(1).join("\n") : ""}`;
      })
      .join("\n");
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const scalar =
          item === null ||
          typeof item !== "object" ||
          (!Array.isArray(item) && Object.keys(item).length === 0) ||
          (Array.isArray(item) &&
            item.every((entry) => typeof entry !== "object" || entry === null));
        const name =
          /^[a-z_][a-z0-9_.]*$/.test(key) &&
          ![
            "on",
            "off",
            "yes",
            "no",
            "y",
            "n",
            "true",
            "false",
            "null",
          ].includes(key)
            ? key
            : JSON.stringify(key);
        return scalar
          ? `${pad}${name}: ${JSON.stringify(item)}`
          : `${pad}${name}:\n${actionYaml(item, level + 1)}`;
      })
      .join("\n");
  }
  return JSON.stringify(value);
}
export function mappedControl(form) {
  return {
    action: "set_state",
    ...(form.stagger && { stagger: { ...form.stagger } }),
    entities: Object.fromEntries(
      form.entities.map((entity) => [
        entity,
        { state: form.action === "turn_off" ? "off" : "on" },
      ]),
    ),
  };
}
export function simpleMapping(source) {
  if (source.action !== "set_state" || Array.isArray(source.entities)) {
    return source;
  }
  const entries = Object.entries(source.entities || {});
  const states = new Set(entries.map(([, settings]) => settings.state));
  if (
    entries.length > 0 &&
    states.size === 1 &&
    entries.every(
      ([entity, settings]) =>
        /^(light|switch)\./.test(entity) &&
        Object.keys(settings).length === 1 &&
        ["on", "off"].includes(String(settings.state)),
    )
  ) {
    return {
      action: states.has("off") ? "turn_off" : "turn_on",
      ...(source.stagger && { stagger: { ...source.stagger } }),
      entities: entries.map(([entity]) => entity),
    };
  }
  return;
}
export async function prepareCustomAction(panel, form) {
  if (form.kind !== "custom") {
    return true;
  }
  const text = form.customYaml || "";
  const version = panel.version;
  const editor = panel.activeEditor;
  const result = await panel.ws("action_yaml", { yaml: text });
  if (
    form.customYaml !== text ||
    panel.version !== version ||
    panel.activeEditor !== editor
  ) {
    throw new Error(
      "Your changes are kept. Submit again to include the latest edits.",
    );
  }
  if (!result.valid) {
    throw new Error(
      result.issues
        .map(
          (issue) =>
            `${issue.line ? `Line ${issue.line}: ` : ""}${issue.path || ""}: ${issue.message}`,
        )
        .join("\n"),
    );
  }
  form.customActions = result.actions;
  form.customAccepted = text;
  return true;
}
export const customExample = actionYaml({
  action: "set_state",
  entities: { "light.example": { state: "on", brightness: 128 } },
});
