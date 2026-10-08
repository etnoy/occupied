import type { OccupiedPanel } from "@occupied/occupied-panel.js";
import type {
  HaSelector,
  HaGenericPicker,
  SourcePickerState,
  RuntimeSnapshot,
  WebSocketResponses,
} from "@occupied/types.js";
export interface WorkflowResult {
  name: string;
  passed: boolean;
  error?: string;
}
export type Check = (
  name: string,
  work: () => void | Promise<void>,
) => Promise<void>;
export type FixtureMessage = { type: string; [key: string]: unknown };
export type FixtureResponses = {
  [K in keyof WebSocketResponses as `occupied/${K}`]: WebSocketResponses[K];
} & { "test/reset": unknown; "test/file-error": RuntimeSnapshot };
export interface TestSelector extends HaSelector {
  select(value: unknown): void;
  picker: HTMLElement & { value: unknown };
}
export type TestSourcePicker = HTMLInputElement &
  HaGenericPicker &
  SourcePickerState;
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
declare global {
  var calls: FixtureMessage[];
  var deviceCalls: unknown[][];
  var subscribers: Set<(snapshot: RuntimeSnapshot) => void>;
  var fixtureWS: <K extends keyof FixtureResponses>(
    message: { type: K } & Record<string, unknown>,
  ) => Promise<FixtureResponses[K]>;
  var mount: () => OccupiedPanel;
  var emit: (snapshot: RuntimeSnapshot) => void;
  interface Window {
    runWorkflows: () => Promise<WorkflowResult[]>;
    workflowResults: WorkflowResult[];
  }
}
