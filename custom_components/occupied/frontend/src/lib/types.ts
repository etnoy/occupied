export type Path = (string | number)[];

export type Translate = (key: string) => string;

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface TimingBoundary {
  absolute_time?: { start: string };
  relative_to?: { sun: string; start_offset?: string };
}

export interface Timing {
  latest_at?: TimingBoundary;
  only_before?: TimingBoundary;
  absolute_time?: { start: string; end?: string };
  duration?: { min: string; max?: string };
  relative_to?: {
    step?: string;
    random?: string;
    sun?: string;
    entity?: string;
    attribute?: "start_time" | "end_time";
    start_offset?: string;
    end_offset?: string;
  };
}

export interface Stagger {
  enabled?: boolean;
  period?: string;
}

export interface Action {
  stagger?: Stagger;
  action?: string;
  entities?: string[] | Record<string, Record<string, JsonValue>>;
  actions?: Action[];
  data?: Record<string, JsonValue>;
}

export interface Schedule {
  name?: string;
  enabled?: boolean;
  days?: string[];
}

export interface Step extends Schedule, Action {
  timing: Timing;
}

export interface RandomEvent extends Schedule {
  start: Timing;
  end: Timing;
  min_duration?: string;
  max_duration?: string;
  count?: number | { min: number; max: number };
  on: Action;
  off: Action;
}

export interface RunCondition {
  entity_id: string;
  state: string | string[];
  enforce_state_on_start?: boolean;
  start_delay?: string;
  off_entities?: string[];
}

export interface Program {
  schema_version?: number;
  name?: string;
  run_condition?: RunCondition;
  steps?: Record<string, Step>;
  random?: Record<string, RandomEvent>;
}

export interface StepEntry extends Omit<Step, "name" | "days"> {
  id: string;
  name: string;
  path: ["steps", string];
  days: string[];
}

export interface TimingForm {
  latestAt?: BoundaryForm;
  onlyBefore?: BoundaryForm;
  mode: string;
  start: string;
  end: string;
  anchor: string;
  startOffset: string | number;
  endOffset: string | number;
  minDuration?: string;
  maxDuration?: string;
}

export interface BoundaryForm {
  mode: string;
  start: string;
  anchor: string;
  startOffset: string | number;
}

export interface ActionForm {
  stagger?: Stagger;
  customYaml?: string;
  customActions?: Action[];
  customAccepted?: string;
  kind: string;
  service: string;
  data: string;
  entities: string[];
  action: string;
  position: string;
  tiltPosition: string;
  activity: string;
}

export interface StepForm extends ActionForm {
  name: string;
  enabled: boolean;
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

export interface RandomEntry extends RandomEvent {
  id: string;
  name: string;
  path: ["random", string];
  days: string[];
}

export interface RandomForm {
  name: string;
  enabled: boolean;
  days: string[];
  start: TimingForm;
  end: TimingForm;
  minDuration: string;
  maxDuration: string;
  minCount: string;
  maxCount: string;
  on: ActionForm;
  off: ActionForm;
  sameEntities: boolean;
}

export interface RandomEditorState {
  id: string;
  existing: boolean;
  form: RandomForm;
  original: RandomForm;
  errors: FieldErrors;
  candidatePath?: Path;
  startOptions: Pick<StepEditor, "showEndTime" | "showEndOffset">;
  endOptions: Pick<StepEditor, "showEndTime" | "showEndOffset">;
}

export interface EditorContext {
  editor: Pick<StepEditor, "id" | "existing" | "errors">;
  t: Translate;
  changed: (key: string) => void;
  fieldPrefix?: string;
}

export interface ActionEditorContext extends EditorContext {
  setErrors: (errors: FieldErrors) => void;
  form: ActionForm;
}

export interface TimingEditorContext extends EditorContext {
  editor: Pick<
    StepEditor,
    "id" | "existing" | "errors" | "showEndTime" | "showEndOffset"
  >;
  form: Pick<StepForm, "days">;
  time: TimingForm;
  stepId?: string;
  randomId?: string;
  refresh: (key?: string) => void;
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
    activity_list?: string[];
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
        target?: {
          entity?:
            { domain?: string | string[] }[] | { domain?: string | string[] };
        };
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
  details?: Record<string, string>;
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
  recovery_yaml?: string | null;
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
  live_preview?: LivePreviewSession | null;
  overlaps: { config_entry_id: string; name: string; entities: string[] }[];
}

export type ApiResult<T> =
  ({ valid: true; issues?: Issue[] } & T) | { valid: false; issues: Issue[] };

export interface RuntimeSnapshot {
  enforce_state_on_start?: boolean;
  reason?: string;
  run_condition?:
    | (RunCondition & {
        current_state: string | null;
        matches: boolean;
        activation_deadline: string | null;
        remaining_seconds: number | null;
      })
    | null;
  reconciliation?: {
    phase: string;
    counts?: Record<string, number>;
    results: Record<
      string,
      { status: string; reason?: string; calls?: string[] }
    >;
  };
  loaded?: boolean;
  source_revision?: string;
  configuration_source?: ConfigurationSource;
  paused?: boolean;
  live_preview?: LivePreviewSession | null;
}

export interface PlannedEvent {
  scheduled?: boolean;
  occurrence_id?: string;
  authored_at?: string;
  configured_index?: number;
  tick?: number;
  tick_count?: number;
  period_seconds?: number;
  superseded?: boolean;
  id?: string;
  group_id?: string;
  source_date?: string;
  action_index?: number;
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
  plan_fingerprint?: string;
  feasible?: boolean;
  start: string;
  end: string;
  steps: Record<string, string>;
  events: PlannedEvent[];
  history_events?: PlannedEvent[];
  future_events?: PlannedEvent[];
  issues: Issue[];
}

export interface PreviewResult {
  valid: boolean;
  issues?: Issue[];
  plans: Plan[];
  plan_fingerprint?: string;
}

export interface LiveCallOutcome {
  group_id: string;
  status: string;
  detail: string;
  action?: PlannedEvent["action"];
}

export interface LivePreviewSession {
  id: string;
  user_id: string;
  state:
    | "ready"
    | "executing"
    | "stopping"
    | "completed"
    | "stopped"
    | "interrupted";
  date: string;
  source_revision: string;
  plan_fingerprint: string;
  cursor: number;
  total: number;
  simulated_time: string | null;
  in_flight: string | null;
  last_group_id: string | null;
  next_group: {
    id: string;
    time: string;
    title: string;
    kind: string;
    calls: PlannedEvent[];
  } | null;
  detail: string;
  paused: boolean;
  earlier_revision: boolean;
  storage_failed: boolean;
  outcomes: Record<string, LiveCallOutcome>;
}

export interface LivePreviewResponse {
  session: LivePreviewSession | null;
  can_advance: boolean;
  program?: Program;
  plan?: Plan;
  call_outcomes?: Record<string, LiveCallOutcome>;
}

export interface WebSocketResponses {
  instances: InstanceDocument[];
  program: ProgramDocument;
  catalog: Catalog;
  action_yaml: ApiResult<{ actions: Action[] }>;
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
  "live_preview/start": LivePreviewResponse;
  "live_preview/next": LivePreviewResponse;
  "live_preview/status": LivePreviewResponse;
  "live_preview/stop": LivePreviewResponse;
}

export interface HomeAssistant {
  states?: Record<
    string,
    { state: string; attributes: Record<string, unknown> }
  >;
  language?: string;
  config?: { time_zone?: string; [key: string]: unknown };
  locale?: {
    language?: string;
    time_format?: "language" | "system" | "12" | "24";
    time_zone?: "local" | "server";
  };
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  connection: {
    addEventListener?(event: string, callback: () => void): void;
    removeEventListener?(event: string, callback: () => void): void;
    subscribeMessage<T>(
      callback: (snapshot: T) => void,
      message: Record<string, unknown>,
    ): Promise<() => Promise<void>>;
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

export type Tab = "steps" | "random" | "settings" | "preview";

declare global {
  interface HTMLElementTagNameMap {
    "occupied-panel": import("../occupied-panel.js").OccupiedPanel;
    "ha-selector": HaSelector;
    "ha-generic-picker": HaGenericPicker;
  }

  interface HTMLElementEventMap {
    "value-changed": Event & { detail: { value: unknown } };
  }
}
