import type {
  Action,
  ActionForm,
  EntitySettingsForm,
  FieldErrors,
  JsonValue,
  Translate,
} from "../types.js";

export function emptyEntitySettings(): EntitySettingsForm {
  return { brightness: "", transition: "" };
}

export function canSetBrightness(entity: string, action: string): boolean {
  return action === "turn_on" && entity.startsWith("light.");
}

export function brightnessPercentage(raw: number): string {
  return String(Math.round((raw * 1000) / 255) / 10);
}

export function editableEntityMapping(source?: Action) {
  if (
    source?.action !== "set_state" ||
    source.actions ||
    !source.entities ||
    Array.isArray(source.entities) ||
    Object.keys(source.data || {}).length > 0
  ) {
    return;
  }
  const entries = Object.entries(source.entities);
  const state = entries[0]?.[1].state;
  if (
    !["on", "off"].includes(String(state)) ||
    entries.some(([entity, settings]) => {
      if (!/^(light|switch)\./.test(entity) || settings.state !== state) {
        return true;
      }
      const allowed = ["state"];
      if (entity.startsWith("light.")) {
        allowed.push("transition");
        if (state === "on") {
          allowed.push("brightness", "rgb_color", "color_temp_kelvin");
        }
      }

      return (
        Object.keys(settings).some((key) => !allowed.includes(key)) ||
        (settings.brightness !== undefined &&
          (typeof settings.brightness !== "number" ||
            !Number.isSafeInteger(settings.brightness) ||
            settings.brightness < 1 ||
            settings.brightness > 255)) ||
        (settings.transition !== undefined &&
          (typeof settings.transition !== "number" ||
            !Number.isFinite(settings.transition) ||
            settings.transition < 0 ||
            settings.transition > 604_800)) ||
        (settings.rgb_color !== undefined &&
          !validRgbColor(settings.rgb_color)) ||
        (settings.color_temp_kelvin !== undefined &&
          !validColorTemp(settings.color_temp_kelvin)) ||
        (settings.rgb_color !== undefined &&
          settings.color_temp_kelvin !== undefined)
      );
    })
  ) {
    return;
  }
  const entitySettings: Record<string, EntitySettingsForm> = {};
  for (const [entity, settings] of entries) {
    if (
      settings.brightness === undefined &&
      settings.transition === undefined &&
      settings.rgb_color === undefined &&
      settings.color_temp_kelvin === undefined
    ) {
      continue;
    }
    entitySettings[entity] = {
      brightness:
        settings.brightness === undefined
          ? ""
          : brightnessPercentage(settings.brightness as number),
      ...(settings.brightness !== undefined && {
        rawBrightness: settings.brightness as number,
      }),
      transition: String(settings.transition ?? ""),
      ...(settings.rgb_color !== undefined && {
        rgbColor: [...(settings.rgb_color as number[])],
      }),
      ...(settings.color_temp_kelvin !== undefined && {
        colorTemp: String(settings.color_temp_kelvin),
      }),
    };
  }

  return { action: state === "off" ? "turn_off" : "turn_on", entitySettings };
}

export function setActionEntities(form: ActionForm, entities: string[]) {
  form.entities = [...new Set(entities)];
  if (!form.entitySettings) {
    return;
  }

  form.entitySettings = Object.fromEntries(
    Object.entries(form.entitySettings).filter(([entity]) =>
      form.entities.includes(entity),
    ),
  );
  if (Object.keys(form.entitySettings).length === 0) {
    delete form.entitySettings;
  }
}

export function resetEntitySettings(form: ActionForm, entity: string) {
  const next = { ...form.entitySettings };
  delete next[entity];
  if (Object.keys(next).length > 0) {
    form.entitySettings = next;
  } else {
    delete form.entitySettings;
  }
}

export function updateEntitySetting(
  form: ActionForm,
  entity: string,
  key: "brightness" | "transition" | "colorTemp",
  value: string,
) {
  const settings = {
    ...(form.entitySettings?.[entity] || emptyEntitySettings()),
    [key]: value,
  };
  if (key === "brightness") {
    delete settings.rawBrightness;
  }
  if (key === "colorTemp" && value.trim()) {
    delete settings.rgbColor;
  }
  if (key === "colorTemp" && !value.trim()) {
    delete settings.colorTemp;
  }
  saveEntitySettings(form, entity, settings);
}

export function updateEntityColor(
  form: ActionForm,
  entity: string,
  value?: number[],
) {
  const settings = {
    ...(form.entitySettings?.[entity] || emptyEntitySettings()),
  };
  if (value) {
    settings.rgbColor = [...value];
    delete settings.colorTemp;
  } else {
    delete settings.rgbColor;
  }
  saveEntitySettings(form, entity, settings);
}

function saveEntitySettings(
  form: ActionForm,
  entity: string,
  settings: EntitySettingsForm,
) {
  if (
    !settings.brightness.trim() &&
    !settings.transition.trim() &&
    !settings.rgbColor &&
    !settings.colorTemp?.trim()
  ) {
    resetEntitySettings(form, entity);

    return;
  }
  form.entitySettings = { ...form.entitySettings, [entity]: settings };
}

function validRgbColor(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(
      (channel) =>
        Number.isSafeInteger(channel) && channel >= 0 && channel <= 255,
    )
  );
}

function validColorTemp(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 100_000
  );
}

export function entitySettingsErrors(form: ActionForm): FieldErrors {
  const errors: FieldErrors = {};
  for (const entity of form.entities) {
    const settings = form.entitySettings?.[entity];
    if (!settings) {
      continue;
    }
    if (
      form.action === "turn_on" &&
      settings.brightness.trim() &&
      (!entity.startsWith("light.") ||
        !Number.isFinite(Number(settings.brightness)) ||
        Number(settings.brightness) <= 0 ||
        Number(settings.brightness) > 100)
    ) {
      errors[`entitySettings.${entity}.brightness`] = "entity_brightness_error";
    }
    if (form.action === "turn_on") {
      if (
        settings.rgbColor &&
        (!entity.startsWith("light.") || !validRgbColor(settings.rgbColor))
      ) {
        errors[`entitySettings.${entity}.rgbColor`] = "entity_color_error";
      }
      if (
        settings.colorTemp?.trim() &&
        (!entity.startsWith("light.") ||
          !validColorTemp(Number(settings.colorTemp)) ||
          settings.rgbColor)
      ) {
        errors[`entitySettings.${entity}.colorTemp`] =
          "entity_color_temp_error";
      }
    }
    if (
      settings.transition.trim() &&
      (!entity.startsWith("light.") ||
        !Number.isFinite(Number(settings.transition)) ||
        Number(settings.transition) < 0 ||
        Number(settings.transition) > 604_800)
    ) {
      errors[`entitySettings.${entity}.transition`] = "entity_transition_error";
    }
  }

  return errors;
}

export function entitySettingsData(form: ActionForm, entity: string) {
  const settings = form.entitySettings?.[entity];
  const data: Record<string, JsonValue> = {};
  if (!entity.startsWith("light.") || !settings) {
    return data;
  }
  if (form.action === "turn_on" && settings.brightness.trim()) {
    data.brightness =
      settings.rawBrightness ??
      Math.max(1, Math.round((Number(settings.brightness) * 255) / 100));
  }
  if (form.action === "turn_on") {
    if (settings.rgbColor) {
      data.rgb_color = [...settings.rgbColor];
    }
    if (settings.colorTemp?.trim()) {
      data.color_temp_kelvin = Number(settings.colorTemp);
    }
  }
  if (settings.transition.trim()) {
    data.transition = Number(settings.transition);
  }

  return data;
}

export function entitySettingsSummary(
  settings: EntitySettingsForm | undefined,
  t: Translate,
  action = "turn_on",
): string {
  return action === "turn_on" && settings?.brightness.trim()
    ? t("entity_brightness_summary").replace(
        "{value}",
        () => settings.brightness,
      )
    : "";
}
