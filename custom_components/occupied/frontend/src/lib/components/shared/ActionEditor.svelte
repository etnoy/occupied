<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { ActionEditorContext } from "../../types.js";
  import { properties } from "../../actions/dom.js";
  import { isValueChangedEvent } from "../../utils/util.js";
  import FieldError from "./FieldError.svelte";
  import EditorField from "./EditorField.svelte";
  import EntitiesEditor from "./EntitiesEditor.svelte";
  import {
    serviceOptions,
    serviceExample,
    emptyServiceData,
  } from "../../utils/services.js";
  import { remoteActivities } from "../../utils/remote.js";
  import { coverActions } from "../../utils/cover.js";
  import { changeActionKind } from "../../utils/action-kind.js";

  let {
    panel,
    context,
    heading = "action",
    kindLabel = "step_type",
    entityLabel = "entities_label",
    hideEntities = false,
  }: {
    panel: LoadedOccupiedPanel;
    context: ActionEditorContext;
    heading?: string;
    kindLabel?: string;
    entityLabel?: string;
    hideEntities?: boolean;
  } = $props();

  let { form, t } = $derived(context);
  let serviceDescription = $derived.by(() => {
    const [domain, service] = form.service.split(".", 2);

    return panel.catalog.services[domain]?.[service];
  });
  let example = $derived(serviceExample(serviceDescription));
</script>

<div data-editor-section="action">
  <h3>{t(heading)}</h3>
  <EditorField
    {panel}
    {context}
    key="kind"
    label={kindLabel}
    value={form.kind === "entities" ? form.action : form.kind}
    update={(value) => {
      const errors = changeActionKind(form, value, (message) =>
        globalThis.confirm(t(message)),
      );
      context.setErrors(errors);
    }}
    options={{
      hideLabel: true,
      choices: [
        ["turn_on", "turn_on_lights_switches"],
        ["turn_off", "turn_off_lights_switches"],
        ["cover", "control_covers"],
        ["remote", "remote_activity_action"],
        ["service", "entity_service_action"],
        ["scene", "activate_home_assistant_scene"],
        ["custom", "custom_yaml"],
      ],
      render: true,
    }}
  ></EditorField>
  {#if form.kind !== "custom" && !hideEntities}
    <EntitiesEditor {panel} {context} label={entityLabel} />
  {/if}
  {#if form.kind === "custom"}
    <ha-code-editor
      role="group"
      aria-label={t("action_yaml")}
      aria-describedby={context.editor.errors.customYaml
        ? `step-error-${context.fieldPrefix || ""}customYaml`
        : undefined}
      data-builder-field={`${context.fieldPrefix || ""}customYaml`}
      dir="ltr"
      use:properties={{
        mode: "yaml",
        value: form.customYaml || "",
        linewrap: true,
      }}
      onvalue-changed={(event: Event) => {
        if (
          !isValueChangedEvent(event) ||
          typeof event.detail.value !== "string"
        ) {
          return;
        }
        form.customYaml = event.detail.value;
        context.changed("customYaml");
      }}
    ></ha-code-editor>
    <FieldError
      {t}
      key="customYaml"
      fieldPrefix={context.fieldPrefix || ""}
      errors={{ ...context.editor.errors }}
    />
    <p class="hint">
      {t("custom_yaml_hint")}
    </p>
  {/if}
  {#if form.kind === "service"}
    <ha-selector
      data-builder-field={`${context.fieldPrefix || ""}service`}
      aria-label={t("service")}
      aria-invalid={context.editor.errors.service ? "true" : undefined}
      aria-describedby={context.editor.errors.service
        ? `step-error-${context.fieldPrefix || ""}service`
        : undefined}
      use:properties={{
        hass: panel._hass,
        label: t("service"),
        required: true,
        value: form.service,
        selector: {
          select: {
            options: serviceOptions(panel.catalog, form.entities, form.service),
            custom_value: true,
          },
        },
      }}
      onvalue-changed={(event: Event) => {
        if (
          !isValueChangedEvent(event) ||
          (event.detail.value != null && typeof event.detail.value !== "string")
        ) {
          return;
        }
        form.service = event.detail.value || "";
        context.changed("service");
      }}
    ></ha-selector>
    <FieldError
      {t}
      key="service"
      fieldPrefix={context.fieldPrefix || ""}
      errors={{ ...context.editor.errors }}
    />
  {/if}
  {#if form.kind === "remote"}
    <EditorField
      {panel}
      {context}
      key="service"
      label="remote_command"
      value={form.service}
      update={(value) => (form.service = value)}
      options={{
        choices: [
          ["remote.turn_on", "start_activity"],
          ["remote.turn_off", "turn_off"],
        ],
        render: true,
      }}
    />
    {#if form.service === "remote.turn_on"}
      <ha-selector
        data-builder-field={`${context.fieldPrefix || ""}activity`}
        aria-label={t("remote_activity")}
        use:properties={{
          hass: panel._hass,
          label: t("remote_activity"),
          selector: {
            select: {
              options: remoteActivities(panel.catalog, form.entities),
              custom_value: true,
            },
          },
          value: form.activity,
        }}
        onvalue-changed={(event: Event) => {
          if (
            !isValueChangedEvent(event) ||
            (event.detail.value != null &&
              typeof event.detail.value !== "string")
          ) {
            return;
          }
          form.activity = event.detail.value || "";
          context.changed("activity");
        }}
      ></ha-selector>
      <p class="hint">{t("remote_default_activity_hint")}</p>
    {/if}
  {/if}
  {#if form.kind === "cover"}
    <EditorField
      {panel}
      {context}
      key="service"
      label="cover_action"
      value={form.service}
      update={(value) => (form.service = value)}
      options={{ choices: coverActions, render: true }}
    />
    {#if form.service === "cover.set_cover_position"}
      <EditorField
        {panel}
        {context}
        key="position"
        label="position"
        value={form.position}
        update={(value) => (form.position = value)}
        options={{ type: "number", min: 0, max: 100, step: 1 }}
      />
    {:else if form.service === "cover.set_cover_tilt_position"}
      <EditorField
        {panel}
        {context}
        key="tiltPosition"
        label="tilt_position"
        value={form.tiltPosition}
        update={(value) => (form.tiltPosition = value)}
        options={{ type: "number", min: 0, max: 100, step: 1 }}
      />
    {/if}
    <p class="hint">
      {t("cover_position_hint")}
    </p>
    <p class="hint">
      {t("cover_schedule_hint")}
    </p>
  {/if}
  {#if form.kind === "scene" || form.kind === "service"}
    <EditorField
      {panel}
      {context}
      key="data"
      label="service_data"
      value={form.data}
      update={(value) => (form.data = value)}
      options={{ multiline: true }}
    ></EditorField>
  {/if}
  {#if form.kind === "service" && Object.keys(serviceDescription?.fields || {}).length > 0}
    <div class="service-fields">
      <h4>{t("service_fields")}</h4>
      <dl>
        {#each Object.entries(serviceDescription?.fields || {}) as [key, field] (key)}
          <dt>
            <code>{key}</code>{field.required
              ? ` · ${t("required_field")}`
              : ""}
          </dt>
          <dd>
            {#if field.description}<p>{field.description}</p>{/if}
            {#if field.example !== undefined}<p>
                {t("field_example")}:
                <code>{JSON.stringify(field.example)}</code>
              </p>{/if}
          </dd>
        {/each}
      </dl>
      {#if Object.keys(example).length > 0}
        <button
          type="button"
          disabled={!emptyServiceData(form.data)}
          onclick={() => {
            if (!emptyServiceData(form.data)) {
              return;
            }
            form.data = JSON.stringify(example, null, 2);
            context.changed("data");
          }}>{t("insert_service_example")}</button
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  ha-code-editor {
    display: block;
    width: 100%;
    margin: 8px 0;
    --code-mirror-height: 280px;
    --code-mirror-max-height: 60vh;
  }
</style>
