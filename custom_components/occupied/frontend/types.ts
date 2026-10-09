// Configuration exchanged with the canonical Python API. Optional fields also
// describe editable drafts; backend validation remains authoritative.
export type Path = (string | number)[];
export type Translate = (text: string) => string;
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export interface Targets {
  entities?: string[];
  groups?: string[];
}
export interface Range<T = string | number> {
  fixed?: T;
  min?: T;
  max?: T;
  mode?: T;
}
export interface ClockRange {
  earliest: string;
  latest: string;
  cross_midnight?: boolean;
  mode?: string;
}
export interface When {
  clock_range?: ClockRange;
  sun_range?: { sun: string; offset_range: Range; fallback?: string };
  entity_range?: { entity_id: string; attribute?: string; offset_range: Range };
  relative_to?: string;
  offset_range?: Range;
  distribution?: string;
}
export interface Anchor {
  step?: string;
  clock?: string;
  sun?: string;
  offset?: string;
  day_offset?: number;
  fallback?: string;
}
export interface Condition {
  condition: string;
  entity_id?: string | string[];
  state?: string | string[];
  attribute?: string;
  match?: string;
  conditions?: Condition[];
}
export interface ActionData {
  [key: string]: JsonValue | undefined;
  brightness?: number;
  brightness_pct?: number;
}
export interface Action {
  action: string;
  targets?: Targets;
  data?: ActionData;
  resources?: string[];
  target_order?: string;
  stagger?: Range;
  replay_safe?: boolean;
}
export interface Handover {
  duration?: string;
  target?: string;
  dimming?: string;
  non_dimmable?: string;
  step_interval?: string;
  cancel_behavior?: string;
}
export interface Item {
  id: string;
  name: string;
  description?: string;
  days?: string[];
  probability?: number;
  time_distribution?: string;
  missing_anchor?: string;
  allow_cross_boundary?: boolean;
}
export interface ScheduledItem extends Item {
  when?: When;
  actions?: Action[];
  duration?: Range;
  resources?: string[];
  on_start?: Action[];
  on_end?: Action[];
  start_conditions?: Condition[];
  ownership_conditions?: Condition[];
  stop_behavior?: string;
  within?: Between;
  between?: Between;
  cycles?: Range<number>;
  targets?: Targets;
  on_duration?: Range;
  min_gap?: string;
  overlap?: boolean;
  target_mode?: string;
  subset_size?: Range<number>;
  weights?: Record<string, number>;
  max_simultaneous?: number;
  data?: ActionData;
}
export interface Between {
  start: Anchor;
  end: Anchor;
  cross_midnight?: boolean;
}
export interface Group extends Item {
  entities: string[];
  handover?: Handover;
}
export interface Defaults {
  time_distribution?: string;
  probability?: number;
  target_order?: string;
  stagger?: Range;
  handover?: Handover;
  activity_windows?: {
    on_duration?: Range;
    min_gap?: string;
    overlap?: boolean;
    target_mode?: string;
  };
  activities?: { duration?: Range; stop_behavior?: string };
}
export interface Routine extends Item {
  steps?: ScheduledItem[];
  activities?: ScheduledItem[];
  activity_windows?: ScheduledItem[];
  defaults?: Defaults;
}
export interface Lighting {
  managed_targets?: Targets;
  default_brightness_pct?: number;
  baseline?: {
    targets: Targets;
    state: string;
    brightness_pct?: number;
    [key: string]: unknown;
  }[];
  handover?: Handover;
}
export interface Program {
  schema_version?: number;
  name?: string;
  description?: string;
  timezone?: string;
  location?: { latitude: number; longitude: number; elevation?: number };
  day_boundary?: string;
  activation?: { conditions: Condition[] };
  policies?: {
    late_start?: string;
    lighting_stop_behavior?: string;
    manual_override?: string;
  };
  defaults?: Defaults;
  lighting?: Lighting;
  constraints?: {
    max_simultaneous_groups?: number;
    generation_attempts?: number;
  };
  groups?: Group[];
  routines?: Routine[];
}
export type EditableResource = ScheduledItem &
  Partial<Group> &
  Partial<Routine>;
export type ResourceKind = "group" | "routine" | "step" | "activity" | "window";
export type ItemKind = "steps" | "activities" | "activity_windows";
export type Resource = (Group | Routine | ScheduledItem) & {
  kind: ResourceKind;
  routine?: string;
  when?: When;
};
export interface StepEntry extends ScheduledItem {
  kind: ItemKind;
  container: Routine;
  path: ["routines", number, ItemKind, number];
  days: string[];
  entities: string[];
}
export interface TimingForm {
  mode: string;
  start: string;
  end: string;
  anchor: string;
  startOffset: string | number;
  endOffset: string | number;
  fallback: string;
}
export interface StepForm {
  name: string;
  kind: string;
  service: string;
  data: string;
  entities: string[];
  action: string;
  brightness: string | number;
  days: string[];
  timing: TimingForm;
}
export type FieldErrors = Record<string, string>;
export interface StepEditor {
  id: string;
  existing: boolean;
  stage: number;
  form: StepForm;
  original: StepForm;
  changed: boolean;
  errors: FieldErrors;
  candidatePath?: Path;
  search?: string;
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
    activities?: string[];
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
  revision: string;
  source: string;
  configuration_source?: ConfigurationSource;
  needs_apply?: boolean;
  simulation_date: string;
  timezone: string;
}
export type ApiResult<T> =
  | ({ valid: true; issues?: Issue[] } & T)
  | { valid: false; issues: Issue[] };
export interface RuntimeActivity {
  source_id: string;
  phase: string;
  deadline?: string;
  duration: number;
  resources: string[];
}
export interface RuntimeHandover {
  start: string;
  deadline: string;
  progress: number;
  observed: JsonValue;
  target: JsonValue;
}
export interface RuntimeSnapshot {
  status?: string;
  reason?: string;
  enabled?: boolean;
  paused?: boolean;
  active?: boolean;
  dry_run?: boolean;
  mode?: string;
  next_event?: string;
  source_revision?: string;
  configuration_source?: ConfigurationSource;
  yielded?: string[];
  activities?: RuntimeActivity[];
  handover?: Record<string, RuntimeHandover>;
  events?: { time: string; event: string; id: string }[];
  outcomes?: JsonValue[];
  last_error?: string;
}
export interface PlannedEvent {
  time: string;
  source_id: string;
  kind: string;
  action: Action & { targets: { entities: string[] } };
  outcome?: string;
  actual_time?: string;
  dispatch_time?: string;
}
export interface Plan {
  simulation_date: string;
  timezone: string;
  behavior_hash: string;
  source_revision?: string;
  start: string;
  end: string;
  intervals: {
    source_id: string;
    kind: string;
    start: string;
    end: string;
    resources: string[];
  }[];
  steps: Record<string, string>;
  events: PlannedEvent[];
  issues: Issue[];
}
export interface TimelineDocument {
  plan?: Plan;
  snapshot?: RuntimeSnapshot;
  events?: PlannedEvent[];
  issues?: Issue[];
  dates?: string[];
}
export interface PreviewResult {
  valid: boolean;
  issues?: Issue[];
  plans: Plan[];
  handover?: JsonValue;
}
export interface WebSocketResponses {
  program: ProgramDocument;
  catalog: Catalog;
  status: RuntimeSnapshot;
  editor_validate: ApiResult<{ program: Program; behavior_hash: string }>;
  save: ApiResult<ProgramDocument>;
  validate: ApiResult<{ program: Program; behavior_hash: string }>;
  export: ApiResult<{ yaml: string; behavior_hash: string }>;
  rename_id: ApiResult<{
    program: Program;
    yaml: string;
    behavior_hash: string;
  }>;
  source: ApiResult<ProgramDocument>;
  reload: { valid: boolean; changed: boolean; issues: Issue[] };
  timeline: TimelineDocument;
  preview: PreviewResult;
  diagnostics: JsonObject;
}
export interface HomeAssistant {
  language?: string;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    data: Record<string, unknown>,
  ): Promise<unknown>;
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
export interface SourcePickerState {
  sourceChoices: TimeSource[];
  selectedValue: string;
  suppressNextOpen?: boolean;
  invalid?: boolean;
  errorMessage?: string;
}
// Primary navigation tabs plus the secondary pages reached from them.
export type Tab =
  | "routines"
  | "settings"
  | "overview"
  | "timeline"
  | "preview"
  | "configuration"
  | "diagnostics";
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
