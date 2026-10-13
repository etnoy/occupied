// The editable GUI draft is the canonical YAML/JSON model.
export type Path = (string | number)[];
export type Translate = (text: string) => string;
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export interface Timing {
  absolute_time?: { start: string; end?: string };
  relative_to?: {
    step?: string;
    sun?: string;
    entity?: string;
    attribute?: "start_time" | "end_time";
    start_offset?: string;
    end_offset?: string;
  };
}
export interface Step {
  name?: string;
  enabled?: boolean;
  days?: string[];
  timing: Timing;
  action: string;
  entities: string[];
  data?: Record<string, JsonValue>;
}
export interface Program {
  schema_version?: number;
  name?: string;
  steps?: Record<string, Step>;
}
export interface StepEntry extends Omit<Step, "name" | "days"> {
  id: string;
  name: string;
  path: ["steps", string];
  days: string[];
}
export interface TimingForm {
  mode: string;
  start: string;
  end: string;
  anchor: string;
  startOffset: string | number;
  endOffset: string | number;
}
export interface StepForm {
  name: string;
  enabled: boolean;
  kind: string;
  service: string;
  data: string;
  entities: string[];
  action: string;
  days: string[];
  timing: TimingForm;
}
export type FieldErrors = Record<string, string>;
export interface StepEditor {
  id: string;
  existing: boolean;
  form: StepForm;
  original: StepForm;
  changed: boolean;
  errors: FieldErrors;
  candidatePath?: Path;
  showEndTime?: boolean;
  showEndOffset?: boolean;
}
export interface TimeSource {
  value: string;
  name: string;
  group: string;
  entity_id?: string;
}
export interface Catalog {
  entities: {
    entity_id: string;
    name: string;
    area?: string | null;
    domain?: string;
    state?: string;
    dimmable?: boolean;
    transition?: boolean;
  }[];
  services: Record<
    string,
    Record<
      string,
      {
        name?: string;
        description?: string;
        fields?: Record<
          string,
          {
            name?: string;
            description?: string;
            selector?: SelectorConfig;
            example?: unknown;
            required?: boolean;
          }
        >;
      }
    >
  >;
  time_sources?: TimeSource[];
}
export interface Issue {
  message: string;
  severity?: string;
  code?: string;
  path?: string;
  model_path?: Path;
  line?: number;
}
export interface ConfigurationSource {
  mode: string;
  status?: string;
  config_file?: string;
  has_valid_program?: boolean;
  observed_hash?: string;
  issues?: Issue[];
}
export interface ProgramDocument {
  program: Program;
  warnings?: Issue[];
  revision: string;
  source: string;
  configuration_source?: ConfigurationSource;
  needs_apply?: boolean;
  simulation_date: string;
  timezone: string;
}
export interface InstanceDocument {
  config_entry_id: string;
  name: string;
  loaded: boolean;
  state: string;
  source: string;
  source_status?: string | null;
  status: string;
  enabled: boolean;
  paused: boolean;
  active: boolean;
  overlaps: { config_entry_id: string; name: string; entities: string[] }[];
}
export type ApiResult<T> =
  | ({ valid: true; issues?: Issue[] } & T)
  | { valid: false; issues: Issue[] };
export interface RuntimeSnapshot {
  source_revision?: string;
  configuration_source?: ConfigurationSource;
}
export interface PlannedEvent {
  time: string;
  source_id: string;
  kind: string;
  action: {
    action: string;
    entities: string[];
    data?: Record<string, JsonValue>;
  };
}
export interface Plan {
  simulation_date: string;
  timezone: string;
  behavior_hash: string;
  source_revision?: string;
  start: string;
  end: string;
  steps: Record<string, string>;
  events: PlannedEvent[];
  issues: Issue[];
}
export interface PreviewResult {
  valid: boolean;
  issues?: Issue[];
  plans: Plan[];
}
export interface WebSocketResponses {
  instances: InstanceDocument[];
  program: ProgramDocument;
  catalog: Catalog;
  editor_validate: ApiResult<{ program: Program; behavior_hash: string }>;
  save: ApiResult<ProgramDocument>;
  validate: ApiResult<{ program: Program; behavior_hash: string }>;
  export: ApiResult<{ yaml: string; behavior_hash: string }>;
  rename_id: ApiResult<{
    program: Program;
    yaml: string;
    behavior_hash: string;
  }>;
  preview: PreviewResult;
}
export interface HomeAssistant {
  language?: string;
  config?: { time_zone?: string; [key: string]: unknown };
  locale?: {
    language?: string;
    time_format?: "language" | "system" | "12" | "24";
    time_zone?: "local" | "server";
  };
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  connection: {
    subscribeMessage<T>(
      callback: (snapshot: T) => void,
      message: Record<string, unknown>,
    ): Promise<() => void>;
  };
}
export interface SelectorConfig {
  entity?: { multiple?: boolean; filter?: { domain: string[] } };
  time?: Record<string, never>;
  [key: string]: unknown;
}
export interface HaSelector extends HTMLElement {
  hass?: HomeAssistant;
  selector: SelectorConfig;
  value: unknown;
  label: string;
  required: boolean;
  narrow: boolean;
}
export interface PickerItem {
  id: string;
  primary: string;
  secondary?: string;
  group: string;
}
export interface HaGenericPicker extends HTMLElement {
  hass?: HomeAssistant;
  value?: string;
  label: string;
  searchLabel: string;
  placeholder: string;
  notFoundLabel: string;
  getItems: () => (string | PickerItem)[];
  searchKeys: string[];
  valueRenderer: (id: string) => HTMLElement;
  allowCustomValue: boolean;
  noSort: boolean;
  required: boolean;
}
// Primary navigation tabs plus the secondary pages reached from them.
export type Tab = "steps" | "settings" | "preview";
declare global {
  interface HTMLElementTagNameMap {
    "occupied-panel": import("./occupied-panel.js").OccupiedPanel;
    "ha-selector": HaSelector;
    "ha-generic-picker": HaGenericPicker;
  }
  interface HTMLElementEventMap {
    // HA's fireEvent uses a plain Event with detail attached. CustomEvent
    // implements the same contract, but cannot be required at runtime.
    "value-changed": Event & { detail: { value: unknown } };
  }
}
