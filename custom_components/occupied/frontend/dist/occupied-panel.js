// Generated from custom_components/occupied/frontend/src/occupied-panel.ts by pnpm run build. Do not edit.
// custom_components/occupied/frontend/src/lib/i18n/translations.ts
var en = {
  stored_program_invalid_hint:
    "Stored program is invalid. Correct the preserved YAML in Settings and save to resume management.",
  chronological_order: "Chronological",
  manual_order: "Manual order",
  reset_chronological_order: "Reset to chronological",
  chronological_order_hint:
    "Ordered by start time. Solar times are estimated when unavailable; unresolved times appear last.",
  reorder_activity: "Reorder {name}",
  reorder_activity_hint:
    "Drag to reorder, or use the arrow keys to move up and down.",
  activity_moved: "{name} moved to position {position} of {total}.",
  run_condition_count_checked: "Checked",
  run_condition_count_applied: "Applied",
  run_condition_count_already_matching: "Already matching",
  run_condition_count_failed: "Failed",
  run_condition_count_skipped: "Skipped",
  already_matching: "Already matching",
  skipped: "Skipped",
  complete: "Complete",
  applying: "Applying",
  run_condition: "Run condition",
  run_condition_enable: "Run only when an entity matches",
  run_condition_entity: "Condition entity",
  run_condition_states: "Allowed states (match any)",
  run_condition_hint:
    "When the condition ends, Occupied stops without changing any entities. Management permission and pause still apply.",
  run_condition_enforce: "Enforce expected state on start",
  run_condition_enforce_hint:
    "Apply known light, switch, and cover targets after the delay. This can move covers. Unknown states and scene/service effects are skipped.",
  run_condition_delay: "Delay before enforcing state",
  run_condition_delay_hint:
    "Default: 30s. Use 0s to 1h. Scheduled device changes wait for this delay, then use the state expected at that time.",
  run_condition_off_entities: "Extra entities to turn off",
  run_condition_off_entities_hint:
    "Turn off these lights and switches when expected states are enforced, after the startup delay or with the enforcement button. Entities used in steps or events keep their scheduled targets. Manual changes are respected until the next activation or button press.",
  run_condition_off_entities_error: "Select valid light or switch entities.",
  run_condition_off_entities_warning:
    "Already managed by steps or events (including disabled ones). These entities keep their scheduled targets and will not be turned off by this list:",
  run_condition_yaml_hint:
    "Save or discard YAML edits before changing the run condition.",
  run_condition_entity_error: "Select a valid condition entity.",
  run_condition_states_error:
    "Choose at least one state; unknown and unavailable cannot activate management.",
  run_condition_delay_error: "Use a duration from 0s to 1h, for example 30s.",
  run_condition_countdown: "Enforcing expected states in {seconds} seconds.",
  run_condition_results: "State enforcement results",
  staggered_action: "Staggered action",
  stagger_timing_summary: "Targets staggered over {duration} in random order",
  stagger_hint:
    "Factorio style: act on one entity at each evenly spaced tick, in a random order.",
  time_window: "Time window",
  stagger_period_hint: "Default: 2m. Use a duration from 1s to 30m.",
  stagger_period_error: "Use a time window from 1s to 30m, for example 2m.",
  tick_progress: "Tick {tick} of {count}",
  superseded: "Superseded",
  period: "Period",
  tick_interval: "Tick interval",
  custom_yaml: "Custom YAML",
  action_yaml: "Action YAML",
  actions: "actions",
  entity_and_more: "{entity} and {count} more",
  custom_yaml_hint:
    "Enter one action or an ordered list of actions. Use brightness from 1 to 255. Timing stays in the controls above. A failed call stops the remaining actions.",
  custom_yaml_replace_confirm:
    "Replace this Custom YAML block with the selected action? Its individual settings or other actions will be removed.",
  custom_yaml_summary: "run the Custom YAML actions in order",
  live_preview: "Live preview",
  controls_real_devices: "Controls real devices",
  live_preview_paused_hint:
    "Scheduling stays paused until you choose Resume scheduling.",
  live_preview_controls_hint:
    "Normal scheduling pauses until you choose Resume scheduling. Each press runs one event immediately, even with management disabled. Configured run conditions must match.",
  live_preview_start_hint:
    "Starting prepares the session. Devices run only when you press Next event.",
  start_live_preview: "Start live preview",
  ready_to_start: "Ready to start",
  ready_for_next_event: "Ready for next event",
  next_event: "Next event",
  running: "Running\u2026",
  stopping: "Stopping\u2026",
  stopped: "Stopped",
  interrupted: "Interrupted",
  stop: "Stop",
  day_complete: "Day complete",
  run_again: "Run again",
  resume_scheduling: "Resume scheduling",
  refresh_preview: "Refresh Preview",
  live_preview_progress: "{done} of {total} events",
  simulated_time: "Simulated time",
  last_result: "Last result",
  dispatched_label: "Dispatched",
  partial_success: "Partial success",
  event_failed_or_interrupted: "Event failed or interrupted",
  recovering_live_preview: "Recovering live preview\u2026",
  live_preview_revision_hint:
    "This session uses an earlier program revision. Its actions are frozen.",
  live_preview_owner_hint:
    "Only the account that started this session can advance. You can stop it.",
  live_preview_controls: "Live preview controls",
  result: "Result",
  dispatched: "dispatched",
  pending: "pending",
  failed: "failed",
  unavailable: "unavailable",
  entity_disabled: "entity_disabled",
  service_missing: "service_missing",
  uncertain: "uncertain",
  cancelled: "cancelled",
  instance: "Instance",
  unloaded: "Unloaded",
  managed_file: "Managed file",
  gui_storage: "GUI storage",
  shared_devices_with: "Shared devices with",
  instance_overlap_hint: "Actions and cleanup can interfere between instances.",
  instance_switch_confirm:
    "This instance has unsaved changes. Discard them and switch?",
  view_switch_confirm:
    "There are unsaved edits. Discard them and switch views?",
  instance_unavailable_hint:
    "This instance is unavailable. Check Settings \u2192 Devices & services, then retry.",
  steps_and_time_sources: "Steps and time sources",
  matching_sources: "matching sources",
  time_sources_no_matches: "No matching steps or time sources.",
  steps: "Steps",
  scheduled_activity: "Scheduled activity",
  steps_hint:
    "Run actions at specific times, around sunrise or sunset, or relative to other steps. Choose which devices to control and what they should do.",
  random: "Random",
  random_activity: "Random activity",
  random_event: "Random event",
  random_events: "Random events",
  random_event_name: "Random event name",
  random_event_actions: "Random event actions",
  random_settings_hint: "Apply these settings, then save the random event.",
  create_your_first_random_event: "Create your first random event",
  create_random_event: "Create random event",
  save_random_event: "Save random event",
  delete_random_event: "Delete random event",
  delete_random_event_confirm: "Delete random event?",
  delete_random_event_hint:
    "This removes the random event and all its future occurrences.",
  random_unsaved_confirm:
    "This random event has unsaved changes. Discard them and continue?",
  random_activity_hint:
    "Run actions at random times within a window. Choose how often they run and how long each occurrence lasts.",
  random_create_hint:
    "Choose a window, a duration, and actions for the start and end of each occurrence.",
  window_starts: "Window starts",
  window_ends: "Window ends",
  duration: "Duration",
  end_of: "End of",
  the_end_of: "the end of",
  minimum_window_duration: "Minimum window duration",
  maximum_window_duration: "Maximum window duration",
  window_duration_error: "Choose a positive window duration within seven days.",
  window_duration_order_error:
    "Maximum window duration must be at least the minimum.",
  window_durations_prompt: "Choose valid window durations.",
  window_duration_summary: "Window closes {duration} after it starts",
  window_duration_range_summary:
    "Window closes between {min} and {max} after it starts",
  random_reference_error:
    "Choose another random event without creating a circular relationship.",
  random_relative_start_hint:
    "This start follows the selected window's closing time.",
  random_relative_end_hint:
    "Choose Absolute time or Duration to replace this saved relative window end.",
  random_dependents_error:
    "Other random events depend on this window. Change their starts before deleting.",
  random_duration_exceeds_window:
    "No events can run because the minimum duration is longer than the window.",
  random_duration_fit_hint: "Reduce the minimum duration or extend the window.",
  random_duration_priority_hint:
    "Duration limits take priority over the event count.",
  window_start: "Window start",
  window_end: "Window end",
  latest_window_start_optional: "Latest window start (optional)",
  latest_window_end_optional: "Latest window end (optional)",
  randomize_window_start: "Randomize window start",
  randomize_window_end: "Randomize window end",
  frequency_and_duration: "Frequency and duration",
  minimum_events_per_window: "Minimum events per window",
  maximum_events_per_window: "Maximum events per window",
  add_maximum_events: "Add maximum events",
  remove_maximum_events: "Remove maximum events",
  random_count_order_error:
    "Maximum events per window must be at least the minimum.",
  random_disabled_hint: "This random event is disabled.",
  random_counts_prompt:
    "Choose valid event counts to describe how often events run.",
  random_count_error: "Choose a whole number from 0 to 1000.",
  random_zero_count_hint: "No events run because the event count is zero.",
  random_dependents_skip_hint: "Dependent random events also skip this window.",
  random_empty_window_hint:
    "A window may have no events; dependent random events skip that window.",
  random_count_range_summary:
    "Between {min} and {max} events start at random times during each window.",
  random_single_event_summary:
    "One event starts at a random time during each window.",
  random_count_summary:
    "{count} events start at random times during each window.",
  random_durations_prompt:
    "Choose valid durations to describe how long each event lasts.",
  random_duration_fit_prompt: "Choose durations that fit inside the window.",
  random_duration_summary: "Each event lasts {duration}.",
  random_duration_range_summary: "Each event lasts between {min} and {max}.",
  action_activate_summary: "activate {entities}",
  action_service_summary: "run {service} for {entities}",
  action_turn_on_summary: "turn on {entities}",
  action_turn_off_summary: "turn off {entities}",
  action_open_summary: "open {entities}",
  action_close_summary: "close {entities}",
  action_stop_summary: "stop {entities}",
  action_position_summary: "set the position of {entities} to {position}%",
  action_open_tilt_summary: "open the tilt of {entities}",
  action_close_tilt_summary: "close the tilt of {entities}",
  action_stop_tilt_summary: "stop the tilt of {entities}",
  action_tilt_position_summary: "set the tilt of {entities} to {position}%",
  random_start_action_summary: "When each event starts, {action}.",
  random_end_action_summary: "When each event ends, {action}.",
  random_single_finish_hint: "The event finishes before the window closes.",
  random_overlap_hint:
    "Events may overlap, but all finish before the window closes.",
  times_per_window: "times per window",
  minimum_duration: "Minimum duration",
  maximum_duration: "Maximum duration",
  duration_hint: "Use durations like 5m, 30s, or 1h.",
  when_event_starts: "When event starts",
  when_event_ends: "When event ends",
  random_days_hint: "Choose which days this random event should run.",
  at_the_start: "At the start",
  at_the_end: "At the end",
  start_action: "Start action",
  end_action: "End action",
  start_entities: "Start entities",
  end_entities: "End entities",
  use_the_same_entities: "Use the same entities",
  random_start: "Random start",
  random_end: "Random end",
  solar_events: "Solar events",
  home_assistant_times: "Home Assistant times",
  calendars: "Calendars",
  unavailable_sources: "Unavailable sources",
  search_steps_or_time_sources: "Search steps or time sources",
  start: "start",
  end: "end",
  dawn: "dawn",
  dusk: "dusk",
  noon: "noon",
  midnight: "midnight",
  dawn_label: "Dawn",
  dusk_label: "Dusk",
  solar_noon: "Solar noon",
  solar_midnight: "Solar midnight",
  ha_time_source_hint:
    "Uses the time currently reported by Home Assistant. Time-only helpers repeat daily; dated sources run only on their reported date.",
  preview: "Preview",
  step_type: "Step type",
  activate_home_assistant_scene: "Activate Home Assistant scene",
  entity_service_action: "Entity service action",
  turn_on_lights_switches: "Turn on lights/switches",
  turn_off_lights_switches: "Turn off lights/switches",
  control_covers: "Control covers",
  cover_action: "Cover action",
  open_cover: "Open cover",
  close_cover: "Close cover",
  stop_cover: "Stop cover",
  set_cover_position: "Set cover position",
  open_tilt: "Open tilt",
  close_tilt: "Close tilt",
  stop_tilt: "Stop tilt",
  set_tilt_position: "Set tilt position",
  position: "Position (%)",
  tilt_position: "Tilt position (%)",
  cover_entities_error: "Choose cover entities.",
  cover_action_error: "Choose a cover action.",
  cover_position_error: "Choose a whole number from 0 to 100.",
  cover_position_hint:
    "0% is closed; 100% is open. Device support determines which cover actions are available.",
  cover_schedule_hint:
    "Covers run only at scheduled times. Enabling late skips past cover actions.",
  settings: "Settings",
  create_step: "Create step",
  create_your_first_step: "Create your first step",
  unsaved_changes: "Unsaved changes",
  step_unsaved_confirm:
    "This step has unsaved changes. Discard them and continue?",
  keep_editing: "Keep editing",
  discard_changes: "Discard changes",
  edit_step: "Edit step",
  add_related_step: "Add related step",
  step_actions: "Step actions",
  advanced_settings: "Advanced settings",
  step_days_hint: "Choose which days this step should run.",
  run_on: "Run on",
  step_settings_hint: "Apply these settings, then save the step.",
  apply: "Apply",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
  days_required_error: "Choose at least one day.",
  no_later_than: "No later than",
  only_run_before: "Only run before",
  boundary_source: "Boundary source",
  boundary_clock: "Boundary time",
  latest_at_summary: "No later than {boundary}",
  only_before_summary:
    "Only runs strictly before {boundary}; equality skips the occurrence",
  timing_limits_sampling_hint:
    "Sample once, then apply the limit and condition. Samples beyond the limit land on the limit; excluded samples are skipped without resampling",
  timing_limits_source_date_hint:
    "Boundaries use the schedule's source date and Home Assistant location. An unavailable solar event skips the step and its dependents",
  enabled: "Enabled",
  disabled: "Disabled",
  save_step: "Save step",
  save_changes: "Save changes",
  step_name: "Step name",
  optional_title: "Optional title",
  event_details: "Event details",
  loading_schedule: "Loading schedule\u2026",
  schedule_day: "Schedule day",
  previous_day: "Previous day",
  next_day: "Next day",
  today: "Today",
  yesterday: "Yesterday",
  tomorrow: "Tomorrow",
  schedule_empty_hint: "No steps are scheduled for this date.",
  planned_device_states: "Planned device states",
  loading_graph: "Loading graph\u2026",
  preview_now: "Now",
  on_label: "On",
  unknown: "Unknown",
  open: "Open",
  closed: "Closed",
  cover_position_summary: "Position {position}%",
  cover_tilt_summary: "Tilt {position}%",
  preview_covers_hint:
    "Cover strips show planned position and tilt targets. Travel time and positions after stop actions are unknown.",
  preview_devices_empty_hint:
    "No light, switch, or cover actions on this date. Other actions are listed in Event details.",
  preview_lights_empty_hint:
    "No light or switch actions on this date. Other actions are listed in Event details.",
  preview_graph_error:
    "The Home Assistant graph could not load. Planned actions are available in Event details.",
  back_to_steps: "Back to steps",
  continue: "Continue",
  cancel: "Cancel",
  back: "Back",
  action: "Action",
  timing: "Timing",
  absolute_time: "Absolute time",
  relative_to: "Relative to",
  start_time_window: "Start time window",
  at: "at",
  at_a_random_time_between: "at a random time between",
  at_a_random_time_during_the: "at a random time during the",
  and: "and",
  the_next_day: "the next day",
  runs: "Runs",
  step: "step",
  hour: "hour",
  hours: "hours",
  minute: "minute",
  minutes: "minutes",
  second: "second",
  seconds: "seconds",
  at_the_same_time_as: "at the same time as",
  the_start_of: "the start of",
  time_window_randomness_hint: "Add an end of window to introduce randomness",
  time_offset_randomness_hint: "Add an end offset to introduce randomness",
  time_window_fixed_hint: "Start and end are the same, so the time is fixed",
  end_of_window_optional: "End of window (optional)",
  add_end_of_window: "Add end of window",
  start_offset: "Start offset",
  end_offset_optional: "End offset (optional)",
  add_end_offset: "Add end offset",
  remove_end_offset: "Remove end offset",
  choose_a_step_or_event: "Choose a step or event",
  window_offsets_prompt: "Enter valid offsets to see the window boundary",
  turn_on: "Turn on",
  turn_off: "Turn off",
  every_day_label: "Every day",
  every_day: "every day",
  on_weekdays: "on weekdays",
  on_weekends: "on weekends",
  on_no_days: "on no days",
  on: "on",
  mondays: "Mondays",
  tuesdays: "Tuesdays",
  wednesdays: "Wednesdays",
  thursdays: "Thursdays",
  fridays: "Fridays",
  saturdays: "Saturdays",
  sundays: "Sundays",
  weekends: "Weekends",
  before: "before",
  after: "after",
  sunrise_label: "Sunrise",
  sunset_label: "Sunset",
  sunrise: "sunrise",
  sunset: "sunset",
  search_entities_or_rooms: "Search entities or rooms",
  selected: "selected",
  managing: "Managing",
  waiting: "Waiting",
  paused: "Paused",
  discard_edits: "Discard edits",
  reload_saved_program: "Reload saved program",
  unsaved_edits: "Unsaved edits",
  loading_controller: "Loading controller\u2026",
  enable: "Enable",
  disable: "Disable",
  entities_label: "Entities",
  targets: "Targets",
  delete: "Delete",
  delete_step_confirm: "Delete step?",
  delete_step: "Delete step",
  used_by: "Used by",
  delete_dependents_hint: "Change those relationships before deleting.",
  delete_step_hint:
    "This step will be deleted and your program saved immediately.",
  delete_step_file_hint:
    "This step will be removed from your draft. Export the YAML to update the managed file.",
  weekdays: "Weekdays",
  previous: "Previous",
  next: "Next",
  date: "Date",
  days: "Days",
  seed: "Seed",
  refresh: "Refresh",
  run_preview: "Run preview",
  export_yaml: "Export YAML",
  changes: "changes",
  yaml_editor_hint:
    "Edit the YAML and save to validate and apply your changes. Invalid code is kept in the editor.",
  download: "Download",
  none: "None",
  mon: "mon",
  tue: "tue",
  wed: "wed",
  thu: "thu",
  fri: "fri",
  sat: "sat",
  sun: "sun",
  service: "Service (domain.service)",
  service_data: "Service data (JSON)",
  draft_invalid_hint:
    "This draft cannot be shown. Discard edits or import a corrected program from Settings.",
  custom_entity_hint:
    "This selection includes a custom entity. Select lights or switches for this step.",
  managed_file_draft_hint:
    "This program is managed by a file. Add changes to your draft, then export them from Settings.",
  submit_newer_edits_hint:
    "Your changes are kept. Submit again to include the latest edits.",
  step_dependents_error:
    "Steps or random events depend on this step. Change their timing first.",
  draft_revision_conflict_hint:
    "The saved program changed. Your draft is preserved; reload the saved program before saving.",
  managed_file_export_hint:
    "Managed file is authoritative. Export draft changes to your file, then reload.",
  managed_file_error: "File error: see Settings or Home Assistant Repairs",
  preview_infeasible_error:
    "Preview contains infeasible dates. Review timeline issues.",
  step_edit_in_progress_hint:
    "Finish or cancel this step to edit other configuration issues.",
  save_newer_edits_hint:
    "Your changes are kept. Save again to include the latest edits.",
  saved_newer_edits_hint:
    "Earlier changes saved. Your newer edits are still open.",
  duration_error:
    "Use a positive duration within seven days, for example 5m or 1h.",
  duration_order_error:
    "Maximum duration must be at least the minimum duration.",
  duration_exceeds_window_error:
    "Minimum duration does not fit inside this window.",
  window_end_order_error: "Window end must be after its start.",
  random_changed_error:
    "This random event changed elsewhere. Cancel and reopen it before saving.",
  custom_yaml_required_error: "Enter an action mapping or a list of actions.",
  scene_required_error: "Select a Home Assistant scene.",
  entities_required_error: "Select at least one entity.",
  entity_ids_error: "Choose valid Home Assistant entity IDs.",
  scene_single_error: "Select one Home Assistant scene.",
  light_switch_entities_error:
    "Choose lights and switches, or select a service action.",
  service_error: "Choose a service using domain.service.",
  service_data_error: "Service data must be a JSON object.",
  start_time_required_error: "Choose a start time.",
  end_time_error: "Choose a valid end time or leave it blank.",
  step_reference_error:
    "Choose another step without creating a circular relationship.",
  time_source_required_error: "Choose a step or Home Assistant time source.",
  timing_mode_error: "Choose absolute time or relative to.",
  step_changed_error:
    "This step changed elsewhere. Cancel and reopen it before saving.",
  custom_yaml_validation_error:
    "Validate Custom YAML before adding it to the draft.",
  offset_format_error: "Use h, m or s, for example 30m, 1h, 1h30m or -10m.",
  offset_range_error: "Offsets must be within seven days.",
  offset_order_error: "The end offset must be at least the start offset.",
  time_window_prompt: "Choose valid start and end times",
  step_offsets_prompt: "Enter valid offsets to see when this step runs",
  retry: "Retry",
  occupied: "Occupied",
  yaml: "YAML",
  choose_configuration_file: "Choose configuration file",
  occupied_yaml: "Occupied YAML",
  behavior_revision: "Behavior revision",
  plan_revision: "Plan revision",
  entities: "entities",
  filter_events: "Filter events",
  events: "events",
  activate_scene: "Activate scene",
  repeated_activity_window: "Repeated activity window",
  add_to_draft: "Add to draft",
  planned_time: "Planned time",
  source: "Source",
  off_label: "Off",
};
var sv = {
  stored_program_invalid_hint:
    "Det sparade programmet \xE4r ogiltigt. R\xE4tta bevarad YAML i Inst\xE4llningar och spara f\xF6r att \xE5teruppta styrningen.",
  chronological_order: "Kronologisk ordning",
  manual_order: "Manuell ordning",
  reset_chronological_order: "\xC5terst\xE4ll kronologisk ordning",
  chronological_order_hint:
    "Sorterat efter starttid. Soltider uppskattas n\xE4r de saknas; ok\xE4nda tider visas sist.",
  reorder_activity: "\xC4ndra ordning f\xF6r {name}",
  reorder_activity_hint:
    "Dra f\xF6r att \xE4ndra ordning, eller anv\xE4nd piltangenterna f\xF6r att flytta upp och ned.",
  activity_moved: "{name} flyttades till plats {position} av {total}.",
  run_condition_count_checked: "Kontrollerade",
  run_condition_count_applied: "Till\xE4mpade",
  run_condition_count_already_matching: "Matchar redan",
  run_condition_count_failed: "Misslyckade",
  run_condition_count_skipped: "\xD6verhoppade",
  already_matching: "Matchar redan",
  skipped: "\xD6verhoppad",
  complete: "Klar",
  applying: "Till\xE4mpar",
  run_condition: "K\xF6rvillkor",
  run_condition_enable: "K\xF6r endast n\xE4r en entitet matchar",
  run_condition_entity: "Entitet f\xF6r villkor",
  run_condition_states: "Till\xE5tna tillst\xE5nd (matcha n\xE5got)",
  run_condition_hint:
    "N\xE4r villkoret upph\xF6r stannar Occupied utan att \xE4ndra n\xE5gra entiteter. Hanteringstillst\xE5nd och paus g\xE4ller fortfarande.",
  run_condition_enforce: "Till\xE4mpa f\xF6rv\xE4ntat tillst\xE5nd vid start",
  run_condition_enforce_hint:
    "Till\xE4mpa k\xE4nda m\xE5l f\xF6r lampor, str\xF6mbrytare och jalusier efter f\xF6rdr\xF6jningen. Detta kan flytta jalusier. Ok\xE4nda tillst\xE5nd och effekter av scener/tj\xE4nster hoppas \xF6ver.",
  run_condition_delay: "F\xF6rdr\xF6jning f\xF6re till\xE4mpning",
  run_condition_delay_hint:
    "Standard: 30s. Ange 0s till 1h. Schemalagda enhets\xE4ndringar v\xE4ntar p\xE5 f\xF6rdr\xF6jningen och anv\xE4nder sedan det tillst\xE5nd som f\xF6rv\xE4ntas d\xE5.",
  run_condition_off_entities: "Extra entiteter att st\xE4nga av",
  run_condition_off_entities_hint:
    "St\xE4ng av dessa lampor och str\xF6mbrytare n\xE4r f\xF6rv\xE4ntade tillst\xE5nd till\xE4mpas, efter startf\xF6rdr\xF6jningen eller med till\xE4mpningsknappen. Entiteter i steg eller h\xE4ndelser beh\xE5ller sina schemalagda m\xE5l. Manuella \xE4ndringar respekteras tills n\xE4sta aktivering eller knapptryckning.",
  run_condition_off_entities_error:
    "V\xE4lj giltiga lamp- eller str\xF6mbrytarentiteter.",
  run_condition_off_entities_warning:
    "Hanteras redan av steg eller h\xE4ndelser (\xE4ven inaktiverade). Dessa entiteter beh\xE5ller sina schemalagda m\xE5l och st\xE4ngs inte av via denna lista:",
  run_condition_yaml_hint:
    "Spara eller kasta YAML-\xE4ndringar innan du \xE4ndrar k\xF6rvillkoret.",
  run_condition_entity_error: "V\xE4lj en giltig entitet f\xF6r villkoret.",
  run_condition_states_error:
    "V\xE4lj minst ett tillst\xE5nd; unknown och unavailable kan inte aktivera hantering.",
  run_condition_delay_error:
    "Ange en tid fr\xE5n 0s till 1h, till exempel 30s.",
  run_condition_countdown:
    "Till\xE4mpar f\xF6rv\xE4ntade tillst\xE5nd om {seconds} sekunder.",
  run_condition_results: "Resultat f\xF6r till\xE4mpade tillst\xE5nd",
  staggered_action: "F\xF6rskjuten \xE5tg\xE4rd",
  stagger_timing_summary:
    "Enheterna \xE4ndras successivt under {duration} i slumpm\xE4ssig ordning",
  stagger_hint:
    "Factorio-stil: styr en enhet i taget med j\xE4mna tidsintervall, i slumpm\xE4ssig ordning.",
  time_window: "Tidsf\xF6nster",
  stagger_period_hint: "Standard: 2m. Ange en tid fr\xE5n 1s till 30m.",
  stagger_period_error:
    "Ange ett tidsf\xF6nster fr\xE5n 1s till 30m, till exempel 2m.",
  tick_progress: "Steg {tick} av {count}",
  superseded: "Ersatt",
  period: "Period",
  tick_interval: "Stegintervall",
  custom_yaml: "Egen YAML",
  action_yaml: "\xC5tg\xE4rds-YAML",
  actions: "\xE5tg\xE4rder",
  entity_and_more: "{entity} och {count} till",
  custom_yaml_hint:
    "Ange en \xE5tg\xE4rd eller en ordnad lista med \xE5tg\xE4rder. Anv\xE4nd brightness fr\xE5n 1 till 255. Tider anges i kontrollerna ovan. Ett misslyckat anrop stoppar \xE5terst\xE5ende \xE5tg\xE4rder.",
  custom_yaml_replace_confirm:
    "Ers\xE4tt detta YAML-block med den valda \xE5tg\xE4rden? Individuella inst\xE4llningar eller andra \xE5tg\xE4rder tas bort.",
  custom_yaml_summary: "k\xF6r YAML-\xE5tg\xE4rderna i ordning",
  live_preview: "Livef\xF6rhandsvisning",
  controls_real_devices: "Styr riktiga enheter",
  live_preview_paused_hint:
    "Schemal\xE4ggningen f\xF6rblir pausad tills du v\xE4ljer \xC5teruppta schemal\xE4ggning.",
  live_preview_controls_hint:
    "Schemal\xE4ggningen pausas tills du v\xE4ljer \xC5teruppta schemal\xE4ggning. Varje tryck k\xF6r en h\xE4ndelse direkt, \xE4ven n\xE4r styrningen \xE4r avst\xE4ngd. Konfigurerade k\xF6rvillkor m\xE5ste matcha.",
  live_preview_start_hint:
    "Start f\xF6rbereder sessionen. Enheterna styrs f\xF6rst n\xE4r du trycker p\xE5 N\xE4sta h\xE4ndelse.",
  start_live_preview: "Starta livef\xF6rhandsvisning",
  ready_to_start: "Redo att starta",
  ready_for_next_event: "Redo f\xF6r n\xE4sta h\xE4ndelse",
  next_event: "N\xE4sta h\xE4ndelse",
  running: "K\xF6r\u2026",
  stopping: "Stoppar\u2026",
  stopped: "Stoppad",
  interrupted: "Avbruten",
  stop: "Stoppa",
  day_complete: "Dagen \xE4r klar",
  run_again: "K\xF6r igen",
  resume_scheduling: "\xC5teruppta schemal\xE4ggning",
  refresh_preview: "Uppdatera f\xF6rhandsvisning",
  live_preview_progress: "{done} av {total} h\xE4ndelser",
  simulated_time: "Simulerad tid",
  last_result: "Senaste resultat",
  dispatched_label: "Utf\xF6rd",
  partial_success: "Delvis utf\xF6rd",
  event_failed_or_interrupted: "H\xE4ndelsen misslyckades eller avbr\xF6ts",
  recovering_live_preview: "H\xE4mtar livef\xF6rhandsvisning\u2026",
  live_preview_revision_hint:
    "Sessionen anv\xE4nder en tidigare programversion. Dess \xE5tg\xE4rder \xE4r frysta.",
  live_preview_owner_hint:
    "Bara kontot som startade sessionen kan g\xE5 vidare. Du kan stoppa den.",
  live_preview_controls: "Kontroller f\xF6r livef\xF6rhandsvisning",
  result: "Resultat",
  dispatched: "Utf\xF6rd",
  pending: "P\xE5g\xE5r",
  failed: "Misslyckad",
  unavailable: "Otillg\xE4nglig",
  entity_disabled: "Enhet avst\xE4ngd",
  service_missing: "Tj\xE4nsten saknas",
  uncertain: "Os\xE4kert resultat",
  cancelled: "Avbruten",
  instance: "Instans",
  unloaded: "Inte inl\xE4st",
  managed_file: "Hanterad fil",
  gui_storage: "Lagring i gr\xE4nssnittet",
  shared_devices_with: "Delade enheter med",
  instance_overlap_hint:
    "\xC5tg\xE4rder och avslut kan p\xE5verka varandra mellan instanser.",
  instance_switch_confirm:
    "Den h\xE4r instansen har osparade \xE4ndringar. Kasta dem och byt?",
  view_switch_confirm:
    "Det finns osparade \xE4ndringar. Vill du kasta dem och byta vy?",
  instance_unavailable_hint:
    "Den h\xE4r instansen \xE4r inte tillg\xE4nglig. Kontrollera Inst\xE4llningar \u2192 Enheter och tj\xE4nster och f\xF6rs\xF6k igen.",
  steps_and_time_sources: "Steg och tidsk\xE4llor",
  matching_sources: "matchande tidsk\xE4llor",
  time_sources_no_matches: "Inga matchande steg eller tidsk\xE4llor.",
  steps: "Steg",
  scheduled_activity: "Schemalagd aktivitet",
  steps_hint:
    "K\xF6r \xE5tg\xE4rder vid best\xE4mda tider, kring soluppg\xE5ng eller solnedg\xE5ng, eller i f\xF6rh\xE5llande till andra steg. V\xE4lj vilka enheter som ska styras och vad de ska g\xF6ra.",
  random: "Slumpm\xE4ssigt",
  random_activity: "Slumpm\xE4ssig aktivitet",
  random_event: "Slumpm\xE4ssig h\xE4ndelse",
  random_events: "Slumpm\xE4ssiga h\xE4ndelser",
  random_event_name: "H\xE4ndelsens namn",
  random_event_actions: "\xC5tg\xE4rder f\xF6r slumpm\xE4ssig h\xE4ndelse",
  random_settings_hint:
    "Till\xE4mpa inst\xE4llningarna och spara sedan den slumpm\xE4ssiga h\xE4ndelsen.",
  create_your_first_random_event:
    "Skapa din f\xF6rsta slumpm\xE4ssiga h\xE4ndelse",
  create_random_event: "Skapa slumpm\xE4ssig h\xE4ndelse",
  save_random_event: "Spara slumpm\xE4ssig h\xE4ndelse",
  delete_random_event: "Ta bort slumpm\xE4ssig h\xE4ndelse",
  delete_random_event_confirm: "Ta bort slumpm\xE4ssig h\xE4ndelse?",
  delete_random_event_hint:
    "Detta tar bort den slumpm\xE4ssiga h\xE4ndelsen och alla framtida f\xF6rekomster.",
  random_unsaved_confirm:
    "H\xE4ndelsen har osparade \xE4ndringar. Kasta dem och forts\xE4tta?",
  random_activity_hint:
    "K\xF6r \xE5tg\xE4rder vid slumpm\xE4ssiga tider inom ett tidsf\xF6nster. V\xE4lj hur ofta de k\xF6rs och hur l\xE4nge varje tillf\xE4lle varar.",
  random_create_hint:
    "V\xE4lj ett tidsf\xF6nster, en varaktighet och \xE5tg\xE4rder f\xF6r b\xF6rjan och slutet av varje tillf\xE4lle.",
  window_starts: "Tidsf\xF6nstret b\xF6rjar",
  window_ends: "Tidsf\xF6nstret slutar",
  duration: "Varaktighet",
  end_of: "Slutet p\xE5",
  the_end_of: "slutet p\xE5",
  minimum_window_duration: "Minsta varaktighet f\xF6r tidsf\xF6nstret",
  maximum_window_duration: "H\xF6gsta varaktighet f\xF6r tidsf\xF6nstret",
  window_duration_error:
    "V\xE4lj en positiv varaktighet f\xF6r tidsf\xF6nstret inom sju dagar.",
  window_duration_order_error:
    "H\xF6gsta varaktighet f\xF6r tidsf\xF6nstret m\xE5ste vara minst den l\xE4gsta.",
  window_durations_prompt:
    "V\xE4lj giltiga varaktigheter f\xF6r tidsf\xF6nstret.",
  window_duration_summary:
    "Tidsf\xF6nstret st\xE4ngs {duration} efter att det b\xF6rjar",
  window_duration_range_summary:
    "Tidsf\xF6nstret st\xE4ngs mellan {min} och {max} efter att det b\xF6rjar",
  random_reference_error:
    "V\xE4lj en annan slumpm\xE4ssig h\xE4ndelse utan att skapa ett cirkul\xE4rt beroende.",
  random_relative_start_hint:
    "Starten f\xF6ljer det valda tidsf\xF6nstrets sluttid.",
  random_relative_end_hint:
    "V\xE4lj Absolut tid eller Varaktighet f\xF6r att ers\xE4tta det sparade tidsf\xF6nstrets relativa slut.",
  random_dependents_error:
    "Andra slumpm\xE4ssiga h\xE4ndelser beror p\xE5 det h\xE4r tidsf\xF6nstret. \xC4ndra deras start innan du tar bort det.",
  random_duration_exceeds_window:
    "Inga h\xE4ndelser kan k\xF6ras eftersom minsta varaktighet \xE4r l\xE4ngre \xE4n tidsf\xF6nstret.",
  random_duration_fit_hint:
    "Minska den kortaste varaktigheten eller f\xF6rl\xE4ng tidsf\xF6nstret.",
  random_duration_priority_hint:
    "Varaktighetsgr\xE4nserna har f\xF6retr\xE4de framf\xF6r antalet h\xE4ndelser.",
  window_start: "Tidsf\xF6nstrets start",
  window_end: "Tidsf\xF6nstrets slut",
  latest_window_start_optional:
    "Senaste start f\xF6r tidsf\xF6nstret (valfritt)",
  latest_window_end_optional: "Senaste slut f\xF6r tidsf\xF6nstret (valfritt)",
  randomize_window_start: "Slumpm\xE4ssig start f\xF6r tidsf\xF6nstret",
  randomize_window_end: "Slumpm\xE4ssigt slut f\xF6r tidsf\xF6nstret",
  frequency_and_duration: "Frekvens och varaktighet",
  minimum_events_per_window: "Minsta antal h\xE4ndelser per tidsf\xF6nster",
  maximum_events_per_window: "H\xF6gsta antal h\xE4ndelser per tidsf\xF6nster",
  add_maximum_events: "L\xE4gg till h\xF6gsta antal h\xE4ndelser",
  remove_maximum_events: "Ta bort h\xF6gsta antal h\xE4ndelser",
  random_count_order_error:
    "H\xF6gsta antal h\xE4ndelser per tidsf\xF6nster m\xE5ste vara minst det l\xE4gsta antalet.",
  random_disabled_hint:
    "Den h\xE4r slumpm\xE4ssiga h\xE4ndelsen \xE4r inaktiverad.",
  random_counts_prompt:
    "V\xE4lj giltiga antal h\xE4ndelser f\xF6r att beskriva hur ofta de k\xF6rs.",
  random_count_error: "V\xE4lj ett heltal fr\xE5n 0 till 1000.",
  random_zero_count_hint:
    "Inga h\xE4ndelser k\xF6rs eftersom antalet h\xE4ndelser \xE4r noll.",
  random_dependents_skip_hint:
    "Beroende slumpm\xE4ssiga h\xE4ndelser hoppar ocks\xE5 \xF6ver det h\xE4r tidsf\xF6nstret.",
  random_empty_window_hint:
    "Ett tidsf\xF6nster kan sakna h\xE4ndelser; beroende slumpm\xE4ssiga h\xE4ndelser hoppar \xF6ver det tidsf\xF6nstret.",
  random_count_range_summary:
    "Mellan {min} och {max} h\xE4ndelser b\xF6rjar vid slumpm\xE4ssiga tider inom varje tidsf\xF6nster.",
  random_single_event_summary:
    "En h\xE4ndelse b\xF6rjar vid en slumpm\xE4ssig tid inom varje tidsf\xF6nster.",
  random_count_summary:
    "{count} h\xE4ndelser b\xF6rjar vid slumpm\xE4ssiga tider inom varje tidsf\xF6nster.",
  random_durations_prompt:
    "V\xE4lj giltiga varaktigheter f\xF6r att beskriva hur l\xE4nge varje h\xE4ndelse varar.",
  random_duration_fit_prompt:
    "V\xE4lj varaktigheter som ryms inom tidsf\xF6nstret.",
  random_duration_summary: "Varje h\xE4ndelse varar {duration}.",
  random_duration_range_summary:
    "Varje h\xE4ndelse varar mellan {min} och {max}.",
  action_activate_summary: "aktivera {entities}",
  action_service_summary: "k\xF6r {service} f\xF6r {entities}",
  action_turn_on_summary: "sl\xE5 p\xE5 {entities}",
  action_turn_off_summary: "sl\xE5 av {entities}",
  action_open_summary: "\xF6ppna {entities}",
  action_close_summary: "st\xE4ng {entities}",
  action_stop_summary: "stoppa {entities}",
  action_position_summary:
    "st\xE4ll in positionen f\xF6r {entities} till {position}%",
  action_open_tilt_summary: "\xF6ppna lamellerna f\xF6r {entities}",
  action_close_tilt_summary: "st\xE4ng lamellerna f\xF6r {entities}",
  action_stop_tilt_summary: "stoppa lamellerna f\xF6r {entities}",
  action_tilt_position_summary:
    "st\xE4ll in lamellerna f\xF6r {entities} till {position}%",
  random_start_action_summary: "N\xE4r varje h\xE4ndelse b\xF6rjar, {action}.",
  random_end_action_summary: "N\xE4r varje h\xE4ndelse slutar, {action}.",
  random_single_finish_hint:
    "H\xE4ndelsen avslutas innan tidsf\xF6nstret st\xE4ngs.",
  random_overlap_hint:
    "H\xE4ndelser kan \xF6verlappa, men alla avslutas innan tidsf\xF6nstret st\xE4ngs.",
  times_per_window: "g\xE5nger per tidsf\xF6nster",
  minimum_duration: "Minsta varaktighet",
  maximum_duration: "L\xE4ngsta varaktighet",
  duration_hint: "Ange varaktigheter som 5m, 30s eller 1h.",
  when_event_starts: "N\xE4r h\xE4ndelsen b\xF6rjar",
  when_event_ends: "N\xE4r h\xE4ndelsen slutar",
  random_days_hint:
    "V\xE4lj vilka dagar den slumpm\xE4ssiga h\xE4ndelsen ska k\xF6ras.",
  at_the_start: "Vid b\xF6rjan",
  at_the_end: "Vid slutet",
  start_action: "Start\xE5tg\xE4rd",
  end_action: "Slut\xE5tg\xE4rd",
  start_entities: "Entiteter vid b\xF6rjan",
  end_entities: "Entiteter vid slutet",
  use_the_same_entities: "Anv\xE4nd samma entiteter",
  random_start: "Slumpm\xE4ssig start",
  random_end: "Slumpm\xE4ssigt slut",
  solar_events: "Solh\xE4ndelser",
  home_assistant_times: "Home Assistant-tider",
  calendars: "Kalendrar",
  unavailable_sources: "Otillg\xE4ngliga tidsk\xE4llor",
  search_steps_or_time_sources: "S\xF6k efter steg eller tidsk\xE4llor",
  start: "start",
  end: "slut",
  dawn: "gryning",
  dusk: "skymning",
  noon: "solmiddag",
  midnight: "solmidnatt",
  dawn_label: "Gryning",
  dusk_label: "Skymning",
  solar_noon: "Solmiddag",
  solar_midnight: "Solmidnatt",
  ha_time_source_hint:
    "Anv\xE4nder tiden som Home Assistant rapporterar. Hj\xE4lpare med enbart tid upprepas dagligen; daterade tidsk\xE4llor k\xF6rs bara p\xE5 det rapporterade datumet.",
  preview: "F\xF6rhandsvisning",
  step_type: "Typ av steg",
  activate_home_assistant_scene: "Aktivera Home Assistant-scen",
  entity_service_action: "Tj\xE4nsteanrop f\xF6r entiteter",
  turn_on_lights_switches: "Sl\xE5 p\xE5 lampor/brytare",
  turn_off_lights_switches: "Sl\xE5 av lampor/brytare",
  control_covers: "Styr gardiner och persienner",
  cover_action: "\xC5tg\xE4rd f\xF6r gardin eller persienn",
  open_cover: "\xD6ppna gardin eller persienn",
  close_cover: "St\xE4ng gardin eller persienn",
  stop_cover: "Stoppa gardin eller persienn",
  set_cover_position: "St\xE4ll in position",
  open_tilt: "\xD6ppna lameller",
  close_tilt: "St\xE4ng lameller",
  stop_tilt: "Stoppa lameller",
  set_tilt_position: "St\xE4ll in lamellernas position",
  position: "Position (%)",
  tilt_position: "Lamellernas position (%)",
  cover_entities_error: "V\xE4lj gardin- eller persiennentiteter.",
  cover_action_error: "V\xE4lj en \xE5tg\xE4rd f\xF6r gardin eller persienn.",
  cover_position_error: "V\xE4lj ett heltal fr\xE5n 0 till 100.",
  cover_position_hint:
    "0% \xE4r st\xE4ngt; 100% \xE4r \xF6ppet. Enhetens st\xF6d avg\xF6r vilka \xE5tg\xE4rder som \xE4r tillg\xE4ngliga.",
  cover_schedule_hint:
    "Gardiner och persienner styrs bara vid schemalagda tider. Vid sen aktivering hoppas tidigare \xE5tg\xE4rder \xF6ver.",
  settings: "Inst\xE4llningar",
  create_step: "Skapa steg",
  create_your_first_step: "Skapa ditt f\xF6rsta steg",
  unsaved_changes: "Osparade \xE4ndringar",
  step_unsaved_confirm:
    "Steget har osparade \xE4ndringar. Kasta dem och forts\xE4tta?",
  keep_editing: "Forts\xE4tt redigera",
  discard_changes: "Kasta \xE4ndringar",
  edit_step: "Redigera steg",
  add_related_step: "L\xE4gg till relaterat steg",
  step_actions: "Steg\xE5tg\xE4rder",
  advanced_settings: "Avancerade inst\xE4llningar",
  step_days_hint: "V\xE4lj vilka dagar steget ska k\xF6ras.",
  run_on: "K\xF6r p\xE5",
  step_settings_hint: "Till\xE4mpa inst\xE4llningarna och spara sedan steget.",
  apply: "Till\xE4mpa",
  monday: "M\xE5ndag",
  tuesday: "Tisdag",
  wednesday: "Onsdag",
  thursday: "Torsdag",
  friday: "Fredag",
  saturday: "L\xF6rdag",
  sunday: "S\xF6ndag",
  days_required_error: "V\xE4lj minst en dag.",
  no_later_than: "Senast",
  only_run_before: "K\xF6r endast f\xF6re",
  boundary_source: "Gr\xE4nsens k\xE4lla",
  boundary_clock: "Gr\xE4nstid",
  latest_at_summary: "Senast {boundary}",
  only_before_summary:
    "K\xF6r endast strikt f\xF6re {boundary}; vid samma tid hoppas tillf\xE4llet \xF6ver",
  timing_limits_sampling_hint:
    "Slumpa en g\xE5ng och till\xE4mpa sedan gr\xE4nsen och villkoret. Tider efter gr\xE4nsen flyttas till gr\xE4nsen; uteslutna tillf\xE4llen hoppas \xF6ver utan ny slumpning",
  timing_limits_source_date_hint:
    "Gr\xE4nser anv\xE4nder schemats ursprungsdatum och Home Assistants plats. En otillg\xE4nglig solh\xE4ndelse hoppar \xF6ver steget och dess beroenden",
  enabled: "Aktiverat",
  disabled: "Inaktiverat",
  save_step: "Spara steg",
  save_changes: "Spara \xE4ndringar",
  step_name: "Stegets namn",
  optional_title: "Valfri titel",
  event_details: "H\xE4ndelsedetaljer",
  loading_schedule: "Laddar schema\u2026",
  schedule_day: "Schemadag",
  previous_day: "F\xF6reg\xE5ende dag",
  next_day: "N\xE4sta dag",
  today: "Idag",
  yesterday: "Ig\xE5r",
  tomorrow: "Imorgon",
  schedule_empty_hint: "Inga steg \xE4r schemalagda detta datum.",
  planned_device_states: "Planerade enhetstillst\xE5nd",
  loading_graph: "Laddar diagram\u2026",
  preview_now: "Nu",
  on_label: "P\xE5",
  unknown: "Ok\xE4nt",
  open: "\xD6ppet",
  closed: "St\xE4ngt",
  cover_position_summary: "Position {position}%",
  cover_tilt_summary: "Lameller {position}%",
  preview_covers_hint:
    "Gardiner och persienner visar planerade m\xE5l f\xF6r position och lameller. F\xF6rflyttningstid och position efter stopp \xE4r ok\xE4nda.",
  preview_devices_empty_hint:
    "Inga \xE5tg\xE4rder f\xF6r lampor, brytare, gardiner eller persienner detta datum. \xD6vriga \xE5tg\xE4rder visas i H\xE4ndelsedetaljer.",
  preview_lights_empty_hint:
    "Inga \xE5tg\xE4rder f\xF6r lampor eller brytare detta datum. \xD6vriga \xE5tg\xE4rder visas i H\xE4ndelsedetaljer.",
  preview_graph_error:
    "Home Assistant-diagrammet kunde inte laddas. Planerade \xE5tg\xE4rder finns i H\xE4ndelsedetaljer.",
  back_to_steps: "Tillbaka till steg",
  continue: "Forts\xE4tt",
  cancel: "Avbryt",
  back: "Tillbaka",
  action: "\xC5tg\xE4rd",
  timing: "Tidpunkt",
  absolute_time: "Absolut tid",
  relative_to: "Relativt till",
  start_time_window: "Tidsintervallets start",
  at: "kl.",
  at_a_random_time_between: "vid en slumpm\xE4ssig tid mellan",
  at_a_random_time_during_the: "vid en slumpm\xE4ssig tid inom",
  and: "och",
  the_next_day: "n\xE4sta dag",
  runs: "K\xF6rs",
  step: "steg",
  hour: "timme",
  hours: "timmar",
  minute: "minut",
  minutes: "minuter",
  second: "sekund",
  seconds: "sekunder",
  at_the_same_time_as: "samtidigt som",
  the_start_of: "starten av",
  time_window_randomness_hint:
    "L\xE4gg till ett slut p\xE5 tidsintervallet f\xF6r att variera tiden",
  time_offset_randomness_hint:
    "L\xE4gg till en slutf\xF6rskjutning f\xF6r att variera tiden",
  time_window_fixed_hint: "Start och slut \xE4r samma, s\xE5 tiden \xE4r fast",
  end_of_window_optional: "Slut p\xE5 tidsintervall (valfritt)",
  add_end_of_window: "L\xE4gg till slut p\xE5 tidsintervall",
  start_offset: "Startf\xF6rskjutning",
  end_offset_optional: "Slutf\xF6rskjutning (valfritt)",
  add_end_offset: "L\xE4gg till slutf\xF6rskjutning",
  remove_end_offset: "Ta bort slutf\xF6rskjutning",
  choose_a_step_or_event: "V\xE4lj ett steg eller en h\xE4ndelse",
  window_offsets_prompt:
    "Ange giltiga f\xF6rskjutningar f\xF6r att se tidsf\xF6nstrets gr\xE4ns",
  turn_on: "Sl\xE5 p\xE5",
  turn_off: "Sl\xE5 av",
  every_day_label: "Varje dag",
  every_day: "varje dag",
  on_weekdays: "p\xE5 vardagar",
  on_weekends: "p\xE5 helger",
  on_no_days: "inga dagar",
  on: "p\xE5",
  mondays: "m\xE5ndagar",
  tuesdays: "tisdagar",
  wednesdays: "onsdagar",
  thursdays: "torsdagar",
  fridays: "fredagar",
  saturdays: "l\xF6rdagar",
  sundays: "s\xF6ndagar",
  weekends: "Helger",
  before: "f\xF6re",
  after: "efter",
  sunrise_label: "Soluppg\xE5ng",
  sunset_label: "Solnedg\xE5ng",
  sunrise: "soluppg\xE5ng",
  sunset: "solnedg\xE5ng",
  search_entities_or_rooms: "S\xF6k entiteter eller rum",
  selected: "valda",
  managing: "Styr",
  waiting: "V\xE4ntar",
  paused: "Pausad",
  discard_edits: "\xC5terst\xE4ll \xE4ndringar",
  reload_saved_program: "L\xE4s in sparat program",
  unsaved_edits: "Osparade \xE4ndringar",
  loading_controller: "L\xE4ser in styrenhet\u2026",
  enable: "Aktivera",
  disable: "Inaktivera",
  entities_label: "Entiteter",
  targets: "M\xE5l",
  delete: "Radera",
  delete_step_confirm: "Radera steg?",
  delete_step: "Radera steg",
  used_by: "Anv\xE4nds av",
  delete_dependents_hint: "\xC4ndra dessa relationer innan du raderar steget.",
  delete_step_hint: "Steget tas bort och programmet sparas direkt.",
  delete_step_file_hint:
    "Steget tas bort fr\xE5n utkastet. Exportera YAML f\xF6r att uppdatera den hanterade filen.",
  weekdays: "Veckodagar",
  previous: "F\xF6reg\xE5ende",
  next: "N\xE4sta",
  date: "Datum",
  days: "Dagar",
  seed: "Slumpfr\xF6",
  refresh: "Uppdatera",
  run_preview: "F\xF6rhandsvisa",
  export_yaml: "Exportera YAML",
  changes: "\xE4ndringar",
  yaml_editor_hint:
    "Redigera YAML och spara f\xF6r att validera och till\xE4mpa dina \xE4ndringar. Ogiltig kod beh\xE5lls i redigeraren.",
  download: "Ladda ner",
  none: "Inga",
  mon: "m\xE5n",
  tue: "tis",
  wed: "ons",
  thu: "tor",
  fri: "fre",
  sat: "l\xF6r",
  sun: "s\xF6n",
};
function translator(language) {
  const localized = language?.startsWith("sv") ? sv : void 0;
  return (key2) => {
    if (!Object.hasOwn(en, key2)) {
      return key2;
    }
    const translationKey = key2;
    return localized?.[translationKey] ?? en[translationKey];
  };
}

// custom_components/occupied/frontend/src/lib/utils/time-format.ts
function shiftScheduleDate(value, days2) {
  const date = /* @__PURE__ */ new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days2);
  return date.toISOString().slice(0, 10);
}
function calendarMidnight(value, zone) {
  const target = Date.parse(`${value}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(instant)
        .map(({ type, value: value2 }) => [type, value2]),
    );
    const local = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
    );
    const correction = target - local;
    if (correction === 0) {
      return new Date(instant).toISOString();
    }
    instant += correction;
  }
  return new Date(instant).toISOString();
}
function formatScheduleDate(value, locale) {
  const weekday = new Intl.DateTimeFormat(locale?.language, {
    weekday: "long",
    timeZone: "UTC",
  }).format(/* @__PURE__ */ new Date(`${value}T12:00:00Z`));
  return `${weekday} ${value}`;
}
function formatPreviewDate(value, today, locale, t) {
  const valueTime = Date.parse(`${value}T12:00:00Z`);
  const todayTime = Date.parse(`${today}T12:00:00Z`);
  const daysFromToday = Math.round((valueTime - todayTime) / 864e5);
  const relativeLabels = {
    [-1]: "yesterday",
    0: "today",
    1: "tomorrow",
  };
  const relativeLabel = relativeLabels[daysFromToday]
    ? t(relativeLabels[daysFromToday])
    : void 0;
  const dateLabel = formatScheduleDate(value, locale);
  return relativeLabel ? `${relativeLabel} \xB7 ${dateLabel}` : dateLabel;
}
function usesAmPm(locale) {
  if (!locale) {
    return false;
  }
  if (locale.time_format === "12") {
    return true;
  }
  if (locale.time_format === "24") {
    return false;
  }
  const language = locale.time_format === "language" ? locale.language : void 0;
  const hourCycle2 = new Intl.DateTimeFormat(language, {
    hour: "numeric",
  }).resolvedOptions().hourCycle;
  return hourCycle2 === "h11" || hourCycle2 === "h12";
}
function formatterLocale(locale) {
  return locale?.language;
}
function hourCycle(locale) {
  return usesAmPm(locale) ? "h12" : "h23";
}
function formatClock(value, locale) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    return value;
  }
  const [, hour, minute, second] = match;
  const date = new Date(
    Date.UTC(2020, 0, 1, Number(hour), Number(minute), Number(second || 0)),
  );
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    hour: usesAmPm(locale) ? "numeric" : "2-digit",
    minute: "2-digit",
    ...(Number(second) && { second: "2-digit" }),
    hourCycle: hourCycle(locale),
    timeZone: "UTC",
  }).format(date);
}
function formatTimestamp(value, zone, locale) {
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    dateStyle: "short",
    timeStyle: "medium",
    hourCycle: hourCycle(locale),
    timeZone: zone && zone !== "home_assistant" ? zone : void 0,
  }).format(new Date(value));
}
function formatEventTime(value, zone, locale) {
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    timeStyle: "medium",
    hourCycle: hourCycle(locale),
    timeZone: zone && zone !== "home_assistant" ? zone : void 0,
  }).format(new Date(value));
}

// custom_components/occupied/frontend/src/lib/models/model.ts
var copy = (value) => structuredClone(value);
var days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
function set(object, path, value) {
  if (path.length === 0) {
    throw new Error("Cannot set an empty path");
  }
  let parent = object;
  for (const [i, key2] of path.slice(0, -1).entries()) {
    parent = parent[key2] ??= typeof path[i + 1] === "number" ? [] : {};
  }
  const last = path.at(-1);
  if (value === void 0) {
    delete parent[last];
  } else {
    parent[last] = value;
  }
}
function identifier(program, name, collection = "steps") {
  let base = name
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(base)) {
    base = "item_" + base;
  }
  base ||= "item";
  const used = new Set(Object.keys(program[collection] || {}));
  let id = base,
    n = 2;
  while (used.has(id)) {
    id = `${base}_${n++}`;
  }
  return id;
}
function references(program, id) {
  const result = Object.entries(program.steps || {})
    .filter(([, step]) => step.timing.relative_to?.step === id)
    .map(([key2]) => ["steps", key2, "timing", "relative_to", "step"]);
  for (const [key2, event2] of Object.entries(program.random || {})) {
    for (const edge of ["start", "end"]) {
      if (event2[edge].relative_to?.step === id) {
        result.push(["random", key2, edge, "relative_to", "step"]);
      }
    }
  }
  return result;
}
function removeStep(program, path) {
  const id = String(path[1]);
  if (references(program, id).length > 0) {
    throw new Error("step_dependents_error");
  }
  delete program.steps?.[id];
}
function parentSteps(program, child2) {
  const blocked = /* @__PURE__ */ new Set([child2]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, step] of Object.entries(program.steps || {})) {
      if (
        !(
          step.timing.relative_to?.step &&
          blocked.has(step.timing.relative_to.step)
        ) ||
        blocked.has(id)
      ) {
        continue;
      }
      blocked.add(id);
      changed = true;
    }
  }
  return Object.entries(program.steps || {})
    .filter(([id]) => !blocked.has(id))
    .map(([id, step]) => ({ ...step, id, name: step.name || id }));
}
function parentRandomEvents(program, child2) {
  const blocked = /* @__PURE__ */ new Set([child2]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, event2] of Object.entries(program.random || {})) {
      const parent = event2.start.relative_to?.random;
      if (!(parent && blocked.has(parent)) || blocked.has(id)) {
        continue;
      }
      blocked.add(id);
      changed = true;
    }
  }
  return Object.entries(program.random || {})
    .filter(([id]) => !blocked.has(id))
    .map(([id, event2]) => ({ ...event2, id }));
}
function randomReferences(program, id) {
  return Object.entries(program.random || {})
    .filter(([, event2]) => event2.start.relative_to?.random === id)
    .map(([key2]) => ["random", key2, "start", "relative_to", "random"]);
}

// custom_components/occupied/frontend/src/lib/utils/util.ts
function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(
    typeof error === "object" && error !== null && "message" in error
      ? error.message
      : error,
  );
}
function isValueChangedEvent(event2) {
  return (
    "detail" in event2 &&
    typeof event2.detail === "object" &&
    event2.detail !== null &&
    "value" in event2.detail
  );
}
function required(value) {
  if (value == null) {
    throw new Error("Required editor element or value is missing");
  }
  return value;
}
function download(name, text2, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text2], { type })),
    link2 = document.createElement("a");
  link2.href = url;
  link2.download = name;
  link2.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
function entityName(catalog, id) {
  return catalog.entities.find((entity) => entity.entity_id === id)?.name || id;
}
function entitySummary(catalog, entities, t = translator()) {
  if (entities.length < 5) {
    return entities.map((id) => entityName(catalog, id)).join(", ");
  }
  const first = entityName(catalog, entities[0]);
  return t("entity_and_more")
    .replace("{entity}", () => first)
    .replace("{count}", () => String(entities.length - 1));
}
function minutes(value) {
  if (value === "0") {
    return 0;
  }
  if (typeof value === "number") {
    return value / 60;
  }
  const text2 = value || "0s";
  if (
    !/^[+-]?(?:\d+(?:\.\d+)?h)?(?:\d+(?:\.\d+)?m)?(?:\d+(?:\.\d+)?s)?$/.test(
      text2,
    ) ||
    ["", "+", "-"].includes(text2)
  ) {
    return NaN;
  }
  const total = [...text2.matchAll(/(\d+(?:\.\d+)?)([hms])/g)].reduce(
    (n, [, amount, unit]) =>
      n + Number(amount) * { h: 60, m: 1, s: 1 / 60 }[unit],
    0,
  );
  return text2.startsWith("-") ? -total : total;
}
function durationSeconds(value) {
  return !value || value === "0" ? NaN : minutes(value) * 60;
}
function durationLabel(value, t = translator()) {
  let remaining = Math.round(Math.abs(value) * 1e6) / 1e6;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const mins = Math.floor(remaining / 60);
  const seconds = Math.round((remaining - mins * 60) * 1e6) / 1e6;
  return [
    [hours, "hour", "hours"],
    [mins, "minute", "minutes"],
    [seconds, "second", "seconds"],
  ]
    .filter(([amount]) => amount > 0)
    .map(
      ([amount, singular, plural]) =>
        `${amount} ${t(amount === 1 ? singular : plural)}`,
    )
    .join(" ");
}
function timingForm(timing = {}) {
  const clock = timing.absolute_time,
    source2 = timing.relative_to;
  let anchor = "";
  if (source2?.step) {
    anchor = `step:${source2.step}`;
  } else if (source2?.random) {
    anchor = `random:${source2.random}`;
  } else if (source2?.sun) {
    anchor = `sun:${source2.sun}`;
  } else if (source2?.entity) {
    const attribute = source2.attribute ? `:${source2.attribute}` : "";
    anchor = `entity:${source2.entity}${attribute}`;
  }
  let mode = source2 ? "relative" : "absolute";
  if (timing.duration) {
    mode = "duration";
  }
  return {
    mode,
    start: clock?.start || "18:00",
    end: clock?.end || "",
    anchor,
    startOffset: source2?.start_offset || "0s",
    endOffset: source2?.end_offset || "",
    ...(timing.duration && {
      minDuration: timing.duration.min,
      maxDuration: timing.duration.max || timing.duration.min,
    }),
    ...(timing.latest_at && { latestAt: timingForm(timing.latest_at) }),
    ...(timing.only_before && { onlyBefore: timingForm(timing.only_before) }),
  };
}
function offsetErrors(time) {
  const errors = {},
    low = minutes(time.startOffset);
  const formatError = "offset_format_error";
  if (!time.startOffset || !Number.isFinite(low)) {
    errors.startOffset = formatError;
  } else if (Math.abs(low) > 10080) {
    errors.startOffset = "offset_range_error";
  }
  if (time.endOffset) {
    const high = minutes(time.endOffset);
    if (!Number.isFinite(high)) {
      errors.endOffset = formatError;
    } else if (Math.abs(high) > 10080) {
      errors.endOffset = "offset_range_error";
    } else if (Number.isFinite(low) && high < low) {
      errors.endOffset = "offset_order_error";
    }
  }
  return errors;
}
function scheduleDaySuffix(selected, t) {
  if (!selected) {
    return "";
  }
  if (selected.length === 0) {
    return ` ${t("on_no_days")}`;
  }
  if (days.every((day2) => selected.includes(day2))) {
    return "";
  }
  if (
    selected.length === 5 &&
    days.slice(0, 5).every((day2) => selected.includes(day2))
  ) {
    return ` ${t("on_weekdays")}`;
  }
  if (
    selected.length === 2 &&
    days.slice(5).every((day2) => selected.includes(day2))
  ) {
    return ` ${t("on_weekends")}`;
  }
  const weekdayNames = {
    mon: "mondays",
    tue: "tuesdays",
    wed: "wednesdays",
    thu: "thursdays",
    fri: "fridays",
    sat: "saturdays",
    sun: "sundays",
  };
  const dayNames = selected.map((day2) => t(weekdayNames[day2] || day2));
  const lastDay = dayNames.pop();
  const dayList =
    dayNames.length > 0
      ? `${dayNames.join(", ")}${dayNames.length > 1 ? "," : ""} ${t("and")} ${lastDay}`
      : lastDay;
  return ` ${t("on")} ${dayList}`;
}
function timingSummary(entry, entries, t = translator(), sources = [], locale) {
  if (!entry.timing) {
    return `${t("repeated_activity_window")}${scheduleDaySuffix(entry.days, t)}`;
  }
  const timing = timingExplanation(
    timingForm(entry.timing),
    entries,
    t,
    sources,
    {
      includeHints: false,
      locale,
      days: entry.days,
    },
  );
  const staggerSeconds = (entry.actions ?? [entry]).reduce(
    (total, action2) =>
      total +
      (action2.stagger?.enabled
        ? durationSeconds(action2.stagger.period ?? "2m")
        : 0),
    0,
  );
  return staggerSeconds > 0
    ? `${timing}. ${t("stagger_timing_summary").replace("{duration}", () => durationLabel(staggerSeconds, t))}`
    : timing;
}
function timingExplanation(
  input,
  entries = [],
  t = translator(),
  sources = [],
  options = {},
) {
  const modified = input.latestAt || input.onlyBefore;
  let explanation = baseTimingExplanation(input, entries, t, sources, {
    ...options,
    ...(modified && { includeHints: false }),
  });
  for (const key2 of ["latestAt", "onlyBefore"]) {
    const boundary2 = input[key2];
    if (!boundary2) {
      continue;
    }
    let label = formatClock(boundary2.start, options.locale);
    if (boundary2.mode === "relative") {
      label =
        durationSeconds(String(boundary2.startOffset)) === 0
          ? t(boundary2.anchor.slice(4))
          : baseTimingExplanation(boundary2, [], t, [], {
              includeHints: false,
            }).slice(t("runs").length + 1);
    }
    explanation += `. ${t(
      key2 === "latestAt" ? "latest_at_summary" : "only_before_summary",
    ).replace("{boundary}", () => label)}`;
  }
  if (modified && options.includeHints !== false) {
    explanation += `. ${t("timing_limits_sampling_hint")}`;
  }
  return explanation;
}
function baseTimingExplanation(
  input,
  entries = [],
  t = translator(),
  sources = [],
  { includeHints = true, subject = "runs", locale, days: selectedDays } = {},
) {
  const runs = `${t(subject)}${scheduleDaySuffix(selectedDays, t)}`;
  const time = {
    start: "",
    end: "",
    anchor: "",
    startOffset: "0s",
    endOffset: "",
    ...input,
  };
  if (time.mode === "duration") {
    const minimum = durationSeconds(time.minDuration || "");
    const maximum = durationSeconds(time.maxDuration || time.minDuration || "");
    if (
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      minimum <= 0 ||
      maximum < minimum ||
      maximum > 604800
    ) {
      return t("window_durations_prompt");
    }
    return t(
      minimum === maximum
        ? "window_duration_summary"
        : "window_duration_range_summary",
    )
      .replace("{duration}", () => durationLabel(minimum, t))
      .replace("{min}", () => durationLabel(minimum, t))
      .replace("{max}", () => durationLabel(maximum, t));
  }
  if (time.mode === "absolute") {
    const valid = (value) =>
      /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
    const display = (value) => formatClock(value, locale);
    const seconds = (value) =>
      value
        .split(":")
        .reduce(
          (sum, part, index2) => sum + Number(part) * [3600, 60, 1][index2],
          0,
        );
    if (!valid(time.start) || (time.end && !valid(time.end))) {
      return t("time_window_prompt");
    }
    const fixedTime = `${runs} ${t("at")} ${display(time.start)}`;
    if (!time.end) {
      return `${fixedTime}${includeHints ? `. ${t("time_window_randomness_hint")}` : ""}`;
    }
    if (seconds(time.end) === seconds(time.start)) {
      return `${fixedTime}${includeHints ? `. ${t("time_window_fixed_hint")}` : ""}`;
    }
    const nextDay =
      seconds(time.end) < seconds(time.start) ? ` ${t("the_next_day")}` : "";
    return `${runs} ${t("at_a_random_time_between")} ${display(time.start)} ${t("and")} ${display(time.end)}${nextDay}`;
  }
  if (Object.keys(offsetErrors(time)).length > 0) {
    return t(
      subject === "runs" ? "step_offsets_prompt" : "window_offsets_prompt",
    );
  }
  if (!time.anchor) {
    return t("choose_a_step_or_event");
  }
  const step = time.anchor.startsWith("step:");
  let name;
  if (time.anchor.startsWith("random:")) {
    name = `${t("the_end_of")} ${entries.find((entry) => entry.id === time.anchor)?.name || time.anchor.slice(7)}`;
  } else if (step) {
    name =
      entries.find((entry) => entry.id === time.anchor.slice(5))?.name ||
      time.anchor.slice(5);
  } else if (time.anchor.startsWith("sun:")) {
    name = t(time.anchor.slice(4));
  } else {
    name =
      sources.find((source2) => source2.value === time.anchor)?.name ||
      time.anchor
        .slice(7)
        .replace(
          /:(start_time|end_time)$/,
          (_, attribute) =>
            ` \xB7 ${t(attribute === "start_time" ? "start" : "end")}`,
        );
  }
  const low = minutes(time.startOffset),
    high = time.endOffset ? minutes(time.endOffset) : low;
  const duration = (offset) => durationLabel(Math.abs(offset) * 60, t);
  const offsetLabel = (offset) =>
    `${duration(offset)} ${t(offset < 0 ? "before" : "after")}`;
  if (low === high) {
    const fixedTime =
      low === 0
        ? `${runs} ${t("at_the_same_time_as")} ${name}`
        : `${runs} ${offsetLabel(low)} ${name}`;
    return `${fixedTime}${includeHints && !time.endOffset ? `. ${t("time_offset_randomness_hint")}` : ""}`;
  }
  if (low === 0 || high === 0) {
    return `${runs} ${t("at_a_random_time_during_the")} ${offsetLabel(low === 0 ? high : low)} ${name}`;
  }
  const firstBound =
    Math.sign(low) === Math.sign(high) ? duration(low) : offsetLabel(low);
  return `${runs} ${t("at_a_random_time_between")} ${firstBound} ${t("and")} ${offsetLabel(high)} ${name}`;
}

// custom_components/occupied/frontend/src/lib/models/run-condition.ts
function runConditionForm(config) {
  return {
    enabled: !!config,
    entityId: config?.entity_id || "",
    states: config ? [config.state].flat() : [],
    enforceState: config?.enforce_state_on_start ?? false,
    startDelay: config?.start_delay ?? "30s",
    offEntities: [...(config?.off_entities ?? [])],
  };
}
function runConditionErrors(form) {
  if (!form.enabled) {
    return {};
  }
  const errors = {};
  if (!/^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(form.entityId)) {
    errors.entityId = "run_condition_entity_error";
  }
  if (
    form.states.length === 0 ||
    form.states.some(
      (state2) => !state2.trim() || ["unknown", "unavailable"].includes(state2),
    )
  ) {
    errors.states = "run_condition_states_error";
  }
  if (
    form.offEntities.some(
      (entity) => !/^(light|switch)\.[a-z0-9_]+$/.test(entity),
    )
  ) {
    errors.offEntities = "run_condition_off_entities_error";
  }
  const delay = durationSeconds(form.startDelay);
  if (!Number.isFinite(delay) || delay < 0 || delay > 3600) {
    errors.startDelay = "run_condition_delay_error";
  }
  return errors;
}
function runConditionValue(form) {
  if (!form.enabled) {
    return;
  }
  return {
    entity_id: form.entityId,
    state: [...new Set(form.states)],
    enforce_state_on_start: form.enforceState,
    start_delay: form.startDelay,
    ...(form.offEntities.length > 0 && {
      off_entities: [...new Set(form.offEntities)],
    }),
  };
}
function runConditionStateOptions(entity, states, current) {
  return [
    .../* @__PURE__ */ new Set([
      ...(entity.startsWith("alarm_control_panel.")
        ? [
            "armed_away",
            "armed_night",
            "armed_home",
            "armed_vacation",
            "armed_custom_bypass",
            "disarmed",
            "arming",
            "pending",
            "triggered",
          ]
        : []),
      ...states,
      ...(current && !["unknown", "unavailable"].includes(current)
        ? [current]
        : []),
    ]),
  ];
}
function managedOffEntities(program, entities) {
  const managed2 = /* @__PURE__ */ new Set();
  const visit = (action2) => {
    const targets = action2.entities ?? [];
    for (const entity of Array.isArray(targets)
      ? targets
      : Object.keys(targets)) {
      managed2.add(entity);
    }
    for (const child2 of action2.actions ?? []) {
      visit(child2);
    }
  };
  for (const step of Object.values(program.steps ?? {})) {
    visit(step);
  }
  for (const event2 of Object.values(program.random ?? {})) {
    visit(event2.on);
    visit(event2.off);
  }
  const overlaps = /* @__PURE__ */ new Set();
  for (const entity of entities) {
    if (managed2.has(entity)) {
      overlaps.add(entity);
    }
  }
  return [...overlaps];
}

// custom_components/occupied/frontend/src/app.css
var app_default =
  '/* Shared element defaults */\np,\nli {\n  overflow-wrap: anywhere;\n}\n\n:host {\n  display: block;\n  min-height: 100%;\n  background: var(--primary-background-color, #f4f5f8);\n  color: var(--primary-text-color, #202c37);\n  font:\n    15px/1.5 system-ui,\n    sans-serif;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nmain {\n  max-width: 1200px;\n  margin: auto;\n  padding: 24px;\n}\n\nh1 {\n  margin: 0;\n  font-size: 28px;\n}\n\nh2 {\n  font-size: 21px;\n  margin: 0 0 12px;\n}\n\nh3 {\n  font-size: 17px;\n}\n\np {\n  margin: 8px 0;\n}\n\nsmall,\n.hint {\n  color: var(--secondary-text-color, #596773);\n}\n\nheader {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 16px;\n  flex-wrap: wrap;\n}\n\nnav,\n.row,\n.toolbar {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n\nnav {\n  margin: 18px 0;\n}\n\nnav button[aria-current="page"] {\n  background: var(--primary-color, #167b94);\n  color: white;\n}\n\nsection {\n  background: var(--card-background-color, #fff);\n  border: 1px solid var(--divider-color, #d5dce3);\n  border-radius: 12px;\n  padding: 20px;\n  margin: 16px 0;\n  min-width: 0;\n}\n\nsection section {\n  border-radius: 8px;\n}\n\ndetails {\n  padding: 12px 0;\n}\n\nsummary {\n  cursor: pointer;\n  font-weight: 600;\n}\n\nbutton,\ninput,\nselect,\ntextarea {\n  font: inherit;\n  color: inherit;\n}\n\nbutton {\n  background: var(--card-background-color, #fff);\n  border: 1px solid var(--divider-color, #bdc9d2);\n  padding: 8px 14px;\n  border-radius: 8px;\n  cursor: pointer;\n  min-height: 42px;\n}\n\nbutton.primary {\n  background: var(--primary-color, #167b94);\n  color: white;\n}\n\nbutton:disabled {\n  opacity: 0.5;\n  cursor: default;\n}\n\nbutton:focus-visible,\ninput:focus-visible,\nselect:focus-visible,\ntextarea:focus-visible,\nsummary:focus-visible,\na:focus-visible,\n[tabindex]:focus-visible {\n  outline: 3px solid var(--primary-color, #167b94);\n  outline-offset: 2px;\n}\n\n.field {\n  display: flex;\n  flex-direction: column;\n  gap: 5px;\n  margin: 12px 0;\n  max-width: 700px;\n}\n\nlabel {\n  font-weight: 500;\n}\n\ninput:not([type="checkbox"]),\nselect,\ntextarea {\n  border: 1px solid var(--divider-color, #bdc9d2);\n  border-radius: 6px;\n  background: var(--card-background-color, #fff);\n  padding: 9px;\n  min-width: 0;\n  max-width: 100%;\n}\n\n.field input,\n.field select,\n.field textarea {\n  width: 100%;\n}\n\ntextarea {\n  resize: vertical;\n}\n\n.field textarea {\n  font:\n    14px/1.5 ui-monospace,\n    monospace;\n}\n\ninput[type="checkbox"] {\n  width: 20px;\n  height: 20px;\n  vertical-align: middle;\n}\n\nfieldset {\n  border: 1px solid var(--divider-color, #d5dce3);\n  border-radius: 8px;\n  margin: 12px 0;\n  min-width: 0;\n}\n\n.banner {\n  padding: 12px 16px;\n  border-radius: 8px;\n  background: var(--secondary-background-color, #e3eef2);\n  margin: 12px 0;\n  overflow-wrap: anywhere;\n}\n\n.banner.unsaved {\n  border: 1px solid var(--warning-color, #e69500);\n  border-left-width: 4px;\n  background: color-mix(\n    in srgb,\n    var(--warning-color, #e69500) 18%,\n    var(--card-background-color, #fff)\n  );\n  color: var(--primary-text-color, #202c37);\n  font-weight: 600;\n}\n\n.error,\n[aria-invalid="true"] {\n  color: var(--error-color, #b3261e);\n}\n\n[aria-invalid="true"] {\n  border-color: var(--error-color, #b3261e);\n}\n\n[hidden] {\n  display: none !important;\n}\n\n.toolbar {\n  position: sticky;\n  top: 0;\n  padding: 12px 0;\n  background: var(--primary-background-color, #f4f5f8);\n  z-index: 2;\n}\n\n.table-wrap {\n  overflow: auto;\n}\n\ntable {\n  width: 100%;\n  border-collapse: collapse;\n  font-size: 13px;\n}\n\nth,\ntd {\n  padding: 9px;\n  text-align: left;\n  border-bottom: 1px solid var(--divider-color, #d5dce3);\n  max-width: 300px;\n  overflow-wrap: anywhere;\n}\n\nth {\n  white-space: nowrap;\n}\n\n@media (max-width: 600px) {\n  main {\n    padding: 14px;\n  }\n\n  section {\n    padding: 14px;\n  }\n\n  nav {\n    gap: 5px;\n  }\n\n  nav button {\n    padding: 7px 10px;\n  }\n\n  .row input {\n    width: 100%;\n  }\n}\n\n/* Panel shell overrides: keep these after the shared defaults. */\nmain {\n  max-width: 1120px;\n  padding: 32px;\n}\n\nheader {\n  margin-bottom: 24px;\n}\n\nheader h1 {\n  font-size: 24px;\n  letter-spacing: -0.7px;\n}\n\nheader p {\n  margin: 2px 0;\n  font-size: 13px;\n}\n\nnav {\n  border-bottom: 1px solid var(--divider-color, #d5dce3);\n  gap: 24px;\n  margin: 16px 0 32px;\n}\n\nnav button,\nnav button[aria-current="page"] {\n  border: 0;\n  border-radius: 0;\n  border-bottom: 3px solid transparent;\n  background: transparent;\n  padding: 10px 0;\n  color: var(--secondary-text-color, #596773);\n}\n\nnav button[aria-current="page"] {\n  border-bottom-color: var(--primary-color, #167b94);\n  color: var(--primary-color, #167b94);\n  font-weight: 650;\n}\n\n.field-label-row {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  gap: 4px 12px;\n}\n\n.field-label-row .text-button {\n  min-height: 24px;\n  padding: 0;\n  border: 0;\n  font-size: 13px;\n}\n\n.text-button {\n  border-color: transparent;\n  background: transparent;\n  color: var(--primary-color, #167b94);\n  padding-left: 4px;\n  padding-right: 4px;\n}\n\n.page-heading {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 24px;\n  margin: 24px 0;\n}\n\n.page-heading h2 {\n  font-size: 30px;\n  letter-spacing: -0.8px;\n  margin: 0;\n}\n\n.page-heading .hint {\n  max-width: 500px;\n}\n\n/* Step lists and empty states */\n.activity-intro {\n  border-left: 3px solid var(--primary-color, #167b94);\n  padding: 4px 0 4px 16px;\n  margin: 0 0 24px;\n}\n\n.activity-intro h2 {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0 0 4px;\n}\n\n.activity-intro p {\n  max-width: 68ch;\n  margin: 0;\n  font-size: 14px;\n  line-height: 1.6;\n}\n\n.step-empty {\n  text-align: center;\n  padding: 60px 32px;\n  border-style: dashed;\n}\n\n.step-empty h2 {\n  font-size: 25px;\n  letter-spacing: -0.5px;\n}\n\n.step-empty p {\n  max-width: 490px;\n  margin: 12px auto 24px;\n}\n\n.empty-steps {\n  font-size: 13px;\n  color: var(--secondary-text-color, #596773);\n}\n\n.step-list {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  margin: 0 0 20px;\n  min-width: 0;\n}\n\n.activity-list-actions {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n}\n\n.activity-reset-order {\n  margin-left: auto;\n}\n\n.activity-item {\n  position: relative;\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  gap: 10px;\n  min-width: 0;\n}\n\n.activity-children {\n  display: flex;\n  flex-direction: column;\n  grid-column: 1 / -1;\n  gap: 10px;\n  margin-left: 14px;\n}\n\n.activity-drag-handle {\n  display: grid;\n  place-items: center;\n  width: 32px;\n  min-height: 44px;\n  margin: 4px 6px;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: var(--secondary-text-color, #596773);\n  cursor: grab;\n  touch-action: none;\n  user-select: none;\n}\n\n.activity-drag-handle:active {\n  cursor: grabbing;\n}\n\n.activity-drag-handle:focus-visible {\n  outline: 2px solid var(--primary-color, #03a9f4);\n  outline-offset: 2px;\n}\n\n.activity-dragging .step-card {\n  opacity: 0.45;\n}\n\n.activity-drop-before::before,\n.activity-drop-after::after {\n  content: "";\n  position: absolute;\n  left: 0;\n  right: 0;\n  height: 3px;\n  border-radius: 2px;\n  background: var(--primary-color, #03a9f4);\n  pointer-events: none;\n}\n\n.activity-drop-before::before {\n  top: -6px;\n}\n\n.activity-drop-after::after {\n  bottom: -6px;\n}\n\n.visually-hidden {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip-path: inset(50%);\n  white-space: nowrap;\n  border: 0;\n}\n\n.step-card {\n  width: calc(100% - var(--depth) * 14px);\n  margin-left: calc(var(--depth) * 14px);\n  border: 1px solid var(--divider-color, #d5dce3);\n  border-radius: 12px;\n  background: var(--card-background-color, #fff);\n  overflow: hidden;\n}\n\n.step-card-header {\n  display: grid;\n  grid-template-columns: 44px minmax(0, 1fr);\n  align-items: center;\n}\n\n.step-card-header:has(.step-row[aria-expanded="true"]) {\n  border-bottom: 1px solid var(--divider-color, #d5dce3);\n}\n\n.step-card.step-disabled {\n  border-style: dashed;\n}\n\n.step-card.step-warning {\n  border-color: var(--warning-color, #ffa600);\n  background: color-mix(\n    in srgb,\n    var(--warning-color, #ffa600) 10%,\n    var(--card-background-color, #fff)\n  );\n}\n\n.step-card.step-warning .step-row:not(:disabled):hover {\n  background: color-mix(\n    in srgb,\n    var(--warning-color, #ffa600) 18%,\n    var(--card-background-color, #fff)\n  );\n}\n\n.step-row-warning {\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n  color: var(--warning-color, #ffa600);\n  font-size: 13px;\n  overflow-wrap: anywhere;\n}\n\n.step-row-warning ha-icon {\n  --mdc-icon-size: 20px;\n  flex-shrink: 0;\n}\n\n.step-warning-message {\n  display: block;\n}\n\n.step-card.step-disabled .step-row {\n  color: var(--secondary-text-color, #596773);\n}\n\n.step-row {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);\n  align-items: center;\n  gap: 14px;\n  text-align: left;\n  width: 100%;\n  padding: 20px;\n  border: 0;\n  border-radius: 0;\n  background: transparent;\n  color: inherit;\n}\n\n.step-row:disabled {\n  opacity: 1;\n  cursor: default;\n}\n\n.step-row.editing {\n  grid-template-columns: minmax(0, 1fr);\n}\n\n.step-row:not(:disabled):hover {\n  background: var(--secondary-background-color, #e3eef2);\n}\n\n.step-card .step-editor {\n  margin: 0;\n}\n\n.step-editor-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 12px;\n  margin-top: 24px;\n}\n\n/* Editor action menus */\n.step-actions-menu {\n  position: fixed;\n  inset: auto;\n  width: 240px;\n  max-width: calc(100vw - 32px);\n  max-height: calc(100vh - 32px);\n  overflow: auto;\n  margin: 0;\n  padding: 6px;\n  border: 1px solid var(--divider-color, #d5dce3);\n  border-radius: 10px;\n  background: var(--card-background-color, #fff);\n  color: var(--primary-text-color, #202c37);\n  box-shadow: 0 6px 24px #0003;\n}\n\n.step-actions-menu button {\n  display: block;\n  width: 100%;\n  border: 0;\n  background: transparent;\n  text-align: left;\n}\n\n.step-actions-menu button:hover,\n.step-actions-menu button:focus-visible {\n  background: var(--secondary-background-color, #e3eef2);\n}\n\n.step-actions-menu [role="separator"] {\n  border-top: 1px solid var(--divider-color, #d5dce3);\n  margin: 6px 8px;\n}\n\n.step-row-content {\n  display: flex;\n  min-width: 0;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.step-row-heading {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n\n.step-status-badge {\n  padding: 2px 8px;\n  border: 1px solid var(--divider-color, #d5dce3);\n  border-radius: 999px;\n  background: var(--secondary-background-color, #e3eef2);\n  color: var(--secondary-text-color, #596773);\n  font-size: 11px;\n  font-weight: 500;\n  line-height: 1.5;\n  white-space: nowrap;\n}\n\n.step-row strong {\n  font-size: 16px;\n  font-weight: 650;\n  overflow-wrap: anywhere;\n}\n\n.step-row-content .hint {\n  font-size: 13px;\n  overflow-wrap: anywhere;\n}\n\n.step-row-time {\n  text-align: right;\n  font-size: 13px;\n  overflow-wrap: anywhere;\n}\n\n/* Editor dialogs */\n.step-delete-dialog,\n.step-advanced-dialog {\n  width: 440px;\n  max-width: calc(100vw - 32px);\n  max-height: calc(100vh - 32px);\n  overflow: auto;\n  padding: 24px;\n  border: 1px solid var(--divider-color, #d5dce3);\n  border-radius: 12px;\n  background: var(--card-background-color, #fff);\n  color: var(--primary-text-color, #202c37);\n  box-shadow: 0 6px 24px #0003;\n}\n\n.step-delete-dialog::backdrop,\n.step-advanced-dialog::backdrop {\n  background: #0006;\n}\n\n.step-weekdays {\n  padding: 12px;\n}\n\n.step-weekday-presets {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  margin-bottom: 16px;\n}\n\n.step-weekday-presets button {\n  padding: 6px 10px;\n}\n\n.step-weekday-presets button[aria-pressed="true"] {\n  border-color: var(--primary-color, #167b94);\n  background: var(--secondary-background-color, #e3eef2);\n  color: var(--primary-color, #167b94);\n}\n\n.step-weekday-options {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n}\n\n.step-weekday-option {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 42px;\n  cursor: pointer;\n}\n\n.step-weekday-option input {\n  flex: 0 0 auto;\n  accent-color: var(--primary-color, #167b94);\n}\n\n.step-exit-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 10;\n  display: grid;\n  place-items: center;\n  padding: 16px;\n  background: #0004;\n}\n\n.step-exit-dialog {\n  position: relative;\n  inset: auto;\n  width: 440px;\n  max-width: 100%;\n  margin: 0;\n  padding: 24px;\n  border: 1px solid var(--divider-color, #d5dce3);\n  border-radius: 12px;\n  background: var(--card-background-color, #fff);\n  color: var(--primary-text-color, #202c37);\n  box-shadow: 0 6px 24px #0003;\n}\n\n.step-exit-dialog h2 {\n  margin-top: 0;\n}\n\n.step-delete-actions {\n  display: flex;\n  justify-content: flex-end;\n  flex-wrap: wrap;\n  gap: 12px;\n  margin-top: 24px;\n}\n\n.danger {\n  color: var(--error-color, #b3261e);\n}\n\n.icon-button {\n  display: inline-grid;\n  place-items: center;\n  width: 42px;\n  padding: 8px;\n}\n\n.icon-button svg {\n  width: 20px;\n  height: 20px;\n  fill: currentColor;\n}\n\n.step-editor {\n  max-width: none;\n  margin: 0 auto 32px;\n  padding: 32px;\n}\n\n.step-editor h3 {\n  font-size: 23px;\n  font-weight: 600;\n  letter-spacing: -0.5px;\n  margin: 28px 0 8px;\n}\n\n.entity-native-selector {\n  display: block;\n  width: 100%;\n}\n\n.builder-footer {\n  display: flex;\n  gap: 10px;\n  align-items: center;\n  flex-wrap: wrap;\n  border-top: 1px solid var(--divider-color, #d5dce3);\n  padding-top: 22px;\n  margin-top: 28px;\n}\n\n.builder-footer .step-editor-actions {\n  margin-top: 0;\n}\n\n.builder-footer > button:first-child {\n  margin-right: auto;\n}\n\n.step-editor details {\n  padding: 8px 0;\n}\n\n.step-editor .field {\n  margin: 18px 0;\n}\n\n.source-picker {\n  position: relative;\n}\n\n.source-picker ha-generic-picker {\n  display: block;\n  width: 100%;\n}\n\n.step-editor .error {\n  font-size: 13px;\n}\n\n.timing-options {\n  border: 0;\n  padding: 0;\n  margin: 18px 0;\n}\n\n.timing-option-row {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n}\n\n.timing-option {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 12px;\n  min-height: 44px;\n  border: 1px solid var(--divider-color, #bdc9d2);\n  border-radius: 8px;\n  cursor: pointer;\n}\n\n.timing-option:has(input:checked) {\n  border-color: var(--primary-color, #167b94);\n  background: var(--secondary-background-color, #e3eef2);\n  color: var(--primary-color, #167b94);\n}\n\n.timing-options input[type="radio"] {\n  width: 18px;\n  height: 18px;\n  padding: 0;\n  margin: 0;\n  flex: 0 0 auto;\n  accent-color: var(--primary-color, #167b94);\n}\n\n.step-editor .step-name-editor .field {\n  max-width: none;\n  margin: 20px 0 28px;\n}\n\n.step-editor .step-name-editor label {\n  font-weight: 600;\n}\n\n.step-editor .step-name-editor input {\n  font-family: inherit;\n  font-size: 22px;\n  font-weight: 600;\n  line-height: 1.4;\n  padding: 14px;\n}\n\n.step-editor .editor-sections {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 28px;\n}\n\n.step-editor .editor-sections > div {\n  min-width: 0;\n}\n\n.step-editor h3 {\n  margin: 16px 0 8px;\n  font-size: 20px;\n}\n\n.step-editor h4 {\n  margin: 14px 0 8px;\n  font-size: 16px;\n  font-weight: 600;\n}\n\n.step-editor .field {\n  margin: 14px 0;\n}\n\n@media (max-width: 900px) {\n  .step-editor .editor-sections {\n    grid-template-columns: 1fr;\n    gap: 20px;\n  }\n\n  .step-editor .editor-sections > div + div {\n    border-top: 1px solid var(--divider-color, #d5dce3);\n    padding-top: 12px;\n  }\n}\n\n#issues:empty {\n  display: none;\n}\n\n#issues button {\n  margin: 0 6px 8px 0;\n  text-align: left;\n}\n\n@media (max-width: 600px) {\n  main {\n    padding: 18px 14px;\n  }\n\n  header {\n    gap: 10px;\n    margin-bottom: 8px;\n  }\n\n  nav {\n    margin-bottom: 24px;\n  }\n\n  .page-heading {\n    align-items: flex-start;\n    flex-direction: column;\n    gap: 12px;\n  }\n\n  .page-heading h2 {\n    font-size: 27px;\n  }\n\n  .step-row {\n    padding: 14px;\n    gap: 10px;\n    grid-template-columns: minmax(0, 1fr);\n  }\n\n  .step-row-time {\n    text-align: left;\n  }\n\n  .step-editor {\n    padding: 20px 16px;\n  }\n\n  .builder-footer {\n    gap: 6px;\n  }\n\n  .builder-footer button {\n    padding: 8px 12px;\n  }\n\n  .step-empty {\n    padding: 36px 20px;\n  }\n\n  .empty-steps {\n    line-height: 2;\n  }\n}\n';

// node_modules/.pnpm/esm-env@1.2.2/node_modules/esm-env/dev-fallback.js
var node_env = globalThis.process?.env?.NODE_ENV;
var dev_fallback_default =
  node_env && !node_env.toLowerCase().startsWith("prod");

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/shared/utils.js
var is_array = Array.isArray;
var index_of = Array.prototype.indexOf;
var includes = Array.prototype.includes;
var array_from = Array.from;
var object_keys = Object.keys;
var define_property = Object.defineProperty;
var get_descriptor = Object.getOwnPropertyDescriptor;
var get_descriptors = Object.getOwnPropertyDescriptors;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var get_prototype_of = Object.getPrototypeOf;
var is_extensible = Object.isExtensible;
function is_function(thing) {
  return typeof thing === "function";
}
var noop = () => {};
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i]();
  }
}
function deferred() {
  var resolve;
  var reject;
  var promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function to_array(value, n) {
  if (Array.isArray(value)) {
    return value;
  }
  if (n === void 0 || !(Symbol.iterator in value)) {
    return Array.from(value);
  }
  const array = [];
  for (const element2 of value) {
    array.push(element2);
    if (array.length === n) break;
  }
  return array;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/constants.js
var DERIVED = 1 << 1;
var EFFECT = 1 << 2;
var RENDER_EFFECT = 1 << 3;
var MANAGED_EFFECT = 1 << 24;
var BLOCK_EFFECT = 1 << 4;
var BRANCH_EFFECT = 1 << 5;
var ROOT_EFFECT = 1 << 6;
var BOUNDARY_EFFECT = 1 << 7;
var PAUSED = 1 << 8;
var CONNECTED = 1 << 9;
var CLEAN = 1 << 10;
var DIRTY = 1 << 11;
var MAYBE_DIRTY = 1 << 12;
var INERT = 1 << 13;
var DESTROYED = 1 << 14;
var REACTION_RAN = 1 << 15;
var DESTROYING = 1 << 25;
var EFFECT_TRANSPARENT = 1 << 16;
var EAGER_EFFECT = 1 << 17;
var HEAD_EFFECT = 1 << 18;
var EFFECT_PRESERVED = 1 << 19;
var USER_EFFECT = 1 << 20;
var EFFECT_OFFSCREEN = 1 << 25;
var REACTION_IS_UPDATING = 1 << 21;
var ASYNC = 1 << 22;
var ERROR_VALUE = 1 << 23;
var STATE_SYMBOL = /* @__PURE__ */ Symbol("$state");
var COMPONENT_SYMBOL = /* @__PURE__ */ Symbol("component");
var LEGACY_PROPS = /* @__PURE__ */ Symbol("legacy props");
var LOADING_ATTR_SYMBOL = /* @__PURE__ */ Symbol("");
var PROXY_PATH_SYMBOL = /* @__PURE__ */ Symbol("proxy path");
var ATTRIBUTES_CACHE = /* @__PURE__ */ Symbol("attributes");
var CLASS_CACHE = /* @__PURE__ */ Symbol("class");
var STYLE_CACHE = /* @__PURE__ */ Symbol("style");
var TEXT_CACHE = /* @__PURE__ */ Symbol("text");
var FORM_RESET_HANDLER = /* @__PURE__ */ Symbol("form reset");
var HMR_ANCHOR = /* @__PURE__ */ Symbol("hmr anchor");
var STALE_REACTION = new (class StaleReactionError extends Error {
  name = "StaleReactionError";
  message =
    "The reaction that called `getAbortSignal()` was re-run or destroyed";
})();
var IS_XHTML =
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  !!globalThis.document?.contentType &&
  /* @__PURE__ */ globalThis.document.contentType.includes("xml");
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/constants.js
var EACH_ITEM_REACTIVE = 1;
var EACH_INDEX_REACTIVE = 1 << 1;
var EACH_IS_CONTROLLED = 1 << 2;
var EACH_IS_ANIMATED = 1 << 3;
var EACH_ITEM_IMMUTABLE = 1 << 4;
var PROPS_IS_IMMUTABLE = 1;
var PROPS_IS_RUNES = 1 << 1;
var PROPS_IS_UPDATED = 1 << 2;
var PROPS_IS_BINDABLE = 1 << 3;
var PROPS_IS_LAZY_INITIAL = 1 << 4;
var TRANSITION_OUT = 1 << 1;
var TRANSITION_GLOBAL = 1 << 2;
var TEMPLATE_FRAGMENT = 1;
var TEMPLATE_USE_IMPORT_NODE = 1 << 1;
var TEMPLATE_USE_SVG = 1 << 2;
var TEMPLATE_USE_MATHML = 1 << 3;
var HYDRATION_START = "[";
var HYDRATION_START_ELSE = "[!";
var HYDRATION_START_FAILED = "[?";
var HYDRATION_END = "]";
var HYDRATION_ERROR = {};
var ELEMENT_PRESERVE_ATTRIBUTE_CASE = 1 << 1;
var ELEMENT_IS_INPUT = 1 << 2;
var UNINITIALIZED = /* @__PURE__ */ Symbol("uninitialized");
var FILENAME = /* @__PURE__ */ Symbol("filename");
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/warnings.js
var bold = "font-weight: bold";
var normal = "font-weight: normal";
function await_reactivity_loss(name) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] await_reactivity_loss
%cDetected reactivity loss when reading \`${name}\`. This happens when state is read in an async function after an earlier \`await\`
https://svelte.dev/e/await_reactivity_loss`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/await_reactivity_loss`);
  }
}
function await_waterfall(name, location2) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] await_waterfall
%cAn async derived, \`${name}\` (${location2}) was not read immediately after it resolved. This often indicates an unnecessary waterfall, which can slow down your app
https://svelte.dev/e/await_waterfall`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/await_waterfall`);
  }
}
function derived_inert() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] derived_inert
%cReading a derived belonging to a now-destroyed effect may result in stale values
https://svelte.dev/e/derived_inert`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/derived_inert`);
  }
}
function hydration_attribute_changed(attribute, html2, value) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] hydration_attribute_changed
%cThe \`${attribute}\` attribute on \`${html2}\` changed its value between server and client renders. The client value, \`${value}\`, will be ignored in favour of the server value
https://svelte.dev/e/hydration_attribute_changed`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/hydration_attribute_changed`);
  }
}
function hydration_mismatch(location2) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] hydration_mismatch
%c${location2 ? `Hydration failed because the initial UI does not match what was rendered on the server. The error occurred near ${location2}` : "Hydration failed because the initial UI does not match what was rendered on the server"}
https://svelte.dev/e/hydration_mismatch`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/hydration_mismatch`);
  }
}
function lifecycle_double_unmount() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] lifecycle_double_unmount
%cTried to unmount a component that was not mounted
https://svelte.dev/e/lifecycle_double_unmount`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/lifecycle_double_unmount`);
  }
}
function select_multiple_invalid_value() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] select_multiple_invalid_value
%cThe \`value\` property of a \`<select multiple>\` element should be an array, but it received a non-array value. The selection will be kept as is.
https://svelte.dev/e/select_multiple_invalid_value`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/select_multiple_invalid_value`);
  }
}
function state_proxy_equality_mismatch(operator) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] state_proxy_equality_mismatch
%cReactive \`$state(...)\` proxies and the values they proxy have different identities. Because of this, comparisons with \`${operator}\` will produce unexpected results
https://svelte.dev/e/state_proxy_equality_mismatch`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/state_proxy_equality_mismatch`);
  }
}
function svelte_boundary_reset_noop() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] svelte_boundary_reset_noop
%cA \`<svelte:boundary>\` \`reset\` function only resets the boundary the first time it is called
https://svelte.dev/e/svelte_boundary_reset_noop`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/hydration.js
var hydrating = false;
function set_hydrating(value) {
  hydrating = value;
}
var hydrate_node;
function set_hydrate_node(node) {
  if (node === null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return (hydrate_node = node);
}
function hydrate_next() {
  return set_hydrate_node(get_next_sibling(hydrate_node));
}
function reset(node) {
  if (!hydrating) return;
  if (get_next_sibling(hydrate_node) !== null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  hydrate_node = node;
}
function next(count = 1) {
  if (hydrating) {
    var i = count;
    var node = hydrate_node;
    while (i--) {
      node = /** @type {TemplateNode} */ get_next_sibling(node);
    }
    hydrate_node = node;
  }
}
function skip_nodes(remove = true) {
  var depth = 0;
  var node = hydrate_node;
  while (true) {
    if (node.nodeType === COMMENT_NODE) {
      var data =
        /** @type {Comment} */
        node.data;
      if (data === HYDRATION_END) {
        if (depth === 0) return node;
        depth -= 1;
      } else if (
        data === HYDRATION_START ||
        data === HYDRATION_START_ELSE || // "[1", "[2", etc. for if blocks
        (data[0] === "[" && !isNaN(Number(data.slice(1))))
      ) {
        depth += 1;
      }
    }
    var next2 =
      /** @type {TemplateNode} */
      get_next_sibling(node);
    if (remove) node.remove();
    node = next2;
  }
}
function read_hydration_instruction(node) {
  if (!node || node.nodeType !== COMMENT_NODE) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return (
    /** @type {Comment} */
    node.data
  );
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/equality.js
function equals(value) {
  return value === this.v;
}
function safe_not_equal(a, b) {
  return a != a
    ? b == b
    : a !== b ||
        (a !== null && typeof a === "object") ||
        typeof a === "function";
}
function safe_equals(value) {
  return !safe_not_equal(value, this.v);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/shared/errors.js
function invariant_violation(message) {
  if (dev_fallback_default) {
    const error = new Error(`invariant_violation
An invariant violation occurred, meaning Svelte's internal assumptions were flawed. This is a bug in Svelte, not your app \u2014 please open an issue at https://github.com/sveltejs/svelte, citing the following message: "${message}"
https://svelte.dev/e/invariant_violation`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/invariant_violation`);
  }
}
function lifecycle_outside_component(name) {
  if (dev_fallback_default) {
    const error = new Error(`lifecycle_outside_component
\`${name}(...)\` can only be used during component initialisation
https://svelte.dev/e/lifecycle_outside_component`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/errors.js
function async_derived_orphan() {
  if (dev_fallback_default) {
    const error = new Error(`async_derived_orphan
Cannot create a \`$derived(...)\` with an \`await\` expression outside of an effect tree
https://svelte.dev/e/async_derived_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/async_derived_orphan`);
  }
}
function derived_references_self() {
  if (dev_fallback_default) {
    const error = new Error(`derived_references_self
A derived value cannot reference itself recursively
https://svelte.dev/e/derived_references_self`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/derived_references_self`);
  }
}
function each_key_duplicate(a, b, value) {
  if (dev_fallback_default) {
    const error = new Error(`each_key_duplicate
${value ? `Keyed each block has duplicate key \`${value}\` at indexes ${a} and ${b}` : `Keyed each block has duplicate key at indexes ${a} and ${b}`}
https://svelte.dev/e/each_key_duplicate`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/each_key_duplicate`);
  }
}
function each_key_volatile(index2, a, b) {
  if (dev_fallback_default) {
    const error = new Error(`each_key_volatile
Keyed each block has key that is not idempotent \u2014 the key for item at index ${index2} was \`${a}\` but is now \`${b}\`. Keys must be the same each time for a given item
https://svelte.dev/e/each_key_volatile`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/each_key_volatile`);
  }
}
function effect_in_teardown(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_teardown
\`${rune}\` cannot be used inside an effect cleanup function
https://svelte.dev/e/effect_in_teardown`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_teardown`);
  }
}
function effect_in_unowned_derived() {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_unowned_derived
Effect cannot be created inside a \`$derived\` value that was not itself created inside an effect
https://svelte.dev/e/effect_in_unowned_derived`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
  }
}
function effect_orphan(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_orphan
\`${rune}\` can only be used inside an effect (e.g. during component initialisation)
https://svelte.dev/e/effect_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_orphan`);
  }
}
function effect_update_depth_exceeded() {
  if (dev_fallback_default) {
    const error = new Error(`effect_update_depth_exceeded
Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state
https://svelte.dev/e/effect_update_depth_exceeded`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
  }
}
function hydration_failed() {
  if (dev_fallback_default) {
    const error = new Error(`hydration_failed
Failed to hydrate the application
https://svelte.dev/e/hydration_failed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/hydration_failed`);
  }
}
function invalid_snippet() {
  if (dev_fallback_default) {
    const error = new Error(`invalid_snippet
Could not \`{@render}\` snippet due to the expression being \`null\` or \`undefined\`. Consider using optional chaining \`{@render snippet?.()}\`
https://svelte.dev/e/invalid_snippet`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/invalid_snippet`);
  }
}
function props_invalid_value(key2) {
  if (dev_fallback_default) {
    const error = new Error(`props_invalid_value
Cannot do \`bind:${key2}={undefined}\` when \`${key2}\` has a fallback value
https://svelte.dev/e/props_invalid_value`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/props_invalid_value`);
  }
}
function rune_outside_svelte(rune) {
  if (dev_fallback_default) {
    const error = new Error(`rune_outside_svelte
The \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files
https://svelte.dev/e/rune_outside_svelte`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/rune_outside_svelte`);
  }
}
function state_descriptors_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_descriptors_fixed
Property descriptors defined on \`$state\` objects must contain \`value\` and always be \`enumerable\`, \`configurable\` and \`writable\`.
https://svelte.dev/e/state_descriptors_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
  }
}
function state_prototype_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_prototype_fixed
Cannot set prototype of \`$state\` object
https://svelte.dev/e/state_prototype_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
  }
}
function state_unsafe_mutation() {
  if (dev_fallback_default) {
    const error = new Error(`state_unsafe_mutation
Updating state inside \`$derived(...)\`, \`$inspect(...)\` or a template expression is forbidden. If the value should not be reactive, declare it without \`$state\`
https://svelte.dev/e/state_unsafe_mutation`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
  }
}
function svelte_boundary_reset_onerror() {
  if (dev_fallback_default) {
    const error = new Error(`svelte_boundary_reset_onerror
A \`<svelte:boundary>\` \`reset\` function cannot be called while an error is still being handled
https://svelte.dev/e/svelte_boundary_reset_onerror`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/flags/index.js
var async_mode_flag = false;
var legacy_mode_flag = false;
var tracing_mode_flag = false;

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dev/tracing.js
var tracing_expressions = null;
function tag(source2, label) {
  source2.label = label;
  tag_proxy(source2.v, label);
  return source2;
}
function tag_proxy(value, label) {
  value?.[PROXY_PATH_SYMBOL]?.(label);
  return value;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/shared/dev.js
function get_error(label) {
  const error = new Error();
  const stack2 = get_stack();
  if (stack2.length === 0) {
    return null;
  }
  stack2.unshift("\n");
  define_property(error, "stack", {
    value: stack2.join("\n"),
  });
  define_property(error, "name", {
    value: label,
  });
  return (
    /** @type {Error & { stack: string }} */
    error
  );
}
function get_stack() {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = Infinity;
  const stack2 = new Error().stack;
  Error.stackTraceLimit = limit;
  if (!stack2) return [];
  const lines = stack2.split("\n");
  const new_lines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const posixified = line.replaceAll("\\", "/");
    if (line.trim() === "Error") {
      continue;
    }
    if (line.includes("validate_each_keys")) {
      return [];
    }
    if (
      posixified.includes("svelte/src/internal") ||
      posixified.includes("node_modules/.vite")
    ) {
      continue;
    }
    new_lines.push(line);
  }
  return new_lines;
}
function invariant(condition, message) {
  if (!dev_fallback_default) {
    throw new Error("invariant(...) was not guarded by if (DEV)");
  }
  if (!condition) invariant_violation(message);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/context.js
var component_context = null;
function set_component_context(context) {
  component_context = context;
}
var dev_stack = null;
function set_dev_stack(stack2) {
  dev_stack = stack2;
}
var dev_current_component_function = null;
function set_dev_current_component_function(fn) {
  dev_current_component_function = fn;
}
function push(props, runes = false, fn) {
  component_context = {
    p: component_context,
    i: false,
    c: null,
    e: null,
    s: props,
    x: null,
    r:
      /** @type {Effect} */
      active_effect,
    l: legacy_mode_flag && !runes ? { s: null, u: null, $: [] } : null,
  };
  if (dev_fallback_default) {
    component_context.function = fn;
    dev_current_component_function = fn;
  }
}
function pop(component2) {
  var context =
    /** @type {ComponentContext} */
    component_context;
  var effects = context.e;
  if (effects !== null) {
    context.e = null;
    for (var fn of effects) {
      create_user_effect(fn);
    }
  }
  if (component2 !== void 0) {
    context.x = component2;
  }
  context.i = true;
  component_context = context.p;
  if (dev_fallback_default) {
    dev_current_component_function = component_context?.function ?? null;
  }
  return mark_as_component(component2);
}
function mark_as_component(component2 = {}) {
  define_property(component2, COMPONENT_SYMBOL, { value: true });
  return component2;
}
function is_runes() {
  return (
    !legacy_mode_flag ||
    (component_context !== null && component_context.l === null)
  );
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/task.js
var micro_tasks = [];
function run_micro_tasks() {
  var tasks = micro_tasks;
  micro_tasks = [];
  run_all(tasks);
}
function queue_micro_task(fn) {
  if (micro_tasks.length === 0 && !is_flushing_sync) {
    var tasks = micro_tasks;
    queueMicrotask(() => {
      if (tasks === micro_tasks) run_micro_tasks();
    });
  }
  micro_tasks.push(fn);
}
function flush_tasks() {
  while (micro_tasks.length > 0) {
    run_micro_tasks();
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/status.js
var STATUS_MASK = ~(DIRTY | MAYBE_DIRTY | CLEAN);
function set_signal_status(signal, status) {
  signal.f = (signal.f & STATUS_MASK) | status;
}
function update_derived_status(derived3) {
  if ((derived3.f & CONNECTED) !== 0 || derived3.deps === null) {
    set_signal_status(derived3, CLEAN);
  } else {
    set_signal_status(derived3, MAYBE_DIRTY);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/utils.js
function defer_effect(effect2, dirty_effects, maybe_dirty_effects) {
  if ((effect2.f & DIRTY) !== 0) {
    dirty_effects.add(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    maybe_dirty_effects.add(effect2);
  }
  set_signal_status(effect2, CLEAN);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/misc.js
function remove_textarea_child(dom) {
  if (hydrating && get_first_child(dom) !== null) {
    clear_text_content(dom);
  }
}
var listening_to_form_reset = false;
function add_form_reset_listener() {
  if (!listening_to_form_reset) {
    listening_to_form_reset = true;
    document.addEventListener(
      "reset",
      (evt) => {
        Promise.resolve().then(() => {
          if (!evt.defaultPrevented) {
            for (const e of /**@type {HTMLFormElement} */
            evt.target.elements) {
              e[FORM_RESET_HANDLER]?.();
            }
          }
        });
      },
      // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
      { capture: true },
    );
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function without_reactive_context(fn) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    return fn();
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/async.js
function flatten(blockers, sync, async2, fn) {
  const d = is_runes() ? derived : derived_safe_equal;
  var pending2 = blockers.filter((b) => !b.settled);
  var deriveds = sync.map(d);
  if (dev_fallback_default) {
    deriveds.forEach((d2, i) => {
      d2.label = sync[i]
        .toString()
        .replace("() => ", "")
        .replaceAll("$.eager(() => ", "$state.eager(")
        .replace(/\$\.get\((.+?)\)/g, (_, id) => id);
    });
  }
  if (async2.length === 0 && pending2.length === 0) {
    fn(deriveds);
    return;
  }
  var parent =
    /** @type {Effect} */
    active_effect;
  var restore = capture();
  var blocker_promise =
    pending2.length === 1
      ? pending2[0].promise
      : pending2.length > 1
        ? Promise.all(pending2.map((b) => b.promise))
        : null;
  function finish(async3) {
    if ((parent.f & DESTROYED) !== 0) {
      return;
    }
    restore();
    try {
      fn([...deriveds, ...async3]);
    } catch (error) {
      invoke_error_boundary(error, parent);
    }
    unset_context();
  }
  var decrement_pending = increment_pending();
  if (async2.length === 0) {
    blocker_promise.then(() => finish([])).finally(decrement_pending);
    return;
  }
  function run3() {
    Promise.all(async2.map((expression) => async_derived(expression)))
      .then(finish)
      .catch((error) => invoke_error_boundary(error, parent))
      .finally(decrement_pending);
  }
  if (blocker_promise) {
    blocker_promise.then(() => {
      if ((parent.f & DESTROYED) !== 0) {
        decrement_pending();
        return;
      }
      restore();
      run3();
      unset_context();
    });
  } else {
    run3();
  }
}
function capture() {
  var previous_effect =
    /** @type {Effect} */
    active_effect;
  var previous_reaction = active_reaction;
  var previous_component_context = component_context;
  var previous_batch2 =
    /** @type {Batch} */
    current_batch;
  if (dev_fallback_default) {
    var previous_dev_stack = dev_stack;
  }
  return function restore(activate_batch = true) {
    set_active_effect(previous_effect);
    set_active_reaction(previous_reaction);
    set_component_context(previous_component_context);
    if (activate_batch && (previous_effect.f & DESTROYED) === 0) {
      previous_batch2?.activate();
      previous_batch2?.apply();
    }
    if (dev_fallback_default) {
      set_reactivity_loss_tracker(null);
      set_dev_stack(previous_dev_stack);
    }
  };
}
var restored = false;
function unset_context(deactivate_batch = true) {
  restored = false;
  set_active_effect(null);
  set_active_reaction(null);
  set_component_context(null);
  if (deactivate_batch) current_batch?.deactivate();
  if (dev_fallback_default) {
    set_reactivity_loss_tracker(null);
    set_dev_stack(null);
  }
}
function increment_pending() {
  var effect2 =
    /** @type {Effect} */
    active_effect;
  var boundary2 = effect2.b;
  var batch =
    /** @type {Batch} */
    current_batch;
  var blocking = !!boundary2?.is_rendered();
  boundary2?.update_pending_count(1, batch);
  batch.increment(blocking, effect2);
  return () => {
    boundary2?.update_pending_count(-1, batch);
    batch.decrement(blocking, effect2);
  };
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/deriveds.js
var reactivity_loss_tracker = null;
function set_reactivity_loss_tracker(v) {
  reactivity_loss_tracker = v;
}
var recent_async_deriveds = /* @__PURE__ */ new Set();
// @__NO_SIDE_EFFECTS__
function derived(fn) {
  var flags2 = DERIVED | DIRTY;
  if (active_effect !== null) {
    active_effect.f |= EFFECT_PRESERVED;
  }
  const signal = {
    ctx: component_context,
    deps: null,
    effects: null,
    equals,
    f: flags2,
    fn,
    reactions: null,
    rv: 0,
    v:
      /** @type {V} */
      UNINITIALIZED,
    wv: 0,
    parent: active_effect,
    ac: null,
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = get_error("created at");
  }
  return signal;
}
var OBSOLETE = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function async_derived(fn, label, location2) {
  let parent =
    /** @type {Effect | null} */
    active_effect;
  if (parent === null) {
    async_derived_orphan();
  }
  var promise =
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0;
  var signal = source(
    /** @type {V} */
    UNINITIALIZED,
  );
  if (dev_fallback_default) signal.label = label ?? fn.toString();
  var should_suspend = !active_reaction;
  var deferreds = /* @__PURE__ */ new Set();
  async_effect(() => {
    var effect2 =
      /** @type {Effect} */
      active_effect;
    if (dev_fallback_default) {
      reactivity_loss_tracker = {
        effect: effect2,
        effect_deps: /* @__PURE__ */ new Set(),
        warned: false,
      };
    }
    var d = deferred();
    promise = d.promise;
    try {
      Promise.resolve(fn())
        .then(d.resolve, (e) => {
          if (e !== STALE_REACTION) d.reject(e);
        })
        .finally(unset_context);
    } catch (error) {
      d.reject(error);
      unset_context();
    }
    if (dev_fallback_default) {
      if (reactivity_loss_tracker) {
        if (effect2.deps !== null) {
          for (let i = 0; i < skipped_deps; i += 1) {
            reactivity_loss_tracker.effect_deps.add(effect2.deps[i]);
          }
        }
        if (new_deps !== null) {
          for (let i = 0; i < new_deps.length; i += 1) {
            reactivity_loss_tracker.effect_deps.add(new_deps[i]);
          }
        }
      }
      reactivity_loss_tracker = null;
    }
    var batch =
      /** @type {Batch} */
      current_batch;
    if (should_suspend) {
      if ((effect2.f & REACTION_RAN) !== 0) {
        var decrement_pending = increment_pending();
      }
      if (
        // boundary can be null if the async derived is inside an $effect.root not connected to the component render tree
        parent.b?.is_rendered()
      ) {
        batch.async_deriveds.get(effect2)?.reject(OBSOLETE);
      } else {
        for (const d2 of deferreds.values()) {
          d2.reject(OBSOLETE);
        }
      }
      deferreds.add(d);
      batch.async_deriveds.set(effect2, d);
    }
    const handler = (value, error = void 0) => {
      if (dev_fallback_default) {
        reactivity_loss_tracker = null;
      }
      decrement_pending?.();
      deferreds.delete(d);
      if (error === OBSOLETE) return;
      batch.activate();
      if (error) {
        signal.f |= ERROR_VALUE;
        internal_set(signal, error);
      } else {
        if ((signal.f & ERROR_VALUE) !== 0) {
          signal.f ^= ERROR_VALUE;
        }
        if (
          dev_fallback_default &&
          location2 !== void 0 &&
          !signal.equals(value)
        ) {
          recent_async_deriveds.add(signal);
          setTimeout(() => {
            if (
              recent_async_deriveds.has(signal) &&
              (effect2.f & DESTROYED) === 0
            ) {
              await_waterfall(
                /** @type {string} */
                signal.label,
                location2,
              );
              recent_async_deriveds.delete(signal);
            }
          });
        }
        internal_set(signal, value);
      }
      batch.deactivate();
    };
    d.promise.then(handler, (e) => handler(null, e || "unknown"));
  });
  teardown(() => {
    for (const d of deferreds) {
      d.reject(OBSOLETE);
    }
  });
  if (dev_fallback_default) {
    signal.f |= ASYNC;
  }
  return new Promise((fulfil) => {
    function next2(p) {
      function go() {
        if (p === promise) {
          fulfil(signal);
        } else {
          next2(promise);
        }
      }
      p.then(go, go);
    }
    next2(promise);
  });
}
// @__NO_SIDE_EFFECTS__
function user_derived(fn) {
  const d = /* @__PURE__ */ derived(fn);
  if (!async_mode_flag) push_reaction_value(d);
  return d;
}
// @__NO_SIDE_EFFECTS__
function derived_safe_equal(fn) {
  const signal = /* @__PURE__ */ derived(fn);
  signal.equals = safe_equals;
  return signal;
}
function destroy_derived_effects(derived3) {
  var effects = derived3.effects;
  if (effects !== null) {
    derived3.effects = null;
    for (var i = 0; i < effects.length; i += 1) {
      destroy_effect(
        /** @type {Effect} */
        effects[i],
      );
    }
  }
}
var stack = [];
function execute_derived(derived3) {
  var value;
  var prev_active_effect = active_effect;
  var parent = derived3.parent;
  if (
    !is_destroying_effect &&
    parent !== null &&
    derived3.v !== UNINITIALIZED && // if it was never evaluated before, it's guaranteed to fail downstream, so we try to execute instead
    (parent.f & (DESTROYED | INERT)) !== 0
  ) {
    derived_inert();
    return derived3.v;
  }
  set_active_effect(parent);
  if (dev_fallback_default) {
    let prev_eager_effects = eager_effects;
    set_eager_effects(/* @__PURE__ */ new Set());
    try {
      if (includes.call(stack, derived3)) {
        derived_references_self();
      }
      stack.push(derived3);
      destroy_derived_effects(derived3);
      value = update_reaction(derived3);
    } finally {
      set_active_effect(prev_active_effect);
      set_eager_effects(prev_eager_effects);
      stack.pop();
    }
  } else {
    try {
      destroy_derived_effects(derived3);
      value = update_reaction(derived3);
    } finally {
      set_active_effect(prev_active_effect);
    }
  }
  return value;
}
function update_derived(derived3) {
  var value = execute_derived(derived3);
  if (!derived3.equals(value)) {
    derived3.wv = increment_write_version();
    if (!current_batch?.is_fork || derived3.deps === null) {
      if (current_batch !== null) {
        current_batch.capture(derived3, value, true);
        previous_batch?.capture(derived3, value, true);
      } else {
        derived3.v = value;
      }
      if (derived3.deps === null) {
        set_signal_status(derived3, CLEAN);
        return;
      }
    }
  }
  if (is_destroying_effect) {
    return;
  }
  if (batch_values !== null) {
    if (effect_tracking() || current_batch?.is_fork) {
      batch_values.set(derived3, value);
    }
  } else {
    update_derived_status(derived3);
  }
}
function freeze_derived_effects(derived3) {
  if (derived3.effects === null) return;
  for (const e of derived3.effects) {
    if (e.teardown || e.ac) {
      e.teardown?.();
      if (e.ac !== null) {
        without_reactive_context(() => {
          e.ac.abort(STALE_REACTION);
          e.ac = null;
        });
      }
      if (e.fn !== null) e.teardown = noop;
      remove_reactions(e, 0);
      destroy_effect_children(e);
    }
  }
}
function unfreeze_derived_effects(derived3) {
  if (derived3.effects === null) return;
  for (const e of derived3.effects) {
    if (e.teardown && e.fn !== null) {
      update_effect(e);
    }
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/batch.js
var first_batch = null;
var last_batch = null;
var current_batch = null;
var previous_batch = null;
var batch_values = null;
var last_scheduled_effect = null;
var is_flushing_sync = false;
var is_processing = false;
var collected_effects = null;
var legacy_updates = null;
var flush_count = 0;
var source_stacks = /* @__PURE__ */ new Set();
var uid = 1;
var Batch = class _Batch {
  id = uid++;
  /** True as soon as `#process` was called */
  #started = false;
  linked = true;
  /** @type {Batch | null} */
  #prev = null;
  /** @type {Batch | null} */
  #next = null;
  /** @type {Map<Effect, ReturnType<typeof deferred<any>>>} */
  async_deriveds = /* @__PURE__ */ new Map();
  /**
   * The current values of any signals that are updated in this batch.
   * Tuple format: [value, is_derived] (note: is_derived is false for deriveds, too, if they were overridden via assignment)
   * They keys of this map are identical to `this.#previous`
   * @type {Map<Value, [any, boolean]>}
   */
  current = /* @__PURE__ */ new Map();
  /**
   * The values of any signals (sources and deriveds) that are updated in this batch _before_ those updates took place.
   * They keys of this map are identical to `this.#current`
   * @type {Map<Value, any>}
   */
  previous = /* @__PURE__ */ new Map();
  /**
   * When the batch is committed (and the DOM is updated), we need to remove old branches
   * and append new ones by calling the functions added inside (if/each/key/etc) blocks
   * @type {Set<(batch: Batch) => void>}
   */
  #commit_callbacks = /* @__PURE__ */ new Set();
  /**
   * If a fork is discarded, we need to destroy any effects that are no longer needed
   * @type {Set<(batch: Batch) => void>}
   */
  #discard_callbacks = /* @__PURE__ */ new Set();
  /**
   * The number of async effects that are currently in flight
   */
  #pending = 0;
  /**
   * Async effects that are currently in flight, _not_ inside a pending boundary
   * @type {Map<Effect, number>}
   */
  #blocking_pending = /* @__PURE__ */ new Map();
  /**
   * A deferred that resolves when the batch is committed, used with `settled()`
   * TODO replace with Promise.withResolvers once supported widely enough
   * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
   */
  #deferred = null;
  /**
   * Effects that were scheduled in this batch but not yet 'resolved' into the
   * root effects that need to be flushed. Resolving — the upwards traversal that
   * marks the path to each effect on the shared effect tree (see #resolve) — is
   * deferred until the batch is processed, so that the markers are created and
   * consumed within a single traversal. Scheduling into other batches (which can
   * happen concurrently, e.g. while a batch is committed) can therefore never
   * observe (and be confused by) this batch's markers.
   * May contain duplicates — deduplication happens during resolving
   * @type {Effect[]}
   */
  #scheduled = [];
  /**
   * Effects created while this batch was active.
   * @type {Effect[]}
   */
  #new_effects = [];
  /**
   * Deferred effects (which run after async work has completed) that are DIRTY
   * @type {Set<Effect>}
   */
  #dirty_effects = /* @__PURE__ */ new Set();
  /**
   * Deferred effects that are MAYBE_DIRTY
   * @type {Set<Effect>}
   */
  #maybe_dirty_effects = /* @__PURE__ */ new Set();
  /**
   * A map of branches that still exist, but will be destroyed when this batch
   * is committed — we skip over these during `process`.
   * The value contains child effects that were dirty/maybe_dirty before being reset,
   * so they can be rescheduled if the branch survives.
   * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
   */
  #skipped_branches = /* @__PURE__ */ new Map();
  /**
   * Inverse of #skipped_branches which we need to tell prior batches to unskip them when committing
   * @type {Set<Effect>}
   */
  #unskipped_branches = /* @__PURE__ */ new Set();
  is_fork = false;
  #decrement_queued = false;
  constructor() {
    if (last_batch === null) {
      first_batch = last_batch = this;
    } else {
      last_batch.#next = this;
      this.#prev = last_batch;
    }
    last_batch = this;
  }
  #is_deferred() {
    if (this.is_fork) return true;
    for (const effect2 of this.#blocking_pending.keys()) {
      var e = effect2;
      var skipped = false;
      while (e.parent !== null) {
        if (this.#skipped_branches.has(e)) {
          skipped = true;
          break;
        }
        e = e.parent;
      }
      if (!skipped) {
        return true;
      }
    }
    return false;
  }
  /**
   * Add an effect to the #skipped_branches map and reset its children
   * @param {Effect} effect
   */
  skip_effect(effect2) {
    if (!this.#skipped_branches.has(effect2)) {
      this.#skipped_branches.set(effect2, { d: [], m: [] });
    }
    this.#unskipped_branches.delete(effect2);
  }
  /**
   * Remove an effect from the #skipped_branches map and reschedule
   * any tracked dirty/maybe_dirty child effects
   * @param {Effect} effect
   * @param {(e: Effect) => void} callback
   */
  unskip_effect(effect2, callback = (e) => this.schedule(e)) {
    var tracked = this.#skipped_branches.get(effect2);
    if (tracked) {
      this.#skipped_branches.delete(effect2);
      for (var e of tracked.d) {
        set_signal_status(e, DIRTY);
        callback(e);
      }
      for (e of tracked.m) {
        set_signal_status(e, MAYBE_DIRTY);
        callback(e);
      }
    }
    this.#unskipped_branches.add(effect2);
  }
  /**
   * Convert the effects that were scheduled in this batch into the root effects
   * that need to be traversed, marking the path to each effect (by clearing the
   * `CLEAN` flag on ancestor branches) so that the traversal can find them.
   * This happens right before traversal rather than at scheduling time, so that
   * the markers left on the (shared) effect tree are created and consumed within
   * a single traversal — scheduling into other batches can never observe them
   * @returns {Effect[]}
   */
  #resolve() {
    var roots = [];
    for (const effect2 of this.#scheduled) {
      if (
        (effect2.f & DESTROYED) !== 0 ||
        (effect2.f & (DIRTY | MAYBE_DIRTY)) === 0
      )
        continue;
      var e = effect2;
      var covered = false;
      while (e.parent !== null) {
        e = e.parent;
        var flags2 = e.f;
        if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
          if ((flags2 & CLEAN) === 0) {
            covered = true;
            break;
          }
          e.f ^= CLEAN;
        }
      }
      if (!covered) {
        roots.push(e);
      }
    }
    this.#scheduled = [];
    return roots;
  }
  #process() {
    this.#started = true;
    if (dev_fallback_default) {
      for (const value of this.current.keys()) {
        source_stacks.add(value);
      }
    }
    for (const e of this.#dirty_effects) {
      this.#maybe_dirty_effects.delete(e);
      set_signal_status(e, DIRTY);
      this.schedule(e);
    }
    for (const e of this.#maybe_dirty_effects) {
      set_signal_status(e, MAYBE_DIRTY);
      this.schedule(e);
    }
    this.apply();
    var effects = (collected_effects = []);
    var render_effects = [];
    var updates = (legacy_updates = []);
    while (this.#scheduled.length > 0) {
      if (flush_count++ > 1e3) {
        this.#unlink();
        infinite_loop_guard();
      }
      for (const root28 of this.#resolve()) {
        try {
          this.#traverse(root28, effects, render_effects);
        } catch (e) {
          reset_all(root28);
          if (!this.#is_deferred()) this.discard();
          throw e;
        }
      }
    }
    current_batch = null;
    if (updates.length > 0) {
      var batch = _Batch.ensure();
      for (const e of updates) {
        batch.schedule(e);
      }
    }
    collected_effects = null;
    legacy_updates = null;
    if (this.#is_deferred()) {
      this.#defer_effects(render_effects);
      this.#defer_effects(effects);
      for (const [e, t] of this.#skipped_branches) {
        reset_branch(e, t);
      }
      if (updates.length > 0) {
        /** @type {unknown} */
        current_batch.#process();
      }
      return;
    }
    const earlier_batch = this.#find_earlier_batch();
    if (earlier_batch) {
      this.#defer_effects(render_effects);
      this.#defer_effects(effects);
      earlier_batch.#merge(this);
      return;
    }
    this.#dirty_effects.clear();
    this.#maybe_dirty_effects.clear();
    for (const fn of this.#commit_callbacks) fn(this);
    this.#commit_callbacks.clear();
    previous_batch = this;
    flush_queued_effects(render_effects);
    flush_queued_effects(effects);
    previous_batch = null;
    this.#deferred?.resolve();
    var next_batch =
      /** @type {Batch | null} */
      /** @type {unknown} */
      current_batch;
    if (
      this.#pending === 0 &&
      (this.#scheduled.length === 0 || next_batch !== null)
    ) {
      this.#unlink();
      if (async_mode_flag) {
        this.#commit();
        current_batch = next_batch;
      }
    }
    if (this.#scheduled.length > 0) {
      if (next_batch !== null) {
        for (const e of this.#scheduled) {
          next_batch.#scheduled.push(e);
        }
        this.#scheduled = [];
      } else {
        next_batch = this;
      }
    }
    if (next_batch !== null) {
      old_values.clear();
      next_batch.#process();
    }
  }
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   * @param {Effect[]} effects
   * @param {Effect[]} render_effects
   */
  #traverse(root28, effects, render_effects) {
    root28.f ^= CLEAN;
    var effect2 = root28.first;
    while (effect2 !== null) {
      var flags2 = effect2.f;
      var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
      var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
      var skip =
        is_skippable_branch ||
        (flags2 & INERT) !== 0 ||
        this.#skipped_branches.has(effect2);
      if (!skip && effect2.fn !== null) {
        if (is_branch) {
          effect2.f ^= CLEAN;
        } else if ((flags2 & EFFECT) !== 0) {
          effects.push(effect2);
        } else if (
          async_mode_flag &&
          (flags2 & (RENDER_EFFECT | MANAGED_EFFECT)) !== 0
        ) {
          render_effects.push(effect2);
        } else if (is_dirty(effect2)) {
          if ((flags2 & BLOCK_EFFECT) !== 0)
            this.#maybe_dirty_effects.add(effect2);
          update_effect(effect2);
        }
        var child2 = effect2.first;
        if (child2 !== null) {
          effect2 = child2;
          continue;
        }
      }
      while (effect2 !== null) {
        var next2 = effect2.next;
        if (next2 !== null) {
          effect2 = next2;
          break;
        }
        effect2 = effect2.parent;
      }
    }
  }
  #find_earlier_batch() {
    var batch = this.#prev;
    while (batch !== null) {
      if (!batch.is_fork) {
        for (const [value, [, is_derived]] of this.current) {
          if (batch.current.has(value) && !is_derived) {
            return batch;
          }
        }
      }
      batch = batch.#prev;
    }
    return null;
  }
  /**
   * @param {Batch} batch
   */
  #merge(batch) {
    for (const [source2, value] of batch.current) {
      if (!this.previous.has(source2) && batch.previous.has(source2)) {
        this.previous.set(source2, batch.previous.get(source2));
      }
      this.current.set(source2, value);
    }
    for (const [effect2, deferred2] of batch.async_deriveds) {
      const d = this.async_deriveds.get(effect2);
      if (d) deferred2.promise.then(d.resolve).catch(d.reject);
    }
    batch.async_deriveds.clear();
    this.transfer_effects(batch.#dirty_effects, batch.#maybe_dirty_effects);
    const mark = (value) => {
      var reactions = value.reactions;
      if (reactions === null) return;
      if (
        (value.f & DERIVED) !== 0 &&
        (value.f & (DIRTY | MAYBE_DIRTY)) === 0
      ) {
        return;
      }
      for (const reaction of reactions) {
        var flags2 = reaction.f;
        if ((flags2 & DERIVED) !== 0) {
          mark(
            /** @type {Derived} */
            reaction,
          );
        } else {
          var effect2 =
            /** @type {Effect} */
            reaction;
          if (
            flags2 & (ASYNC | BLOCK_EFFECT) &&
            !this.async_deriveds.has(effect2)
          ) {
            this.#maybe_dirty_effects.delete(effect2);
            set_signal_status(effect2, DIRTY);
            this.schedule(effect2);
          }
        }
      }
    };
    for (const source2 of this.current.keys()) {
      mark(source2);
    }
    this.oncommit(() => batch.discard());
    batch.#unlink();
    current_batch = this;
    this.#process();
  }
  /**
   * @param {Effect[]} effects
   */
  #defer_effects(effects) {
    for (var i = 0; i < effects.length; i += 1) {
      defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects);
    }
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Value} source
   * @param {any} value
   * @param {boolean} [is_derived]
   */
  capture(source2, value, is_derived = false) {
    if (source2.v !== UNINITIALIZED && !this.previous.has(source2)) {
      this.previous.set(source2, source2.v);
    }
    if ((source2.f & ERROR_VALUE) === 0) {
      this.current.set(source2, [value, is_derived]);
      batch_values?.set(source2, value);
    }
    if (!this.is_fork) {
      source2.v = value;
    }
  }
  activate() {
    current_batch = this;
  }
  deactivate() {
    current_batch = null;
    batch_values = null;
  }
  flush() {
    try {
      if (dev_fallback_default) {
        source_stacks.clear();
      }
      is_processing = true;
      current_batch = this;
      this.#process();
    } finally {
      flush_count = 0;
      last_scheduled_effect = null;
      collected_effects = null;
      legacy_updates = null;
      is_processing = false;
      current_batch = null;
      batch_values = null;
      old_values.clear();
      if (dev_fallback_default) {
        for (const source2 of source_stacks) {
          source2.updated = null;
        }
      }
    }
  }
  discard() {
    for (const fn of this.#discard_callbacks) fn(this);
    this.#discard_callbacks.clear();
    for (const deferred2 of this.async_deriveds.values()) {
      deferred2.reject(OBSOLETE);
    }
    this.#unlink();
    this.#deferred?.resolve();
  }
  /**
   * @param {Effect} effect
   */
  register_created_effect(effect2) {
    this.#new_effects.push(effect2);
  }
  #commit() {
    for (let batch = first_batch; batch !== null; batch = batch.#next) {
      var is_earlier = batch.id < this.id;
      var sources = [];
      for (const [source3, [value, is_derived]] of this.current) {
        if (batch.current.has(source3)) {
          var batch_value =
            /** @type {[any, boolean]} */
            batch.current.get(source3)[0];
          if (is_earlier && value !== batch_value) {
            batch.current.set(source3, [value, is_derived]);
          } else {
            continue;
          }
        }
        sources.push(source3);
      }
      if (is_earlier) {
        for (const [effect2, deferred2] of this.async_deriveds) {
          const d = batch.async_deriveds.get(effect2);
          if (d) deferred2.promise.then(d.resolve).catch(d.reject);
        }
      }
      var current = [...batch.current.keys()].filter(
        (source3) =>
          !(/** @type {[any, boolean]} */ batch.current.get(source3)[1]),
      );
      if (!batch.#started || current.length === 0) continue;
      var others = current.filter((source3) => !this.current.has(source3));
      if (others.length === 0) {
        if (is_earlier) {
          batch.discard();
        }
      } else if (sources.length > 0) {
        if (dev_fallback_default && !batch.#decrement_queued) {
          invariant(
            batch.#scheduled.length === 0,
            "Batch has scheduled effects",
          );
        }
        if (is_earlier) {
          for (const unskipped of this.#unskipped_branches) {
            batch.unskip_effect(unskipped, (e) => {
              if ((e.f & (BLOCK_EFFECT | ASYNC)) !== 0) {
                batch.schedule(e);
              } else {
                batch.#defer_effects([e]);
              }
            });
          }
        }
        batch.activate();
        var marked = /* @__PURE__ */ new Set();
        var checked = /* @__PURE__ */ new Map();
        for (var source2 of sources) {
          mark_effects(source2, others, marked, checked);
        }
        checked = /* @__PURE__ */ new Map();
        var current_unequal = [...batch.current]
          .filter(([c, v1]) => {
            const v2 = this.current.get(c);
            if (!v2) return true;
            return v2[0] !== v1[0] || v2[1] !== v1[1];
          })
          .map(([c]) => c);
        if (current_unequal.length > 0) {
          for (const effect2 of this.#new_effects) {
            if (
              (effect2.f & (DESTROYED | INERT | EAGER_EFFECT)) === 0 &&
              depends_on(effect2, current_unequal, checked)
            ) {
              if ((effect2.f & (ASYNC | BLOCK_EFFECT)) !== 0) {
                set_signal_status(effect2, DIRTY);
                batch.schedule(effect2);
              } else {
                batch.#dirty_effects.add(effect2);
              }
            }
          }
        }
        if (batch.#scheduled.length > 0 && !batch.#decrement_queued) {
          batch.apply();
          for (var root28 of batch.#resolve()) {
            batch.#traverse(root28, [], []);
          }
        }
        batch.deactivate();
      }
    }
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  increment(blocking, effect2) {
    this.#pending += 1;
    if (blocking) {
      let blocking_pending_count = this.#blocking_pending.get(effect2) ?? 0;
      this.#blocking_pending.set(effect2, blocking_pending_count + 1);
    }
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  decrement(blocking, effect2) {
    this.#pending -= 1;
    if (blocking) {
      let blocking_pending_count = this.#blocking_pending.get(effect2) ?? 0;
      if (blocking_pending_count === 1) {
        this.#blocking_pending.delete(effect2);
      } else {
        this.#blocking_pending.set(effect2, blocking_pending_count - 1);
      }
    }
    if (this.#decrement_queued) return;
    this.#decrement_queued = true;
    queue_micro_task(() => {
      this.#decrement_queued = false;
      if (this.linked) {
        this.flush();
      }
    });
  }
  /**
   * @param {Set<Effect>} dirty_effects
   * @param {Set<Effect>} maybe_dirty_effects
   */
  transfer_effects(dirty_effects, maybe_dirty_effects) {
    for (const e of dirty_effects) {
      this.#dirty_effects.add(e);
    }
    for (const e of maybe_dirty_effects) {
      this.#maybe_dirty_effects.add(e);
    }
    dirty_effects.clear();
    maybe_dirty_effects.clear();
  }
  /** @param {(batch: Batch) => void} fn */
  oncommit(fn) {
    this.#commit_callbacks.add(fn);
  }
  /** @param {(batch: Batch) => void} fn */
  ondiscard(fn) {
    this.#discard_callbacks.add(fn);
  }
  settled() {
    return (this.#deferred ??= deferred()).promise;
  }
  static ensure() {
    if (current_batch === null) {
      const batch = (current_batch = new _Batch());
      if (!is_processing && !is_flushing_sync) {
        queue_micro_task(() => {
          if (!batch.#started) {
            batch.flush();
          }
        });
      }
    }
    return current_batch;
  }
  apply() {
    if (
      !async_mode_flag ||
      (!this.is_fork && this.#prev === null && this.#next === null)
    ) {
      batch_values = null;
      return;
    }
    batch_values = /* @__PURE__ */ new Map();
    for (const [source2, [value]] of this.current) {
      batch_values.set(source2, value);
    }
    for (let batch = first_batch; batch !== null; batch = batch.#next) {
      if (batch === this || batch.is_fork) continue;
      var intersects = false;
      if (batch.id < this.id) {
        for (const [source2, [, is_derived]] of batch.current) {
          if (is_derived) continue;
          if (this.current.has(source2)) {
            intersects = true;
            break;
          }
        }
      }
      if (!intersects) {
        for (const [source2, previous] of batch.previous) {
          if (!batch_values.has(source2)) {
            batch_values.set(source2, previous);
          }
        }
      }
    }
  }
  /**
   *
   * @param {Effect} effect
   */
  schedule(effect2) {
    last_scheduled_effect = effect2;
    if (
      effect2.b?.is_pending &&
      (effect2.f & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0 &&
      (effect2.f & REACTION_RAN) === 0
    ) {
      effect2.b.defer_effect(effect2);
      return;
    }
    this.#scheduled.push(effect2);
  }
  #unlink() {
    if (!this.linked) return;
    var prev = this.#prev;
    var next2 = this.#next;
    if (prev === null) {
      first_batch = next2;
    } else {
      prev.#next = next2;
    }
    if (next2 === null) {
      last_batch = prev;
    } else {
      next2.#prev = prev;
    }
    this.linked = false;
  }
};
function flushSync(fn) {
  var was_flushing_sync = is_flushing_sync;
  var prev_previous_batch = previous_batch;
  previous_batch = null;
  is_flushing_sync = true;
  try {
    var result;
    if (fn) {
      flushSync();
      result = fn();
    }
    while (true) {
      flush_tasks();
      if (current_batch === null) {
        return (
          /** @type {T} */
          result
        );
      }
      current_batch.flush();
    }
  } finally {
    is_flushing_sync = was_flushing_sync;
    previous_batch = prev_previous_batch;
  }
}
function infinite_loop_guard() {
  if (dev_fallback_default) {
    var updates = /* @__PURE__ */ new Map();
    for (const source2 of /** @type {Batch} */
    current_batch.current.keys()) {
      for (const [stack2, update2] of source2.updated ?? []) {
        var entry = updates.get(stack2);
        if (!entry) {
          entry = { error: update2.error, count: 0 };
          updates.set(stack2, entry);
        }
        entry.count += update2.count;
      }
    }
    for (const update2 of updates.values()) {
      if (update2.error) {
        console.error(update2.error);
      }
    }
  }
  try {
    effect_update_depth_exceeded();
  } catch (error) {
    if (dev_fallback_default) {
      define_property(error, "stack", { value: "" });
    }
    invoke_error_boundary(error, last_scheduled_effect);
  }
}
var eager_block_effects = null;
function flush_queued_effects(effects) {
  var length = effects.length;
  if (length === 0) return;
  var i = 0;
  while (i < length) {
    var effect2 = effects[i++];
    if ((effect2.f & (DESTROYED | INERT)) === 0 && is_dirty(effect2)) {
      eager_block_effects = /* @__PURE__ */ new Set();
      update_effect(effect2);
      if (
        effect2.deps === null &&
        effect2.first === null &&
        effect2.nodes === null &&
        effect2.teardown === null &&
        effect2.ac === null
      ) {
        unlink_effect(effect2);
      }
      if (eager_block_effects?.size > 0) {
        old_values.clear();
        for (const e of eager_block_effects) {
          if ((e.f & (DESTROYED | INERT)) !== 0) continue;
          const ordered_effects = [e];
          let ancestor = e.parent;
          while (ancestor !== null) {
            if (eager_block_effects.has(ancestor)) {
              eager_block_effects.delete(ancestor);
              ordered_effects.push(ancestor);
            }
            ancestor = ancestor.parent;
          }
          for (let j = ordered_effects.length - 1; j >= 0; j--) {
            const e2 = ordered_effects[j];
            if ((e2.f & (DESTROYED | INERT)) !== 0) continue;
            update_effect(e2);
          }
        }
        eager_block_effects.clear();
      }
    }
  }
  eager_block_effects = null;
}
function mark_effects(value, sources, marked, checked) {
  if (marked.has(value)) return;
  marked.add(value);
  if (value.reactions !== null) {
    for (const reaction of value.reactions) {
      const flags2 = reaction.f;
      if ((flags2 & DERIVED) !== 0) {
        mark_effects(
          /** @type {Derived} */
          reaction,
          sources,
          marked,
          checked,
        );
      } else if (
        (flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 &&
        (flags2 & DIRTY) === 0 &&
        depends_on(reaction, sources, checked)
      ) {
        set_signal_status(reaction, DIRTY);
        schedule_effect(
          /** @type {Effect} */
          reaction,
        );
      }
    }
  }
}
function depends_on(reaction, sources, checked) {
  const depends = checked.get(reaction);
  if (depends !== void 0) return depends;
  if (reaction.deps !== null) {
    for (const dep of reaction.deps) {
      if (includes.call(sources, dep)) {
        return true;
      }
      if (
        (dep.f & DERIVED) !== 0 &&
        depends_on(
          /** @type {Derived} */
          dep,
          sources,
          checked,
        )
      ) {
        checked.set(
          /** @type {Derived} */
          dep,
          true,
        );
        return true;
      }
    }
  }
  checked.set(reaction, false);
  return false;
}
function schedule_effect(effect2) {
  current_batch.schedule(effect2);
}
function reset_branch(effect2, tracked) {
  if ((effect2.f & BRANCH_EFFECT) !== 0 && (effect2.f & CLEAN) !== 0) {
    return;
  }
  if ((effect2.f & DIRTY) !== 0) {
    tracked.d.push(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    tracked.m.push(effect2);
  }
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_branch(e, tracked);
    e = e.next;
  }
}
function reset_all(effect2) {
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_all(e);
    e = e.next;
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/sources.js
var eager_effects = /* @__PURE__ */ new Set();
var old_values = /* @__PURE__ */ new Map();
function set_eager_effects(v) {
  eager_effects = v;
}
var eager_effects_deferred = false;
function set_eager_effects_deferred() {
  eager_effects_deferred = true;
}
function source(v, stack2) {
  var signal = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v,
    reactions: null,
    equals,
    rv: 0,
    wv: 0,
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = stack2 ?? get_error("created at");
    signal.updated = null;
    signal.set_during_effect = false;
    signal.trace = null;
  }
  return signal;
}
// @__NO_SIDE_EFFECTS__
function state(v, stack2) {
  const s = source(v, stack2);
  push_reaction_value(s);
  return s;
}
// @__NO_SIDE_EFFECTS__
function mutable_source(initial_value, immutable = false, trackable = true) {
  const s = source(initial_value);
  if (!immutable) {
    s.equals = safe_equals;
  }
  if (
    legacy_mode_flag &&
    trackable &&
    component_context !== null &&
    component_context.l !== null
  ) {
    (component_context.l.s ??= []).push(s);
  }
  return s;
}
function set2(source2, value, should_proxy = false) {
  if (
    active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
    // to ensure we error if state is set inside an inspect effect
    (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) &&
    is_runes() &&
    (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !==
      0 &&
    (current_sources === null || !current_sources.has(source2))
  ) {
    state_unsafe_mutation();
  }
  let new_value = should_proxy ? proxy(value) : value;
  if (dev_fallback_default) {
    tag_proxy(
      new_value,
      /** @type {string} */
      source2.label,
    );
  }
  return internal_set(source2, new_value, legacy_updates);
}
var seen = null;
var count_deps = 0;
function internal_set(source2, value, updated_during_traversal = null) {
  if (!source2.equals(value)) {
    if (is_destroying_effect) {
      old_values.set(source2, value);
    } else if (!old_values.has(source2)) {
      old_values.set(source2, source2.v);
    }
    var batch = Batch.ensure();
    batch.capture(source2, value);
    if (dev_fallback_default) {
      if (tracing_mode_flag || active_effect !== null) {
        source2.updated ??= /* @__PURE__ */ new Map();
        const count = (source2.updated.get("")?.count ?? 0) + 1;
        source2.updated.set("", {
          error:
            /** @type {any} */
            null,
          count,
        });
        if (tracing_mode_flag || count > 5) {
          const error = get_error("updated at");
          if (error !== null) {
            let entry = source2.updated.get(error.stack);
            if (!entry) {
              entry = { error, count: 0 };
              source2.updated.set(error.stack, entry);
            }
            entry.count++;
          }
        }
      }
      if (active_effect !== null) {
        source2.set_during_effect = true;
      }
    }
    if ((source2.f & DERIVED) !== 0) {
      const derived3 =
        /** @type {Derived} */
        source2;
      if ((source2.f & DIRTY) !== 0) {
        execute_derived(derived3);
      }
      if (batch_values === null) {
        update_derived_status(derived3);
      }
    }
    source2.wv = increment_write_version();
    seen = null;
    count_deps = 0;
    mark_reactions(source2, DIRTY, updated_during_traversal);
    seen = null;
    if (
      is_runes() &&
      active_effect !== null &&
      (active_effect.f & CLEAN) !== 0 &&
      (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0
    ) {
      if (untracked_writes === null) {
        set_untracked_writes([source2]);
      } else {
        untracked_writes.push(source2);
      }
    }
    if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
      flush_eager_effects();
    }
  }
  return value;
}
function flush_eager_effects() {
  eager_effects_deferred = false;
  for (const effect2 of eager_effects) {
    if ((effect2.f & CLEAN) !== 0) {
      set_signal_status(effect2, MAYBE_DIRTY);
    }
    let dirty;
    try {
      dirty = is_dirty(effect2);
    } catch {
      dirty = true;
    }
    if (dirty) {
      update_effect(effect2);
    }
  }
  eager_effects.clear();
}
function increment(source2) {
  set2(source2, source2.v + 1);
}
function mark_reactions(signal, status, updated_during_traversal) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  var runes = is_runes();
  var length = reactions.length;
  count_deps += length;
  if (count_deps > 1e5 && seen === null) seen = /* @__PURE__ */ new Set();
  if (seen !== null) {
    if (seen.has(signal)) return;
    seen.add(signal);
  }
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i];
    var flags2 = reaction.f;
    if (!runes && reaction === active_effect) continue;
    var not_dirty = (flags2 & DIRTY) === 0;
    if (not_dirty) {
      set_signal_status(reaction, status);
    }
    if ((flags2 & EAGER_EFFECT) !== 0) {
      eager_effects.add(
        /** @type {Effect} */
        reaction,
      );
    } else if ((flags2 & DERIVED) !== 0) {
      var derived3 =
        /** @type {Derived} */
        reaction;
      batch_values?.delete(derived3);
      mark_reactions(derived3, MAYBE_DIRTY, updated_during_traversal);
    } else if (not_dirty) {
      var effect2 =
        /** @type {Effect} */
        reaction;
      if ((flags2 & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
        eager_block_effects.add(effect2);
      }
      if (updated_during_traversal !== null) {
        updated_during_traversal.push(effect2);
      } else {
        schedule_effect(effect2);
      }
    }
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/proxy.js
var regex_is_valid_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function proxy(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    STATE_SYMBOL in value ||
    COMPONENT_SYMBOL in value
  ) {
    return value;
  }
  const prototype = get_prototype_of(value);
  if (prototype !== object_prototype && prototype !== array_prototype) {
    return value;
  }
  var sources = /* @__PURE__ */ new Map();
  var is_proxied_array = is_array(value);
  var version = state(0);
  var stack2 =
    dev_fallback_default && tracing_mode_flag ? get_error("created at") : null;
  var parent_version = update_version;
  var with_parent = (fn) => {
    if (update_version === parent_version) {
      return fn();
    }
    var reaction = active_reaction;
    var version2 = update_version;
    set_active_reaction(null);
    set_update_version(parent_version);
    var result = fn();
    set_active_reaction(reaction);
    set_update_version(version2);
    return result;
  };
  if (is_proxied_array) {
    sources.set(
      "length",
      state(
        /** @type {any[]} */
        value.length,
        stack2,
      ),
    );
    if (dev_fallback_default) {
      value =
        /** @type {any} */
        inspectable_array(
          /** @type {any[]} */
          value,
        );
    }
  }
  var path = "";
  let updating = false;
  function update_path(new_path) {
    if (updating) return;
    updating = true;
    path = new_path;
    tag(version, `${path} version`);
    for (const [prop2, source2] of sources) {
      tag(source2, get_label(path, prop2));
    }
    updating = false;
  }
  return new Proxy(
    /** @type {any} */
    value,
    {
      defineProperty(_, prop2, descriptor) {
        if (
          !("value" in descriptor) ||
          descriptor.configurable === false ||
          descriptor.enumerable === false ||
          descriptor.writable === false
        ) {
          state_descriptors_fixed();
        }
        var s = sources.get(prop2);
        if (s === void 0) {
          with_parent(() => {
            var s2 = state(descriptor.value, stack2);
            sources.set(prop2, s2);
            if (dev_fallback_default && typeof prop2 === "string") {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
        } else {
          set2(s, descriptor.value, true);
        }
        return true;
      },
      deleteProperty(target, prop2) {
        var s = sources.get(prop2);
        if (s === void 0) {
          if (prop2 in target) {
            const s2 = with_parent(() => state(UNINITIALIZED, stack2));
            sources.set(prop2, s2);
            increment(version);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
          }
        } else {
          set2(s, UNINITIALIZED);
          increment(version);
        }
        return true;
      },
      get(target, prop2, receiver) {
        if (prop2 === STATE_SYMBOL) {
          return value;
        }
        if (dev_fallback_default && prop2 === PROXY_PATH_SYMBOL) {
          return update_path;
        }
        var s = sources.get(prop2);
        var exists = prop2 in target;
        if (
          s === void 0 &&
          (!exists || get_descriptor(target, prop2)?.writable)
        ) {
          s = with_parent(() => {
            var p = proxy(exists ? target[prop2] : UNINITIALIZED);
            var s2 = state(p, stack2);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
          sources.set(prop2, s);
        }
        if (s !== void 0) {
          var v = get(s);
          return v === UNINITIALIZED ? void 0 : v;
        }
        return Reflect.get(target, prop2, receiver);
      },
      getOwnPropertyDescriptor(target, prop2) {
        this.has?.(target, prop2);
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        var s = sources.get(prop2);
        if (s !== void 0) {
          var value2 = get(s);
          if (value2 === UNINITIALIZED) {
            return void 0;
          }
          if (descriptor && "value" in descriptor) {
            descriptor.value = value2;
          } else {
            return {
              enumerable: true,
              configurable: true,
              value: value2,
              writable: true,
            };
          }
        }
        return descriptor;
      },
      has(target, prop2) {
        if (prop2 === STATE_SYMBOL) {
          return true;
        }
        var s = sources.get(prop2);
        var has =
          (s !== void 0 && s.v !== UNINITIALIZED) || Reflect.has(target, prop2);
        if (
          s !== void 0 ||
          (active_effect !== null &&
            (!has || get_descriptor(target, prop2)?.writable))
        ) {
          if (s === void 0) {
            s = with_parent(() => {
              var p = has ? proxy(target[prop2]) : UNINITIALIZED;
              var s2 = state(p, stack2);
              if (dev_fallback_default) {
                tag(s2, get_label(path, prop2));
              }
              return s2;
            });
            sources.set(prop2, s);
          }
          var value2 = get(s);
          if (value2 === UNINITIALIZED) {
            return false;
          }
        }
        return has;
      },
      set(target, prop2, value2, receiver) {
        var s = sources.get(prop2);
        var has = prop2 in target;
        if (is_proxied_array && prop2 === "length") {
          for (var i = value2; i < /** @type {Source<number>} */ s.v; i += 1) {
            var other_s = sources.get(i + "");
            if (other_s !== void 0) {
              set2(other_s, UNINITIALIZED);
            } else if (i in target) {
              other_s = with_parent(() => state(UNINITIALIZED, stack2));
              sources.set(i + "", other_s);
              if (dev_fallback_default) {
                tag(other_s, get_label(path, i));
              }
            }
          }
        }
        if (s === void 0) {
          if (!has || get_descriptor(target, prop2)?.writable) {
            s = with_parent(() => state(void 0, stack2));
            if (dev_fallback_default) {
              tag(s, get_label(path, prop2));
            }
            set2(s, proxy(value2));
            sources.set(prop2, s);
          }
        } else {
          has = s.v !== UNINITIALIZED;
          var p = with_parent(() => proxy(value2));
          set2(s, p);
        }
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        if (descriptor?.set) {
          descriptor.set.call(receiver, value2);
        }
        if (!has) {
          if (is_proxied_array && typeof prop2 === "string") {
            var ls =
              /** @type {Source<number>} */
              sources.get("length");
            var n = Number(prop2);
            if (Number.isInteger(n) && n >= ls.v) {
              set2(ls, n + 1);
            }
          }
          increment(version);
        }
        return true;
      },
      ownKeys(target) {
        get(version);
        var own_keys = Reflect.ownKeys(target).filter((key3) => {
          var source3 = sources.get(key3);
          return source3 === void 0 || source3.v !== UNINITIALIZED;
        });
        for (var [key2, source2] of sources) {
          if (source2.v !== UNINITIALIZED && !(key2 in target)) {
            own_keys.push(key2);
          }
        }
        return own_keys;
      },
      setPrototypeOf() {
        state_prototype_fixed();
      },
    },
  );
}
function get_label(path, prop2) {
  if (typeof prop2 === "symbol")
    return `${path}[Symbol(${prop2.description ?? ""})]`;
  if (regex_is_valid_identifier.test(prop2)) return `${path}.${prop2}`;
  return /^\d+$/.test(prop2) ? `${path}[${prop2}]` : `${path}['${prop2}']`;
}
function get_proxied_value(value) {
  try {
    if (value !== null && typeof value === "object" && STATE_SYMBOL in value) {
      return value[STATE_SYMBOL];
    }
  } catch {}
  return value;
}
function is(a, b) {
  return Object.is(get_proxied_value(a), get_proxied_value(b));
}
var ARRAY_MUTATING_METHODS = /* @__PURE__ */ new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);
function inspectable_array(array) {
  return new Proxy(array, {
    get(target, prop2, receiver) {
      var value = Reflect.get(target, prop2, receiver);
      if (
        !ARRAY_MUTATING_METHODS.has(
          /** @type {string} */
          prop2,
        )
      ) {
        return value;
      }
      return function (...args) {
        set_eager_effects_deferred();
        var result = value.apply(this, args);
        flush_eager_effects();
        return result;
      };
    },
  });
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dev/equality.js
function init_array_prototype_warnings() {
  const array_prototype2 = Array.prototype;
  const cleanup = Array.__svelte_cleanup;
  if (cleanup) {
    cleanup();
  }
  const { indexOf, lastIndexOf, includes: includes2 } = array_prototype2;
  array_prototype2.indexOf = function (item, from_index) {
    const index2 = indexOf.call(this, item, from_index);
    if (index2 === -1) {
      for (let i = from_index ?? 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.indexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.lastIndexOf = function (item, from_index) {
    const index2 = lastIndexOf.call(this, item, from_index ?? this.length - 1);
    if (index2 === -1) {
      for (let i = 0; i <= (from_index ?? this.length - 1); i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.lastIndexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.includes = function (item, from_index) {
    const has = includes2.call(this, item, from_index);
    if (!has) {
      for (let i = 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.includes(...)");
          break;
        }
      }
    }
    return has;
  };
  Array.__svelte_cleanup = () => {
    array_prototype2.indexOf = indexOf;
    array_prototype2.lastIndexOf = lastIndexOf;
    array_prototype2.includes = includes2;
  };
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/operations.js
var $window;
var $document;
var is_firefox;
var first_child_getter;
var next_sibling_getter;
function init_operations() {
  if ($window !== void 0) {
    return;
  }
  $window = window;
  $document = document;
  is_firefox = /Firefox/.test(navigator.userAgent);
  var element_prototype = Element.prototype;
  var node_prototype = Node.prototype;
  var text_prototype = Text.prototype;
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
  if (is_extensible(element_prototype)) {
    element_prototype[CLASS_CACHE] = void 0;
    element_prototype[ATTRIBUTES_CACHE] = null;
    element_prototype[STYLE_CACHE] = void 0;
    element_prototype.__e = void 0;
  }
  if (is_extensible(text_prototype)) {
    text_prototype[TEXT_CACHE] = void 0;
  }
  if (dev_fallback_default) {
    element_prototype.__svelte_meta = null;
    init_array_prototype_warnings();
  }
}
function create_text(value = "") {
  return document.createTextNode(value);
}
// @__NO_SIDE_EFFECTS__
function get_first_child(node) {
  return (
    /** @type {TemplateNode | null} */
    first_child_getter.call(node)
  );
}
// @__NO_SIDE_EFFECTS__
function get_next_sibling(node) {
  return (
    /** @type {TemplateNode | null} */
    next_sibling_getter.call(node)
  );
}
function child(node, is_text) {
  if (!hydrating) {
    return /* @__PURE__ */ get_first_child(node);
  }
  var child2 = /* @__PURE__ */ get_first_child(hydrate_node);
  if (child2 === null) {
    child2 = hydrate_node.appendChild(create_text());
  } else if (is_text && child2.nodeType !== TEXT_NODE) {
    var text2 = create_text();
    child2?.before(text2);
    set_hydrate_node(text2);
    return text2;
  }
  if (is_text) {
    merge_text_nodes(
      /** @type {Text} */
      child2,
    );
  }
  set_hydrate_node(child2);
  return child2;
}
function first_child(node, is_text = false) {
  if (!hydrating) {
    var first = /* @__PURE__ */ get_first_child(node);
    if (first instanceof Comment && first.data === "")
      return /* @__PURE__ */ get_next_sibling(first);
    return first;
  }
  if (is_text) {
    if (hydrate_node?.nodeType !== TEXT_NODE) {
      var text2 = create_text();
      hydrate_node?.before(text2);
      set_hydrate_node(text2);
      return text2;
    }
    merge_text_nodes(
      /** @type {Text} */
      hydrate_node,
    );
  }
  return hydrate_node;
}
function only_child(node, is_text = false) {
  if (!hydrating) {
    return /* @__PURE__ */ get_first_child(node);
  }
  var first = child(node, is_text);
  reset(node);
  return first;
}
function sibling(node, count = 1, is_text = false) {
  let next_sibling = hydrating ? hydrate_node : node;
  var last_sibling;
  while (count--) {
    last_sibling = next_sibling;
    next_sibling =
      /** @type {TemplateNode} */
      /* @__PURE__ */ get_next_sibling(next_sibling);
  }
  if (!hydrating) {
    return next_sibling;
  }
  if (is_text) {
    if (next_sibling?.nodeType !== TEXT_NODE) {
      var text2 = create_text();
      if (next_sibling === null) {
        last_sibling?.after(text2);
      } else {
        next_sibling.before(text2);
      }
      set_hydrate_node(text2);
      return text2;
    }
    merge_text_nodes(
      /** @type {Text} */
      next_sibling,
    );
  }
  set_hydrate_node(next_sibling);
  return next_sibling;
}
function clear_text_content(node) {
  node.textContent = "";
}
function should_defer_append() {
  if (!async_mode_flag) return false;
  if (eager_block_effects !== null) return false;
  var flags2 =
    /** @type {Effect} */
    active_effect.f;
  return (flags2 & REACTION_RAN) !== 0;
}
function create_element(tag2, namespace, is2) {
  if (namespace == null || namespace === NAMESPACE_HTML) {
    return (
      /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
      is2
        ? document.createElement(tag2, { is: is2 })
        : document.createElement(tag2)
    );
  }
  return (
    /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
    is2
      ? document.createElementNS(namespace, tag2, { is: is2 })
      : document.createElementNS(namespace, tag2)
  );
}
function merge_text_nodes(text2) {
  if (
    /** @type {string} */
    text2.nodeValue.length < 65536
  ) {
    return;
  }
  let next2 = text2.nextSibling;
  while (next2 !== null && next2.nodeType === TEXT_NODE) {
    next2.remove();
    text2.nodeValue += /** @type {string} */ next2.nodeValue;
    next2 = text2.nextSibling;
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/error-handling.js
var adjustments = /* @__PURE__ */ new WeakMap();
function handle_error(error) {
  var effect2 = active_effect;
  if (effect2 === null) {
    active_reaction.f |= ERROR_VALUE;
    return error;
  }
  if (
    dev_fallback_default &&
    error instanceof Error &&
    !adjustments.has(error)
  ) {
    adjustments.set(error, get_adjustments(error, effect2));
  }
  if ((effect2.f & REACTION_RAN) === 0 && (effect2.f & EFFECT) === 0) {
    if (dev_fallback_default && !effect2.parent && error instanceof Error) {
      apply_adjustments(error);
    }
    throw error;
  }
  invoke_error_boundary(error, effect2);
}
function invoke_error_boundary(error, effect2) {
  if (error === HYDRATION_ERROR) {
    throw error;
  }
  if (effect2 !== null && (effect2.f & DESTROYED) !== 0) {
    return;
  }
  while (effect2 !== null) {
    if (
      (effect2.f & BOUNDARY_EFFECT) !== 0 &&
      (effect2.f & (DESTROYED | DESTROYING)) === 0
    ) {
      if ((effect2.f & REACTION_RAN) === 0) {
        throw error;
      }
      try {
        effect2.b.error(error);
        return;
      } catch (e) {
        error = e;
      }
    }
    effect2 = effect2.parent;
  }
  if (dev_fallback_default && error instanceof Error) {
    apply_adjustments(error);
  }
  throw error;
}
function get_adjustments(error, effect2) {
  const message_descriptor = get_descriptor(error, "message");
  if (message_descriptor && !message_descriptor.configurable) return;
  var indent = is_firefox ? "  " : "	";
  var component_stack = `
${indent}in ${effect2.fn?.name || "<unknown>"}`;
  var context = effect2.ctx;
  while (context !== null) {
    component_stack += `
${indent}in ${context.function?.[FILENAME].split("/").pop()}`;
    context = context.p;
  }
  return {
    message:
      error.message +
      `
${component_stack}
`,
    stack: error.stack
      ?.split("\n")
      .filter((line) => !line.includes("svelte/src/internal"))
      .join("\n"),
  };
}
function apply_adjustments(error) {
  const adjusted = adjustments.get(error);
  if (adjusted) {
    define_property(error, "message", {
      value: adjusted.message,
    });
    define_property(error, "stack", {
      value: adjusted.stack,
    });
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/effects.js
function validate_effect(rune) {
  if (active_effect === null) {
    if (active_reaction === null) {
      effect_orphan(rune);
    }
    effect_in_unowned_derived();
  }
  if (is_destroying_effect) {
    effect_in_teardown(rune);
  }
}
function push_effect(effect2, parent_effect) {
  var parent_last = parent_effect.last;
  if (parent_last === null) {
    parent_effect.last = parent_effect.first = effect2;
  } else {
    parent_last.next = effect2;
    effect2.prev = parent_last;
    parent_effect.last = effect2;
  }
}
function create_effect(type, fn) {
  var parent = active_effect;
  if (dev_fallback_default) {
    while (parent !== null && (parent.f & EAGER_EFFECT) !== 0) {
      parent = parent.parent;
    }
  }
  if (parent !== null && (parent.f & INERT) !== 0) {
    type |= INERT;
  }
  var effect2 = {
    ctx: component_context,
    deps: null,
    nodes: null,
    f: type | DIRTY | CONNECTED,
    first: null,
    fn,
    last: null,
    next: null,
    parent,
    b: parent && parent.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null,
  };
  if (dev_fallback_default) {
    effect2.component_function = dev_current_component_function;
  }
  current_batch?.register_created_effect(effect2);
  var e = effect2;
  if ((type & EFFECT) !== 0) {
    if (collected_effects !== null) {
      collected_effects.push(effect2);
    } else {
      Batch.ensure().schedule(effect2);
    }
  } else if (fn !== null) {
    try {
      update_effect(effect2);
    } catch (e2) {
      destroy_effect(effect2);
      throw e2;
    }
    if (
      e.deps === null &&
      e.teardown === null &&
      e.nodes === null &&
      e.first === e.last && // either `null`, or a singular child
      (e.f & EFFECT_PRESERVED) === 0
    ) {
      e = e.first;
      if (
        (type & BLOCK_EFFECT) !== 0 &&
        (type & EFFECT_TRANSPARENT) !== 0 &&
        e !== null
      ) {
        e.f |= EFFECT_TRANSPARENT;
      }
    }
  }
  if (e !== null) {
    e.parent = parent;
    if (parent !== null) {
      push_effect(e, parent);
    }
    if (
      active_reaction !== null &&
      (active_reaction.f & DERIVED) !== 0 &&
      (type & ROOT_EFFECT) === 0
    ) {
      var derived3 =
        /** @type {Derived} */
        active_reaction;
      (derived3.effects ??= []).push(e);
    }
  }
  return effect2;
}
function effect_tracking() {
  return active_reaction !== null && !untracking;
}
function teardown(fn) {
  const effect2 = create_effect(RENDER_EFFECT, null);
  set_signal_status(effect2, CLEAN);
  effect2.teardown = fn;
  return effect2;
}
function user_effect(fn) {
  validate_effect("$effect");
  if (dev_fallback_default) {
    define_property(fn, "name", {
      value: "$effect",
    });
  }
  var flags2 =
    /** @type {Effect} */
    active_effect.f;
  var defer =
    !active_reaction &&
    (flags2 & BRANCH_EFFECT) !== 0 &&
    component_context !== null &&
    !component_context.i;
  if (defer) {
    var context =
      /** @type {ComponentContext} */
      component_context;
    (context.e ??= []).push(fn);
  } else {
    return create_user_effect(fn);
  }
}
function create_user_effect(fn) {
  return create_effect(EFFECT | USER_EFFECT, fn);
}
function effect_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
  return () => {
    destroy_effect(effect2);
  };
}
function component_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
  return (options = {}) => {
    return new Promise((fulfil) => {
      if (options.outro) {
        pause_effect(effect2, () => {
          destroy_effect(effect2);
          fulfil(void 0);
        });
      } else {
        destroy_effect(effect2);
        fulfil(void 0);
      }
    });
  };
}
function effect(fn) {
  return create_effect(EFFECT, fn);
}
function async_effect(fn) {
  return create_effect(ASYNC | EFFECT_PRESERVED, fn);
}
function render_effect(fn, flags2 = 0) {
  return create_effect(RENDER_EFFECT | flags2, fn);
}
function template_effect(fn, sync = [], async2 = [], blockers = []) {
  flatten(blockers, sync, async2, (values) => {
    create_effect(RENDER_EFFECT, () => {
      fn(...values.map(get));
    });
  });
}
function block(fn, flags2 = 0) {
  var effect2 = create_effect(BLOCK_EFFECT | flags2, fn);
  if (dev_fallback_default) {
    effect2.dev_stack = dev_stack;
  }
  return effect2;
}
function branch(fn) {
  return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn);
}
function execute_effect_teardown(effect2) {
  var teardown2 = effect2.teardown;
  if (teardown2 !== null) {
    const previously_destroying_effect = is_destroying_effect;
    const previous_reaction = active_reaction;
    set_is_destroying_effect(true);
    set_active_reaction(null);
    try {
      teardown2.call(null);
    } catch (error) {
      invoke_error_boundary(error, effect2.parent);
    } finally {
      set_is_destroying_effect(previously_destroying_effect);
      set_active_reaction(previous_reaction);
    }
  }
}
function destroy_effect_children(signal, remove_dom = false) {
  var effect2 = signal.first;
  signal.first = signal.last = null;
  while (effect2 !== null) {
    const controller = effect2.ac;
    if (controller !== null) {
      without_reactive_context(() => {
        controller.abort(STALE_REACTION);
      });
    }
    var next2 = effect2.next;
    if ((effect2.f & ROOT_EFFECT) !== 0) {
      effect2.parent = null;
    } else {
      destroy_effect(effect2, remove_dom);
    }
    effect2 = next2;
  }
}
function destroy_block_effect_children(signal) {
  var effect2 = signal.first;
  while (effect2 !== null) {
    var next2 = effect2.next;
    if ((effect2.f & BRANCH_EFFECT) === 0) {
      destroy_effect(effect2);
    }
    effect2 = next2;
  }
}
function destroy_effect(effect2, remove_dom = true) {
  var removed = false;
  if (
    (remove_dom || (effect2.f & HEAD_EFFECT) !== 0) &&
    effect2.nodes !== null &&
    effect2.nodes.end !== null
  ) {
    remove_effect_dom(
      effect2.nodes.start,
      /** @type {TemplateNode} */
      effect2.nodes.end,
    );
    removed = true;
  }
  effect2.f |= DESTROYING;
  destroy_effect_children(effect2, remove_dom && !removed);
  remove_reactions(effect2, 0);
  var transitions = effect2.nodes && effect2.nodes.t;
  if (transitions !== null) {
    for (const transition2 of transitions) {
      transition2.stop();
    }
  }
  execute_effect_teardown(effect2);
  effect2.f ^= DESTROYING;
  effect2.f |= DESTROYED;
  var parent = effect2.parent;
  if (parent !== null && parent.first !== null) {
    unlink_effect(effect2);
  }
  if (dev_fallback_default) {
    effect2.component_function = null;
  }
  effect2.next =
    effect2.prev =
    effect2.teardown =
    effect2.ctx =
    effect2.deps =
    effect2.fn =
    effect2.nodes =
    effect2.ac =
    effect2.b =
      null;
}
function remove_effect_dom(node, end) {
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    node.remove();
    node = next2;
  }
}
function unlink_effect(effect2) {
  var parent = effect2.parent;
  var prev = effect2.prev;
  var next2 = effect2.next;
  if (prev !== null) prev.next = next2;
  if (next2 !== null) next2.prev = prev;
  if (parent !== null) {
    if (parent.first === effect2) parent.first = next2;
    if (parent.last === effect2) parent.last = prev;
  }
}
function pause_effect(effect2, callback, destroy = true) {
  var transitions = [];
  effect2.f |= PAUSED;
  pause_children(effect2, transitions, true);
  var fn = () => {
    if (destroy) destroy_effect(effect2);
    if (callback) callback();
  };
  var remaining = transitions.length;
  if (remaining > 0) {
    var check = () => --remaining || fn();
    for (var transition2 of transitions) {
      transition2.out(check);
    }
  } else {
    fn();
  }
}
function pause_children(effect2, transitions, local) {
  if ((effect2.f & INERT) !== 0) return;
  effect2.f ^= INERT;
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition2 of t) {
      if (transition2.is_global || local) {
        transitions.push(transition2);
      }
    }
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    if ((child2.f & ROOT_EFFECT) === 0) {
      var transparent =
        (child2.f & EFFECT_TRANSPARENT) !== 0 || // If this is a branch effect without a block effect parent,
        // it means the parent block effect was pruned. In that case,
        // transparency information was transferred to the branch effect.
        ((child2.f & BRANCH_EFFECT) !== 0 && (effect2.f & BLOCK_EFFECT) !== 0);
      pause_children(child2, transitions, transparent ? local : false);
    }
    child2 = sibling2;
  }
}
function resume_effect(effect2) {
  effect2.f &= ~PAUSED;
  resume_children(effect2, true);
}
function resume_children(effect2, local) {
  if ((effect2.f & PAUSED) !== 0) return;
  if ((effect2.f & INERT) === 0) return;
  effect2.f ^= INERT;
  if ((effect2.f & CLEAN) === 0) {
    set_signal_status(effect2, DIRTY);
    Batch.ensure().schedule(effect2);
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    var transparent =
      (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
    resume_children(child2, transparent ? local : false);
    child2 = sibling2;
  }
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition2 of t) {
      if (transition2.is_global || local) {
        transition2.in();
      }
    }
  }
}
function move_effect(effect2, fragment) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    fragment.append(node);
    node = next2;
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/legacy.js
var captured_signals = null;

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/runtime.js
var is_destroying_effect = false;
function set_is_destroying_effect(value) {
  is_destroying_effect = value;
}
var active_reaction = null;
var untracking = false;
function set_active_reaction(reaction) {
  active_reaction = reaction;
}
var active_effect = null;
function set_active_effect(effect2) {
  active_effect = effect2;
}
var current_sources = null;
function push_reaction_value(value) {
  if (
    active_reaction !== null &&
    ((!async_mode_flag && (active_reaction.f & REACTION_IS_UPDATING) !== 0) ||
      (active_reaction.f & DERIVED) !== 0)
  ) {
    (current_sources ??= /* @__PURE__ */ new Set()).add(value);
  }
}
var new_deps = null;
var skipped_deps = 0;
var untracked_writes = null;
function set_untracked_writes(value) {
  untracked_writes = value;
}
var write_version = 1;
var read_version = 0;
var update_version = read_version;
function set_update_version(value) {
  update_version = value;
}
function increment_write_version() {
  return ++write_version;
}
function is_dirty(reaction) {
  var flags2 = reaction.f;
  if ((flags2 & DIRTY) !== 0) {
    return true;
  }
  if ((flags2 & MAYBE_DIRTY) !== 0) {
    var dependencies =
      /** @type {Value[]} */
      reaction.deps;
    var length = dependencies.length;
    for (var i = 0; i < length; i++) {
      var dependency = dependencies[i];
      if (
        is_dirty(
          /** @type {Derived} */
          dependency,
        )
      ) {
        update_derived(
          /** @type {Derived} */
          dependency,
        );
      }
      if (dependency.wv > reaction.wv) {
        return true;
      }
    }
    if (
      (flags2 & CONNECTED) !== 0 && // During time traveling we don't want to reset the status so that
      // traversal of the graph in the other batches still happens
      batch_values === null
    ) {
      set_signal_status(reaction, CLEAN);
    }
  }
  return false;
}
function schedule_possible_effect_self_invalidation(
  signal,
  effect2,
  root28 = true,
) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  if (
    !async_mode_flag &&
    current_sources !== null &&
    current_sources.has(signal)
  ) {
    return;
  }
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i];
    if ((reaction.f & DERIVED) !== 0) {
      schedule_possible_effect_self_invalidation(
        /** @type {Derived} */
        reaction,
        effect2,
        false,
      );
    } else if (effect2 === reaction) {
      if (root28) {
        set_signal_status(reaction, DIRTY);
      } else if ((reaction.f & CLEAN) !== 0) {
        set_signal_status(reaction, MAYBE_DIRTY);
      }
      schedule_effect(
        /** @type {Effect} */
        reaction,
      );
    }
  }
}
function update_reaction(reaction) {
  var previous_deps = new_deps;
  var previous_skipped_deps = skipped_deps;
  var previous_untracked_writes = untracked_writes;
  var previous_reaction = active_reaction;
  var previous_sources = current_sources;
  var previous_component_context = component_context;
  var previous_untracking = untracking;
  var previous_update_version = update_version;
  var flags2 = reaction.f;
  new_deps = /** @type {null | Value[]} */ null;
  skipped_deps = 0;
  untracked_writes = null;
  active_reaction =
    (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
  current_sources = null;
  set_component_context(reaction.ctx);
  untracking = false;
  update_version = ++read_version;
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      reaction.ac.abort(STALE_REACTION);
    });
    reaction.ac = null;
  }
  try {
    reaction.f |= REACTION_IS_UPDATING;
    var fn =
      /** @type {Function} */
      reaction.fn;
    var result = fn();
    reaction.f |= REACTION_RAN;
    var deps = update_dependencies(reaction);
    if (
      is_runes() &&
      untracked_writes !== null &&
      !untracking &&
      deps !== null &&
      (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0
    ) {
      for (
        var i = 0;
        i < /** @type {Source[]} */ untracked_writes.length;
        i++
      ) {
        schedule_possible_effect_self_invalidation(
          untracked_writes[i],
          /** @type {Effect} */
          reaction,
        );
      }
    }
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++;
      if (previous_reaction.deps !== null) {
        for (let i2 = 0; i2 < previous_skipped_deps; i2 += 1) {
          previous_reaction.deps[i2].rv = read_version;
        }
      }
      if (previous_deps !== null) {
        for (const dep of previous_deps) {
          dep.rv = read_version;
        }
      }
      if (untracked_writes !== null) {
        if (previous_untracked_writes === null) {
          previous_untracked_writes = untracked_writes;
        } else {
          previous_untracked_writes.push(
            .../** @type {Source[]} */
            untracked_writes,
          );
        }
      }
    }
    if ((reaction.f & ERROR_VALUE) !== 0) {
      reaction.f ^= ERROR_VALUE;
    }
    return result;
  } catch (error) {
    update_dependencies(reaction);
    return handle_error(error);
  } finally {
    reaction.f ^= REACTION_IS_UPDATING;
    new_deps = previous_deps;
    skipped_deps = previous_skipped_deps;
    untracked_writes = previous_untracked_writes;
    active_reaction = previous_reaction;
    current_sources = previous_sources;
    set_component_context(previous_component_context);
    untracking = previous_untracking;
    update_version = previous_update_version;
  }
}
function update_dependencies(reaction) {
  var deps = reaction.deps;
  var is_fork = current_batch?.is_fork;
  if (new_deps !== null) {
    var i;
    if (!is_fork) {
      remove_reactions(reaction, skipped_deps);
    }
    if (deps !== null && skipped_deps > 0) {
      deps.length = skipped_deps + new_deps.length;
      for (i = 0; i < new_deps.length; i++) {
        deps[skipped_deps + i] = new_deps[i];
      }
    } else {
      reaction.deps = deps = new_deps;
    }
    if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
      for (i = skipped_deps; i < deps.length; i++) {
        (deps[i].reactions ??= []).push(reaction);
      }
    }
  } else if (!is_fork && deps !== null && skipped_deps < deps.length) {
    remove_reactions(reaction, skipped_deps);
    deps.length = skipped_deps;
  }
  return deps;
}
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions;
  if (reactions !== null) {
    var index2 = index_of.call(reactions, signal);
    if (index2 !== -1) {
      var new_length = reactions.length - 1;
      if (new_length === 0) {
        reactions = dependency.reactions = null;
      } else {
        reactions[index2] = reactions[new_length];
        reactions.pop();
      }
    }
  }
  if (
    reactions === null &&
    (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
    // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
    // allows us to skip the expensive work of disconnecting and immediately reconnecting it
    (new_deps === null || !includes.call(new_deps, dependency))
  ) {
    var derived3 =
      /** @type {Derived} */
      dependency;
    if ((derived3.f & CONNECTED) !== 0) {
      derived3.f ^= CONNECTED;
    }
    if (derived3.v !== UNINITIALIZED) {
      update_derived_status(derived3);
    }
    if (derived3.ac !== null) {
      without_reactive_context(() => {
        derived3.ac.abort(STALE_REACTION);
        derived3.ac = null;
        set_signal_status(derived3, DIRTY);
      });
    }
    freeze_derived_effects(derived3);
    remove_reactions(derived3, 0);
  }
}
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps;
  if (dependencies === null) return;
  for (var i = start_index; i < dependencies.length; i++) {
    remove_reaction(signal, dependencies[i]);
  }
}
function update_effect(effect2) {
  var flags2 = effect2.f;
  if ((flags2 & DESTROYED) !== 0) {
    return;
  }
  set_signal_status(effect2, CLEAN);
  var previous_effect = active_effect;
  active_effect = effect2;
  if (dev_fallback_default) {
    var previous_component_fn = dev_current_component_function;
    set_dev_current_component_function(effect2.component_function);
    var previous_stack =
      /** @type {any} */
      dev_stack;
    set_dev_stack(effect2.dev_stack ?? dev_stack);
  }
  try {
    if ((flags2 & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
      destroy_block_effect_children(effect2);
    } else {
      destroy_effect_children(effect2);
    }
    execute_effect_teardown(effect2);
    var teardown2 = update_reaction(effect2);
    effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
    effect2.wv = write_version;
    if (
      dev_fallback_default &&
      tracing_mode_flag &&
      (effect2.f & DIRTY) !== 0 &&
      effect2.deps !== null
    ) {
      for (var dep of effect2.deps) {
        if (dep.set_during_effect) {
          dep.wv = increment_write_version();
          dep.set_during_effect = false;
        }
      }
    }
  } finally {
    active_effect = previous_effect;
    if (dev_fallback_default) {
      set_dev_current_component_function(previous_component_fn);
      set_dev_stack(previous_stack);
    }
  }
}
async function tick() {
  if (async_mode_flag) {
    return new Promise((f) => {
      requestAnimationFrame(() => f());
      setTimeout(() => f());
    });
  }
  await Promise.resolve();
  flushSync();
}
function get(signal) {
  var flags2 = signal.f;
  var is_derived = (flags2 & DERIVED) !== 0;
  captured_signals?.add(signal);
  if (active_reaction !== null && !untracking) {
    var destroyed =
      active_effect !== null && (active_effect.f & DESTROYED) !== 0;
    if (
      !destroyed &&
      (current_sources === null || !current_sources.has(signal))
    ) {
      var deps = active_reaction.deps;
      if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version;
          if (
            new_deps === null &&
            deps !== null &&
            deps[skipped_deps] === signal
          ) {
            skipped_deps++;
          } else if (new_deps === null) {
            new_deps = [signal];
          } else {
            new_deps.push(signal);
          }
        }
      } else {
        active_reaction.deps ??= [];
        if (!includes.call(active_reaction.deps, signal)) {
          active_reaction.deps.push(signal);
        }
        var reactions = signal.reactions;
        if (reactions === null) {
          signal.reactions = [active_reaction];
        } else if (!includes.call(reactions, active_reaction)) {
          reactions.push(active_reaction);
        }
      }
    }
  }
  if (dev_fallback_default) {
    if (
      !untracking &&
      reactivity_loss_tracker && // By checking that current/previous batch are null we filter out false positives.
      // reactivity_loss_tracker is only reset after a microtask, so if a flush happens
      // before that, we get warnings for things we shouldn't warn on.
      current_batch === null &&
      previous_batch === null &&
      !reactivity_loss_tracker.warned &&
      (reactivity_loss_tracker.effect.f & REACTION_IS_UPDATING) === 0 &&
      !reactivity_loss_tracker.effect_deps.has(signal)
    ) {
      reactivity_loss_tracker.warned = true;
      await_reactivity_loss(
        /** @type {string} */
        signal.label,
      );
      var trace2 = get_error("traced at");
      if (trace2) console.warn(trace2);
    }
    recent_async_deriveds.delete(signal);
    if (
      tracing_mode_flag &&
      !untracking &&
      tracing_expressions !== null &&
      active_reaction !== null &&
      tracing_expressions.reaction === active_reaction
    ) {
      if (signal.trace) {
        signal.trace();
      } else {
        trace2 = get_error("traced at");
        if (trace2) {
          var entry = tracing_expressions.entries.get(signal);
          if (entry === void 0) {
            entry = { traces: [] };
            tracing_expressions.entries.set(signal, entry);
          }
          var last = entry.traces[entry.traces.length - 1];
          if (trace2.stack !== last?.stack) {
            entry.traces.push(trace2);
          }
        }
      }
    }
  }
  if (is_destroying_effect && old_values.has(signal)) {
    return old_values.get(signal);
  }
  if (is_derived) {
    var derived3 =
      /** @type {Derived} */
      signal;
    if (is_destroying_effect) {
      var value = derived3.v;
      if (
        ((derived3.f & CLEAN) === 0 && derived3.reactions !== null) ||
        depends_on_old_values(derived3)
      ) {
        value = execute_derived(derived3);
      }
      old_values.set(derived3, value);
      return value;
    }
    var should_connect =
      (derived3.f & CONNECTED) === 0 &&
      !untracking &&
      active_reaction !== null &&
      (active_reaction.f & CONNECTED) !== 0;
    var is_new = (derived3.f & REACTION_RAN) === 0;
    if (is_dirty(derived3)) {
      if (should_connect) {
        derived3.f |= CONNECTED;
      }
      update_derived(derived3);
    }
    if (should_connect && !is_new) {
      unfreeze_derived_effects(derived3);
      reconnect(derived3);
    }
  }
  if (batch_values?.has(signal)) {
    return batch_values.get(signal);
  }
  if ((signal.f & ERROR_VALUE) !== 0) {
    throw signal.v;
  }
  return signal.v;
}
function reconnect(derived3) {
  derived3.f |= CONNECTED;
  if (derived3.deps === null) return;
  for (const dep of derived3.deps) {
    var reactions = dep.reactions;
    if (reactions === null) {
      dep.reactions = [derived3];
    } else if (!includes.call(reactions, derived3)) {
      reactions.push(derived3);
    }
    if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
      unfreeze_derived_effects(
        /** @type {Derived} */
        dep,
      );
      reconnect(
        /** @type {Derived} */
        dep,
      );
    }
  }
}
function depends_on_old_values(derived3) {
  if (derived3.v === UNINITIALIZED) return true;
  if (derived3.deps === null) return false;
  for (const dep of derived3.deps) {
    if (old_values.has(dep)) {
      return true;
    }
    if (
      (dep.f & DERIVED) !== 0 &&
      depends_on_old_values(
        /** @type {Derived} */
        dep,
      )
    ) {
      return true;
    }
  }
  return false;
}
function untrack(fn) {
  var previous_untracking = untracking;
  try {
    untracking = true;
    return fn();
  } finally {
    untracking = previous_untracking;
  }
}
function deep_read_state(value) {
  if (typeof value !== "object" || !value || value instanceof EventTarget) {
    return;
  }
  if (STATE_SYMBOL in value) {
    deep_read(value);
  } else if (!Array.isArray(value)) {
    for (let key2 in value) {
      const prop2 = value[key2];
      if (typeof prop2 === "object" && prop2 && STATE_SYMBOL in prop2) {
        deep_read(prop2);
      }
    }
  }
}
function deep_read(value, visited = /* @__PURE__ */ new Set()) {
  if (
    typeof value === "object" &&
    value !== null && // We don't want to traverse DOM elements
    !(value instanceof EventTarget) &&
    !visited.has(value)
  ) {
    visited.add(value);
    if (value instanceof Date) {
      value.getTime();
    }
    for (let key2 in value) {
      try {
        deep_read(value[key2], visited);
      } catch (e) {}
    }
    const proto = get_prototype_of(value);
    if (
      proto !== Object.prototype &&
      proto !== Array.prototype &&
      proto !== Map.prototype &&
      proto !== Set.prototype &&
      proto !== Date.prototype
    ) {
      const descriptors = get_descriptors(proto);
      for (let key2 in descriptors) {
        const get3 = descriptors[key2].get;
        if (get3) {
          try {
            get3.call(value);
          } catch (e) {}
        }
      }
    }
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/utils.js
var DOM_BOOLEAN_ATTRIBUTES = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
  "webkitdirectory",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback",
];
var DOM_PROPERTIES = [
  ...DOM_BOOLEAN_ATTRIBUTES,
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  "readOnly",
  "value",
  "volume",
  "defaultValue",
  "defaultChecked",
  "srcObject",
  "noValidate",
  "allowFullscreen",
  "disablePictureInPicture",
  "disableRemotePlayback",
];
var PASSIVE_EVENTS = ["touchstart", "touchmove"];
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name);
}
var STATE_CREATION_RUNES =
  /** @type {const} */
  ["$state", "$state.raw", "$derived", "$derived.by"];
var RUNES =
  /** @type {const} */
  [
    ...STATE_CREATION_RUNES,
    "$state.eager",
    "$state.snapshot",
    "$props",
    "$props.id",
    "$bindable",
    "$effect",
    "$effect.pre",
    "$effect.tracking",
    "$effect.root",
    "$effect.pending",
    "$inspect",
    "$inspect().with",
    "$inspect.trace",
    "$host",
  ];

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dev/css.js
var all_styles = /* @__PURE__ */ new Map();
function register_style(hash2, style) {
  var styles = all_styles.get(hash2);
  if (!styles) {
    styles = /* @__PURE__ */ new Set();
    all_styles.set(hash2, styles);
  }
  styles.add(style);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/events.js
var event_symbol = /* @__PURE__ */ Symbol("events");
var all_registered_events = /* @__PURE__ */ new Set();
var root_event_handles = /* @__PURE__ */ new Set();
function create_event(event_name, dom, handler, options = {}) {
  function target_handler(event2) {
    if (!options.capture) {
      handle_event_propagation.call(dom, event2);
    }
    if (!event2.cancelBubble) {
      return without_reactive_context(() => {
        return handler?.call(this, event2);
      });
    }
  }
  if (
    event_name.startsWith("pointer") ||
    event_name.startsWith("touch") ||
    event_name === "wheel"
  ) {
    target_handler.__removed = false;
    queue_micro_task(() => {
      if (!target_handler.__removed) {
        dom.addEventListener(event_name, target_handler, options);
      }
    });
  } else {
    dom.addEventListener(event_name, target_handler, options);
  }
  return target_handler;
}
function event(event_name, dom, handler, capture2, passive2) {
  var options = { capture: capture2, passive: passive2 };
  var target_handler = create_event(event_name, dom, handler, options);
  if (
    dom === document.body || // @ts-ignore
    dom === window || // @ts-ignore
    dom === document || // Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
    dom instanceof HTMLMediaElement
  ) {
    teardown(() => {
      target_handler.__removed = true;
      dom.removeEventListener(event_name, target_handler, options);
    });
  }
}
function delegated(event_name, element2, handler) {
  (element2[event_symbol] ??= {})[event_name] = handler;
}
function delegate(events) {
  for (var i = 0; i < events.length; i++) {
    all_registered_events.add(events[i]);
  }
  for (var fn of root_event_handles) {
    fn(events);
  }
}
var last_propagated_event = null;
var last_propagated_event_clear_scheduled = false;
function handle_event_propagation(event2) {
  var handler_element = this;
  var owner_document =
    /** @type {Node} */
    handler_element.ownerDocument;
  var event_name = event2.type;
  var path = event2.composedPath?.() || [];
  var current_target =
    /** @type {null | Element} */
    path[0] || event2.target;
  last_propagated_event = event2;
  if (!last_propagated_event_clear_scheduled) {
    last_propagated_event_clear_scheduled = true;
    setTimeout(() => {
      last_propagated_event_clear_scheduled = false;
      last_propagated_event = null;
    });
  }
  var path_idx = 0;
  var handled_at = last_propagated_event === event2 && event2[event_symbol];
  if (handled_at) {
    var at_idx = path.indexOf(handled_at);
    if (
      at_idx !== -1 &&
      (handler_element === document ||
        handler_element === /** @type {any} */ window)
    ) {
      event2[event_symbol] = handler_element;
      return;
    }
    var handler_idx = path.indexOf(handler_element);
    if (handler_idx === -1) {
      return;
    }
    if (at_idx <= handler_idx) {
      path_idx = at_idx;
    }
  }
  current_target = /** @type {Element} */ path[path_idx] || event2.target;
  if (current_target === handler_element) return;
  define_property(event2, "currentTarget", {
    configurable: true,
    get() {
      return current_target || owner_document;
    },
  });
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    var throw_error;
    var other_errors = [];
    while (current_target !== null) {
      if (current_target === handler_element) break;
      try {
        var delegated2 = current_target[event_symbol]?.[event_name];
        if (
          delegated2 != null &&
          (!(/** @type {any} */ current_target.disabled) || // DOM could've been updated already by the time this is reached, so we check this as well
            // -> the target could not have been disabled because it emits the event in the first place
            event2.target === current_target)
        ) {
          delegated2.call(current_target, event2);
        }
      } catch (error) {
        if (throw_error) {
          other_errors.push(error);
        } else {
          throw_error = error;
        }
      }
      if (event2.cancelBubble) break;
      path_idx++;
      current_target =
        path_idx < path.length
          ? /** @type {Element} */
            path[path_idx]
          : null;
    }
    if (throw_error) {
      for (let error of other_errors) {
        queueMicrotask(() => {
          throw error;
        });
      }
      throw throw_error;
    }
  } finally {
    event2[event_symbol] = handler_element;
    delete event2.currentTarget;
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/reconciler.js
var policy =
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  globalThis?.window?.trustedTypes &&
  /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy(
    "svelte-trusted-html",
    {
      /** @param {string} html */
      createHTML: (html2) => {
        return html2;
      },
    },
  );
function create_trusted_html(html2) {
  return (
    /** @type {string} */
    policy?.createHTML(html2) ?? html2
  );
}
function create_fragment_from_html(html2) {
  var elem = create_element("template");
  elem.innerHTML = create_trusted_html(html2.replaceAll("<!>", "<!---->"));
  return elem.content;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/template.js
function assign_nodes(start, end) {
  var effect2 =
    /** @type {Effect} */
    active_effect;
  if (effect2.nodes === null) {
    effect2.nodes = { start, end, a: null, t: null };
  }
}
// @__NO_SIDE_EFFECTS__
function from_html(content, flags2) {
  var is_fragment = (flags2 & TEMPLATE_FRAGMENT) !== 0;
  var use_import_node = (flags2 & TEMPLATE_USE_IMPORT_NODE) !== 0;
  var node;
  var has_start = !content.startsWith("<!>");
  return () => {
    if (hydrating) {
      assign_nodes(hydrate_node, null);
      return hydrate_node;
    }
    if (node === void 0) {
      node = create_fragment_from_html(has_start ? content : "<!>" + content);
      if (!is_fragment)
        node = /** @type {TemplateNode} */ get_first_child(node);
    }
    var clone =
      /** @type {TemplateNode} */
      use_import_node || is_firefox
        ? document.importNode(node, true)
        : node.cloneNode(true);
    if (is_fragment) {
      var start =
        /** @type {TemplateNode} */
        get_first_child(clone);
      var end =
        /** @type {TemplateNode} */
        clone.lastChild;
      assign_nodes(start, end);
    } else {
      assign_nodes(clone, clone);
    }
    return clone;
  };
}
function text(value = "") {
  if (!hydrating) {
    var t = create_text(value + "");
    assign_nodes(t, t);
    return t;
  }
  var node = hydrate_node;
  if (node.nodeType !== TEXT_NODE) {
    node.before((node = create_text()));
    set_hydrate_node(node);
  } else {
    merge_text_nodes(
      /** @type {Text} */
      node,
    );
  }
  assign_nodes(node, node);
  return node;
}
function comment() {
  if (hydrating) {
    assign_nodes(hydrate_node, null);
    return hydrate_node;
  }
  var frag = document.createDocumentFragment();
  var start = document.createComment("");
  var anchor = create_text();
  frag.append(start, anchor);
  assign_nodes(start, anchor);
  return frag;
}
function append(anchor, dom) {
  if (hydrating) {
    var effect2 =
      /** @type {Effect & { nodes: EffectNodes }} */
      active_effect;
    if ((effect2.f & REACTION_RAN) === 0 || effect2.nodes.end === null) {
      effect2.nodes.end = hydrate_node;
    }
    hydrate_next();
    return;
  }
  if (anchor === null) {
    return;
  }
  anchor.before(
    /** @type {Node} */
    dom,
  );
}
function props_id() {
  if (
    hydrating &&
    hydrate_node &&
    hydrate_node.nodeType === COMMENT_NODE &&
    hydrate_node.textContent?.startsWith(`$`)
  ) {
    const id = hydrate_node.textContent.substring(1);
    hydrate_next();
    return id;
  }
  (window.__svelte ??= {}).uid ??= 1;
  return `c${window.__svelte.uid++}`;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/reactivity/create-subscriber.js
function createSubscriber(start) {
  let subscribers = 0;
  let version = source(0);
  let stop;
  if (dev_fallback_default) {
    tag(version, "createSubscriber version");
  }
  return () => {
    if (effect_tracking()) {
      get(version);
      render_effect(() => {
        if (subscribers === 0) {
          stop = untrack(() => start(() => increment(version)));
        }
        subscribers += 1;
        return () => {
          queue_micro_task(() => {
            subscribers -= 1;
            if (subscribers === 0) {
              stop?.();
              stop = void 0;
              increment(version);
            }
          });
        };
      });
    }
  };
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;
function boundary(node, props, children, transform_error) {
  new Boundary(node, props, children, transform_error);
}
var Boundary = class {
  /** @type {Boundary | null} */
  parent;
  is_pending = false;
  /**
   * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
   * Inherited from parent boundary, or defaults to identity.
   * @type {(error: unknown) => unknown}
   */
  transform_error;
  /** @type {TemplateNode} */
  #anchor;
  /** @type {TemplateNode | null} */
  #hydrate_open = hydrating ? hydrate_node : null;
  /** @type {BoundaryProps} */
  #props;
  /** @type {((anchor: Node) => void)} */
  #children;
  /** @type {Effect} */
  #effect;
  /** @type {Effect | null} */
  #main_effect = null;
  /** @type {Effect | null} */
  #pending_effect = null;
  /** @type {Effect | null} */
  #failed_effect = null;
  /** @type {DocumentFragment | null} */
  #offscreen_fragment = null;
  #local_pending_count = 0;
  #pending_count = 0;
  #pending_count_update_queued = false;
  /** @type {Set<Effect>} */
  #dirty_effects = /* @__PURE__ */ new Set();
  /** @type {Set<Effect>} */
  #maybe_dirty_effects = /* @__PURE__ */ new Set();
  /**
   * A source containing the number of pending async deriveds/expressions.
   * Only created if `$effect.pending()` is used inside the boundary,
   * otherwise updating the source results in needless `Batch.ensure()`
   * calls followed by no-op flushes
   * @type {Source<number> | null}
   */
  #effect_pending = null;
  #effect_pending_subscriber = createSubscriber(() => {
    this.#effect_pending = source(this.#local_pending_count);
    if (dev_fallback_default) {
      tag(this.#effect_pending, "$effect.pending()");
    }
    return () => {
      this.#effect_pending = null;
    };
  });
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   * @param {((error: unknown) => unknown) | undefined} [transform_error]
   */
  constructor(node, props, children, transform_error) {
    this.#anchor = node;
    this.#props = props;
    this.#children = (anchor) => {
      var effect2 =
        /** @type {Effect} */
        active_effect;
      effect2.b = this;
      effect2.f |= BOUNDARY_EFFECT;
      children(anchor);
    };
    this.parent = /** @type {Effect} */ active_effect.b;
    this.transform_error =
      transform_error ?? this.parent?.transform_error ?? ((e) => e);
    this.#effect = block(() => {
      if (hydrating) {
        const comment_data = read_hydration_instruction(
          /** @type {TemplateNode} */
          this.#hydrate_open,
        );
        hydrate_next();
        const server_rendered_pending = comment_data === HYDRATION_START_ELSE;
        const server_rendered_failed = comment_data.startsWith(
          HYDRATION_START_FAILED,
        );
        if (server_rendered_failed) {
          const serialized_error = JSON.parse(
            comment_data.slice(HYDRATION_START_FAILED.length),
          );
          this.#hydrate_failed_content(serialized_error);
        } else if (server_rendered_pending) {
          this.#hydrate_pending_content();
        } else {
          this.#hydrate_resolved_content();
        }
      } else {
        this.#render();
      }
    }, flags);
    if (hydrating) {
      this.#anchor = hydrate_node;
    }
  }
  #hydrate_resolved_content() {
    try {
      this.#main_effect = branch(() => this.#children(this.#anchor));
    } catch (error) {
      this.error(error);
    }
  }
  /**
   * @param {unknown} error The deserialized error from the server's hydration comment
   */
  #hydrate_failed_content(error) {
    const failed = this.#props.failed;
    const { reset: reset2, invoke_onerror } = this.#create_reset(error);
    queue_micro_task(invoke_onerror);
    if (!failed) return;
    this.#failed_effect = branch(() => {
      failed(
        this.#anchor,
        () => error,
        () => reset2,
      );
    });
  }
  /**
   * Creates the `reset` function for a failed boundary, along with a function
   * that invokes `onerror` with it (if provided)
   * @param {unknown} error
   * @returns {{ reset: () => void, invoke_onerror: () => void }}
   */
  #create_reset(error) {
    var did_reset = false;
    var calling_on_error = false;
    const reset2 = () => {
      if (this.#is_destroyed()) return;
      if (did_reset) {
        svelte_boundary_reset_noop();
        return;
      }
      did_reset = true;
      if (calling_on_error) {
        svelte_boundary_reset_onerror();
      }
      if (this.#failed_effect !== null) {
        pause_effect(this.#failed_effect, () => {
          this.#failed_effect = null;
        });
      }
      this.#run(() => {
        this.#render();
      });
    };
    const invoke_onerror = () => {
      if (this.#is_destroyed()) return;
      try {
        calling_on_error = true;
        this.#props.onerror?.(error, reset2);
        calling_on_error = false;
      } catch (err) {
        invoke_error_boundary(err, this.#effect && this.#effect.parent);
      }
    };
    return { reset: reset2, invoke_onerror };
  }
  #is_destroyed() {
    return (this.#effect.f & (DESTROYED | DESTROYING)) !== 0;
  }
  #hydrate_pending_content() {
    const pending2 = this.#props.pending;
    if (!pending2) return;
    this.is_pending = true;
    this.#pending_effect = branch(() => pending2(this.#anchor));
    queue_micro_task(() => {
      if (this.#is_destroyed()) return;
      var fragment = (this.#offscreen_fragment =
        document.createDocumentFragment());
      var anchor = create_text();
      var handled = false;
      fragment.append(anchor);
      this.#main_effect = this.#run(() => {
        try {
          return branch(() => this.#children(anchor));
        } catch (error) {
          try {
            this.error(error);
            handled = true;
          } catch (error2) {
            invoke_error_boundary(error2, this.#effect.parent);
          }
          return null;
        }
      });
      if (this.#main_effect === null) {
        this.#offscreen_fragment = null;
        if (handled)
          this.#resolve(
            /** @type {Batch} */
            current_batch,
          );
        return;
      }
      if (this.#pending_count === 0) {
        this.#anchor.before(fragment);
        this.#offscreen_fragment = null;
        pause_effect(
          /** @type {Effect} */
          this.#pending_effect,
          () => {
            this.#pending_effect = null;
          },
        );
        this.#resolve(
          /** @type {Batch} */
          current_batch,
        );
      }
    });
  }
  #render() {
    try {
      this.is_pending = this.has_pending_snippet();
      this.#pending_count = 0;
      this.#local_pending_count = 0;
      this.#main_effect = branch(() => {
        this.#children(this.#anchor);
      });
      if (this.#pending_count > 0) {
        var fragment = (this.#offscreen_fragment =
          document.createDocumentFragment());
        move_effect(this.#main_effect, fragment);
        const pending2 =
          /** @type {(anchor: Node) => void} */
          this.#props.pending;
        this.#pending_effect = branch(() => pending2(this.#anchor));
      } else {
        this.#resolve(
          /** @type {Batch} */
          current_batch,
        );
      }
    } catch (error) {
      this.error(error);
    }
  }
  /**
   * @param {Batch} batch
   */
  #resolve(batch) {
    this.is_pending = false;
    batch.transfer_effects(this.#dirty_effects, this.#maybe_dirty_effects);
  }
  /**
   * Defer an effect inside a pending boundary until the boundary resolves
   * @param {Effect} effect
   */
  defer_effect(effect2) {
    defer_effect(effect2, this.#dirty_effects, this.#maybe_dirty_effects);
  }
  /**
   * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!this.#props.pending;
  }
  /**
   * @template T
   * @param {() => T} fn
   */
  #run(fn) {
    var previous_effect = active_effect;
    var previous_reaction = active_reaction;
    var previous_ctx = component_context;
    set_active_effect(this.#effect);
    set_active_reaction(this.#effect);
    set_component_context(this.#effect.ctx);
    try {
      Batch.ensure();
      return fn();
    } finally {
      set_active_effect(previous_effect);
      set_active_reaction(previous_reaction);
      set_component_context(previous_ctx);
    }
  }
  /**
   * Updates the pending count associated with the currently visible pending snippet,
   * if any, such that we can replace the snippet with content once work is done
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  #update_pending_count(d, batch) {
    if (!this.has_pending_snippet()) {
      if (this.parent) {
        this.parent.#update_pending_count(d, batch);
      }
      return;
    }
    this.#pending_count += d;
    if (this.#pending_count === 0) {
      this.#resolve(batch);
      if (this.#pending_effect) {
        pause_effect(this.#pending_effect, () => {
          this.#pending_effect = null;
        });
      }
      if (this.#offscreen_fragment) {
        this.#anchor.before(this.#offscreen_fragment);
        this.#offscreen_fragment = null;
      }
    }
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  update_pending_count(d, batch) {
    this.#update_pending_count(d, batch);
    this.#local_pending_count += d;
    if (!this.#effect_pending || this.#pending_count_update_queued) return;
    this.#pending_count_update_queued = true;
    queue_micro_task(() => {
      this.#pending_count_update_queued = false;
      if (this.#effect_pending) {
        internal_set(this.#effect_pending, this.#local_pending_count);
      }
    });
  }
  get_effect_pending() {
    this.#effect_pending_subscriber();
    return get(
      /** @type {Source<number>} */
      this.#effect_pending,
    );
  }
  /** @param {unknown} error */
  error(error) {
    if (error === HYDRATION_ERROR) {
      throw error;
    }
    if (!this.#props.onerror && !this.#props.failed) {
      throw error;
    }
    if (current_batch?.is_fork) {
      if (this.#main_effect) current_batch.skip_effect(this.#main_effect);
      if (this.#pending_effect) current_batch.skip_effect(this.#pending_effect);
      if (this.#failed_effect) current_batch.skip_effect(this.#failed_effect);
      current_batch.oncommit(() => {
        if (!this.#is_destroyed()) this.#handle_error(error);
      });
    } else {
      this.#handle_error(error);
    }
  }
  /**
   * @param {unknown} error
   */
  #handle_error(error) {
    if (this.#main_effect) {
      destroy_effect(this.#main_effect);
      this.#main_effect = null;
    }
    if (this.#pending_effect) {
      destroy_effect(this.#pending_effect);
      this.#pending_effect = null;
    }
    if (this.#failed_effect) {
      destroy_effect(this.#failed_effect);
      this.#failed_effect = null;
    }
    if (hydrating) {
      set_hydrate_node(
        /** @type {TemplateNode} */
        this.#hydrate_open,
      );
      next();
      set_hydrate_node(skip_nodes());
    }
    let failed = this.#props.failed;
    const handle_error_result = (transformed_error) => {
      if (this.#is_destroyed()) return;
      const { reset: reset2, invoke_onerror } =
        this.#create_reset(transformed_error);
      invoke_onerror();
      if (failed && !this.#is_destroyed()) {
        this.#failed_effect = this.#run(() => {
          try {
            return branch(() => {
              var effect2 =
                /** @type {Effect} */
                active_effect;
              effect2.b = this;
              effect2.f |= BOUNDARY_EFFECT;
              failed(
                this.#anchor,
                () => transformed_error,
                () => reset2,
              );
            });
          } catch (error2) {
            invoke_error_boundary(
              error2,
              /** @type {Effect} */
              this.#effect.parent,
            );
            return null;
          }
        });
      }
    };
    queue_micro_task(() => {
      if (this.#is_destroyed()) return;
      var result;
      try {
        result = this.transform_error(error);
      } catch (e) {
        invoke_error_boundary(e, this.#effect && this.#effect.parent);
        return;
      }
      if (
        result !== null &&
        typeof result === "object" &&
        typeof (/** @type {any} */ result.then) === "function"
      ) {
        result.then(
          handle_error_result,
          /** @param {unknown} e */
          (e) => invoke_error_boundary(e, this.#effect && this.#effect.parent),
        );
      } else {
        handle_error_result(result);
      }
    });
  }
};

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/render.js
var should_intro = true;
function set_text(text2, value) {
  var str = value == null ? "" : typeof value === "object" ? `${value}` : value;
  if (str !== /** @type {any} */ (text2[TEXT_CACHE] ??= text2.nodeValue)) {
    text2[TEXT_CACHE] = str;
    text2.nodeValue = `${str}`;
  }
}
function mount(component2, options) {
  return _mount(component2, options);
}
function hydrate(component2, options) {
  init_operations();
  options.intro = options.intro ?? false;
  const target = options.target;
  const was_hydrating = hydrating;
  const previous_hydrate_node = hydrate_node;
  try {
    var anchor = get_first_child(target);
    while (
      anchor &&
      (anchor.nodeType !== COMMENT_NODE ||
        /** @type {Comment} */
        anchor.data !== HYDRATION_START)
    ) {
      anchor = get_next_sibling(anchor);
    }
    if (!anchor) {
      throw HYDRATION_ERROR;
    }
    set_hydrating(true);
    set_hydrate_node(
      /** @type {Comment} */
      anchor,
    );
    const instance = _mount(component2, { ...options, anchor });
    set_hydrating(false);
    return (
      /**  @type {Exports} */
      instance
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message
        .split("\n")
        .some((line) => line.startsWith("https://svelte.dev/e/"))
    ) {
      throw error;
    }
    if (error !== HYDRATION_ERROR) {
      console.warn("Failed to hydrate: ", error);
    }
    if (options.recover === false) {
      hydration_failed();
    }
    init_operations();
    clear_text_content(target);
    set_hydrating(false);
    return mount(component2, options);
  } finally {
    set_hydrating(was_hydrating);
    set_hydrate_node(previous_hydrate_node);
  }
}
var listeners = /* @__PURE__ */ new Map();
function _mount(
  Component,
  { target, anchor, props = {}, events, context, intro = true, transformError },
) {
  init_operations();
  var component2 = void 0;
  var unmount2 = component_root(() => {
    var anchor_node = anchor ?? target.appendChild(create_text());
    boundary(
      /** @type {TemplateNode} */
      anchor_node,
      {
        pending: () => {},
      },
      (anchor_node2) => {
        push({});
        var ctx =
          /** @type {ComponentContext} */
          component_context;
        if (context) ctx.c = context;
        if (events) {
          props.$$events = events;
        }
        if (hydrating) {
          assign_nodes(
            /** @type {TemplateNode} */
            anchor_node2,
            null,
          );
        }
        should_intro = intro;
        component2 = Component(anchor_node2, props) || mark_as_component();
        should_intro = true;
        if (hydrating) {
          active_effect.nodes.end = hydrate_node;
          if (
            hydrate_node === null ||
            hydrate_node.nodeType !== COMMENT_NODE ||
            /** @type {Comment} */
            hydrate_node.data !== HYDRATION_END
          ) {
            hydration_mismatch();
            throw HYDRATION_ERROR;
          }
        }
        pop();
      },
      transformError,
    );
    var registered_events = /* @__PURE__ */ new Set();
    var event_handle = (events2) => {
      for (var i = 0; i < events2.length; i++) {
        var event_name = events2[i];
        if (registered_events.has(event_name)) continue;
        registered_events.add(event_name);
        var passive2 = is_passive_event(event_name);
        for (const node of [target, document]) {
          var counts = listeners.get(node);
          if (counts === void 0) {
            counts = /* @__PURE__ */ new Map();
            listeners.set(node, counts);
          }
          var count = counts.get(event_name);
          if (count === void 0) {
            node.addEventListener(event_name, handle_event_propagation, {
              passive: passive2,
            });
            counts.set(event_name, 1);
          } else {
            counts.set(event_name, count + 1);
          }
        }
      }
    };
    event_handle(array_from(all_registered_events));
    root_event_handles.add(event_handle);
    return () => {
      for (var event_name of registered_events) {
        for (const node of [target, document]) {
          var counts =
            /** @type {Map<string, number>} */
            listeners.get(node);
          var count =
            /** @type {number} */
            counts.get(event_name);
          if (--count == 0) {
            node.removeEventListener(event_name, handle_event_propagation);
            counts.delete(event_name);
            if (counts.size === 0) {
              listeners.delete(node);
            }
          } else {
            counts.set(event_name, count);
          }
        }
      }
      root_event_handles.delete(event_handle);
      if (anchor_node !== anchor) {
        anchor_node.parentNode?.removeChild(anchor_node);
      }
    };
  });
  mounted_components.set(component2, unmount2);
  return component2;
}
var mounted_components = /* @__PURE__ */ new WeakMap();
function unmount(component2, options) {
  const fn = mounted_components.get(component2);
  if (fn) {
    mounted_components.delete(component2);
    return fn(options);
  }
  if (dev_fallback_default) {
    lifecycle_double_unmount();
  }
  return Promise.resolve();
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var BranchManager = class {
  /** @type {TemplateNode} */
  anchor;
  /** @type {Map<Batch, Key>} */
  #batches = /* @__PURE__ */ new Map();
  /**
   * Map of keys to effects that are currently rendered in the DOM.
   * These effects are visible and actively part of the document tree.
   * Example:
   * ```
   * {#if condition}
   * 	foo
   * {:else}
   * 	bar
   * {/if}
   * ```
   * Can result in the entries `true->Effect` and `false->Effect`
   * @type {Map<Key, Effect>}
   */
  #onscreen = /* @__PURE__ */ new Map();
  /**
   * Similar to #onscreen with respect to the keys, but contains branches that are not yet
   * in the DOM, because their insertion is deferred.
   * @type {Map<Key, Branch>}
   */
  #offscreen = /* @__PURE__ */ new Map();
  /**
   * Keys of effects that are currently outroing
   * @type {Set<Key>}
   */
  #outroing = /* @__PURE__ */ new Set();
  /**
   * Whether to pause (i.e. outro) on change, or destroy immediately.
   * This is necessary for `<svelte:element>`
   */
  #transition = true;
  /**
   * @param {TemplateNode} anchor
   * @param {boolean} transition
   */
  constructor(anchor, transition2 = true) {
    this.anchor = anchor;
    this.#transition = transition2;
  }
  /**
   * @param {Batch} batch
   */
  #commit = (batch) => {
    if (!this.#batches.has(batch)) return;
    var key2 =
      /** @type {Key} */
      this.#batches.get(batch);
    var onscreen = this.#onscreen.get(key2);
    if (onscreen) {
      resume_effect(onscreen);
      this.#outroing.delete(key2);
    } else {
      var offscreen = this.#offscreen.get(key2);
      if (offscreen) {
        resume_effect(offscreen.effect);
        this.#onscreen.set(key2, offscreen.effect);
        this.#offscreen.delete(key2);
        if (dev_fallback_default) {
          offscreen.fragment.lastChild[HMR_ANCHOR] = this.anchor;
        }
        offscreen.fragment.lastChild.remove();
        this.anchor.before(offscreen.fragment);
        onscreen = offscreen.effect;
      }
    }
    for (const [b, k] of this.#batches) {
      this.#batches.delete(b);
      if (b === batch) {
        break;
      }
      const offscreen2 = this.#offscreen.get(k);
      if (offscreen2) {
        destroy_effect(offscreen2.effect);
        this.#offscreen.delete(k);
      }
    }
    for (const [k, effect2] of this.#onscreen) {
      if (k === key2 || this.#outroing.has(k)) continue;
      const on_destroy = () => {
        const keys = Array.from(this.#batches.values());
        if (keys.includes(k)) {
          var fragment = document.createDocumentFragment();
          move_effect(effect2, fragment);
          fragment.append(create_text());
          this.#offscreen.set(k, { effect: effect2, fragment });
        } else {
          destroy_effect(effect2);
        }
        this.#outroing.delete(k);
        this.#onscreen.delete(k);
      };
      if (this.#transition || !onscreen) {
        this.#outroing.add(k);
        pause_effect(effect2, on_destroy, false);
      } else {
        on_destroy();
      }
    }
  };
  /**
   * @param {Batch} batch
   */
  #discard = (batch) => {
    this.#batches.delete(batch);
    const keys = Array.from(this.#batches.values());
    for (const [k, branch2] of this.#offscreen) {
      if (!keys.includes(k)) {
        destroy_effect(branch2.effect);
        this.#offscreen.delete(k);
      }
    }
  };
  /**
   *
   * @param {any} key
   * @param {null | ((target: TemplateNode) => void)} fn
   */
  ensure(key2, fn) {
    var batch =
      /** @type {Batch} */
      current_batch;
    var defer = should_defer_append();
    if (fn && !this.#onscreen.has(key2) && !this.#offscreen.has(key2)) {
      if (defer) {
        var fragment = document.createDocumentFragment();
        var target = create_text();
        fragment.append(target);
        this.#offscreen.set(key2, {
          effect: branch(() => fn(target)),
          fragment,
        });
      } else {
        this.#onscreen.set(
          key2,
          branch(() => fn(this.anchor)),
        );
      }
    }
    this.#batches.set(batch, key2);
    if (defer) {
      for (const [k, effect2] of this.#onscreen) {
        if (k === key2) {
          batch.unskip_effect(effect2);
        } else {
          batch.skip_effect(effect2);
        }
      }
      for (const [k, branch2] of this.#offscreen) {
        if (k === key2) {
          batch.unskip_effect(branch2.effect);
        } else {
          batch.skip_effect(branch2.effect);
        }
      }
      batch.oncommit(this.#commit);
      batch.ondiscard(this.#discard);
    } else {
      if (hydrating) {
        this.anchor = hydrate_node;
      }
      this.#commit(batch);
    }
  }
};

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/if.js
function if_block(node, fn, elseif = false) {
  var marker;
  if (hydrating) {
    marker = hydrate_node;
    hydrate_next();
  }
  var branches = new BranchManager(node);
  var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
  function update_branch(key2, fn2) {
    if (hydrating) {
      var data = read_hydration_instruction(
        /** @type {TemplateNode} */
        marker,
      );
      if (key2 !== parseInt(data.substring(1))) {
        var anchor = skip_nodes();
        set_hydrate_node(anchor);
        branches.anchor = anchor;
        set_hydrating(false);
        branches.ensure(key2, fn2);
        set_hydrating(true);
        return;
      }
    }
    branches.ensure(key2, fn2);
  }
  block(() => {
    var has_branch = false;
    fn((fn2, key2 = 0) => {
      has_branch = true;
      update_branch(key2, fn2);
    });
    if (!has_branch) {
      update_branch(-1, null);
    }
  }, flags2);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/key.js
var NAN = /* @__PURE__ */ Symbol("NaN");
function key(node, get_key, render_fn) {
  if (hydrating) {
    hydrate_next();
  }
  var branches = new BranchManager(node);
  var legacy = !is_runes();
  block(() => {
    var key2 = get_key();
    if (key2 !== key2) {
      key2 = /** @type {any} */ NAN;
    }
    if (legacy && key2 !== null && typeof key2 === "object") {
      key2 = /** @type {V} */ {};
    }
    branches.ensure(key2, render_fn);
  });
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/each.js
function index(_, i) {
  return i;
}
function pause_effects(state2, to_destroy, controlled_anchor) {
  var transitions = [];
  var length = to_destroy.length;
  var group;
  var remaining = to_destroy.length;
  for (var i = 0; i < length; i++) {
    let effect2 = to_destroy[i];
    pause_effect(
      effect2,
      () => {
        if (group) {
          group.pending.delete(effect2);
          group.done.add(effect2);
          if (group.pending.size === 0) {
            var groups =
              /** @type {Set<EachOutroGroup>} */
              state2.outrogroups;
            destroy_effects(state2, array_from(group.done));
            groups.delete(group);
            if (groups.size === 0) {
              state2.outrogroups = null;
            }
          }
        } else {
          remaining -= 1;
        }
      },
      false,
    );
  }
  if (remaining === 0) {
    var fast_path =
      transitions.length === 0 &&
      controlled_anchor !== null &&
      state2.pending.size === 0;
    if (fast_path) {
      var anchor =
        /** @type {Element} */
        controlled_anchor;
      var parent_node =
        /** @type {Element} */
        anchor.parentNode;
      clear_text_content(parent_node);
      parent_node.append(anchor);
      state2.items.clear();
    }
    destroy_effects(state2, to_destroy, !fast_path);
  } else {
    group = {
      pending: new Set(to_destroy),
      done: /* @__PURE__ */ new Set(),
    };
    (state2.outrogroups ??= /* @__PURE__ */ new Set()).add(group);
  }
}
function destroy_effects(state2, to_destroy, remove_dom = true) {
  var preserved_effects;
  if (state2.pending.size > 0) {
    preserved_effects = /* @__PURE__ */ new Set();
    for (const keys of state2.pending.values()) {
      for (const key2 of keys) {
        preserved_effects.add(
          /** @type {EachItem} */
          state2.items.get(key2).e,
        );
      }
    }
  }
  for (var i = 0; i < to_destroy.length; i++) {
    var e = to_destroy[i];
    if (preserved_effects?.has(e)) {
      e.f |= EFFECT_OFFSCREEN;
      const fragment = document.createDocumentFragment();
      move_effect(e, fragment);
    } else {
      destroy_effect(to_destroy[i], remove_dom);
    }
  }
}
var offscreen_anchor;
function each(
  node,
  flags2,
  get_collection,
  get_key,
  render_fn,
  fallback_fn = null,
) {
  var anchor = node;
  var items = /* @__PURE__ */ new Map();
  var is_controlled = (flags2 & EACH_IS_CONTROLLED) !== 0;
  if (is_controlled) {
    var parent_node =
      /** @type {Element} */
      node;
    anchor = hydrating
      ? set_hydrate_node(get_first_child(parent_node))
      : parent_node.appendChild(create_text());
  }
  if (hydrating) {
    hydrate_next();
  }
  var fallback2 = null;
  var each_array = derived_safe_equal(() => {
    var collection = get_collection();
    return (
      /** @type {V[]} */
      is_array(collection)
        ? collection
        : collection == null
          ? []
          : array_from(collection)
    );
  });
  if (dev_fallback_default) {
    tag(each_array, "{#each ...}");
  }
  var pending2 = /* @__PURE__ */ new Map();
  var first_run = true;
  function commit(batch) {
    if ((state2.effect.f & DESTROYED) !== 0) {
      return;
    }
    state2.pending.delete(batch);
    var array = get(each_array);
    state2.fallback = fallback2;
    reconcile(state2, array, anchor, flags2, get_key);
    if (fallback2 !== null) {
      if (array.length === 0) {
        if ((fallback2.f & EFFECT_OFFSCREEN) === 0) {
          resume_effect(fallback2);
        } else {
          fallback2.f ^= EFFECT_OFFSCREEN;
          move(fallback2, null, anchor);
        }
      } else {
        pause_effect(fallback2, () => {
          fallback2 = null;
        });
      }
    }
  }
  function discard(batch) {
    state2.pending.delete(batch);
  }
  var effect2 = block(() => {
    var array =
      /** @type {V[]} */
      get(each_array);
    var length = array.length;
    let mismatch = false;
    if (hydrating) {
      var is_else = read_hydration_instruction(anchor) === HYDRATION_START_ELSE;
      if (is_else !== (length === 0)) {
        anchor = skip_nodes();
        set_hydrate_node(anchor);
        set_hydrating(false);
        mismatch = true;
      }
    }
    var keys = /* @__PURE__ */ new Set();
    var batch =
      /** @type {Batch} */
      current_batch;
    var defer = should_defer_append();
    for (var index2 = 0; index2 < length; index2 += 1) {
      if (
        hydrating &&
        hydrate_node.nodeType === COMMENT_NODE &&
        /** @type {Comment} */
        hydrate_node.data === HYDRATION_END
      ) {
        anchor = /** @type {Comment} */ hydrate_node;
        mismatch = true;
        set_hydrating(false);
      }
      var value = array[index2];
      var key2 = get_key(value, index2);
      if (dev_fallback_default) {
        var key_again = get_key(value, index2);
        if (key2 !== key_again) {
          each_key_volatile(String(index2), String(key2), String(key_again));
        }
      }
      var item = first_run ? null : items.get(key2);
      if (item) {
        if (item.v) internal_set(item.v, value);
        if (item.i) internal_set(item.i, index2);
        if (defer) {
          batch.unskip_effect(item.e);
        }
      } else {
        item = create_item(
          items,
          first_run ? anchor : (offscreen_anchor ??= create_text()),
          value,
          key2,
          index2,
          render_fn,
          flags2,
          get_collection,
        );
        if (!first_run) {
          item.e.f |= EFFECT_OFFSCREEN;
        }
        items.set(key2, item);
      }
      keys.add(key2);
    }
    if (length === 0 && fallback_fn && !fallback2) {
      if (first_run) {
        fallback2 = branch(() => fallback_fn(anchor));
      } else {
        fallback2 = branch(() =>
          fallback_fn((offscreen_anchor ??= create_text())),
        );
        fallback2.f |= EFFECT_OFFSCREEN;
      }
    }
    if (length > keys.size) {
      if (dev_fallback_default) {
        validate_each_keys(array, get_key);
      } else {
        each_key_duplicate("", "", "");
      }
    }
    if (hydrating && length > 0) {
      set_hydrate_node(skip_nodes());
    }
    if (!first_run) {
      pending2.set(batch, keys);
      if (defer) {
        for (const [key3, item2] of items) {
          if (!keys.has(key3)) {
            batch.skip_effect(item2.e);
          }
        }
        batch.oncommit(commit);
        batch.ondiscard(discard);
      } else {
        commit(batch);
      }
    }
    if (mismatch) {
      set_hydrating(true);
    }
    get(each_array);
  });
  var state2 = {
    effect: effect2,
    flags: flags2,
    items,
    pending: pending2,
    outrogroups: null,
    fallback: fallback2,
  };
  first_run = false;
  if (hydrating) {
    anchor = hydrate_node;
  }
}
function skip_to_branch(effect2) {
  while (effect2 !== null && (effect2.f & BRANCH_EFFECT) === 0) {
    effect2 = effect2.next;
  }
  return effect2;
}
function reconcile(state2, array, anchor, flags2, get_key) {
  var is_animated = (flags2 & EACH_IS_ANIMATED) !== 0;
  var length = array.length;
  var items = state2.items;
  var current = skip_to_branch(state2.effect.first);
  var seen2;
  var prev = null;
  var to_animate;
  var matched = [];
  var stashed = [];
  var value;
  var key2;
  var effect2;
  var i;
  if (is_animated) {
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key2 = get_key(value, i);
      effect2 = /** @type {EachItem} */ items.get(key2).e;
      if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
        effect2.nodes?.a?.measure();
        (to_animate ??= /* @__PURE__ */ new Set()).add(effect2);
      }
    }
  }
  for (i = 0; i < length; i += 1) {
    value = array[i];
    key2 = get_key(value, i);
    effect2 = /** @type {EachItem} */ items.get(key2).e;
    if (state2.outrogroups !== null) {
      for (const group of state2.outrogroups) {
        group.pending.delete(effect2);
        group.done.delete(effect2);
      }
    }
    if ((effect2.f & INERT) !== 0) {
      resume_effect(effect2);
      if (is_animated) {
        effect2.nodes?.a?.unfix();
        (to_animate ??= /* @__PURE__ */ new Set()).delete(effect2);
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) !== 0) {
      effect2.f ^= EFFECT_OFFSCREEN;
      if (effect2 === current) {
        move(effect2, null, anchor);
      } else {
        var next2 = prev ? prev.next : current;
        if (effect2 === state2.effect.last) {
          state2.effect.last = effect2.prev;
        }
        if (effect2.prev) effect2.prev.next = effect2.next;
        if (effect2.next) effect2.next.prev = effect2.prev;
        link(state2, prev, effect2);
        link(state2, effect2, next2);
        move(effect2, next2, anchor);
        prev = effect2;
        matched = [];
        stashed = [];
        current = skip_to_branch(prev.next);
        continue;
      }
    }
    if (effect2 !== current) {
      if (seen2 !== void 0 && seen2.has(effect2)) {
        if (matched.length < stashed.length) {
          var start = stashed[0];
          var j;
          prev = start.prev;
          var a = matched[0];
          var b = matched[matched.length - 1];
          for (j = 0; j < matched.length; j += 1) {
            move(matched[j], start, anchor);
          }
          for (j = 0; j < stashed.length; j += 1) {
            seen2.delete(stashed[j]);
          }
          link(state2, a.prev, b.next);
          link(state2, prev, a);
          link(state2, b, start);
          current = start;
          prev = b;
          i -= 1;
          matched = [];
          stashed = [];
        } else {
          seen2.delete(effect2);
          move(effect2, current, anchor);
          link(state2, effect2.prev, effect2.next);
          link(
            state2,
            effect2,
            prev === null ? state2.effect.first : prev.next,
          );
          link(state2, prev, effect2);
          prev = effect2;
        }
        continue;
      }
      matched = [];
      stashed = [];
      while (current !== null && current !== effect2) {
        (seen2 ??= /* @__PURE__ */ new Set()).add(current);
        stashed.push(current);
        current = skip_to_branch(current.next);
      }
      if (current === null) {
        continue;
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
      matched.push(effect2);
    }
    prev = effect2;
    current = skip_to_branch(effect2.next);
  }
  if (state2.outrogroups !== null) {
    for (const group of state2.outrogroups) {
      if (group.pending.size === 0) {
        destroy_effects(state2, array_from(group.done));
        state2.outrogroups?.delete(group);
      }
    }
    if (state2.outrogroups.size === 0) {
      state2.outrogroups = null;
    }
  }
  if (current !== null || seen2 !== void 0) {
    var to_destroy = [];
    if (seen2 !== void 0) {
      for (effect2 of seen2) {
        if ((effect2.f & INERT) === 0) {
          to_destroy.push(effect2);
        }
      }
    }
    while (current !== null) {
      if ((current.f & INERT) === 0 && current !== state2.fallback) {
        to_destroy.push(current);
      }
      current = skip_to_branch(current.next);
    }
    var destroy_length = to_destroy.length;
    if (destroy_length > 0) {
      var controlled_anchor =
        (flags2 & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
      if (is_animated) {
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].nodes?.a?.measure();
        }
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].nodes?.a?.fix();
        }
      }
      pause_effects(state2, to_destroy, controlled_anchor);
    }
  }
  if (is_animated) {
    queue_micro_task(() => {
      if (to_animate === void 0) return;
      for (effect2 of to_animate) {
        effect2.nodes?.a?.apply();
      }
    });
  }
}
function create_item(
  items,
  anchor,
  value,
  key2,
  index2,
  render_fn,
  flags2,
  get_collection,
) {
  var v =
    (flags2 & EACH_ITEM_REACTIVE) !== 0
      ? (flags2 & EACH_ITEM_IMMUTABLE) === 0
        ? mutable_source(value, false, false)
        : source(value)
      : null;
  var i = (flags2 & EACH_INDEX_REACTIVE) !== 0 ? source(index2) : null;
  if (dev_fallback_default && v) {
    v.trace = () => {
      get_collection()[i?.v ?? index2];
    };
  }
  return {
    v,
    i,
    e: branch(() => {
      render_fn(anchor, v ?? value, i ?? index2, get_collection);
      return () => {
        items.delete(key2);
      };
    }),
  };
}
function move(effect2, next2, anchor) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  var dest =
    next2 && (next2.f & EFFECT_OFFSCREEN) === 0
      ? /** @type {EffectNodes} */
        next2.nodes.start
      : anchor;
  while (node !== null) {
    var next_node =
      /** @type {TemplateNode} */
      get_next_sibling(node);
    dest.before(node);
    if (node === end) {
      return;
    }
    node = next_node;
  }
}
function link(state2, prev, next2) {
  if (prev === null) {
    state2.effect.first = next2;
  } else {
    prev.next = next2;
  }
  if (next2 === null) {
    state2.effect.last = prev;
  } else {
    next2.prev = prev;
  }
}
function validate_each_keys(array, key_fn) {
  const keys = /* @__PURE__ */ new Map();
  const length = array.length;
  for (let i = 0; i < length; i++) {
    const key2 = key_fn(array[i], i);
    if (keys.has(key2)) {
      const a = String(keys.get(key2));
      const b = String(i);
      let k = String(key2);
      if (k.startsWith("[object ")) k = null;
      each_key_duplicate(a, b, k);
    }
    keys.set(key2, i);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/snippet.js
function snippet(node, get_snippet, ...args) {
  var branches = new BranchManager(node);
  block(() => {
    const snippet2 = get_snippet() ?? null;
    if (dev_fallback_default && snippet2 == null) {
      invalid_snippet();
    }
    branches.ensure(
      snippet2,
      snippet2 && ((anchor) => snippet2(anchor, ...args)),
    );
  }, EFFECT_TRANSPARENT);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/css.js
function append_styles(anchor, css) {
  effect(() => {
    anchor = active_effect?.parent?.nodes?.start ?? anchor;
    var root28 = anchor.getRootNode();
    var target =
      /** @type {ShadowRoot} */
      root28.host
        ? /** @type {ShadowRoot} */
          root28
        : /** @type {Document} */
          (root28.head ?? /** @type {Document} */ root28.ownerDocument.head);
    if (!target.querySelector("#" + css.hash)) {
      const style = create_element("style");
      style.id = css.hash;
      style.textContent = css.code;
      target.appendChild(style);
      if (dev_fallback_default) {
        register_style(css.hash, style);
      }
    }
  });
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/actions.js
function action(dom, action2, get_value) {
  effect(() => {
    var payload = untrack(() => action2(dom, get_value?.()) || {});
    if (get_value && payload?.update) {
      var inited = false;
      var prev =
        /** @type {any} */
        {};
      render_effect(() => {
        var value = get_value();
        deep_read_state(value);
        if (inited && safe_not_equal(prev, value)) {
          prev = value;
          payload.update(value);
        }
      });
      inited = true;
    }
    if (payload?.destroy) {
      return () =>
        /** @type {Function} */
        payload.destroy();
    }
  });
}

// node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t,
    f,
    n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e)
    if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++)
        e[t] && (f = r(e[t])) && (n && (n += " "), (n += f));
    } else for (f in e) e[f] && (n && (n += " "), (n += f));
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++)
    (e = arguments[f]) && (t = r(e)) && (n && (n += " "), (n += t));
  return n;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/shared/attributes.js
function clsx2(value) {
  if (typeof value === "object") {
    return clsx(value);
  } else {
    return value ?? "";
  }
}
var whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
function to_class(value, hash2, directives) {
  var classname = value == null ? "" : "" + value;
  if (hash2) {
    classname = classname ? classname + " " + hash2 : hash2;
  }
  if (directives) {
    for (var key2 of Object.keys(directives)) {
      if (directives[key2]) {
        classname = classname ? classname + " " + key2 : key2;
      } else if (classname.length) {
        var len = key2.length;
        var a = 0;
        while ((a = classname.indexOf(key2, a)) >= 0) {
          var b = a + len;
          if (
            (a === 0 || whitespace.includes(classname[a - 1])) &&
            (b === classname.length || whitespace.includes(classname[b]))
          ) {
            classname =
              (a === 0 ? "" : classname.substring(0, a)) +
              classname.substring(b + 1);
          } else {
            a = b;
          }
        }
      }
    }
  }
  return classname === "" ? null : classname;
}
function append_styles2(styles, important = false) {
  var separator = important ? " !important;" : ";";
  var css = "";
  for (var key2 of Object.keys(styles)) {
    var value = styles[key2];
    if (value != null && value !== "") {
      css += " " + key2 + ": " + value + separator;
    }
  }
  return css;
}
function to_css_name(name) {
  if (name[0] !== "-" || name[1] !== "-") {
    return name.toLowerCase();
  }
  return name;
}
function to_style(value, styles) {
  if (styles) {
    var new_style = "";
    var normal_styles;
    var important_styles;
    if (Array.isArray(styles)) {
      normal_styles = styles[0];
      important_styles = styles[1];
    } else {
      normal_styles = styles;
    }
    if (value) {
      value = String(value)
        .replaceAll(/\/\*.*?\*\//g, "")
        .trim();
      var in_str = false;
      var in_apo = 0;
      var in_comment = false;
      var reserved_names = [];
      if (normal_styles) {
        reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
      }
      if (important_styles) {
        reserved_names.push(...Object.keys(important_styles).map(to_css_name));
      }
      var start_index = 0;
      var name_index = -1;
      const len = value.length;
      for (var i = 0; i < len; i++) {
        var c = value[i];
        if (in_comment) {
          if (c === "/" && value[i - 1] === "*") {
            in_comment = false;
          }
        } else if (in_str) {
          if (in_str === c) {
            in_str = false;
          }
        } else if (c === "/" && value[i + 1] === "*") {
          in_comment = true;
        } else if (c === '"' || c === "'") {
          in_str = c;
        } else if (c === "(") {
          in_apo++;
        } else if (c === ")") {
          in_apo--;
        }
        if (!in_comment && in_str === false && in_apo === 0) {
          if (c === ":" && name_index === -1) {
            name_index = i;
          } else if (c === ";" || i === len - 1) {
            if (name_index !== -1) {
              var name = to_css_name(
                value.substring(start_index, name_index).trim(),
              );
              if (!reserved_names.includes(name)) {
                if (c !== ";") {
                  i++;
                }
                var property = value.substring(start_index, i).trim();
                new_style += " " + property + ";";
              }
            }
            start_index = i + 1;
            name_index = -1;
          }
        }
      }
    }
    if (normal_styles) {
      new_style += append_styles2(normal_styles);
    }
    if (important_styles) {
      new_style += append_styles2(important_styles, true);
    }
    new_style = new_style.trim();
    return new_style === "" ? null : new_style;
  }
  return value == null ? null : String(value);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/class.js
function set_class(dom, is_html, value, hash2, prev_classes, next_classes) {
  var prev =
    /** @type {any} */
    dom[CLASS_CACHE];
  if (hydrating || prev !== value || prev === void 0) {
    var next_class_name = to_class(value, hash2, next_classes);
    if (!hydrating || next_class_name !== dom.getAttribute("class")) {
      if (next_class_name == null) {
        dom.removeAttribute("class");
      } else if (is_html) {
        dom.className = next_class_name;
      } else {
        dom.setAttribute("class", next_class_name);
      }
    }
    dom[CLASS_CACHE] = value;
  } else if (next_classes && prev_classes !== next_classes) {
    for (var key2 in next_classes) {
      var is_present = !!next_classes[key2];
      if (prev_classes == null || is_present !== !!prev_classes[key2]) {
        dom.classList.toggle(key2, is_present);
      }
    }
  }
  return next_classes;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/style.js
function update_styles(dom, prev = {}, next2, priority) {
  for (var key2 in next2) {
    var value = next2[key2];
    if (prev[key2] !== value) {
      if (next2[key2] == null) {
        dom.style.removeProperty(key2);
      } else {
        dom.style.setProperty(key2, value, priority);
      }
    }
  }
}
function set_style(dom, value, prev_styles, next_styles) {
  var prev =
    /** @type {any} */
    dom[STYLE_CACHE];
  if (hydrating || prev !== value) {
    var next_style_attr = to_style(value, next_styles);
    if (!hydrating || next_style_attr !== dom.getAttribute("style")) {
      if (next_style_attr == null) {
        dom.removeAttribute("style");
      } else {
        dom.style.cssText = next_style_attr;
      }
    }
    dom[STYLE_CACHE] = value;
  } else if (next_styles) {
    if (Array.isArray(next_styles)) {
      update_styles(dom, prev_styles?.[0], next_styles[0]);
      update_styles(dom, prev_styles?.[1], next_styles[1], "important");
    } else {
      update_styles(dom, prev_styles, next_styles);
    }
  }
  return next_styles;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
function set_selected(option, selected) {
  if (selected) {
    if (!option.hasAttribute("selected")) option.setAttribute("selected", "");
  } else {
    option.removeAttribute("selected");
  }
}
function apply_default_select_value(select, preserve) {
  var value = select.__defaultValue;
  var multiple = select.multiple;
  var values = multiple ? (value ?? []) : null;
  if (multiple && !is_array(values)) return;
  var index2 = select.selectedIndex;
  var selected = preserve && multiple ? new Set(select.selectedOptions) : null;
  for (var option of select.options) {
    var option_value = get_option_value(option);
    set_selected(
      option,
      multiple
        ? /** @type {any[]} */
          values.includes(option_value)
        : is(option_value, value),
    );
  }
  if (!preserve) return;
  if (selected !== null) {
    for (option of select.options) {
      var was_selected = selected.has(option);
      if (option.selected !== was_selected) option.selected = was_selected;
    }
  } else if (select.selectedIndex !== index2) {
    select.selectedIndex = index2;
  }
}
function select_option(select, value, mounting = false) {
  if (select.multiple) {
    if (value == void 0) {
      return;
    }
    if (!is_array(value)) {
      return select_multiple_invalid_value();
    }
    for (var option of select.options) {
      option.selected = value.includes(get_option_value(option));
    }
    return;
  }
  for (option of select.options) {
    var option_value = get_option_value(option);
    if (is(option_value, value)) {
      option.selected = true;
      return;
    }
  }
  if (!mounting || value !== void 0) {
    select.selectedIndex = -1;
  }
}
function init_select(select) {
  var observer = new MutationObserver((entries) => {
    if (entries.every(is_selectedcontent_mutation)) return;
    if ("__defaultValue" in select) {
      apply_default_select_value(select, false);
    }
    if ("__value" in select) {
      select_option(select, select.__value);
    }
  });
  observer.observe(select, {
    // Listen to option element changes
    childList: true,
    subtree: true,
    // because of <optgroup>
    // Listen to option element value attribute changes
    // (doesn't get notified of select value changes,
    // because that property is not reflected as an attribute)
    attributes: true,
    attributeFilter: ["value"],
  });
  teardown(() => {
    observer.disconnect();
  });
}
function get_option_value(option) {
  if ("__value" in option) {
    return option.__value;
  } else {
    return option.value;
  }
}
function is_selectedcontent_mutation(entry) {
  if (
    /** @type {Element} */
    entry.target.closest("selectedcontent") !== null
  ) {
    return true;
  }
  if (entry.type === "childList") {
    var nodes = [...entry.addedNodes, ...entry.removedNodes];
    return (
      nodes.length > 0 &&
      nodes.every((node) => node.nodeName === "SELECTEDCONTENT")
    );
  }
  return false;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var IS_CUSTOM_ELEMENT = /* @__PURE__ */ Symbol("is custom element");
var IS_HTML = /* @__PURE__ */ Symbol("is html");
var LINK_TAG = IS_XHTML ? "link" : "LINK";
var PROGRESS_TAG = IS_XHTML ? "progress" : "PROGRESS";
function remove_input_defaults(input) {
  if (!hydrating) return;
  var already_removed = false;
  var remove_defaults = () => {
    if (already_removed) return;
    already_removed = true;
    if (input.hasAttribute("value")) {
      var value = input.value;
      set_attribute2(input, "value", null);
      input.value = value;
    }
    if (input.hasAttribute("checked")) {
      var checked = input.checked;
      set_attribute2(input, "checked", null);
      input.checked = checked;
    }
  };
  input[FORM_RESET_HANDLER] = remove_defaults;
  queue_micro_task(remove_defaults);
  add_form_reset_listener();
}
function set_value(element2, value) {
  var attributes = get_attributes(element2);
  if (
    attributes.value ===
      (attributes.value = value ?? void 0) || // treat null and undefined the same for the initial value // @ts-expect-error
    // `progress` elements always need their value set when it's `0`
    (element2.value === value &&
      (value !== 0 || element2.nodeName !== PROGRESS_TAG))
  ) {
    return;
  }
  element2.value = value ?? "";
}
function set_checked(element2, checked) {
  var attributes = get_attributes(element2);
  if (
    attributes.checked ===
    (attributes.checked = checked ?? void 0) // treat null and undefined the same for the initial value
  ) {
    return;
  }
  element2.checked = checked;
}
function set_attribute2(element2, attribute, value, skip_warning) {
  var attributes = get_attributes(element2);
  if (hydrating) {
    attributes[attribute] = element2.getAttribute(attribute);
    if (
      attribute === "src" ||
      attribute === "srcset" ||
      (attribute === "href" && element2.nodeName === LINK_TAG)
    ) {
      if (!skip_warning) {
        check_src_in_dev_hydration(element2, attribute, value ?? "");
      }
      return;
    }
  }
  if (attributes[attribute] === (attributes[attribute] = value)) return;
  if (attribute === "loading") {
    element2[LOADING_ATTR_SYMBOL] = value;
  }
  if (value == null) {
    element2.removeAttribute(attribute);
  } else if (
    typeof value !== "string" &&
    get_setters(element2).has(attribute)
  ) {
    element2[attribute] = value;
  } else {
    element2.setAttribute(attribute, value);
  }
}
function set_custom_element_data(node, prop2, value) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  let was_hydrating = hydrating;
  if (hydrating) {
    set_hydrating(false);
  }
  set_active_reaction(null);
  set_active_effect(null);
  try {
    if (
      // `style` should use `set_attribute` rather than the setter
      prop2 !== "style" && // Don't compute setters for custom elements while they aren't registered yet,
      // because during their upgrade/instantiation they might add more setters.
      // Instead, fall back to a simple "an object, then set as property" heuristic.
      (setters_cache.has(node.getAttribute("is") || node.nodeName) || // customElements may not be available in browser extension contexts
      !customElements ||
      customElements.get(node.getAttribute("is") || node.nodeName.toLowerCase())
        ? get_setters(node).has(prop2)
        : value && typeof value === "object")
    ) {
      node[prop2] = value;
    } else {
      set_attribute2(node, prop2, value == null ? value : String(value));
    }
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
    if (was_hydrating) {
      set_hydrating(true);
    }
  }
}
function get_attributes(element2) {
  return (
    /** @type {Record<string | symbol, unknown>} **/
    /** @type {any} */
    element2[ATTRIBUTES_CACHE] ??= {
      [IS_CUSTOM_ELEMENT]: element2.nodeName.includes("-"),
      [IS_HTML]: element2.namespaceURI === NAMESPACE_HTML,
    }
  );
}
var setters_cache = /* @__PURE__ */ new Map();
function get_setters(element2) {
  var cache_key = element2.getAttribute("is") || element2.nodeName;
  var setters = setters_cache.get(cache_key);
  if (setters) return setters;
  setters_cache.set(cache_key, (setters = /* @__PURE__ */ new Set()));
  var descriptors;
  var proto = element2;
  var element_proto = Element.prototype;
  while (element_proto !== proto) {
    descriptors = get_descriptors(proto);
    for (var key2 in descriptors) {
      if (
        descriptors[key2].set && // better safe than sorry, we don't want spread attributes to mess with HTML content
        key2 !== "innerHTML" &&
        key2 !== "textContent" &&
        key2 !== "innerText"
      ) {
        setters.add(key2);
      }
    }
    proto = get_prototype_of(proto);
  }
  return setters;
}
function check_src_in_dev_hydration(element2, attribute, value) {
  if (!dev_fallback_default) return;
  if (attribute === "srcset" && srcset_url_equal(element2, value)) return;
  if (src_url_equal(element2.getAttribute(attribute) ?? "", value)) return;
  hydration_attribute_changed(
    attribute,
    element2.outerHTML.replace(element2.innerHTML, element2.innerHTML && "..."),
    String(value),
  );
}
function src_url_equal(element_src, url) {
  if (element_src === url) return true;
  return (
    new URL(element_src, document.baseURI).href ===
    new URL(url, document.baseURI).href
  );
}
function split_srcset(srcset) {
  return srcset.split(",").map((src) => src.trim().split(" ").filter(Boolean));
}
function srcset_url_equal(element2, srcset) {
  var element_urls = split_srcset(element2.srcset);
  var urls = split_srcset(srcset);
  return (
    urls.length === element_urls.length &&
    urls.every(
      ([url, width], i) =>
        width === element_urls[i][1] && // We need to test both ways because Vite will create an a full URL with
        // `new URL(asset, import.meta.url).href` for the client when `base: './'`, and the
        // relative URLs inside srcset are not automatically resolved to absolute URLs by
        // browsers (in contrast to img.src). This means both SSR and DOM code could
        // contain relative or absolute URLs.
        (src_url_equal(element_urls[i][0], url) ||
          src_url_equal(url, element_urls[i][0])),
    )
  );
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function is_bound_this(bound_value, element_or_component) {
  return (
    bound_value === element_or_component ||
    bound_value?.[STATE_SYMBOL] === element_or_component
  );
}
function bind_this(
  element_or_component = mark_as_component(),
  update2,
  get_value,
  get_parts,
) {
  var component_effect =
    /** @type {ComponentContext} */
    component_context.r;
  var parent =
    /** @type {Effect} */
    active_effect;
  effect(() => {
    var old_parts;
    var parts;
    render_effect(() => {
      old_parts = parts;
      parts = get_parts?.() || [];
      untrack(() => {
        if (!is_bound_this(get_value(...parts), element_or_component)) {
          update2(element_or_component, ...parts);
          if (
            old_parts &&
            is_bound_this(get_value(...old_parts), element_or_component)
          ) {
            update2(null, ...old_parts);
          }
        }
      });
    });
    return () => {
      let p = parent;
      while (
        p !== component_effect &&
        p.parent !== null &&
        p.parent.f & DESTROYING
      ) {
        p = p.parent;
      }
      const teardown2 = () => {
        if (parts && is_bound_this(get_value(...parts), element_or_component)) {
          update2(null, ...parts);
        }
      };
      const original_teardown = p.teardown;
      p.teardown = () => {
        teardown2();
        original_teardown?.();
      };
    };
  });
  return element_or_component;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/store/utils.js
function subscribe_to_store(store, run3, invalidate) {
  if (store == null) {
    run3(void 0);
    if (invalidate) invalidate(void 0);
    return noop;
  }
  const unsub = untrack(() =>
    store.subscribe(
      run3,
      // @ts-expect-error
      invalidate,
    ),
  );
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/store/shared/index.js
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop = null;
  const subscribers = /* @__PURE__ */ new Set();
  function set3(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set3(
      fn(
        /** @type {T} */
        value,
      ),
    );
  }
  function subscribe(run3, invalidate = noop) {
    const subscriber = [run3, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set3, update2) || noop;
    }
    run3(
      /** @type {T} */
      value,
    );
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set: set3, update: update2, subscribe };
}
function get2(store) {
  let value;
  subscribe_to_store(store, (_) => (value = _))();
  return value;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/store.js
var is_store_binding = false;
var IS_UNMOUNTED = /* @__PURE__ */ Symbol("unmounted");
function store_get(store, store_name, stores) {
  const entry = (stores[store_name] ??= {
    store: null,
    source: mutable_source(void 0),
    unsubscribe: noop,
  });
  if (dev_fallback_default) {
    entry.source.label = store_name;
  }
  if (entry.store !== store && !(IS_UNMOUNTED in stores)) {
    entry.unsubscribe();
    entry.store = store ?? null;
    if (store == null) {
      entry.source.v = void 0;
      entry.unsubscribe = noop;
    } else {
      var is_synchronous_callback = true;
      entry.unsubscribe = subscribe_to_store(store, (v) => {
        if (is_synchronous_callback) {
          entry.source.v = v;
        } else {
          set2(entry.source, v);
        }
      });
      is_synchronous_callback = false;
    }
  }
  if (store && IS_UNMOUNTED in stores) {
    return get2(store);
  }
  return get(entry.source);
}
function setup_stores() {
  const stores = {};
  function cleanup() {
    teardown(() => {
      for (var store_name in stores) {
        const ref = stores[store_name];
        ref.unsubscribe();
      }
      define_property(stores, IS_UNMOUNTED, {
        enumerable: false,
        value: true,
      });
    });
  }
  return [stores, cleanup];
}
function capture_store_binding(fn) {
  var previous_is_store_binding = is_store_binding;
  try {
    is_store_binding = false;
    return [fn(), is_store_binding];
  } finally {
    is_store_binding = previous_is_store_binding;
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/props.js
var spread_props_handler = {
  get(target, key2) {
    let i = target.props.length;
    while (i--) {
      let p = target.props[i];
      if (is_function(p)) p = p();
      if (typeof p === "object" && p !== null && key2 in p) return p[key2];
    }
  },
  set(target, key2, value) {
    let i = target.props.length;
    while (i--) {
      let p = target.props[i];
      if (is_function(p)) p = p();
      const desc = get_descriptor(p, key2);
      if (desc && desc.set) {
        desc.set(value);
        return true;
      }
    }
    return false;
  },
  getOwnPropertyDescriptor(target, key2) {
    let i = target.props.length;
    while (i--) {
      let p = target.props[i];
      if (is_function(p)) p = p();
      if (typeof p === "object" && p !== null && key2 in p) {
        const descriptor = get_descriptor(p, key2);
        if (descriptor && !descriptor.configurable) {
          descriptor.configurable = true;
        }
        return descriptor;
      }
    }
  },
  has(target, key2) {
    if (key2 === STATE_SYMBOL || key2 === LEGACY_PROPS) return false;
    for (let p of target.props) {
      if (is_function(p)) p = p();
      if (p != null && key2 in p) return true;
    }
    return false;
  },
  ownKeys(target) {
    const keys = [];
    for (let p of target.props) {
      if (is_function(p)) p = p();
      if (!p) continue;
      for (const key2 in p) {
        if (!keys.includes(key2)) keys.push(key2);
      }
      for (const key2 of Object.getOwnPropertySymbols(p)) {
        if (!keys.includes(key2)) keys.push(key2);
      }
    }
    return keys;
  },
};
function spread_props(...props) {
  return new Proxy({ props }, spread_props_handler);
}
function prop(props, key2, flags2, fallback2) {
  var runes = !legacy_mode_flag || (flags2 & PROPS_IS_RUNES) !== 0;
  var bindable = (flags2 & PROPS_IS_BINDABLE) !== 0;
  var lazy = (flags2 & PROPS_IS_LAZY_INITIAL) !== 0;
  var fallback_value =
    /** @type {V} */
    fallback2;
  var fallback_dirty = true;
  var fallback_signal =
    /** @type {Derived<V> | undefined} */
    void 0;
  var get_fallback = () => {
    if (lazy && runes) {
      fallback_signal ??= derived(
        /** @type {() => V} */
        fallback2,
      );
      return get(fallback_signal);
    }
    if (fallback_dirty) {
      fallback_dirty = false;
      fallback_value = lazy
        ? untrack(
            /** @type {() => V} */
            fallback2,
          )
        : /** @type {V} */
          fallback2;
    }
    return fallback_value;
  };
  let setter;
  if (bindable) {
    var is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props;
    setter =
      get_descriptor(props, key2)?.set ??
      (is_entry_props && key2 in props ? (v) => (props[key2] = v) : void 0);
  }
  var initial_value;
  var is_store_sub = false;
  if (bindable) {
    [initial_value, is_store_sub] = capture_store_binding(
      () =>
        /** @type {V} */
        props[key2],
    );
  } else {
    initial_value = /** @type {V} */ props[key2];
  }
  if (initial_value === void 0 && fallback2 !== void 0) {
    initial_value = get_fallback();
    if (setter) {
      if (runes) props_invalid_value(key2);
      setter(initial_value);
    }
  }
  var getter;
  if (runes) {
    getter = () => {
      var value =
        /** @type {V} */
        props[key2];
      if (value === void 0) return get_fallback();
      fallback_dirty = true;
      return value;
    };
  } else {
    getter = () => {
      var value =
        /** @type {V} */
        props[key2];
      if (value !== void 0) {
        fallback_value = /** @type {V} */ void 0;
      }
      return value === void 0 ? fallback_value : value;
    };
  }
  if (runes && (flags2 & PROPS_IS_UPDATED) === 0) {
    return getter;
  }
  if (setter) {
    var legacy_parent = props.$$legacy;
    return (
      /** @type {() => V} */
      (
        function (value, mutation) {
          if (arguments.length > 0) {
            if (!runes || !mutation || legacy_parent || is_store_sub) {
              setter(mutation ? getter() : value);
            }
            return value;
          }
          return getter();
        }
      )
    );
  }
  var overridden = false;
  var d = ((flags2 & PROPS_IS_IMMUTABLE) !== 0 ? derived : derived_safe_equal)(
    () => {
      overridden = false;
      return getter();
    },
  );
  if (dev_fallback_default) {
    d.label = key2;
  }
  if (bindable) get(d);
  var parent_effect =
    /** @type {Effect} */
    active_effect;
  return (
    /** @type {() => V} */
    (
      function (value, mutation) {
        if (arguments.length > 0) {
          const new_value = mutation
            ? get(d)
            : runes && bindable
              ? proxy(value)
              : value;
          set2(d, new_value);
          overridden = true;
          if (fallback_value !== void 0) {
            fallback_value = new_value;
          }
          return value;
        }
        if (
          (is_destroying_effect && overridden) ||
          (parent_effect.f & DESTROYED) !== 0
        ) {
          return d.v;
        }
        return get(d);
      }
    )
  );
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/legacy/legacy-client.js
function createClassComponent(options) {
  return new Svelte4Component(options);
}
var Svelte4Component = class {
  /** @type {any} */
  #events;
  /** @type {Record<string, any>} */
  #instance;
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(options) {
    var sources = /* @__PURE__ */ new Map();
    var add_source = (key2, value) => {
      var s = mutable_source(value, false, false);
      sources.set(key2, s);
      return s;
    };
    const props = new Proxy(
      { ...(options.props || {}), $$events: {} },
      {
        get(target, prop2) {
          return get(
            sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)),
          );
        },
        has(target, prop2) {
          if (prop2 === LEGACY_PROPS) return true;
          get(
            sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)),
          );
          return Reflect.has(target, prop2);
        },
        set(target, prop2, value) {
          set2(sources.get(prop2) ?? add_source(prop2, value), value);
          return Reflect.set(target, prop2, value);
        },
      },
    );
    this.#instance = (options.hydrate ? hydrate : mount)(options.component, {
      target: options.target,
      anchor: options.anchor,
      props,
      context: options.context,
      intro: options.intro ?? false,
      recover: options.recover,
      transformError: options.transformError,
    });
    if (
      !async_mode_flag &&
      (!options?.props?.$$host || options.sync === false)
    ) {
      flushSync();
    }
    this.#events = props.$$events;
    for (const key2 of Object.keys(this.#instance)) {
      if (key2 === "$set" || key2 === "$destroy" || key2 === "$on") continue;
      define_property(this, key2, {
        get() {
          return this.#instance[key2];
        },
        /** @param {any} value */
        set(value) {
          this.#instance[key2] = value;
        },
        enumerable: true,
      });
    }
    this.#instance.$set =
      /** @param {Record<string, any>} next */
      (next2) => {
        Object.assign(props, next2);
      };
    this.#instance.$destroy = () => {
      unmount(this.#instance);
    };
  }
  /** @param {Record<string, any>} props */
  $set(props) {
    this.#instance.$set(props);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(event2, callback) {
    this.#events[event2] = this.#events[event2] || [];
    const cb = (...args) => callback.call(this, ...args);
    this.#events[event2].push(cb);
    return () => {
      this.#events[event2] = this.#events[event2].filter(
        /** @param {any} fn */
        (fn) => fn !== cb,
      );
    };
  }
  $destroy() {
    this.#instance.$destroy();
  }
};

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/custom-element.js
var SvelteElement;
if (typeof HTMLElement === "function") {
  SvelteElement = class extends HTMLElement {
    /** The Svelte component constructor */
    $$ctor;
    /** Slots */
    $$s;
    /** @type {any} The Svelte component instance */
    $$c;
    /** Whether or not the custom element is connected */
    $$cn = false;
    /** @type {Record<string, any>} Component props data */
    $$d = {};
    /** `true` if currently in the process of reflecting component props back to attributes */
    $$r = false;
    /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
    $$p_d = {};
    /** @type {Record<string, EventListenerOrEventListenerObject[]>} Event listeners */
    $$l = {};
    /** @type {Map<EventListenerOrEventListenerObject, Function>} Event listener unsubscribe functions */
    $$l_u = /* @__PURE__ */ new Map();
    /** @type {any} The managed render effect for reflecting attributes */
    $$me;
    /** @type {ShadowRoot | null} The ShadowRoot of the custom element */
    $$shadowRoot = null;
    /**
     * @param {*} $$componentCtor
     * @param {*} $$slots
     * @param {ShadowRootInit | undefined} shadow_root_init
     */
    constructor($$componentCtor, $$slots, shadow_root_init) {
      super();
      this.$$ctor = $$componentCtor;
      this.$$s = $$slots;
      if (shadow_root_init) {
        this.$$shadowRoot = this.attachShadow(shadow_root_init);
      }
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    addEventListener(type, listener, options) {
      this.$$l[type] = this.$$l[type] || [];
      this.$$l[type].push(listener);
      if (this.$$c) {
        const unsub = this.$$c.$on(type, listener);
        this.$$l_u.set(listener, unsub);
      }
      super.addEventListener(type, listener, options);
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options);
      if (this.$$c) {
        const unsub = this.$$l_u.get(listener);
        if (unsub) {
          unsub();
          this.$$l_u.delete(listener);
        }
      }
    }
    async connectedCallback() {
      this.$$cn = true;
      if (!this.$$c) {
        let create_slot = function (name) {
          return (anchor) => {
            const slot2 = create_element("slot");
            if (name !== "default") slot2.name = name;
            append(anchor, slot2);
          };
        };
        await Promise.resolve();
        if (!this.$$cn || this.$$c) {
          return;
        }
        const $$slots = {};
        const existing_slots = get_custom_elements_slots(this);
        for (const name of this.$$s) {
          if (name in existing_slots) {
            if (name === "default" && !this.$$d.children) {
              this.$$d.children = create_slot(name);
              $$slots.default = true;
            } else {
              $$slots[name] = create_slot(name);
            }
          }
        }
        for (const attribute of this.attributes) {
          const name = this.$$g_p(attribute.name);
          if (!(name in this.$$d)) {
            this.$$d[name] = get_custom_element_value(
              name,
              attribute.value,
              this.$$p_d,
              "toProp",
            );
          }
        }
        for (const key2 in this.$$p_d) {
          if (!(key2 in this.$$d) && this[key2] !== void 0) {
            this.$$d[key2] = this[key2];
            delete this[key2];
          }
        }
        this.$$c = createClassComponent({
          component: this.$$ctor,
          target: this.$$shadowRoot || this,
          props: {
            ...this.$$d,
            $$slots,
            $$host: this,
          },
        });
        this.$$me = effect_root(() => {
          render_effect(() => {
            this.$$r = true;
            for (const key2 of object_keys(this.$$c)) {
              if (!this.$$p_d[key2]?.reflect) continue;
              this.$$d[key2] = this.$$c[key2];
              const attribute_value = get_custom_element_value(
                key2,
                this.$$d[key2],
                this.$$p_d,
                "toAttribute",
              );
              if (attribute_value == null) {
                this.removeAttribute(this.$$p_d[key2].attribute || key2);
              } else {
                this.setAttribute(
                  this.$$p_d[key2].attribute || key2,
                  attribute_value,
                );
              }
            }
            this.$$r = false;
          });
        });
        for (const type in this.$$l) {
          for (const listener of this.$$l[type]) {
            const unsub = this.$$c.$on(type, listener);
            this.$$l_u.set(listener, unsub);
          }
        }
        this.$$l = {};
      }
    }
    // We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
    // and setting attributes through setAttribute etc, this is helpful
    /**
     * @param {string} attr
     * @param {string} _oldValue
     * @param {string} newValue
     */
    attributeChangedCallback(attr2, _oldValue, newValue) {
      if (this.$$r) return;
      attr2 = this.$$g_p(attr2);
      this.$$d[attr2] = get_custom_element_value(
        attr2,
        newValue,
        this.$$p_d,
        "toProp",
      );
      this.$$c?.$set({ [attr2]: this.$$d[attr2] });
    }
    disconnectedCallback() {
      this.$$cn = false;
      Promise.resolve().then(() => {
        if (!this.$$cn && this.$$c) {
          this.$$c.$destroy();
          this.$$me();
          this.$$c = void 0;
        }
      });
    }
    /**
     * @param {string} attribute_name
     */
    $$g_p(attribute_name) {
      return (
        object_keys(this.$$p_d).find(
          (key2) =>
            this.$$p_d[key2].attribute === attribute_name ||
            (!this.$$p_d[key2].attribute &&
              key2.toLowerCase() === attribute_name),
        ) || attribute_name
      );
    }
  };
}
function get_custom_element_value(prop2, value, props_definition, transform) {
  const type = props_definition[prop2]?.type;
  value =
    type === "Boolean" && typeof value !== "boolean" ? value != null : value;
  if (!transform || !props_definition[prop2]) {
    return value;
  } else if (transform === "toAttribute") {
    switch (type) {
      case "Object":
      case "Array":
        return value == null ? null : JSON.stringify(value);
      case "Boolean":
        return value ? "" : null;
      case "Number":
        return value == null ? null : value;
      default:
        return value;
    }
  } else {
    switch (type) {
      case "Object":
      case "Array":
        return value && JSON.parse(value);
      case "Boolean":
        return value;
      // conversion already handled above
      case "Number":
        return value != null ? +value : value;
      default:
        return value;
    }
  }
}
function get_custom_elements_slots(element2) {
  const result = {};
  element2.childNodes.forEach((node) => {
    result[
      /** @type {Element} node */
      node.slot || "default"
    ] = true;
  });
  return result;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/index-client.js
if (dev_fallback_default) {
  let throw_rune_error = function (rune) {
    if (!(rune in globalThis)) {
      let value;
      Object.defineProperty(globalThis, rune, {
        configurable: true,
        // eslint-disable-next-line getter-return
        get: () => {
          if (value !== void 0) {
            return value;
          }
          rune_outside_svelte(rune);
        },
        set: (v) => {
          value = v;
        },
      });
    }
  };
  throw_rune_error("$state");
  throw_rune_error("$effect");
  throw_rune_error("$derived");
  throw_rune_error("$inspect");
  throw_rune_error("$props");
  throw_rune_error("$bindable");
}
function onMount(fn) {
  if (component_context === null) {
    lifecycle_outside_component("onMount");
  }
  if (legacy_mode_flag && component_context.l !== null) {
    init_update_callbacks(component_context).m.push(fn);
  } else {
    user_effect(() => {
      const cleanup = untrack(fn);
      if (typeof cleanup === "function")
        return (
          /** @type {() => void} */
          cleanup
        );
    });
  }
}
function onDestroy(fn) {
  if (component_context === null) {
    lifecycle_outside_component("onDestroy");
  }
  onMount(() => () => untrack(fn));
}
function init_update_callbacks(context) {
  var l =
    /** @type {ComponentContextLegacy} */
    context.l;
  return (l.u ??= { a: [], b: [], m: [] });
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/version.js
var PUBLIC_VERSION = "5";

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/disclose-version.js
if (typeof window !== "undefined") {
  ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(
    PUBLIC_VERSION,
  );
}

// custom_components/occupied/frontend/src/lib/utils/cover.ts
var coverActions = [
  ["cover.open_cover", "open_cover"],
  ["cover.close_cover", "close_cover"],
  ["cover.stop_cover", "stop_cover"],
  ["cover.set_cover_position", "set_cover_position"],
  ["cover.open_cover_tilt", "open_tilt"],
  ["cover.close_cover_tilt", "close_tilt"],
  ["cover.stop_cover_tilt", "stop_tilt"],
  ["cover.set_cover_tilt_position", "set_tilt_position"],
];
function coverField(action2) {
  if (action2 === "cover.set_cover_position") {
    return "position";
  }
  if (action2 === "cover.set_cover_tilt_position") {
    return "tilt_position";
  }
  return;
}
function isCoverAction(action2) {
  const field = coverField(action2.action || "");
  return (
    coverActions.some(([service]) => service === action2.action) &&
    Object.keys(action2.data || {}).every((key2) => key2 === field) &&
    (!field || validCoverPosition(action2.data?.[field]))
  );
}
function validCoverPosition(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 100
  );
}
function coverTarget(action2, previous = {}) {
  if (!isCoverAction(action2)) {
    return {};
  }
  const next2 = { ...previous };
  const tilt =
    action2.action?.endsWith("_tilt") ||
    action2.action === "cover.set_cover_tilt_position";
  const field = tilt ? "tilt_position" : "position";
  if (action2.action?.includes(".stop_")) {
    delete next2[field];
  } else if (action2.action?.includes(".open_")) {
    next2[field] = 100;
  } else if (action2.action?.includes(".close_")) {
    next2[field] = 0;
  } else {
    const value = action2.data?.[field];
    if (validCoverPosition(value)) {
      next2[field] = value;
    } else {
      delete next2[field];
    }
  }
  return next2;
}

// custom_components/occupied/frontend/src/lib/utils/custom-action.ts
function actionTargets(source2) {
  if (!source2) {
    return [];
  }
  if (source2.actions) {
    return [
      ...new Set(source2.actions.flatMap((action2) => actionTargets(action2))),
    ];
  }
  return Array.isArray(source2.entities)
    ? source2.entities
    : Object.keys(source2.entities || {});
}
function actionTargetSummary(source2, catalog) {
  const targets = actionTargets(source2);
  const first = catalog ? entityName(catalog, targets[0]) : targets[0];
  const remaining = targets.length > 1 ? ` +${targets.length - 1}` : "";
  return `${first}${remaining}`;
}
function actionYaml(value, level = 0) {
  const pad = "  ".repeat(level);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
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
      .map(([key2, item]) => {
        const scalar =
          item === null ||
          typeof item !== "object" ||
          (!Array.isArray(item) && Object.keys(item).length === 0) ||
          (Array.isArray(item) && item.length === 0);
        const name =
          /^[a-z_][a-z0-9_.]*$/.test(key2) &&
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
          ].includes(key2)
            ? key2
            : JSON.stringify(key2);
        return scalar
          ? `${pad}${name}: ${JSON.stringify(item)}`
          : `${pad}${name}:
${actionYaml(item, level + 1)}`;
      })
      .join("\n");
  }
  return JSON.stringify(value);
}
function mappedControl(form) {
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
function simpleMapping(source2) {
  if (source2.action !== "set_state" || Array.isArray(source2.entities)) {
    return source2;
  }
  const entries = Object.entries(source2.entities || {});
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
      ...(source2.stagger && { stagger: { ...source2.stagger } }),
      entities: entries.map(([entity]) => entity),
    };
  }
  return;
}
async function prepareCustomAction(panel, form) {
  if (form.kind !== "custom") {
    return true;
  }
  const text2 = form.customYaml || "";
  const version = panel.version;
  const editor = panel.activeEditor;
  const result = await panel.ws("action_yaml", { yaml: text2 });
  if (
    form.customYaml !== text2 ||
    panel.version !== version ||
    panel.activeEditor !== editor
  ) {
    throw new Error("submit_newer_edits_hint");
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
  form.customAccepted = text2;
  return true;
}
var customExample = actionYaml({
  action: "set_state",
  entities: { "light.example": { state: "on", brightness: 128 } },
});

// custom_components/occupied/frontend/src/lib/utils/stagger.ts
function staggerPeriodError(settings) {
  const seconds = durationSeconds(settings.period ?? "2m");
  return Number.isFinite(seconds) && seconds >= 1 && seconds <= 1800
    ? void 0
    : "stagger_period_error";
}
function customStaggerAction(form) {
  if (
    form.customAccepted !== form.customYaml ||
    form.customActions?.length !== 1
  ) {
    return;
  }
  const action2 = form.customActions[0];
  if (
    actionTargets(action2).some((entity) => !/^(light|switch)\./.test(entity))
  ) {
    return;
  }
  if (action2.action === "set_state" && !Array.isArray(action2.entities)) {
    return Object.values(action2.entities || {}).every((settings) =>
      ["on", "off"].includes(String(settings.state)),
    )
      ? action2
      : void 0;
  }
  return /^(?:(?:light|switch)\.)?turn_(on|off)$/.test(action2.action || "")
    ? action2
    : void 0;
}
function supportsStagger(form) {
  return (
    form.kind === "entities" ||
    (form.kind === "service" &&
      /^(light|switch)\.turn_(on|off)$/.test(form.service)) ||
    (form.kind === "custom" && !!customStaggerAction(form))
  );
}
function staggerSettings(form) {
  const current =
    form.kind === "custom" ? customStaggerAction(form)?.stagger : form.stagger;
  return {
    enabled: current?.enabled ?? false,
    period: current?.period ?? "2m",
  };
}
function applyStagger(form, settings) {
  const source2 = form.kind === "custom" ? customStaggerAction(form) : form;
  if (!source2) {
    return;
  }
  if (
    (source2.stagger?.enabled ?? false) === (settings.enabled ?? false) &&
    (source2.stagger?.period ?? "2m") === (settings.period ?? "2m")
  ) {
    return;
  }
  source2.stagger = { ...settings };
  if (form.kind !== "custom") {
    return;
  }
  form.customYaml = actionYaml(source2);
  form.customAccepted = form.customYaml;
}

// custom_components/occupied/frontend/src/lib/models/step-model.ts
var sorted = (values) => [...new Set(values)].sort();
var actionLabels = {
  turn_on: "turn_on",
  turn_off: "turn_off",
  "scene.turn_on": "activate_scene",
  ...Object.fromEntries(coverActions),
};
function stepDisplayName(step, catalog, t) {
  const label =
    step.actions || step.action === "set_state"
      ? "custom_yaml"
      : actionLabels[step.action || ""] || step.action || "";
  return `${actionTargetSummary(step, catalog)} \xB7 ${t(label)}`;
}
function stepEntries(program, catalog, t = translator()) {
  return Object.entries(program.steps || {}).map(([id, step]) => ({
    ...step,
    id,
    path: ["steps", id],
    days: [...(step.days || days)],
    name: step.name || stepDisplayName(step, catalog, t),
  }));
}
var solarEvents = ["sunrise", "sunset", "dawn", "dusk", "noon", "midnight"];
function timeSourceChoices(
  program,
  id,
  catalog = {},
  t = translator(),
  randomId,
) {
  const allowed = new Set(parentSteps(program, id).map((step) => step.id));
  return [
    ...stepEntries(
      program,
      catalog.entities ? { entities: catalog.entities } : void 0,
      t,
    )
      .filter((step) => allowed.has(step.id))
      .map((step) => ({
        value: `step:${step.id}`,
        name: step.name,
        group: t("steps"),
      })),
    ...(randomId
      ? parentRandomEvents(program, randomId).map((event2) => {
          const first = actionTargets(event2.on)[0];
          const name =
            event2.name ||
            (catalog.entities
              ? entityName({ entities: catalog.entities }, first)
              : first);
          return {
            value: `random:${event2.id}`,
            name: `${t("end_of")} ${name}`,
            group: t("random_events"),
          };
        })
      : []),
    ...(catalog.time_sources?.map((source2) => {
      const solarLabels = {
        sunrise: "sunrise_label",
        sunset: "sunset_label",
        dawn: "dawn_label",
        dusk: "dusk_label",
        noon: "solar_noon",
        midnight: "solar_midnight",
      };
      const groupKey = [
        "solar_events",
        "calendars",
        "home_assistant_times",
      ].find((key2) => en[key2] === source2.group);
      return {
        ...source2,
        name: source2.value.startsWith("sun:")
          ? t(solarLabels[source2.value.slice(4)] || source2.name)
          : source2.name,
        group: groupKey ? t(groupKey) : source2.group,
      };
    }) ||
      solarEvents.map((event2) => ({
        value: `sun:${event2}`,
        name: t(event2),
        group: t("solar_events"),
      }))),
  ];
}
function stepEditor(program, entry, parent) {
  const source2 = entry || parent;
  const form = {
    ...actionForm(source2),
    name: entry ? program.steps?.[entry.id]?.name || "" : "",
    enabled: entry?.enabled !== false,
    days: [...(source2?.days || days)],
    timing: timingForm(entry?.timing),
  };
  if (parent) {
    Object.assign(form.timing, {
      mode: "relative",
      anchor: `step:${parent.id}`,
      startOffset: "30m",
    });
  }
  return {
    id: entry?.id || identifier(program, "step"),
    existing: !!entry,
    form,
    original: copy(form),
    changed: false,
    errors: {},
  };
}
function actionForm(source2) {
  const action2 = source2?.action;
  let kind = "entities";
  if (source2?.actions || action2 === "set_state") {
    kind = "custom";
  } else if (action2 === "scene.turn_on") {
    kind = "scene";
  } else if (
    source2 &&
    isCoverAction(source2) &&
    actionTargets(source2).every((entity) => entity.startsWith("cover."))
  ) {
    kind = "cover";
  } else if (action2?.includes(".")) {
    kind = "service";
  }
  return {
    kind,
    ...(source2?.stagger && { stagger: copy(source2.stagger) }),
    ...(kind === "custom" &&
      source2 && {
        customActions: source2.actions || [
          {
            action: source2.action,
            entities: source2.entities,
            ...(source2.data && { data: source2.data }),
            ...(source2.stagger && { stagger: source2.stagger }),
          },
        ],
        customAccepted: actionYaml(
          source2.actions?.length === 1
            ? source2.actions[0]
            : source2.actions || {
                action: source2.action,
                entities: source2.entities,
                ...(source2.data && { data: source2.data }),
                ...(source2.stagger && { stagger: source2.stagger }),
              },
        ),
        customYaml: actionYaml(
          source2.actions?.length === 1
            ? source2.actions[0]
            : source2.actions || {
                action: source2.action,
                entities: source2.entities,
                ...(source2.data && { data: source2.data }),
                ...(source2.stagger && { stagger: source2.stagger }),
              },
        ),
      }),
    service: source2?.action || "homeassistant.turn_on",
    data: JSON.stringify(source2?.data || {}, null, 2),
    entities: actionTargets(source2),
    action: action2 === "turn_off" ? "turn_off" : "turn_on",
    position: String(source2?.data?.position ?? ""),
    tiltPosition: String(source2?.data?.tilt_position ?? ""),
  };
}
function hasStepChanges(editor) {
  return JSON.stringify(editor.form) !== JSON.stringify(editor.original);
}
function editorErrors(program, editor) {
  const { form, id } = editor,
    errors = {
      ...actionErrors(form),
      ...timingErrors(program, form.timing, id),
    };
  if (form.days.length === 0) {
    errors.days = "days_required_error";
  }
  return errors;
}
function actionErrors(form) {
  const errors = {};
  if (form.stagger) {
    const error = staggerPeriodError(form.stagger);
    if (error) {
      errors.stagger = error;
    }
  }
  if (form.kind === "custom") {
    if (!form.customYaml?.trim()) {
      errors.customYaml = "custom_yaml_required_error";
    }
    return errors;
  }
  if (form.entities.length === 0) {
    errors.entities =
      form.kind === "scene"
        ? "scene_required_error"
        : "entities_required_error";
  }
  if (form.entities.some((e) => !/^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(e))) {
    errors.entities = "entity_ids_error";
  }
  if (
    form.kind === "scene" &&
    (form.entities.length !== 1 || !form.entities[0]?.startsWith("scene."))
  ) {
    errors.entities = "scene_single_error";
  }
  if (
    form.kind === "entities" &&
    form.entities.some((e) => !/^(light|switch)\./.test(e))
  ) {
    errors.entities = "light_switch_entities_error";
  }
  if (
    form.kind === "service" &&
    !/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(form.service)
  ) {
    errors.service = "service_error";
  }
  if (form.kind === "cover") {
    if (form.entities.some((entity) => !entity.startsWith("cover."))) {
      errors.entities = "cover_entities_error";
    }
    if (coverActions.every(([action2]) => action2 !== form.service)) {
      errors.service = "cover_action_error";
    }
    const field = coverField(form.service);
    if (field) {
      const key2 = field === "position" ? "position" : "tiltPosition";
      const value = Number(form[key2]);
      if (
        !form[key2].trim() ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > 100
      ) {
        errors[key2] = "cover_position_error";
      }
    }
  } else if (form.kind === "scene" || form.kind === "service") {
    try {
      const data = JSON.parse(form.data);
      if (!data || Array.isArray(data) || typeof data !== "object") {
        throw new TypeError("Expected service data to be a JSON object");
      }
    } catch {
      errors.data = "service_data_error";
    }
  }
  return errors;
}
function timingErrors(program, time, id, randomId) {
  const errors = {};
  for (const key2 of ["latestAt", "onlyBefore"]) {
    const boundary2 = time[key2];
    if (!boundary2) {
      continue;
    }
    const boundaryErrors = timingErrors(program, {
      ...boundary2,
      end: "",
      endOffset: "",
    });
    if (
      boundary2.mode === "relative" &&
      solarEvents.every((event2) => boundary2.anchor !== `sun:${event2}`)
    ) {
      boundaryErrors.anchor = "time_source_required_error";
    }
    for (const [field, error] of Object.entries(boundaryErrors)) {
      errors[`${key2}.${field}`] = error;
    }
  }
  const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
  if (time.mode === "absolute") {
    if (!clockPattern.test(time.start)) {
      errors.start = "start_time_required_error";
    }
    if (time.end && !clockPattern.test(time.end)) {
      errors.end = "end_time_error";
    }
  } else if (time.mode === "relative") {
    Object.assign(errors, offsetErrors(time));
    if (time.anchor.startsWith("step:")) {
      const parent = stepEntries(program).find(
        (e) => e.id === time.anchor.slice(5),
      );
      if (
        !parent ||
        parentSteps(program, id).every((e) => e.id !== parent.id)
      ) {
        errors.anchor = "step_reference_error";
      }
    } else if (time.anchor.startsWith("random:")) {
      if (
        !randomId ||
        parentRandomEvents(program, randomId).every(
          (event2) => event2.id !== time.anchor.slice(7),
        )
      ) {
        errors.anchor = "random_reference_error";
      }
    } else if (
      !solarEvents.map((event2) => `sun:${event2}`).includes(time.anchor) &&
      !/^entity:[a-z_][a-z0-9_]*\.[a-z0-9_]+(?::(?:start_time|end_time))?$/.test(
        time.anchor,
      )
    ) {
      errors.anchor = "time_source_required_error";
    }
  } else {
    errors.mode = "timing_mode_error";
  }
  return errors;
}
function formTiming(time) {
  const timing = baseFormTiming(time);
  for (const [key2, field] of [
    ["latestAt", "latest_at"],
    ["onlyBefore", "only_before"],
  ]) {
    const boundary2 = time[key2];
    if (boundary2) {
      timing[field] =
        boundary2.mode === "absolute"
          ? { absolute_time: { start: boundary2.start } }
          : {
              relative_to: {
                sun: boundary2.anchor.slice(4),
                start_offset: String(boundary2.startOffset || "0s"),
              },
            };
    }
  }
  return timing;
}
function baseFormTiming(time) {
  if (time.mode === "duration") {
    return {
      duration: {
        min: time.minDuration || "",
        ...(time.maxDuration &&
          durationSeconds(time.maxDuration) !==
            durationSeconds(time.minDuration || "") && {
            max: time.maxDuration,
          }),
      },
    };
  }
  if (time.mode === "absolute") {
    return {
      absolute_time: { start: time.start, ...(time.end && { end: time.end }) },
    };
  }
  const offsets = {
    start_offset: String(
      time.startOffset === "0" ? "0s" : time.startOffset || "0s",
    ),
    ...(time.endOffset && {
      end_offset: String(time.endOffset === "0" ? "0s" : time.endOffset),
    }),
  };
  if (time.anchor.startsWith("random:")) {
    return { relative_to: { random: time.anchor.slice(7), ...offsets } };
  }
  if (time.anchor.startsWith("step:")) {
    return { relative_to: { step: time.anchor.slice(5), ...offsets } };
  }
  if (time.anchor.startsWith("entity:")) {
    const [, entity, attribute] = time.anchor.split(":", 3);
    return {
      relative_to: {
        entity,
        ...(attribute && { attribute }),
        ...offsets,
      },
    };
  }
  return { relative_to: { sun: time.anchor.slice(4), ...offsets } };
}
function buildStep(program, editor) {
  const errors = editorErrors(program, editor);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  if (editor.existing && !program.steps?.[editor.id]) {
    throw new Error("step_changed_error");
  }
  const next2 = copy(program),
    { form } = editor;
  (next2.steps ||= {})[editor.id] = {
    ...(form.name.trim() && { name: form.name.trim() }),
    ...(!form.enabled && { enabled: false }),
    days: [...form.days],
    timing: formTiming(form.timing),
    ...buildAction(form),
  };
  return next2;
}
function buildAction(form) {
  if (form.kind === "custom") {
    if (!form.customActions || form.customAccepted !== form.customYaml) {
      throw new Error("custom_yaml_validation_error");
    }
    return { actions: copy(form.customActions) };
  }
  let action2 = form.action;
  if (form.kind === "scene") {
    action2 = "scene.turn_on";
  } else if (form.kind === "service" || form.kind === "cover") {
    action2 = form.service;
  }
  if (form.kind === "cover") {
    const field = coverField(action2);
    return {
      action: action2,
      entities: sorted(form.entities),
      ...(field && {
        data: {
          [field]: Number(
            field === "position" ? form.position : form.tiltPosition,
          ),
        },
      }),
    };
  }
  return {
    action: action2,
    entities: sorted(form.entities),
    ...([
      "turn_on",
      "turn_off",
      "light.turn_on",
      "light.turn_off",
      "switch.turn_on",
      "switch.turn_off",
    ].includes(action2) &&
      form.stagger && { stagger: copy(form.stagger) }),
    ...(form.kind !== "entities" && { data: JSON.parse(form.data) }),
  };
}
function dependentNames(program, id) {
  const paths = references(program, id);
  return [
    ...stepEntries(program)
      .filter((e) => paths.some((p) => p[0] === "steps" && p[1] === e.id))
      .map((e) => e.name),
    ...Object.entries(program.random || {})
      .filter(([key2]) => paths.some((p) => p[0] === "random" && p[1] === key2))
      .map(([key2, event2]) => event2.name || key2),
  ];
}

// custom_components/occupied/frontend/src/lib/utils/step-issues.ts
function warningStepId(issue, entries) {
  if (issue.severity !== "warning") {
    return;
  }
  return entries.find((entry) =>
    issue.model_path
      ? entry.path.every((key2, index2) => issue.model_path?.[index2] === key2)
      : issue.path === `$.steps.${entry.id}` ||
        issue.path?.startsWith(`$.steps.${entry.id}.`),
  )?.id;
}

// custom_components/occupied/frontend/src/lib/controllers/step-editor-controller.ts
function focusEditor(panel, key2) {
  const target = key2
    ? panel.shadowRoot.querySelector(
        `[data-builder-field="${CSS.escape(key2)}"]`,
      )
    : panel.shadowRoot.querySelector('.step-editor [aria-invalid="true"]') ||
      panel.shadowRoot.querySelector(
        '.step-editor [data-builder-field="days"][aria-describedby]',
      ) ||
      panel.shadowRoot.querySelector(
        '.step-editor [data-builder-field="name"]',
      );
  target?.focus();
}
function createStepEditorContext(panel) {
  const editor = panel.stepEditor,
    form = editor.form,
    time = form.timing,
    t = panel.t,
    editing = editor.existing;
  const epoch = panel.epoch;
  const isCurrent = () =>
    panel.epoch === epoch && panel.activeEditor === editor;
  const refresh = (key2) => {
    panel.flush();
    focusEditor(panel, key2);
  };
  const changed = (key2) => {
    editor.changed = true;
    panel.version++;
    panel.validatedVersion = -1;
    delete editor.errors[key2];
    if (key2 === "days") {
      const { anchor } = editorErrors(panel.draft, editor);
      if (anchor) {
        editor.errors.anchor = anchor;
      } else {
        delete editor.errors.anchor;
      }
    }
    if (["startOffset", "endOffset"].includes(key2)) {
      const errors = offsetErrors(time);
      for (const offset of ["startOffset", "endOffset"]) {
        if (errors[offset]) {
          editor.errors[offset] = errors[offset];
        } else {
          delete editor.errors[offset];
        }
      }
    }
    panel.flush();
  };
  const submit = async () => {
    if (!isCurrent()) {
      return;
    }
    editor.errors = editorErrors(panel.draft, editor);
    if (Object.keys(editor.errors).length > 0) {
      return refresh();
    }
    try {
      try {
        await prepareCustomAction(panel, form);
      } catch (error) {
        if (!isCurrent()) {
          return;
        }
        editor.errors.customYaml =
          error instanceof Error ? error.message : String(error);
        return refresh("customYaml");
      }
      if (!isCurrent()) {
        return;
      }
      const candidate = buildStep(panel.draft, editor);
      editor.candidatePath = required(
        stepEntries(candidate).find((entry) => entry.id === editor.id),
      ).path;
      if (panel.document?.source === "file") {
        if (form.kind === "custom") {
          const version = panel.version;
          const validation = await panel.ws("editor_validate", {
            program: candidate,
          });
          if (panel.version !== version || !isCurrent()) {
            return;
          }
          if (!validation.valid) {
            panel.showIssues(validation);
            if (validation.issues.length > 0) {
              panel.focusIssue(validation.issues[0]);
            }
            return;
          }
        }
        panel.change([], candidate);
        panel.selectedStep = editor.id;
        panel.stepEditor = null;
        panel.renderView();
      } else {
        await panel.save(candidate);
      }
    } catch (error) {
      if (isCurrent()) {
        panel.fail(error);
      }
    }
  };
  const cancel = () => {
    panel.requestStepExit(() => {
      panel.shadowRoot.getElementById(`step-card-${editor.id}`)?.focus();
    });
  };
  return {
    panel,
    // New facades notify Svelte of in-place form and validation changes.
    editor: new Proxy(editor, {}),
    form: new Proxy(form, {}),
    time: new Proxy(time, {}),
    t,
    editing,
    stepId: editor.id,
    refresh,
    changed,
    submit,
    setErrors: (errors) => {
      Object.assign(editor.errors, errors);
    },
    cancel,
  };
}

// custom_components/occupied/frontend/src/lib/controllers/steps.ts
async function deleteStep(panel, id) {
  if (
    !panel.document ||
    panel.busy ||
    panel.stale ||
    dependentNames(panel.draft, id).length > 0
  ) {
    return false;
  }
  const entry = stepEntries(panel.draft, panel.catalog, panel.t).find(
    (step) => step.id === id,
  );
  if (!entry) {
    return true;
  }
  const candidate = copy(panel.draft);
  removeStep(candidate, entry.path);
  if (panel.document.source === "file") {
    panel.selectedStep = null;
    panel.stepEditor = null;
    panel.change([], candidate, true);
    return true;
  }
  if (await panel.save(candidate)) {
    panel.selectedStep = null;
    panel.stepEditor = null;
    return true;
  }
  return false;
}
function startStep(panel, entry, parent) {
  if (panel.stepEditor) {
    panel.requestStepExit(() => startStep(panel, entry, parent));
    return;
  }
  showStep(panel, entry, parent);
}
function showStep(panel, entry, parent) {
  panel.stepEditor = stepEditor(panel.draft, entry, parent);
  panel.tab = "steps";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel);
  if (entry) {
    scrollStepEditorIntoView(panel, entry.id);
  }
}
function scrollStepEditorIntoView(panel, id) {
  panel.shadowRoot
    .getElementById(`step-editor-${id}`)
    ?.querySelector(".step-editor")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function openStep(panel, entry) {
  if (panel.busy) {
    return;
  }
  if (panel.stepEditor?.id === entry.id) {
    panel.requestStepExit(() => {
      panel.selectedStep = null;
      panel.shadowRoot.getElementById(`step-card-${entry.id}`)?.focus();
    });
    return;
  }
  if (panel.stepEditor) {
    panel.requestStepExit(() => openStep(panel, entry));
    return;
  }
  showEntry(panel, entry);
}
function showEntry(panel, entry) {
  showStep(panel, entry);
}
function actionSummary(entry, t) {
  if (entry.actions || entry.action === "set_state") {
    return `${t("custom_yaml")} \xB7 ${entry.actions?.length || 1} ${t("actions")}`;
  }
  if (entry.action === "scene.turn_on") {
    return t("activate_scene");
  }
  if (entry.action === "turn_on" || entry.action === "turn_off") {
    return t(entry.action === "turn_off" ? "turn_off" : "turn_on");
  }
  return entry.action;
}

// custom_components/occupied/frontend/src/lib/actions/dom.ts
function properties(node, values) {
  const apply2 = (next2) => {
    for (const [key2, value] of Object.entries(next2)) {
      if (node[key2] !== value) {
        node[key2] = value;
      }
    }
  };
  apply2(values);
  return { update: apply2 };
}
function reference(node, callback) {
  callback(node);
  return {
    update(next2) {
      next2(node);
    },
  };
}
function validity(node, message) {
  node.setCustomValidity(message);
  return {
    update(next2) {
      node.setCustomValidity(next2);
    },
  };
}

// custom_components/occupied/frontend/src/lib/components/steps/DeleteStepDialog.svelte
var root = from_html(`<li> </li>`);
var root_1 = from_html(`<p> </p> <ul></ul> <p class="hint"> </p>`, 1);
var root_2 = from_html(`<p class="hint"> </p>`);
var root_3 = from_html(
  `<dialog class="step-delete-dialog" aria-labelledby="step-delete-title" aria-describedby="step-delete-description"><h2 id="step-delete-title"> </h2> <div id="step-delete-description"><p> </p> <!></div> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="danger"> </button></div></dialog>`,
);
function DeleteStepDialog($$anchor, $$props) {
  push($$props, true);
  let t = user_derived(() => $$props.panel.t);
  let dependents = user_derived(() =>
    dependentNames($$props.panel.draft, $$props.entry.id),
  );
  let dialog;
  onMount(() => {
    dialog.showModal();
    dialog.querySelector("button")?.focus();
  });
  var dialog_1 = root_3();
  var h2 = child(dialog_1);
  var text2 = only_child(h2, true);
  var div = sibling(h2, 2);
  var p = child(div);
  var text_1 = only_child(p, true);
  var node_1 = sibling(p, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment = root_1();
      var p_1 = first_child(fragment);
      var text_2 = only_child(p_1);
      var ul = sibling(p_1, 2);
      each(
        ul,
        21,
        () => get(dependents),
        index,
        ($$anchor3, name) => {
          var li = root();
          var text_3 = only_child(li, true);
          template_effect(() => set_text(text_3, get(name)));
          append($$anchor3, li);
        },
      );
      reset(ul);
      var p_2 = sibling(ul, 2);
      var text_4 = only_child(p_2, true);
      template_effect(
        ($0, $1) => {
          set_text(text_2, `${$0 ?? ""}:`);
          set_text(text_4, $1);
        },
        [() => get(t)("used_by"), () => get(t)("delete_dependents_hint")],
      );
      append($$anchor2, fragment);
    };
    var alternate = ($$anchor2) => {
      var p_3 = root_2();
      var text_5 = only_child(p_3, true);
      template_effect(
        ($0) => set_text(text_5, $0),
        [
          () =>
            get(t)(
              $$props.panel.document.source === "file"
                ? "delete_step_file_hint"
                : "delete_step_hint",
            ),
        ],
      );
      append($$anchor2, p_3);
    };
    if_block(node_1, ($$render) => {
      if (get(dependents).length) $$render(consequent);
      else $$render(alternate, -1);
    });
  }
  reset(div);
  var div_1 = sibling(div, 2);
  var button = child(div_1);
  var text_6 = only_child(button, true);
  var button_1 = sibling(button, 2);
  var text_7 = only_child(button_1, true);
  reset(div_1);
  reset(dialog_1);
  action(
    dialog_1,
    ($$node, $$action_arg) => reference?.($$node, $$action_arg),
    () => (node) => {
      if (node) {
        dialog = node;
      }
    },
  );
  template_effect(
    ($0, $1, $2) => {
      set_text(text2, $0);
      set_text(text_1, $$props.entry.name);
      set_text(text_6, $1);
      button_1.disabled =
        get(dependents).length > 0 || $$props.panel.busy || $$props.panel.stale;
      set_text(text_7, $2);
    },
    [
      () => get(t)("delete_step_confirm"),
      () => get(t)("cancel"),
      () => get(t)("delete_step"),
    ],
  );
  event("close", dialog_1, function (...$$args) {
    $$props.onClose?.apply(this, $$args);
  });
  delegated("click", button, () => dialog.close());
  delegated("click", button_1, async () => {
    try {
      if (await deleteStep($$props.panel, $$props.entry.id)) {
        dialog.close();
      }
    } catch (error) {
      $$props.panel.fail(error);
    }
  });
  append($$anchor, dialog_1);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/src/lib/components/shared/StaggerSettings.svelte
var root2 = from_html(`<p class="error" role="alert"> </p>`);
var root_12 = from_html(
  `<fieldset class="stagger-settings svelte-a733qf"><label class="stagger-option svelte-a733qf"><input type="checkbox" class="svelte-a733qf"/> <span> </span></label> <p class="hint"> </p> <label> </label> <input type="text" placeholder="2m"/> <p class="hint"> </p> <!></fieldset>`,
);
var $$css = {
  hash: "svelte-a733qf",
  code: ".stagger-settings.svelte-a733qf {border:0;padding:0;margin-top:24px;}.stagger-option.svelte-a733qf {display:flex;align-items:center;gap:8px;cursor:pointer;min-height:42px;}.stagger-option.svelte-a733qf input:where(.svelte-a733qf) {flex:0 0 auto;accent-color:var(--primary-color, #167b94);}",
};
function StaggerSettings($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css);
  let settings = prop($$props, "settings", 15),
    disabled = prop($$props, "disabled", 3, false);
  let error = user_derived(() => staggerPeriodError(settings()));
  var fieldset = root_12();
  var label = child(fieldset);
  var input = child(label);
  remove_input_defaults(input);
  var span = sibling(input, 2);
  var text2 = only_child(span, true);
  reset(label);
  var p = sibling(label, 2);
  var text_1 = only_child(p, true);
  var label_1 = sibling(p, 2);
  var text_2 = only_child(label_1, true);
  var input_1 = sibling(label_1, 2);
  remove_input_defaults(input_1);
  var p_1 = sibling(input_1, 2);
  var text_3 = only_child(p_1, true);
  var node = sibling(p_1, 2);
  {
    var consequent = ($$anchor2) => {
      var p_2 = root2();
      var text_4 = only_child(p_2, true);
      template_effect(
        ($0) => {
          set_attribute2(p_2, "id", `${$$props.id}-error`);
          set_text(text_4, $0);
        },
        [() => $$props.t(get(error))],
      );
      append($$anchor2, p_2);
    };
    if_block(node, ($$render) => {
      if (get(error)) $$render(consequent);
    });
  }
  reset(fieldset);
  template_effect(
    ($0, $1, $2, $3) => {
      fieldset.disabled = disabled();
      set_checked(input, settings().enabled === true);
      set_attribute2(input, "aria-describedby", `${$$props.id}-description`);
      set_text(text2, $0);
      set_attribute2(p, "id", `${$$props.id}-description`);
      set_text(text_1, $1);
      set_attribute2(label_1, "for", `${$$props.id}-period`);
      set_text(text_2, $2);
      set_attribute2(input_1, "id", `${$$props.id}-period`);
      set_value(input_1, settings().period ?? "2m");
      input_1.disabled = disabled() || !settings().enabled;
      set_attribute2(input_1, "aria-invalid", !!get(error));
      set_attribute2(
        input_1,
        "aria-describedby",
        `${$$props.id}-period-help${get(error) ? ` ${$$props.id}-error` : ""}`,
      );
      set_attribute2(p_1, "id", `${$$props.id}-period-help`);
      set_text(text_3, $3);
    },
    [
      () => $$props.t("staggered_action"),
      () => $$props.t("stagger_hint"),
      () => $$props.t("time_window"),
      () => $$props.t("stagger_period_hint"),
    ],
  );
  delegated("change", input, (event2) =>
    settings((settings().enabled = event2.currentTarget.checked), true),
  );
  delegated("input", input_1, (event2) =>
    settings((settings().period = event2.currentTarget.value), true),
  );
  append($$anchor, fieldset);
  pop();
}
delegate(["change", "input"]);

// custom_components/occupied/frontend/src/lib/components/steps/AdvancedStepSettings.svelte
var root3 = from_html(`<button type="button"> </button>`);
var root_13 = from_html(
  `<label class="step-weekday-option"><input type="checkbox"/> <span> </span></label>`,
);
var root_22 = from_html(
  `<p id="step-weekdays-error" class="error" role="alert"> </p>`,
);
var root_32 = from_html(
  `<dialog class="step-advanced-dialog" aria-labelledby="step-advanced-title" aria-describedby="step-weekdays-description"><h2 id="step-advanced-title"> </h2> <p id="step-weekdays-description" class="hint"> </p> <fieldset class="step-weekdays"><legend> </legend> <div class="step-weekday-presets"></div> <div class="step-weekday-options"></div></fieldset> <!> <!> <p class="hint"> </p> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="primary"> </button></div></dialog>`,
);
function AdvancedStepSettings($$anchor, $$props) {
  push($$props, true);
  let editor = user_derived(() => $$props.context.editor),
    form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t),
    changed = user_derived(() => $$props.context.changed);
  let selectedDays = state(proxy([]));
  let selectedStagger = state(proxy(untrack(() => staggerSettings(get(form)))));
  let canStagger = user_derived(() => supportsStagger(get(form)));
  let staggerError = user_derived(() =>
    get(canStagger) ? staggerPeriodError(get(selectedStagger)) : void 0,
  );
  let dialog;
  const presets = [
    ["every_day_label", days],
    ["weekdays", days.slice(0, 5)],
    ["weekends", days.slice(5)],
  ];
  const weekdayNames = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  let dayError = user_derived(() => {
    const errors = editorErrors($$props.panel.draft, {
      ...get(editor),
      form: { ...get(form), days: get(selectedDays) },
    });
    return (
      errors.days ||
      (get(form).timing.anchor.startsWith("step:") &&
      get(form).timing.mode === "relative"
        ? errors.anchor
        : void 0)
    );
  });
  onMount(() => {
    set2(selectedDays, [...get(form).days], true);
    dialog.showModal();
    dialog.querySelector("input")?.focus();
  });
  function apply2() {
    if (get(dayError) || get(staggerError) || $$props.panel.busy) {
      return;
    }
    get(form).days = [...get(selectedDays)];
    get(changed)("days");
    if (get(canStagger)) {
      applyStagger(get(form), get(selectedStagger));
      get(changed)("stagger");
    }
    dialog.close();
  }
  var dialog_1 = root_32();
  var h2 = child(dialog_1);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var fieldset = sibling(p, 2);
  var legend = child(fieldset);
  var text_2 = only_child(legend, true);
  var div = sibling(legend, 2);
  each(
    div,
    21,
    () => presets,
    ([label, selection]) => label,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array(get($$item), 2));
      let label = () => get($$array)[0];
      let selection = () => get($$array)[1];
      var button = root3();
      var text_3 = only_child(button, true);
      template_effect(
        ($0, $1) => {
          set_attribute2(button, "aria-pressed", $0);
          set_text(text_3, $1);
        },
        [
          () =>
            get(selectedDays).length === selection().length &&
            selection().every((day2) => get(selectedDays).includes(day2)),
          () => get(t)(label()),
        ],
      );
      delegated("click", button, () =>
        set2(selectedDays, [...selection()], true),
      );
      append($$anchor2, button);
    },
  );
  reset(div);
  var div_1 = sibling(div, 2);
  each(
    div_1,
    22,
    () => days,
    (day2) => day2,
    ($$anchor2, day2, index2) => {
      var label_1 = root_13();
      var input = child(label_1);
      remove_input_defaults(input);
      var span = sibling(input, 2);
      var text_4 = only_child(span, true);
      reset(label_1);
      template_effect(
        ($0, $1) => {
          set_value(input, day2);
          set_checked(input, $0);
          set_text(text_4, $1);
        },
        [
          () => get(selectedDays).includes(day2),
          () => get(t)(weekdayNames[get(index2)]),
        ],
      );
      delegated("change", input, (event2) => {
        const checked = event2.currentTarget.checked;
        set2(
          selectedDays,
          days.filter((candidate) =>
            candidate === day2
              ? checked
              : get(selectedDays).includes(candidate),
          ),
          true,
        );
      });
      append($$anchor2, label_1);
    },
  );
  reset(div_1);
  reset(fieldset);
  var node = sibling(fieldset, 2);
  {
    var consequent = ($$anchor2) => {
      var p_1 = root_22();
      var text_5 = only_child(p_1, true);
      template_effect(
        ($0) => set_text(text_5, $0),
        [() => get(t)(get(dayError))],
      );
      append($$anchor2, p_1);
    };
    if_block(node, ($$render) => {
      if (get(dayError)) $$render(consequent);
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      StaggerSettings($$anchor2, {
        get t() {
          return get(t);
        },
        id: "step-stagger",
        get disabled() {
          return $$props.panel.busy;
        },
        get settings() {
          return get(selectedStagger);
        },
        set settings($$value) {
          set2(selectedStagger, $$value, true);
        },
      });
    };
    if_block(node_1, ($$render) => {
      if (get(canStagger)) $$render(consequent_1);
    });
  }
  var p_2 = sibling(node_1, 2);
  var text_6 = only_child(p_2, true);
  var div_2 = sibling(p_2, 2);
  var button_1 = child(div_2);
  var text_7 = only_child(button_1, true);
  var button_2 = sibling(button_1, 2);
  var text_8 = only_child(button_2, true);
  reset(div_2);
  reset(dialog_1);
  bind_this(
    dialog_1,
    ($$value) => (dialog = $$value),
    () => dialog,
  );
  template_effect(
    ($0, $1, $2, $3, $4, $5) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      set_attribute2(
        fieldset,
        "aria-describedby",
        get(dayError) ? "step-weekdays-error" : void 0,
      );
      fieldset.disabled = $$props.panel.busy;
      set_text(text_2, $2);
      set_text(text_6, $3);
      set_text(text_7, $4);
      button_2.disabled =
        $$props.panel.busy || !!get(dayError) || !!get(staggerError);
      set_text(text_8, $5);
    },
    [
      () => get(t)("advanced_settings"),
      () => get(t)("step_days_hint"),
      () => get(t)("run_on"),
      () => get(t)("step_settings_hint"),
      () => get(t)("cancel"),
      () => get(t)("apply"),
    ],
  );
  event("close", dialog_1, function (...$$args) {
    $$props.onClose?.apply(this, $$args);
  });
  delegated("click", button_1, () => dialog.close());
  delegated("click", button_2, apply2);
  append($$anchor, dialog_1);
  pop();
}
delegate(["click", "change"]);

// custom_components/occupied/frontend/src/lib/components/steps/StepActions.svelte
var root4 = from_html(
  `<button type="button" role="menuitem" tabindex="-1"> </button>`,
);
var root_14 = from_html(
  `<div role="separator"></div> <button type="button" role="menuitem" tabindex="-1" class="danger"> </button>`,
  1,
);
var root_23 = from_html(
  `<div class="step-editor-actions"><button type="button" aria-haspopup="menu" data-builder-field="days"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path></svg></button> <div class="step-actions-menu" popover="auto" role="menu" tabindex="-1"><!> <!> <!> <!></div></div> <!> <!>`,
  1,
);
function StepActions($$anchor, $$props) {
  push($$props, true);
  let context = prop($$props, "context", 7);
  let menuOpen = state(false);
  let deleteOpen = state(false);
  let advancedOpen = state(false);
  let trigger;
  let menu;
  let menuId = user_derived(
    () => `step-actions-${$$props.entry?.id || context()?.editor.id}`,
  );
  function closeDialog() {
    flushSync(() => {
      set2(deleteOpen, false);
      set2(advancedOpen, false);
    });
    if (trigger?.isConnected) {
      trigger.focus();
    }
  }
  function closeMenu(restoreFocus = true) {
    menu.hidePopover();
    set2(menuOpen, false);
    if (restoreFocus) {
      trigger.focus();
    }
  }
  function positionMenu() {
    if (!menu.matches(":popover-open")) {
      return;
    }
    const anchor = trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const above = anchor.top - bounds.height - 8;
    const top = above >= 16 ? above : anchor.bottom + 8;
    menu.style.left = `${Math.max(16, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 16))}px`;
    menu.style.top = `${Math.max(16, Math.min(top, window.innerHeight - bounds.height - 16))}px`;
  }
  function openMenu(last = false) {
    menu.showPopover();
    set2(menuOpen, true);
    positionMenu();
    const items = [...menu.querySelectorAll("button:not(:disabled)")];
    (last ? items.at(-1) : items[0])?.focus({ preventScroll: true });
  }
  function menuKeydown(event2) {
    const items = [...menu.querySelectorAll("button:not(:disabled)")];
    const index2 = items.indexOf($$props.panel.shadowRoot.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event2.key)) {
      event2.preventDefault();
      let next2 =
        (index2 + (event2.key === "ArrowDown" ? 1 : -1) + items.length) %
        items.length;
      if (event2.key === "Home") {
        next2 = 0;
      } else if (event2.key === "End") {
        next2 = items.length - 1;
      }
      items[next2]?.focus();
    } else if (event2.key === "Escape") {
      event2.preventDefault();
      closeMenu();
    } else if (event2.key === "Tab") {
      closeMenu();
    }
  }
  var fragment = root_23();
  event("resize", $window, positionMenu);
  event("scroll", $window, positionMenu);
  var div = first_child(fragment);
  var button = child(div);
  let classes;
  bind_this(
    button,
    ($$value) => (trigger = $$value),
    () => trigger,
  );
  var div_1 = sibling(button, 2);
  var node = child(div_1);
  {
    var consequent = ($$anchor2) => {
      var button_1 = root4();
      var text2 = only_child(button_1, true);
      template_effect(
        ($0) => {
          button_1.disabled = $$props.panel.busy;
          set_text(text2, $0);
        },
        [() => $$props.panel.t(context().form.enabled ? "disable" : "enable")],
      );
      delegated("click", button_1, () => {
        closeMenu();
        if (!context()) {
          return;
        }
        context().form.enabled = !context().form.enabled;
        context().changed("enabled");
      });
      append($$anchor2, button_1);
    };
    if_block(node, ($$render) => {
      if (context()) $$render(consequent);
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var button_2 = root4();
      var text_1 = only_child(button_2, true);
      template_effect(
        ($0) => {
          button_2.disabled = $$props.panel.busy;
          set_text(text_1, $0);
        },
        [() => $$props.panel.t("add_related_step")],
      );
      delegated("click", button_2, () => {
        closeMenu();
        if ($$props.entry) {
          startStep($$props.panel, null, $$props.entry);
        }
      });
      append($$anchor2, button_2);
    };
    if_block(node_1, ($$render) => {
      if ($$props.entry) $$render(consequent_1);
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var button_3 = root4();
      var text_2 = only_child(button_3, true);
      template_effect(
        ($0) => {
          button_3.disabled = $$props.panel.busy;
          set_text(text_2, $0);
        },
        [() => $$props.panel.t("advanced_settings")],
      );
      delegated("click", button_3, () => {
        closeMenu(false);
        flushSync(() => set2(advancedOpen, true));
      });
      append($$anchor2, button_3);
    };
    if_block(node_2, ($$render) => {
      if (context()) $$render(consequent_2);
    });
  }
  var node_3 = sibling(node_2, 2);
  {
    var consequent_3 = ($$anchor2) => {
      var fragment_1 = root_14();
      var button_4 = sibling(first_child(fragment_1), 2);
      var text_3 = only_child(button_4, true);
      template_effect(
        ($0) => {
          button_4.disabled = $$props.panel.busy;
          set_text(text_3, $0);
        },
        [() => $$props.panel.t("delete_step")],
      );
      delegated("click", button_4, () => {
        closeMenu(false);
        flushSync(() => set2(deleteOpen, true));
      });
      append($$anchor2, fragment_1);
    };
    if_block(node_3, ($$render) => {
      if ($$props.entry) $$render(consequent_3);
    });
  }
  reset(div_1);
  bind_this(
    div_1,
    ($$value) => (menu = $$value),
    () => menu,
  );
  reset(div);
  var node_4 = sibling(div, 2);
  {
    var consequent_4 = ($$anchor2) => {
      DeleteStepDialog($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get entry() {
          return $$props.entry;
        },
        onClose: closeDialog,
      });
    };
    if_block(node_4, ($$render) => {
      if (get(deleteOpen) && $$props.entry) $$render(consequent_4);
    });
  }
  var node_5 = sibling(node_4, 2);
  {
    var consequent_5 = ($$anchor2) => {
      AdvancedStepSettings($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return context();
        },
        onClose: closeDialog,
      });
    };
    if_block(node_5, ($$render) => {
      if (get(advancedOpen) && context()) $$render(consequent_5);
    });
  }
  template_effect(
    ($0, $1, $2) => {
      classes = set_class(button, 1, "icon-button", null, classes, {
        error: !!context()?.editor.errors.days,
      });
      set_attribute2(button, "aria-label", $0);
      set_attribute2(button, "title", $1);
      set_attribute2(button, "aria-expanded", get(menuOpen));
      set_attribute2(button, "aria-controls", get(menuId));
      set_attribute2(
        button,
        "aria-describedby",
        context()?.editor.errors.days ? "step-error-days" : void 0,
      );
      button.disabled = $$props.panel.busy;
      set_attribute2(div_1, "id", get(menuId));
      set_attribute2(div_1, "aria-label", $2);
    },
    [
      () => $$props.panel.t("step_actions"),
      () => $$props.panel.t("step_actions"),
      () => $$props.panel.t("step_actions"),
    ],
  );
  delegated("click", button, () => (get(menuOpen) ? closeMenu() : openMenu()));
  delegated("keydown", button, (event2) => {
    if (!(event2.key === "ArrowDown" || event2.key === "ArrowUp")) {
      return;
    }
    event2.preventDefault();
    openMenu(event2.key === "ArrowUp");
  });
  event("toggle", div_1, (event2) =>
    set2(menuOpen, event2.newState === "open"),
  );
  delegated("keydown", div_1, menuKeydown);
  append($$anchor, fragment);
  pop();
}
delegate(["click", "keydown"]);

// custom_components/occupied/frontend/src/lib/components/shared/FieldError.svelte
var root5 = from_html(`<p class="error" role="alert"> </p>`);
function FieldError($$anchor, $$props) {
  push($$props, true);
  let fieldPrefix = prop($$props, "fieldPrefix", 3, "");
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      var p = root5();
      var text2 = only_child(p, true);
      template_effect(
        ($0) => {
          set_attribute2(p, "id", `step-error-${fieldPrefix()}${$$props.key}`);
          set_attribute2(
            p,
            "data-builder-error",
            `${fieldPrefix()}${$$props.key}`,
          );
          set_text(text2, $0);
        },
        [() => $$props.t($$props.errors[$$props.key])],
      );
      append($$anchor2, p);
    };
    if_block(node, ($$render) => {
      if ($$props.errors[$$props.key]) $$render(consequent);
    });
  }
  append($$anchor, fragment);
  pop();
}

// custom_components/occupied/frontend/src/lib/components/shared/EditorField.svelte
var root6 = from_html(`<div><label> </label> <!></div>`);
var root_15 = from_html(`<ha-selector></ha-selector>`, 2);
var root_24 = from_html(`<option> </option>`);
var root_33 = from_html(`<select></select>`);
var root_4 = from_html(`<textarea></textarea>`);
var root_5 = from_html(`<input/>`);
var root_6 = from_html(`<div class="field"><!> <!> <!></div>`);
function EditorField($$anchor, $$props) {
  push($$props, true);
  let options = prop($$props, "options", 19, () => ({}));
  let editor = user_derived(() => $$props.context.editor),
    t = user_derived(() => $$props.context.t),
    changed = user_derived(() => $$props.context.changed);
  let fieldPrefix = user_derived(() => $$props.context.fieldPrefix || "");
  let field = user_derived(() => `${get(fieldPrefix)}${$$props.key}`);
  let id = user_derived(() => `step-${get(field)}`);
  let invalid = user_derived(() =>
    get(editor).errors[$$props.key] ? true : void 0,
  );
  let described = user_derived(() =>
    get(editor).errors[$$props.key] ? `step-error-${get(field)}` : void 0,
  );
  let nativeTime = user_derived(() => options().type === "time");
  function input(event2) {
    const control = event2.currentTarget;
    if (get(nativeTime)) {
      if (!isValueChangedEvent(event2)) {
        return;
      }
      control.value = event2.detail.value || "";
    }
    $$props.update(String(control.value ?? ""));
    get(changed)($$props.key);
    if (control instanceof HTMLSelectElement) {
      control.value = String($$props.value);
    }
    if (options().render) {
      focusEditor($$props.panel, get(field));
    }
  }
  var div = root_6();
  var node = child(div);
  {
    var consequent = ($$anchor2) => {
      var div_1 = root6();
      var label_1 = child(div_1);
      var text2 = only_child(label_1, true);
      var node_1 = sibling(label_1, 2);
      snippet(node_1, () => $$props.trailing ?? noop);
      reset(div_1);
      template_effect(
        ($0) => {
          set_class(div_1, 1, clsx2($$props.trailing ? "field-label-row" : ""));
          set_attribute2(label_1, "for", get(id));
          set_text(text2, $0);
        },
        [() => get(t)($$props.label)],
      );
      append($$anchor2, div_1);
    };
    if_block(node, ($$render) => {
      if (!get(nativeTime) && !options().hideLabel) $$render(consequent);
    });
  }
  var node_2 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var ha_selector = root_15();
      template_effect(() =>
        set_custom_element_data(ha_selector, "id", get(id)),
      );
      template_effect(() =>
        set_custom_element_data(ha_selector, "data-builder-field", get(field)),
      );
      template_effect(
        ($0) => set_custom_element_data(ha_selector, "aria-label", $0),
        [() => get(t)($$props.label)],
      );
      template_effect(() =>
        set_custom_element_data(ha_selector, "aria-invalid", get(invalid)),
      );
      template_effect(() =>
        set_custom_element_data(
          ha_selector,
          "aria-describedby",
          get(described),
        ),
      );
      set_custom_element_data(ha_selector, "tabindex", "0");
      action(
        ha_selector,
        ($$node, $$action_arg) => properties?.($$node, $$action_arg),
        () => ({
          hass: $$props.panel._hass,
          selector: { time: {} },
          label: get(t)($$props.label),
          required: !options().optional,
          value: $$props.value || void 0,
        }),
      );
      event("value-changed", ha_selector, input);
      append($$anchor2, ha_selector);
    };
    var consequent_2 = ($$anchor2) => {
      var select = root_33();
      each(
        select,
        21,
        () => options().choices,
        ([v, name]) => v,
        ($$anchor3, $$item) => {
          var $$array = user_derived(() => to_array(get($$item), 2));
          let v = () => get($$array)[0];
          let name = () => get($$array)[1];
          var option = root_24();
          var text_1 = only_child(option, true);
          var option_value = {};
          template_effect(
            ($0) => {
              set_text(text_1, $0);
              if (option_value !== (option_value = v())) {
                option.value = (option.__value = option_value) ?? "";
              }
            },
            [() => get(t)(name())],
          );
          append($$anchor3, option);
        },
      );
      reset(select);
      var select_value;
      init_select(select);
      template_effect(
        ($0, $1) => {
          set_attribute2(select, "id", get(id));
          set_attribute2(select, "data-builder-field", get(field));
          set_attribute2(select, "aria-label", $0);
          set_attribute2(select, "aria-invalid", get(invalid));
          set_attribute2(select, "aria-describedby", get(described));
          if (select_value !== (select_value = $1)) {
            ((select.value = (select.__value = select_value) ?? ""),
              select_option(select, select_value));
          }
        },
        [
          () => (options().hideLabel ? get(t)($$props.label) : void 0),
          () => String($$props.value),
        ],
      );
      delegated("change", select, input);
      append($$anchor2, select);
    };
    var consequent_3 = ($$anchor2) => {
      var textarea = root_4();
      remove_textarea_child(textarea);
      template_effect(
        ($0, $1) => {
          set_attribute2(textarea, "id", get(id));
          set_attribute2(textarea, "data-builder-field", get(field));
          set_attribute2(textarea, "aria-label", $0);
          set_attribute2(textarea, "aria-invalid", get(invalid));
          set_attribute2(textarea, "aria-describedby", get(described));
          set_value(textarea, $1);
        },
        [
          () => (options().hideLabel ? get(t)($$props.label) : void 0),
          () => String($$props.value),
        ],
      );
      delegated("input", textarea, input);
      append($$anchor2, textarea);
    };
    var alternate = ($$anchor2) => {
      var input_1 = root_5();
      remove_input_defaults(input_1);
      action(
        input_1,
        ($$node, $$action_arg) => validity?.($$node, $$action_arg),
        () =>
          ["startOffset", "endOffset"].includes($$props.key)
            ? get(t)(get(editor).errors[$$props.key] || "")
            : "",
      );
      template_effect(
        ($0, $1) => {
          set_attribute2(input_1, "id", get(id));
          set_attribute2(input_1, "data-builder-field", get(field));
          set_attribute2(input_1, "type", options().type || "text");
          set_attribute2(input_1, "aria-label", $0);
          set_attribute2(input_1, "aria-invalid", get(invalid));
          set_attribute2(input_1, "aria-describedby", get(described));
          set_attribute2(input_1, "min", options().min);
          set_attribute2(input_1, "max", options().max);
          set_attribute2(input_1, "step", options().step);
          set_attribute2(input_1, "placeholder", options().placeholder);
          set_value(input_1, $1);
        },
        [
          () => (options().hideLabel ? get(t)($$props.label) : void 0),
          () => String($$props.value),
        ],
      );
      delegated("input", input_1, input);
      append($$anchor2, input_1);
    };
    if_block(node_2, ($$render) => {
      if (get(nativeTime)) $$render(consequent_1);
      else if (options().choices) $$render(consequent_2, 1);
      else if (options().multiline) $$render(consequent_3, 2);
      else $$render(alternate, -1);
    });
  }
  var node_3 = sibling(node_2, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node_3, {
      get t() {
        return get(t);
      },
      get key() {
        return $$props.key;
      },
      get fieldPrefix() {
        return get(fieldPrefix);
      },
      get errors() {
        return get($0);
      },
    });
  }
  reset(div);
  append($$anchor, div);
  pop();
}
delegate(["change", "input"]);

// custom_components/occupied/frontend/src/lib/components/shared/SourcePicker.svelte
var root7 = from_html(
  `<div class="field source-picker"><ha-generic-picker></ha-generic-picker> <!></div>`,
  2,
);
function SourcePicker($$anchor, $$props) {
  push($$props, true);
  let error = prop($$props, "error", 3, ""),
    fieldPrefix = prop($$props, "fieldPrefix", 3, "");
  let items = user_derived(() => {
    const items2 = [];
    let group;
    for (const choice of $$props.choices) {
      if (group !== choice.group) {
        group = choice.group;
        items2.push(group);
      }
      items2.push({
        id: choice.value,
        primary: choice.name,
        secondary: choice.entity_id,
        group: choice.group,
      });
    }
    return items2;
  });
  function valueRenderer(id) {
    const headline = document.createElement("span");
    headline.slot = "headline";
    headline.textContent =
      $$props.choices.find((choice) => choice.value === id)?.name || id;
    return headline;
  }
  function select(event2) {
    if (!isValueChangedEvent(event2)) {
      return;
    }
    const next2 =
      typeof event2.detail.value === "string" ? event2.detail.value : "";
    if (next2 && $$props.choices.every((choice) => choice.value !== next2)) {
      return;
    }
    const control = event2.currentTarget;
    control.value = next2 || void 0;
    $$props.onChange(next2);
  }
  var div = root7();
  var ha_generic_picker = child(div);
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "id",
      `step-${fieldPrefix()}anchor`,
    ),
  );
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "data-builder-field",
      `${fieldPrefix()}anchor`,
    ),
  );
  template_effect(
    ($0) => set_custom_element_data(ha_generic_picker, "aria-label", $0),
    [() => $$props.t("relative_to")],
  );
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "aria-invalid",
      error() ? "true" : void 0,
    ),
  );
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "aria-describedby",
      error() ? `step-error-${fieldPrefix()}anchor` : void 0,
    ),
  );
  set_custom_element_data(ha_generic_picker, "tabindex", "0");
  action(
    ha_generic_picker,
    ($$node, $$action_arg) => properties?.($$node, $$action_arg),
    () => ({
      hass: $$props.hass,
      value: $$props.value || void 0,
      label: $$props.t("relative_to"),
      searchLabel: $$props.t("search_steps_or_time_sources"),
      placeholder: $$props.t("choose_a_step_or_event"),
      notFoundLabel: $$props.t("time_sources_no_matches"),
      getItems: () => get(items),
      searchKeys: ["primary", "secondary", "id", "group"],
      valueRenderer,
      allowCustomValue: false,
      noSort: true,
      required: true,
      invalid: !!error(),
      errorMessage: $$props.t(error()),
    }),
  );
  var node = sibling(ha_generic_picker, 2);
  {
    let $0 = user_derived(() => ({ anchor: error() }));
    FieldError(node, {
      get t() {
        return $$props.t;
      },
      key: "anchor",
      get fieldPrefix() {
        return fieldPrefix();
      },
      get errors() {
        return get($0);
      },
    });
  }
  reset(div);
  event("value-changed", ha_generic_picker, select);
  append($$anchor, div);
  pop();
}

// custom_components/occupied/frontend/src/lib/components/shared/TimingBoundaryEditor.svelte
var root8 = from_html(`<!> <!>`, 1);
function TimingBoundaryEditor($$anchor, $$props) {
  push($$props, true);
  let boundary2 = user_derived(
    () => new Proxy($$props.context.time[$$props.modifier], {}),
  );
  let fields = user_derived(() => ({
    editor: {
      ...$$props.context.editor,
      errors: Object.fromEntries(
        Object.entries($$props.context.editor.errors)
          .filter(([key2]) => key2.startsWith(`${$$props.modifier}.`))
          .map(([key2, value]) => [
            key2.slice($$props.modifier.length + 1),
            value,
          ]),
      ),
    },
    t: $$props.context.t,
    fieldPrefix: `${$$props.modifier}.`,
    changed: (key2) => $$props.context.changed(`${$$props.modifier}.${key2}`),
  }));
  var fragment = root8();
  var node = first_child(fragment);
  EditorField(node, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(fields);
    },
    key: "mode",
    label: "boundary_source",
    get value() {
      return get(boundary2).mode;
    },
    update: (value) => {
      get(boundary2).mode = value;
      get(boundary2).anchor ||= "sun:sunrise";
    },
    options: {
      choices: [
        ["absolute", "absolute_time"],
        ["relative", "solar_events"],
      ],
    },
  });
  var node_1 = sibling(node, 2);
  {
    var consequent = ($$anchor2) => {
      EditorField($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return get(fields);
        },
        key: "start",
        label: "boundary_clock",
        get value() {
          return get(boundary2).start;
        },
        update: (value) => (get(boundary2).start = value),
        options: { type: "time", step: 1 },
      });
    };
    var alternate = ($$anchor2) => {
      var fragment_2 = root8();
      var node_2 = first_child(fragment_2);
      {
        let $0 = user_derived(() => ({
          choices: solarEvents.map((event2) => [`sun:${event2}`, event2]),
        }));
        EditorField(node_2, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return get(fields);
          },
          key: "anchor",
          label: "solar_events",
          get value() {
            return get(boundary2).anchor;
          },
          update: (value) => (get(boundary2).anchor = value),
          get options() {
            return get($0);
          },
        });
      }
      var node_3 = sibling(node_2, 2);
      EditorField(node_3, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return get(fields);
        },
        key: "startOffset",
        label: "start_offset",
        get value() {
          return get(boundary2).startOffset;
        },
        update: (value) => (get(boundary2).startOffset = value),
        options: { placeholder: "-30m or 90m" },
      });
      append($$anchor2, fragment_2);
    };
    if_block(node_1, ($$render) => {
      if (get(boundary2).mode === "absolute") $$render(consequent);
      else $$render(alternate, -1);
    });
  }
  append($$anchor, fragment);
  pop();
}

// custom_components/occupied/frontend/src/lib/models/random-model.ts
function countBounds(count) {
  return typeof count === "object"
    ? count
    : { min: count ?? 3, max: count ?? 3 };
}
function countSummary(count) {
  const { min, max } = countBounds(count);
  return min === max ? String(min) : `${min}\u2013${max}`;
}
function randomEntries(program, catalog) {
  return Object.entries(program.random || {}).map(([id, event2]) => ({
    ...event2,
    id,
    path: ["random", id],
    days: [...(event2.days || days)],
    name: event2.name || actionTargetSummary(event2.on, catalog),
  }));
}
function randomEditor(program, entry) {
  const source2 = entry ? program.random?.[entry.id] : void 0;
  const on2 = actionForm(source2?.on);
  const off = actionForm(source2?.off || { action: "turn_off", entities: [] });
  const count = countBounds(source2?.count);
  const form = {
    name: source2?.name || "",
    enabled: source2?.enabled !== false,
    days: [...(source2?.days || days)],
    start: timingForm(source2?.start),
    end: timingForm(source2?.end || { absolute_time: { start: "23:00" } }),
    minDuration: source2?.min_duration || "5m",
    maxDuration: source2?.max_duration || "15m",
    minCount: String(count.min),
    maxCount: String(count.max),
    on: on2,
    off,
    sameEntities:
      ["entities", "cover"].includes(on2.kind) &&
      on2.kind === off.kind &&
      JSON.stringify([...on2.entities].sort()) ===
        JSON.stringify([...off.entities].sort()),
  };
  return {
    id: entry?.id || identifier(program, "random", "random"),
    existing: !!entry,
    form,
    original: copy(form),
    errors: {},
    startOptions: {},
    endOptions: {},
  };
}
function hasRandomChanges(editor) {
  return JSON.stringify(editor.form) !== JSON.stringify(editor.original);
}
function prefixedErrors(errors, prefix) {
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [
      `${prefix}${field}`,
      message,
    ]),
  );
}
function randomErrors(program, editor) {
  const { form } = editor;
  const errors = {
    ...prefixedErrors(
      timingErrors(program, form.start, void 0, editor.id),
      "start.",
    ),
    ...prefixedErrors(windowEndErrors(program, form.end), "end."),
    ...prefixedErrors(actionErrors(form.on), "on."),
    ...prefixedErrors(
      actionErrors(
        form.sameEntities
          ? { ...form.off, entities: form.on.entities }
          : form.off,
      ),
      "off.",
    ),
  };
  const minimum = durationSeconds(form.minDuration),
    maximum = durationSeconds(form.maxDuration);
  if (!Number.isFinite(minimum) || minimum <= 0 || minimum > 604800) {
    errors.minDuration = "duration_error";
  }
  if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 604800) {
    errors.maxDuration = "duration_error";
  } else if (maximum < minimum) {
    errors.maxDuration = "duration_order_error";
  }
  const minCount = Number(form.minCount),
    maxCount = Number(form.maxCount);
  for (const field of ["minCount", "maxCount"]) {
    const count = Number(form[field]);
    if (
      !form[field].trim() ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > 1e3
    ) {
      errors[field] = "random_count_error";
    }
  }
  if (!errors.minCount && !errors.maxCount && maxCount < minCount) {
    errors.maxCount = "random_count_order_error";
  }
  if (form.days.length === 0) {
    errors.days = "days_required_error";
  }
  if (
    maxCount > 0 &&
    form.end.mode === "duration" &&
    !errors["end.minDuration"] &&
    !errors["end.maxDuration"] &&
    minimum >
      durationSeconds(form.end.maxDuration || form.end.minDuration || "")
  ) {
    errors.minDuration = "duration_exceeds_window_error";
  }
  if (
    maxCount > 0 &&
    form.start.mode === "absolute" &&
    form.end.mode === "absolute" &&
    !form.start.end &&
    !form.end.end &&
    !errors["start.start"] &&
    !errors["end.start"]
  ) {
    const seconds = (clock) =>
      clock
        .split(":")
        .reduce((total, part, i) => total + Number(part) * [3600, 60, 1][i], 0);
    let span = seconds(form.end.start) - seconds(form.start.start);
    if (span < 0) {
      span += 86400;
    }
    if (span === 0) {
      errors["end.start"] = "window_end_order_error";
    } else if (minimum > span) {
      errors.minDuration = "duration_exceeds_window_error";
    }
  }
  return errors;
}
function windowEndErrors(program, time) {
  if (time.mode !== "duration") {
    return timingErrors(program, time);
  }
  const errors = {};
  const minimum = durationSeconds(time.minDuration || "");
  const maximum = durationSeconds(time.maxDuration || time.minDuration || "");
  if (!Number.isFinite(minimum) || minimum <= 0 || minimum > 604800) {
    errors.minDuration = "window_duration_error";
  }
  if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 604800) {
    errors.maxDuration = "window_duration_error";
  } else if (maximum < minimum) {
    errors.maxDuration = "window_duration_order_error";
  }
  return errors;
}
function buildRandom(program, editor) {
  const errors = randomErrors(program, editor);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  if (editor.existing && !program.random?.[editor.id]) {
    throw new Error("random_changed_error");
  }
  const next2 = copy(program),
    { form } = editor;
  (next2.random ||= {})[editor.id] = {
    ...(form.name.trim() && { name: form.name.trim() }),
    ...(!form.enabled && { enabled: false }),
    days: [...form.days],
    start: formTiming(form.start),
    end: formTiming(form.end),
    min_duration: form.minDuration,
    max_duration: form.maxDuration,
    count:
      Number(form.minCount) === Number(form.maxCount)
        ? Number(form.minCount)
        : { min: Number(form.minCount), max: Number(form.maxCount) },
    on: buildAction(form.on),
    off: buildAction(
      form.sameEntities
        ? { ...form.off, entities: form.on.entities }
        : form.off,
    ),
  };
  return next2;
}

// custom_components/occupied/frontend/src/lib/components/shared/TimingEditor.svelte
var root9 = from_html(
  `<label class="timing-option"><input type="radio"/><span> </span></label>`,
);
var root_16 = from_html(`<button type="button" class="text-button"> </button>`);
var root_25 = from_html(`<!> <!>`, 1);
var root_34 = from_html(`<p class="hint"> </p>`);
var root_42 = from_html(`<!> <!> <!> <!> <!>`, 1);
var root_52 = from_html(
  `<fieldset class="timing-options"><legend> </legend> <label class="timing-option"><input type="checkbox"/> <span> </span></label> <!></fieldset>`,
);
var root_62 = from_html(
  `<p class="hint" data-timing-explanation="" aria-live="polite"> </p>`,
);
var root_7 = from_html(
  `<div data-editor-section="time"><h3> </h3> <fieldset class="timing-options"><div class="timing-option-row"></div> <!></fieldset> <!> <!> <!> <!></div>`,
);
function TimingEditor($$anchor, $$props) {
  push($$props, true);
  let heading = prop($$props, "heading", 3, "timing"),
    clockLabel = prop($$props, "clockLabel", 3, "start_time_window"),
    windowEndLabel = prop(
      $$props,
      "windowEndLabel",
      3,
      "end_of_window_optional",
    ),
    addWindowEndLabel = prop(
      $$props,
      "addWindowEndLabel",
      3,
      "add_end_of_window",
    ),
    showExplanation = prop($$props, "showExplanation", 3, true),
    explanationSubject = prop($$props, "explanationSubject", 3, "runs"),
    modes = prop($$props, "modes", 19, () => [
      ["absolute", "absolute_time"],
      ["relative", "relative_to"],
    ]);
  let editor = user_derived(() => $$props.context.editor),
    form = user_derived(() => $$props.context.form),
    time = user_derived(() => $$props.context.time),
    t = user_derived(() => $$props.context.t),
    refresh = user_derived(() => $$props.context.refresh),
    changed = user_derived(() => $$props.context.changed);
  let fieldPrefix = user_derived(() => $$props.context.fieldPrefix || "");
  let choices = user_derived(() => {
    void $$props.context;
    let choices2 = timeSourceChoices(
      $$props.panel.draft,
      $$props.context.stepId,
      $$props.panel.catalog,
      get(t),
      $$props.context.randomId,
    );
    if (
      get(time).anchor &&
      choices2.every((choice) => choice.value !== get(time).anchor)
    ) {
      choices2 = [
        ...choices2,
        {
          value: get(time).anchor,
          name: get(time).anchor,
          group: get(t)("unavailable_sources"),
        },
      ];
    }
    return choices2;
  });
  var div = root_7();
  var h3 = child(div);
  var text2 = only_child(h3, true);
  var fieldset = sibling(h3, 2);
  var div_1 = child(fieldset);
  each(
    div_1,
    21,
    modes,
    ([value, label]) => value,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array(get($$item), 2));
      let value = () => get($$array)[0];
      let label = () => get($$array)[1];
      var label_1 = root9();
      var input = child(label_1);
      remove_input_defaults(input);
      var span = sibling(input);
      var text_1 = only_child(span, true);
      reset(label_1);
      template_effect(
        ($0) => {
          set_attribute2(input, "name", `step-${get(fieldPrefix)}timing-mode`);
          set_value(input, value());
          set_attribute2(
            input,
            "data-builder-field",
            `${get(fieldPrefix)}mode`,
          );
          set_checked(input, get(time).mode === value());
          set_text(text_1, $0);
        },
        [() => get(t)(label())],
      );
      delegated("change", input, (event2) => {
        if (!event2.currentTarget.checked) {
          return;
        }
        get(time).mode = value();
        if (value() === "relative" && !get(time).anchor) {
          get(time).anchor = "sun:sunrise";
        }
        if (value() === "duration") {
          get(time).minDuration ||= "1h";
          get(time).maxDuration ||= get(time).minDuration;
        }
        get(changed)("mode");
        $$props.panel.shadowRoot
          .querySelector(
            `[data-builder-field="${CSS.escape(get(fieldPrefix))}mode"]:checked`,
          )
          ?.focus();
      });
      append($$anchor2, label_1);
    },
  );
  reset(div_1);
  var node = sibling(div_1, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node, {
      get t() {
        return get(t);
      },
      key: "mode",
      get fieldPrefix() {
        return get(fieldPrefix);
      },
      get errors() {
        return get($0);
      },
    });
  }
  reset(fieldset);
  var node_1 = sibling(fieldset, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var fragment = root_25();
      var node_2 = first_child(fragment);
      EditorField(node_2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "start",
        get label() {
          return clockLabel();
        },
        get value() {
          return get(time).start;
        },
        update: (value) => (get(time).start = value),
        options: { type: "time", step: 1 },
      });
      var node_3 = sibling(node_2, 2);
      {
        var consequent = ($$anchor3) => {
          EditorField($$anchor3, {
            get panel() {
              return $$props.panel;
            },
            get context() {
              return $$props.context;
            },
            key: "end",
            get label() {
              return windowEndLabel();
            },
            get value() {
              return get(time).end;
            },
            update: (value) => {
              get(time).end = value;
              if (!value) {
                get(editor).showEndTime = false;
              }
            },
            options: { type: "time", step: 1, optional: true },
          });
        };
        var alternate = ($$anchor3) => {
          var button = root_16();
          var text_2 = only_child(button, true);
          template_effect(
            ($0) => set_text(text_2, $0),
            [() => get(t)(addWindowEndLabel())],
          );
          delegated("click", button, () => {
            get(time).end = get(time).start;
            get(editor).showEndTime = true;
            get(changed)("end");
            get(refresh)("end");
          });
          append($$anchor3, button);
        };
        if_block(node_3, ($$render) => {
          if (
            get(time).end ||
            get(editor).showEndTime ||
            get(editor).errors.end
          )
            $$render(consequent);
          else $$render(alternate, -1);
        });
      }
      append($$anchor2, fragment);
    };
    var consequent_2 = ($$anchor2) => {
      var fragment_2 = root_25();
      var node_4 = first_child(fragment_2);
      {
        let $0 = user_derived(() => get(time).minDuration || "");
        EditorField(node_4, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return $$props.context;
          },
          key: "minDuration",
          label: "minimum_window_duration",
          get value() {
            return get($0);
          },
          update: (value) => (get(time).minDuration = value),
          options: { placeholder: "1h" },
        });
      }
      var node_5 = sibling(node_4, 2);
      {
        let $0 = user_derived(() => get(time).maxDuration || "");
        EditorField(node_5, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return $$props.context;
          },
          key: "maxDuration",
          label: "maximum_window_duration",
          get value() {
            return get($0);
          },
          update: (value) => (get(time).maxDuration = value),
          options: { placeholder: "2h", optional: true },
        });
      }
      append($$anchor2, fragment_2);
    };
    var consequent_6 = ($$anchor2) => {
      var fragment_3 = root_42();
      var node_6 = first_child(fragment_3);
      SourcePicker(
        node_6,
        spread_props(() => ({
          hass: $$props.panel._hass,
          choices: get(choices),
          value: get(time).anchor,
          t: get(t),
          error: get(editor).errors.anchor,
          fieldPrefix: get(fieldPrefix),
          onChange: (value) => {
            get(time).anchor = value;
            if (!get(editor).existing && value.startsWith("step:")) {
              const parent = stepEntries(
                $$props.panel.draft,
                $$props.panel.catalog,
                $$props.panel.t,
              ).find((step) => step.id === value.slice(5));
              if (parent) {
                get(form).days = [...parent.days];
              }
            }
            if (!get(editor).existing && value.startsWith("random:")) {
              const parent = randomEntries($$props.panel.draft).find(
                (entry) => entry.id === value.slice(7),
              );
              if (parent) {
                get(form).days = [...parent.days];
              }
            }
            get(changed)("anchor");
            const picker = $$props.panel.shadowRoot.querySelector(
              `[data-builder-field="${CSS.escape(get(fieldPrefix))}anchor"]`,
            );
            if (picker && $$props.panel.shadowRoot.activeElement !== picker) {
              picker.focus();
            }
          },
        })),
      );
      var node_7 = sibling(node_6, 2);
      {
        var consequent_3 = ($$anchor3) => {
          var p = root_34();
          var text_3 = only_child(p, true);
          template_effect(
            ($0) => set_text(text_3, $0),
            [() => get(t)("random_relative_start_hint")],
          );
          append($$anchor3, p);
        };
        var d = user_derived(() => get(time).anchor.startsWith("random:"));
        if_block(node_7, ($$render) => {
          if (get(d)) $$render(consequent_3);
        });
      }
      var node_8 = sibling(node_7, 2);
      {
        var consequent_4 = ($$anchor3) => {
          var p_1 = root_34();
          var text_4 = only_child(p_1, true);
          template_effect(
            ($0) => set_text(text_4, $0),
            [() => get(t)("ha_time_source_hint")],
          );
          append($$anchor3, p_1);
        };
        var d_1 = user_derived(() => get(time).anchor.startsWith("entity:"));
        if_block(node_8, ($$render) => {
          if (get(d_1)) $$render(consequent_4);
        });
      }
      var node_9 = sibling(node_8, 2);
      EditorField(node_9, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "startOffset",
        label: "start_offset",
        get value() {
          return get(time).startOffset;
        },
        update: (value) => (get(time).startOffset = value),
        options: { placeholder: "30m or 1h" },
      });
      var node_10 = sibling(node_9, 2);
      {
        var consequent_5 = ($$anchor3) => {
          {
            const trailing = ($$anchor4) => {
              var button_1 = root_16();
              var text_5 = only_child(button_1, true);
              template_effect(
                ($0) => set_text(text_5, $0),
                [() => get(t)("remove_end_offset")],
              );
              delegated("click", button_1, () => {
                get(time).endOffset = "";
                get(editor).showEndOffset = false;
                get(changed)("endOffset");
                get(refresh)("startOffset");
              });
              append($$anchor4, button_1);
            };
            EditorField($$anchor3, {
              get panel() {
                return $$props.panel;
              },
              get context() {
                return $$props.context;
              },
              key: "endOffset",
              label: "end_offset_optional",
              get value() {
                return get(time).endOffset;
              },
              update: (value) => (get(time).endOffset = value),
              options: {},
              trailing,
              $$slots: { trailing: true },
            });
          }
        };
        var alternate_1 = ($$anchor3) => {
          var button_2 = root_16();
          var text_6 = only_child(button_2, true);
          template_effect(
            ($0) => set_text(text_6, $0),
            [() => get(t)("add_end_offset")],
          );
          delegated("click", button_2, () => {
            get(editor).showEndOffset = true;
            get(refresh)("endOffset");
          });
          append($$anchor3, button_2);
        };
        if_block(node_10, ($$render) => {
          if (
            get(time).endOffset ||
            get(editor).showEndOffset ||
            get(editor).errors.endOffset
          )
            $$render(consequent_5);
          else $$render(alternate_1, -1);
        });
      }
      append($$anchor2, fragment_3);
    };
    var d_2 = user_derived(() => modes().some(([mode]) => mode === "relative"));
    var alternate_2 = ($$anchor2) => {
      var p_2 = root_34();
      var text_7 = only_child(p_2, true);
      template_effect(
        ($0) => set_text(text_7, $0),
        [() => get(t)("random_relative_end_hint")],
      );
      append($$anchor2, p_2);
    };
    if_block(node_1, ($$render) => {
      if (get(time).mode === "absolute") $$render(consequent_1);
      else if (get(time).mode === "duration") $$render(consequent_2, 1);
      else if (get(d_2)) $$render(consequent_6, 2);
      else $$render(alternate_2, -1);
    });
  }
  var node_11 = sibling(node_1, 2);
  {
    var consequent_9 = ($$anchor2) => {
      var fragment_5 = root_25();
      var node_12 = first_child(fragment_5);
      each(
        node_12,
        16,
        () => [
          ["latestAt", "no_later_than"],
          ["onlyBefore", "only_run_before"],
        ],
        ([modifier, label]) => modifier,
        ($$anchor3, $$item) => {
          var $$array_1 = user_derived(() => to_array($$item, 2));
          let modifier = () => get($$array_1)[0];
          let label = () => get($$array_1)[1];
          const key2 = user_derived(modifier);
          var fieldset_1 = root_52();
          var legend = child(fieldset_1);
          var text_8 = only_child(legend, true);
          var label_2 = sibling(legend, 2);
          var input_1 = child(label_2);
          remove_input_defaults(input_1);
          var span_1 = sibling(input_1, 2);
          var text_9 = only_child(span_1, true);
          reset(label_2);
          var node_13 = sibling(label_2, 2);
          {
            var consequent_7 = ($$anchor4) => {
              TimingBoundaryEditor($$anchor4, {
                get panel() {
                  return $$props.panel;
                },
                get context() {
                  return $$props.context;
                },
                get modifier() {
                  return get(key2);
                },
              });
            };
            if_block(node_13, ($$render) => {
              if (get(time)[get(key2)]) $$render(consequent_7);
            });
          }
          reset(fieldset_1);
          template_effect(
            ($0, $1, $2) => {
              set_text(text_8, $0);
              set_attribute2(input_1, "data-builder-field", get(key2));
              set_checked(input_1, $1);
              set_text(text_9, $2);
            },
            [
              () => get(t)(label()),
              () => Boolean(get(time)[get(key2)]),
              () => get(t)("enabled"),
            ],
          );
          delegated("change", input_1, (event2) => {
            get(time)[get(key2)] = event2.currentTarget.checked
              ? {
                  mode: "absolute",
                  start: "18:00",
                  anchor: "sun:sunrise",
                  startOffset: "0s",
                }
              : void 0;
            for (const field of Object.keys(get(editor).errors)) {
              if (field.startsWith(`${get(key2)}.`)) {
                delete get(editor).errors[field];
              }
            }
            get(changed)(get(key2));
          });
          append($$anchor3, fieldset_1);
        },
      );
      var node_14 = sibling(node_12, 2);
      {
        var consequent_8 = ($$anchor3) => {
          var p_3 = root_34();
          var text_10 = only_child(p_3, true);
          template_effect(
            ($0) => set_text(text_10, $0),
            [() => get(t)("timing_limits_source_date_hint")],
          );
          append($$anchor3, p_3);
        };
        if_block(node_14, ($$render) => {
          if (get(time).latestAt || get(time).onlyBefore)
            $$render(consequent_8);
        });
      }
      append($$anchor2, fragment_5);
    };
    if_block(node_11, ($$render) => {
      if ($$props.context.stepId !== void 0) $$render(consequent_9);
    });
  }
  var node_15 = sibling(node_11, 2);
  {
    var consequent_10 = ($$anchor2) => {
      var p_4 = root_62();
      var text_11 = only_child(p_4, true);
      template_effect(
        ($0) => set_text(text_11, $0),
        [
          () =>
            timingExplanation(
              get(time),
              [
                ...stepEntries(
                  $$props.panel.draft,
                  $$props.panel.catalog,
                  $$props.panel.t,
                ),
                ...randomEntries(
                  $$props.panel.draft,
                  $$props.panel.catalog,
                ).map((entry) => ({
                  id: `random:${entry.id}`,
                  name: entry.name,
                })),
              ],
              get(t),
              $$props.panel.catalog.time_sources,
              {
                locale: $$props.panel._hass.locale,
                days: get(form).days,
                subject: explanationSubject(),
                includeHints: explanationSubject() === "runs",
              },
            ),
        ],
      );
      append($$anchor2, p_4);
    };
    if_block(node_15, ($$render) => {
      if (showExplanation()) $$render(consequent_10);
    });
  }
  var node_16 = sibling(node_15, 2);
  {
    var consequent_11 = ($$anchor2) => {
      var p_5 = root_34();
      var text_12 = only_child(p_5, true);
      template_effect(
        ($0) => set_text(text_12, $0),
        [() => get(t)("managed_file_draft_hint")],
      );
      append($$anchor2, p_5);
    };
    if_block(node_16, ($$render) => {
      if ($$props.panel.document?.source === "file") $$render(consequent_11);
    });
  }
  reset(div);
  template_effect(
    ($0) => {
      set_attribute2(h3, "id", `step-${get(fieldPrefix)}timing-heading`);
      set_text(text2, $0);
      set_attribute2(
        fieldset,
        "aria-labelledby",
        `step-${get(fieldPrefix)}timing-heading`,
      );
    },
    [() => get(t)(heading())],
  );
  append($$anchor, div);
  pop();
}
delegate(["change", "click"]);

// custom_components/occupied/frontend/src/lib/components/shared/EntitiesEditor.svelte
var root10 = from_html(`<p class="hint"> </p>`);
var root_17 = from_html(
  `<div data-editor-section="entities"><h4> </h4> <ha-selector></ha-selector> <!> <!></div>`,
  2,
);
function EntitiesEditor($$anchor, $$props) {
  push($$props, true);
  let label = prop($$props, "label", 3, "entities_label");
  let editor = user_derived(() => $$props.context.editor),
    form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t),
    changed = user_derived(() => $$props.context.changed);
  let fieldPrefix = user_derived(() => $$props.context.fieldPrefix || "");
  let domains = user_derived(() => {
    if (get(form).kind === "scene") {
      return ["scene"];
    }
    return get(form).kind === "cover" ? ["cover"] : ["light", "switch"];
  });
  var div = root_17();
  var h4 = child(div);
  var text2 = only_child(h4, true);
  var ha_selector = sibling(h4, 2);
  set_class(ha_selector, 1, "entity-native-selector");
  template_effect(() =>
    set_custom_element_data(
      ha_selector,
      "data-builder-field",
      `${get(fieldPrefix)}entities`,
    ),
  );
  template_effect(
    ($0) => set_custom_element_data(ha_selector, "aria-label", $0),
    [() => get(t)(label())],
  );
  template_effect(() =>
    set_custom_element_data(
      ha_selector,
      "aria-invalid",
      get(editor).errors.entities ? "true" : void 0,
    ),
  );
  template_effect(() =>
    set_custom_element_data(
      ha_selector,
      "aria-describedby",
      get(editor).errors.entities
        ? `step-error-${get(fieldPrefix)}entities`
        : void 0,
    ),
  );
  action(
    ha_selector,
    ($$node, $$action_arg) => properties?.($$node, $$action_arg),
    () => ({
      hass: $$props.panel._hass,
      selector: {
        entity: {
          multiple: get(form).kind !== "scene",
          ...(get(form).kind !== "service" && {
            filter: { domain: get(domains) },
          }),
        },
      },
      value:
        get(form).kind === "scene"
          ? get(form).entities[0] || ""
          : get(form).entities,
      required: true,
      narrow: $$props.panel.hasAttribute("narrow"),
    }),
  );
  var node = sibling(ha_selector, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node, {
      get t() {
        return get(t);
      },
      key: "entities",
      get fieldPrefix() {
        return get(fieldPrefix);
      },
      get errors() {
        return get($0);
      },
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent = ($$anchor2) => {
      var p = root10();
      var text_1 = only_child(p, true);
      template_effect(
        ($0) => set_text(text_1, $0),
        [() => get(t)("custom_entity_hint")],
      );
      append($$anchor2, p);
    };
    var d = user_derived(
      () =>
        get(form).kind === "entities" &&
        get(form).entities.some((id) => !/^(light|switch)\./.test(id)),
    );
    if_block(node_1, ($$render) => {
      if (get(d)) $$render(consequent);
    });
  }
  reset(div);
  template_effect(($0) => set_text(text2, $0), [() => get(t)(label())]);
  event("value-changed", ha_selector, (event2) => {
    if (!isValueChangedEvent(event2)) {
      return;
    }
    event2.currentTarget.value = event2.detail.value;
    const value = event2.detail.value;
    if (Array.isArray(value)) {
      get(form).entities = value;
    } else {
      get(form).entities = typeof value === "string" && value ? [value] : [];
    }
    get(changed)("entities");
  });
  append($$anchor, div);
  pop();
}

// custom_components/occupied/frontend/src/lib/utils/action-kind.ts
function changeActionKind(form, value, confirmReplace) {
  const kind = value === "turn_on" || value === "turn_off" ? "entities" : value;
  if (kind === "custom" && form.kind !== "custom") {
    const errors = actionErrors(form);
    if (Object.keys(errors).length > 0) {
      if (form.entities.length === 0 && form.kind === "entities") {
        form.customYaml ||= customExample;
        form.kind = "custom";
        return {};
      }
      return errors;
    }
    if (!form.customYaml) {
      const source2 =
        form.kind === "entities" ? mappedControl(form) : buildAction(form);
      form.customYaml = actionYaml(source2);
      form.customAccepted = form.customYaml;
      form.customActions = [source2];
    }
    form.kind = "custom";
    return {};
  }
  if (form.kind === "custom" && kind !== "custom") {
    const accepted =
      form.customAccepted === form.customYaml &&
      form.customActions?.length === 1
        ? simpleMapping(form.customActions[0])
        : void 0;
    const next2 = accepted ? actionForm(accepted) : void 0;
    const compatible =
      next2 &&
      next2.kind === kind &&
      (kind !== "entities" || next2.action === value);
    if (compatible) {
      const buffer = {
        customYaml: form.customYaml,
        customAccepted: form.customAccepted,
        customActions: form.customActions,
      };
      Object.assign(form, next2, buffer);
      return {};
    }
    if (!confirmReplace("custom_yaml_replace_confirm")) {
      return {};
    }
  }
  if (form.kind !== kind) {
    form.entities = [];
  }
  form.kind = kind;
  if (!(kind === "entities" && ["turn_on", "turn_off"].includes(value))) {
    delete form.stagger;
  }
  if (kind === "entities") {
    form.action = value;
  }
  if (
    kind === "cover" &&
    coverActions.every(([action2]) => action2 !== form.service)
  ) {
    form.service = "cover.open_cover";
  }
  return {};
}

// custom_components/occupied/frontend/src/lib/components/shared/ActionEditor.svelte
var root11 = from_html(
  `<ha-code-editor></ha-code-editor> <!> <p class="hint"> </p>`,
  3,
);
var root_18 = from_html(
  `<!> <!> <p class="hint"> </p> <p class="hint"> </p>`,
  1,
);
var root_26 = from_html(
  `<div data-editor-section="action"><h3> </h3> <!> <!> <!> <!> <!> <!></div>`,
);
var $$css2 = {
  hash: "svelte-10b0fum",
  code: "ha-code-editor.svelte-10b0fum {display:block;width:100%;margin:8px 0;--code-mirror-height: 280px;--code-mirror-max-height: 60vh;}",
};
function ActionEditor($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css2);
  let heading = prop($$props, "heading", 3, "action"),
    kindLabel = prop($$props, "kindLabel", 3, "step_type"),
    entityLabel = prop($$props, "entityLabel", 3, "entities_label"),
    hideEntities = prop($$props, "hideEntities", 3, false);
  let form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t);
  var div = root_26();
  var h3 = child(div);
  var text2 = only_child(h3, true);
  var node = sibling(h3, 2);
  {
    let $0 = user_derived(() =>
      get(form).kind === "entities" ? get(form).action : get(form).kind,
    );
    EditorField(node, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return $$props.context;
      },
      key: "kind",
      get label() {
        return kindLabel();
      },
      get value() {
        return get($0);
      },
      update: (value) => {
        const errors = changeActionKind(get(form), value, (message) =>
          globalThis.confirm(get(t)(message)),
        );
        $$props.context.setErrors(errors);
      },
      options: {
        hideLabel: true,
        choices: [
          ["turn_on", "turn_on_lights_switches"],
          ["turn_off", "turn_off_lights_switches"],
          ["cover", "control_covers"],
          ["service", "entity_service_action"],
          ["scene", "activate_home_assistant_scene"],
          ["custom", "custom_yaml"],
        ],
        render: true,
      },
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent = ($$anchor2) => {
      EntitiesEditor($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        get label() {
          return entityLabel();
        },
      });
    };
    if_block(node_1, ($$render) => {
      if (!hideEntities() && get(form).kind !== "custom") $$render(consequent);
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var fragment_1 = root11();
      var ha_code_editor = first_child(fragment_1);
      set_custom_element_data(ha_code_editor, "role", "group");
      template_effect(
        ($0) => set_custom_element_data(ha_code_editor, "aria-label", $0),
        [() => get(t)("action_yaml")],
      );
      template_effect(() =>
        set_custom_element_data(
          ha_code_editor,
          "aria-describedby",
          $$props.context.editor.errors.customYaml
            ? `step-error-${$$props.context.fieldPrefix || ""}customYaml`
            : void 0,
        ),
      );
      template_effect(() =>
        set_custom_element_data(
          ha_code_editor,
          "data-builder-field",
          `${$$props.context.fieldPrefix || ""}customYaml`,
        ),
      );
      set_custom_element_data(ha_code_editor, "dir", "ltr");
      set_class(ha_code_editor, 1, "svelte-10b0fum");
      action(
        ha_code_editor,
        ($$node, $$action_arg) => properties?.($$node, $$action_arg),
        () => ({
          mode: "yaml",
          value: get(form).customYaml || "",
          linewrap: true,
        }),
      );
      var node_3 = sibling(ha_code_editor, 2);
      {
        let $0 = user_derived(() => $$props.context.fieldPrefix || "");
        let $1 = user_derived(() => ({ ...$$props.context.editor.errors }));
        FieldError(node_3, {
          get t() {
            return get(t);
          },
          key: "customYaml",
          get fieldPrefix() {
            return get($0);
          },
          get errors() {
            return get($1);
          },
        });
      }
      var p = sibling(node_3, 2);
      var text_1 = only_child(p, true);
      template_effect(
        ($0) => {
          ha_code_editor.dir = ha_code_editor.dir;
          set_text(text_1, $0);
        },
        [() => get(t)("custom_yaml_hint")],
      );
      event("value-changed", ha_code_editor, (event2) => {
        if (
          !isValueChangedEvent(event2) ||
          typeof event2.detail.value !== "string"
        ) {
          return;
        }
        get(form).customYaml = event2.detail.value;
        $$props.context.changed("customYaml");
      });
      append($$anchor2, fragment_1);
    };
    if_block(node_2, ($$render) => {
      if (get(form).kind === "custom") $$render(consequent_1);
    });
  }
  var node_4 = sibling(node_2, 2);
  {
    var consequent_2 = ($$anchor2) => {
      EditorField($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "service",
        label: "service",
        get value() {
          return get(form).service;
        },
        update: (value) => (get(form).service = value),
      });
    };
    if_block(node_4, ($$render) => {
      if (get(form).kind === "service") $$render(consequent_2);
    });
  }
  var node_5 = sibling(node_4, 2);
  {
    var consequent_5 = ($$anchor2) => {
      var fragment_3 = root_18();
      var node_6 = first_child(fragment_3);
      {
        let $0 = user_derived(() => ({ choices: coverActions, render: true }));
        EditorField(node_6, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return $$props.context;
          },
          key: "service",
          label: "cover_action",
          get value() {
            return get(form).service;
          },
          update: (value) => (get(form).service = value),
          get options() {
            return get($0);
          },
        });
      }
      var node_7 = sibling(node_6, 2);
      {
        var consequent_3 = ($$anchor3) => {
          EditorField($$anchor3, {
            get panel() {
              return $$props.panel;
            },
            get context() {
              return $$props.context;
            },
            key: "position",
            label: "position",
            get value() {
              return get(form).position;
            },
            update: (value) => (get(form).position = value),
            options: { type: "number", min: 0, max: 100, step: 1 },
          });
        };
        var consequent_4 = ($$anchor3) => {
          EditorField($$anchor3, {
            get panel() {
              return $$props.panel;
            },
            get context() {
              return $$props.context;
            },
            key: "tiltPosition",
            label: "tilt_position",
            get value() {
              return get(form).tiltPosition;
            },
            update: (value) => (get(form).tiltPosition = value),
            options: { type: "number", min: 0, max: 100, step: 1 },
          });
        };
        if_block(node_7, ($$render) => {
          if (get(form).service === "cover.set_cover_position")
            $$render(consequent_3);
          else if (get(form).service === "cover.set_cover_tilt_position")
            $$render(consequent_4, 1);
        });
      }
      var p_1 = sibling(node_7, 2);
      var text_2 = only_child(p_1, true);
      var p_2 = sibling(p_1, 2);
      var text_3 = only_child(p_2, true);
      template_effect(
        ($0, $1) => {
          set_text(text_2, $0);
          set_text(text_3, $1);
        },
        [
          () => get(t)("cover_position_hint"),
          () => get(t)("cover_schedule_hint"),
        ],
      );
      append($$anchor2, fragment_3);
    };
    if_block(node_5, ($$render) => {
      if (get(form).kind === "cover") $$render(consequent_5);
    });
  }
  var node_8 = sibling(node_5, 2);
  {
    var consequent_6 = ($$anchor2) => {
      EditorField($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "data",
        label: "service_data",
        get value() {
          return get(form).data;
        },
        update: (value) => (get(form).data = value),
        options: { multiline: true },
      });
    };
    if_block(node_8, ($$render) => {
      if (get(form).kind === "scene" || get(form).kind === "service")
        $$render(consequent_6);
    });
  }
  reset(div);
  template_effect(($0) => set_text(text2, $0), [() => get(t)(heading())]);
  append($$anchor, div);
  pop();
}

// custom_components/occupied/frontend/src/lib/components/steps/StepEditor.svelte
var root12 = from_html(
  `<section class="step-editor"><div class="step-name-editor"><!></div> <div class="editor-sections"><!> <!></div> <!> <div class="builder-footer"><button type="button"> </button> <!> <button type="button" class="primary" data-step-submit=""> </button></div></section>`,
);
function StepEditor($$anchor, $$props) {
  push($$props, true);
  let context = user_derived(() => {
    void $$props.revision;
    return createStepEditorContext($$props.panel);
  });
  let editor = user_derived(() => get(context).editor),
    form = user_derived(() => get(context).form),
    t = user_derived(() => get(context).t),
    editing = user_derived(() => get(context).editing),
    submit = user_derived(() => get(context).submit),
    cancel = user_derived(() => get(context).cancel);
  var section = root12();
  var div = child(section);
  var node = child(div);
  {
    let $0 = user_derived(() => ({
      hideLabel: true,
      placeholder: get(editing) ? void 0 : get(t)("optional_title"),
    }));
    EditorField(node, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get(context);
      },
      key: "name",
      label: "step_name",
      get value() {
        return get(form).name;
      },
      update: (value) => (get(form).name = value),
      get options() {
        return get($0);
      },
    });
  }
  reset(div);
  var div_1 = sibling(div, 2);
  var node_1 = child(div_1);
  TimingEditor(node_1, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
  });
  var node_2 = sibling(node_1, 2);
  ActionEditor(node_2, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
  });
  reset(div_1);
  var node_3 = sibling(div_1, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node_3, {
      get t() {
        return get(t);
      },
      key: "days",
      get errors() {
        return get($0);
      },
    });
  }
  var div_2 = sibling(node_3, 2);
  var button = child(div_2);
  var text2 = only_child(button, true);
  var node_4 = sibling(button, 2);
  {
    var consequent_1 = ($$anchor2) => {
      const entry = user_derived(() =>
        stepEntries(
          $$props.panel.draft,
          $$props.panel.catalog,
          $$props.panel.t,
        ).find((item) => item.id === get(editor).id),
      );
      var fragment = comment();
      var node_5 = first_child(fragment);
      {
        var consequent = ($$anchor3) => {
          StepActions($$anchor3, {
            get panel() {
              return $$props.panel;
            },
            get entry() {
              return get(entry);
            },
            get context() {
              return get(context);
            },
          });
        };
        if_block(node_5, ($$render) => {
          if (get(entry)) $$render(consequent);
        });
      }
      append($$anchor2, fragment);
    };
    var alternate = ($$anchor2) => {
      StepActions($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return get(context);
        },
      });
    };
    if_block(node_4, ($$render) => {
      if (get(editing)) $$render(consequent_1);
      else $$render(alternate, -1);
    });
  }
  var button_1 = sibling(node_4, 2);
  var text_1 = only_child(button_1, true);
  reset(div_2);
  reset(section);
  template_effect(
    ($0, $1) => {
      button.disabled = $$props.panel.busy;
      set_text(text2, $0);
      button_1.disabled = $$props.panel.busy || $$props.panel.stale;
      set_text(text_1, $1);
    },
    [
      () => get(t)("cancel"),
      () =>
        get(t)(
          $$props.panel.document?.source === "file"
            ? "add_to_draft"
            : "save_step",
        ),
    ],
  );
  delegated("click", button, function (...$$args) {
    get(cancel)?.apply(this, $$args);
  });
  delegated("click", button_1, function (...$$args) {
    get(submit)?.apply(this, $$args);
  });
  append($$anchor, section);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/src/lib/utils/activity-order.ts
var day = 86400;
var solarDefaults = {
  dawn: 5 * 3600,
  sunrise: 6 * 3600,
  noon: 12 * 3600,
  sunset: 18 * 3600,
  dusk: 19 * 3600,
  midnight: 0,
};
var solarAttributes = {
  dawn: "next_dawn",
  sunrise: "next_rising",
  noon: "next_noon",
  sunset: "next_setting",
  dusk: "next_dusk",
  midnight: "next_midnight",
};
function clockSeconds(value) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    return void 0;
  }
  const [, hours, minutes2, seconds = "0"] = match;
  return Number(hours) > 23 || Number(minutes2) > 59 || Number(seconds) > 59
    ? void 0
    : Number(hours) * 3600 + Number(minutes2) * 60 + Number(seconds);
}
function chronologicalEntries(entries, program, collection, hass) {
  const sourceSeconds = (value) => {
    if (typeof value !== "string") {
      return void 0;
    }
    const clock = clockSeconds(value);
    if (clock !== void 0) {
      return clock;
    }
    const local = /^\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(value);
    if (local) {
      return clockSeconds(local[1]);
    }
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      return void 0;
    }
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: hass?.config?.time_zone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(new Date(timestamp));
    return clockSeconds(parts);
  };
  const resolve = (timing, seen2) => {
    let start;
    if (timing.absolute_time) {
      start = clockSeconds(timing.absolute_time.start);
    } else if (timing.relative_to) {
      const relative = timing.relative_to;
      let anchor;
      if (relative.step) {
        anchor = stepStart(relative.step, seen2);
      } else if (relative.random) {
        anchor = randomEnd(relative.random, seen2);
      } else if (relative.sun) {
        anchor =
          sourceSeconds(
            hass?.states?.["sun.sun"]?.attributes[
              solarAttributes[relative.sun]
            ],
          ) ?? solarDefaults[relative.sun];
      } else if (relative.entity) {
        const entity = hass?.states?.[relative.entity];
        anchor = sourceSeconds(
          relative.attribute
            ? entity?.attributes[relative.attribute]
            : entity?.state,
        );
      }
      if (anchor !== void 0) {
        const offset = relative.start_offset;
        start =
          anchor + durationSeconds(!offset || offset === "0" ? "0s" : offset);
      }
    }
    if (start !== void 0 && timing.latest_at) {
      const latest = resolve(timing.latest_at, seen2);
      if (latest !== void 0) {
        start = Math.min(start, latest);
      }
    }
    return start !== void 0 && Number.isFinite(start) ? start : void 0;
  };
  const stepStart = (id, seen2) => {
    const key2 = `step:${id}`;
    const step = program.steps?.[id];
    return !step || seen2.has(key2)
      ? void 0
      : resolve(step.timing, /* @__PURE__ */ new Set([...seen2, key2]));
  };
  const randomEnd = (id, seen2) => {
    const key2 = `random:${id}`;
    const event2 = program.random?.[id];
    if (!event2 || seen2.has(key2)) {
      return void 0;
    }
    const path = /* @__PURE__ */ new Set([...seen2, key2]);
    const start = resolve(event2.start, path);
    if (event2.end.duration) {
      return start === void 0
        ? void 0
        : start + durationSeconds(event2.end.duration.min);
    }
    const end = resolve(event2.end, path);
    return end !== void 0 && start !== void 0 && end <= start ? end + day : end;
  };
  const times = new Map(
    entries.map(({ id }) => {
      const time =
        collection === "steps"
          ? stepStart(id, /* @__PURE__ */ new Set())
          : resolve(
              program.random?.[id]?.start || {},
              /* @__PURE__ */ new Set([`random:${id}`]),
            );
      return [id, time === void 0 ? Infinity : ((time % day) + day) % day];
    }),
  );
  return [...entries].sort((a, b) => times.get(a.id) - times.get(b.id));
}
function applyActivityOrder(entries, order) {
  if (!order) {
    return entries;
  }
  const positions = new Map(order.map((id, index2) => [id, index2]));
  return [...entries].sort(
    (a, b) =>
      (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity),
  );
}
function activityTree(entries, parentId) {
  const nodes = new Map(
    entries.map((entry) => [entry.id, { entry, children: [] }]),
  );
  const parents = new Map(
    entries.map((entry) => [entry.id, parentId?.(entry)]),
  );
  const roots = [];
  for (const entry of entries) {
    const seen2 = /* @__PURE__ */ new Set([entry.id]);
    let ancestor = parents.get(entry.id);
    while (ancestor && nodes.has(ancestor) && !seen2.has(ancestor)) {
      seen2.add(ancestor);
      ancestor = parents.get(ancestor);
    }
    const parent =
      ancestor && seen2.has(ancestor)
        ? void 0
        : nodes.get(parents.get(entry.id) || "");
    (parent?.children || roots).push(nodes.get(entry.id));
  }
  return roots;
}
function moveActivityInTree(nodes, id, index2) {
  const siblings = nodes.map((node) => node.entry.id);
  const order = moveActivity(siblings, id, index2);
  const byId = new Map(nodes.map((node) => [node.entry.id, node]));
  return order.flatMap((key2) => [
    key2,
    ...moveActivityInTree(byId.get(key2).children, id, index2),
  ]);
}
function moveActivity(order, id, index2) {
  if (!order.includes(id)) {
    return order;
  }
  const next2 = order.filter((item) => item !== id);
  next2.splice(Math.max(0, Math.min(index2, next2.length)), 0, id);
  return next2;
}
function readActivityOrder(key2) {
  try {
    const value = JSON.parse(localStorage.getItem(key2) || "null");
    return Array.isArray(value) && value.every((id) => typeof id === "string")
      ? [...new Set(value)]
      : null;
  } catch {
    return null;
  }
}
function writeActivityOrder(key2, order) {
  try {
    if (order) {
      localStorage.setItem(key2, JSON.stringify(order));
    } else {
      localStorage.removeItem(key2);
    }
  } catch {}
}

// custom_components/occupied/frontend/src/lib/components/shared/ActivityList.svelte
var root_19 = from_html(
  `<button type="button" class="activity-drag-handle"><ha-icon></ha-icon></button>`,
  2,
);
var root_27 = from_html(`<div class="activity-children"><!></div>`);
var root_35 = from_html(`<div><!> <!></div>`);
var root_43 = from_html(
  `<button type="button" class="activity-reset-order"> </button>`,
);
var root_53 = from_html(`<div class="activity-list-actions"><!> <!></div>`);
var root_63 = from_html(
  `<span class="visually-hidden"> </span> <div class="visually-hidden" role="status" aria-live="polite"> </div> <div class="step-list"><!></div> <!>`,
  1,
);
function ActivityList($$anchor, $$props) {
  const instructionsId = props_id();
  push($$props, true);
  const group = ($$anchor2, nodes = noop) => {
    const remaining = user_derived(() =>
      nodes().filter((node) => node.entry.id !== get(dragging)),
    );
    var fragment = comment();
    var node_1 = first_child(fragment);
    each(
      node_1,
      17,
      nodes,
      (node) => node.entry.id,
      ($$anchor3, node) => {
        const entry = user_derived(() => get(node).entry);
        const remainingIndex = user_derived(() =>
          get(remaining).findIndex((item) => item.entry.id === get(entry).id),
        );
        const activeGroup = user_derived(() =>
          nodes().some((item) => item.entry.id === get(dragging)),
        );
        var div = root_35();
        let classes;
        {
          const dragHandle = ($$anchor4) => {
            var button = root_19();
            var ha_icon = child(button);
            set_custom_element_data(ha_icon, "icon", "mdi:drag");
            set_custom_element_data(ha_icon, "aria-hidden", "true");
            reset(button);
            template_effect(
              ($0, $1) => {
                set_attribute2(button, "aria-label", $0);
                set_attribute2(button, "aria-describedby", instructionsId);
                set_attribute2(button, "title", $1);
                button.disabled = disabled() || nodes().length < 2;
              },
              [
                () =>
                  $$props
                    .t("reorder_activity")
                    .replace("{name}", () => get(entry2).name),
                () => $$props.t("reorder_activity_hint"),
              ],
            );
            delegated("pointerdown", button, (event2) =>
              startDrag(event2, get(entry2).id, nodes()),
            );
            delegated("keydown", button, (event2) =>
              keydown(event2, get(entry2).id, nodes()),
            );
            append($$anchor4, button);
          };
          const entry2 = user_derived(() => get(node).entry);
          const remainingIndex2 = user_derived(() =>
            get(remaining).findIndex(
              (item) => item.entry.id === get(entry2).id,
            ),
          );
          const activeGroup2 = user_derived(() =>
            nodes().some((item) => item.entry.id === get(dragging)),
          );
          var node_2 = child(div);
          snippet(
            node_2,
            () => $$props.children,
            () => get(entry2),
            () => dragHandle,
          );
          var node_3 = sibling(node_2, 2);
          {
            var consequent = ($$anchor4) => {
              var div_1 = root_27();
              var node_4 = child(div_1);
              group(node_4, () => get(node).children);
              reset(div_1);
              append($$anchor4, div_1);
            };
            if_block(node_3, ($$render) => {
              if (get(node).children.length) $$render(consequent);
            });
          }
          reset(div);
        }
        template_effect(() => {
          classes = set_class(div, 1, "activity-item", null, classes, {
            "activity-dragging": get(dragging) === get(entry).id,
            "activity-drop-before":
              get(activeGroup) &&
              get(dragging) !== get(entry).id &&
              get(target) === get(remainingIndex),
            "activity-drop-after":
              get(activeGroup) &&
              get(dragging) !== get(entry).id &&
              get(remainingIndex) === get(remaining).length - 1 &&
              get(target) === nodes().length - 1,
          });
          set_attribute2(div, "data-activity-id", get(entry).id);
        });
        append($$anchor3, div);
      },
    );
    append($$anchor2, fragment);
  };
  let disabled = prop($$props, "disabled", 3, false);
  let preference = state(null);
  let order = user_derived(() =>
    get(preference)?.key === $$props.storageKey
      ? get(preference).order
      : readActivityOrder($$props.storageKey),
  );
  let sorted2 = user_derived(() =>
    applyActivityOrder($$props.entries, get(order)),
  );
  let tree = user_derived(() => activityTree(get(sorted2), $$props.parentId));
  let list;
  let dragging = state(null);
  let target = state(null);
  let announcement = state("");
  let cancelDrag = null;
  onDestroy(() => cancelDrag?.());
  function save2(next2) {
    set2(preference, { key: $$props.storageKey, order: next2 }, true);
    writeActivityOrder($$props.storageKey, next2);
  }
  async function move2(id, index2, siblings) {
    const next2 = moveActivityInTree(get(tree), id, index2);
    const current = moveActivityInTree(get(tree), "", 0);
    if (next2.every((item, position) => item === current[position])) {
      return;
    }
    save2(next2);
    const entry = $$props.entries.find((item) => item.id === id);
    set2(
      announcement,
      $$props
        .t("activity_moved")
        .replace("{name}", () => entry.name)
        .replace("{position}", () =>
          String(Math.max(0, Math.min(index2, siblings.length - 1)) + 1),
        )
        .replace("{total}", () => String(siblings.length)),
      true,
    );
    await tick();
    const row = [...list.querySelectorAll(".activity-item")].find(
      (item) => item.dataset.activityId === id,
    );
    row?.querySelector(".activity-drag-handle")?.focus({ preventScroll: true });
  }
  function keydown(event2, id, siblings) {
    if (event2.key === "Escape" && cancelDrag) {
      event2.preventDefault();
      cancelDrag();
      return;
    }
    if (cancelDrag) {
      return;
    }
    const index2 = siblings.findIndex((node) => node.entry.id === id);
    const targets = {
      ArrowUp: index2 - 1,
      ArrowDown: index2 + 1,
      Home: 0,
      End: siblings.length - 1,
    };
    if (disabled() || targets[event2.key] === void 0) {
      return;
    }
    event2.preventDefault();
    void move2(id, targets[event2.key], siblings);
  }
  function scrollContainer(element2) {
    let current = element2;
    while (current) {
      if (
        current.scrollHeight > current.clientHeight &&
        /auto|scroll/.test(getComputedStyle(current).overflowY)
      ) {
        return current;
      }
      const root28 = current.getRootNode();
      current =
        current.assignedSlot ||
        current.parentElement ||
        (root28 instanceof ShadowRoot ? root28.host : null);
    }
    return document.scrollingElement;
  }
  function startDrag(event2, id, siblings) {
    if (
      disabled() ||
      siblings.length < 2 ||
      event2.button !== 0 ||
      !event2.isPrimary
    ) {
      return;
    }
    cancelDrag?.();
    const handle = event2.currentTarget;
    const group2 = handle.closest(".activity-item").parentElement;
    const scroller = scrollContainer(handle);
    const initialY = event2.clientY;
    const initialKey = $$props.storageKey;
    const initialTree = get(tree);
    const initialIds = get(sorted2).map((entry) => entry.id);
    let clientY = initialY;
    let frame = 0;
    handle.setPointerCapture(event2.pointerId);
    const updateTarget = () => {
      const rows = [
        ...group2.querySelectorAll(":scope > .activity-item"),
      ].filter((row) => row.dataset.activityId !== id);
      const index2 = rows.findIndex((row) => {
        const rect = row.getBoundingClientRect();
        return clientY < rect.top + rect.height / 2;
      });
      set2(target, index2 === -1 ? rows.length : index2, true);
    };
    const autoScroll = () => {
      const rect = scroller.getBoundingClientRect();
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      if (clientY < top + 48) {
        scroller.scrollTop -= 12;
      } else if (clientY > bottom - 48) {
        scroller.scrollTop += 12;
      }
      updateTarget();
      frame = requestAnimationFrame(autoScroll);
    };
    const update2 = (pointer) => {
      if (pointer.pointerId !== event2.pointerId) {
        return;
      }
      clientY = pointer.clientY;
      if (!get(dragging) && Math.abs(clientY - initialY) < 6) {
        return;
      }
      set2(dragging, id, true);
      updateTarget();
      if (!frame) {
        frame = requestAnimationFrame(autoScroll);
      }
    };
    const finish = (commit) => {
      const index2 = get(target);
      cancelAnimationFrame(frame);
      cancelDrag = null;
      set2(dragging, null);
      set2(target, null);
      handle.removeEventListener("pointermove", update2);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      handle.removeEventListener("lostpointercapture", stop);
      if (handle.hasPointerCapture(event2.pointerId)) {
        handle.releasePointerCapture(event2.pointerId);
      }
      if (
        commit &&
        index2 !== null &&
        !disabled() &&
        $$props.storageKey === initialKey &&
        get(tree) === initialTree &&
        initialIds.every(
          (item, position) => item === get(sorted2)[position]?.id,
        ) &&
        initialIds.length === get(sorted2).length
      ) {
        void move2(id, index2, siblings);
      }
    };
    const stop = (pointer) => {
      if (pointer.pointerId === event2.pointerId) {
        finish(pointer.type === "pointerup" && get(dragging) === id);
      }
    };
    cancelDrag = () => finish(false);
    handle.addEventListener("pointermove", update2);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
    handle.addEventListener("lostpointercapture", stop);
  }
  var fragment_1 = root_63();
  var span = first_child(fragment_1);
  var text2 = only_child(span, true);
  var div_2 = sibling(span, 2);
  var text_1 = only_child(div_2, true);
  var div_3 = sibling(div_2, 2);
  var node_5 = child(div_3);
  group(node_5, () => get(tree));
  reset(div_3);
  bind_this(
    div_3,
    ($$value) => (list = $$value),
    () => list,
  );
  var node_6 = sibling(div_3, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var div_4 = root_53();
      var node_7 = child(div_4);
      snippet(node_7, () => $$props.createAction ?? noop);
      var node_8 = sibling(node_7, 2);
      {
        var consequent_1 = ($$anchor3) => {
          var button_1 = root_43();
          var text_2 = only_child(button_1, true);
          template_effect(
            ($0) => {
              button_1.disabled = disabled();
              set_text(text_2, $0);
            },
            [() => $$props.t("reset_chronological_order")],
          );
          delegated("click", button_1, () => save2(null));
          append($$anchor3, button_1);
        };
        if_block(node_8, ($$render) => {
          if (get(order)) $$render(consequent_1);
        });
      }
      reset(div_4);
      append($$anchor2, div_4);
    };
    if_block(node_6, ($$render) => {
      if ($$props.createAction || get(order)) $$render(consequent_2);
    });
  }
  template_effect(
    ($0) => {
      set_attribute2(span, "id", instructionsId);
      set_text(text2, $0);
      set_text(text_1, get(announcement));
      set_attribute2(div_3, "aria-label", $$props.label);
    },
    [() => $$props.t("reorder_activity_hint")],
  );
  append($$anchor, fragment_1);
  pop();
}
delegate(["pointerdown", "keydown", "click"]);

// custom_components/occupied/frontend/src/lib/components/shared/ActivityIntro.svelte
var root13 = from_html(
  `<div class="activity-intro"><h2> </h2> <p class="hint"> </p></div>`,
);
function ActivityIntro($$anchor, $$props) {
  var div = root13();
  var h2 = child(div);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  reset(div);
  template_effect(() => {
    set_text(text2, $$props.title);
    set_text(text_1, $$props.description);
  });
  append($$anchor, div);
}

// custom_components/occupied/frontend/src/lib/components/steps/StepsView.svelte
var root14 = from_html(
  `<section class="step-empty"><h2> </h2> <p class="hint"> </p> <button type="button" class="primary" data-create-step=""> </button></section>`,
);
var root_110 = from_html(`<span class="step-status-badge"> </span>`);
var root_28 = from_html(`<span class="step-warning-message"> </span>`);
var root_36 = from_html(
  `<span class="step-row-warning"><ha-icon></ha-icon> <span></span></span>`,
  2,
);
var root_44 = from_html(`<span class="step-row-time"> </span>`);
var root_54 = from_html(`<div><!></div>`);
var root_64 = from_html(
  `<div style="--depth:0"><div class="step-card-header"><!> <button type="button"><span class="step-row-content"><span class="step-row-heading"><strong> </strong> <!></span> <span class="hint"> </span></span> <!></button></div> <!></div>`,
);
var root_72 = from_html(
  `<button type="button" class="primary" data-create-step=""> </button>`,
);
var root_8 = from_html(`<!> <div class="step-layout"><!></div>`, 1);
function StepsView($$anchor, $$props) {
  push($$props, true);
  let data = user_derived(() => {
    void $$props.revision;
    const entries2 = stepEntries(
      $$props.panel.draft,
      $$props.panel.catalog,
      $$props.panel.t,
    );
    return {
      t: $$props.panel.t,
      entries: entries2,
      ordered: chronologicalEntries(
        entries2,
        $$props.panel.draft,
        "steps",
        $$props.panel._hass,
      ),
      issues: $$props.panel
        .visibleIssues()
        .map((issue) => ({ issue, stepId: warningStepId(issue, entries2) })),
    };
  });
  let t = user_derived(() => get(data).t),
    entries = user_derived(() => get(data).entries),
    ordered = user_derived(() => get(data).ordered),
    issues = user_derived(() => get(data).issues);
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      var section = root14();
      var h2 = child(section);
      var text2 = only_child(h2, true);
      var p = sibling(h2, 2);
      var text_1 = only_child(p, true);
      var button = sibling(p, 2);
      var text_2 = only_child(button, true);
      reset(section);
      template_effect(
        ($0, $1, $2) => {
          set_text(text2, $0);
          set_text(text_1, $1);
          button.disabled = $$props.panel.busy;
          set_text(text_2, $2);
        },
        [
          () => get(t)("scheduled_activity"),
          () => get(t)("steps_hint"),
          () => get(t)("create_your_first_step"),
        ],
      );
      delegated("click", button, () => startStep($$props.panel));
      append($$anchor2, section);
    };
    var alternate = ($$anchor2) => {
      var fragment_1 = root_8();
      var node_1 = first_child(fragment_1);
      {
        let $0 = user_derived(() => get(t)("scheduled_activity"));
        let $1 = user_derived(() => get(t)("steps_hint"));
        ActivityIntro(node_1, {
          get title() {
            return get($0);
          },
          get description() {
            return get($1);
          },
        });
      }
      var div = sibling(node_1, 2);
      var node_2 = child(div);
      {
        const children = ($$anchor3, entry = noop, dragHandle = noop) => {
          const warnings = user_derived(() =>
            get(issues)
              .filter(({ stepId }) => stepId === entry().id)
              .map(({ issue }) => issue),
          );
          const editing = user_derived(
            () =>
              $$props.panel.stepEditor?.existing &&
              $$props.panel.stepEditor.id === entry().id,
          );
          const stepDisabled = user_derived(
            () =>
              (get(editing)
                ? $$props.panel.stepEditor?.form.enabled
                : entry().enabled) === false,
          );
          const expanded = user_derived(
            () =>
              get(editing) ||
              (!$$props.panel.stepEditor &&
                $$props.panel.selectedStep === entry().id),
          );
          var div_1 = root_64();
          let classes;
          var div_2 = child(div_1);
          var node_3 = child(div_2);
          snippet(node_3, dragHandle);
          var button_1 = sibling(node_3, 2);
          let classes_1;
          var span = child(button_1);
          var span_1 = child(span);
          var strong = child(span_1);
          var text_3 = only_child(strong, true);
          var node_4 = sibling(strong, 2);
          {
            var consequent_1 = ($$anchor4) => {
              var span_2 = root_110();
              var text_4 = only_child(span_2, true);
              template_effect(
                ($02) => set_text(text_4, $02),
                [() => get(t)("disabled")],
              );
              append($$anchor4, span_2);
            };
            if_block(node_4, ($$render) => {
              if (get(stepDisabled)) $$render(consequent_1);
            });
          }
          reset(span_1);
          var span_3 = sibling(span_1, 2);
          var text_5 = only_child(span_3);
          reset(span);
          var node_5 = sibling(span, 2);
          {
            var consequent_2 = ($$anchor4) => {
              var span_4 = root_36();
              var ha_icon = child(span_4);
              set_custom_element_data(ha_icon, "icon", "mdi:alert-outline");
              set_custom_element_data(ha_icon, "aria-hidden", "true");
              var span_5 = sibling(ha_icon, 2);
              each(
                span_5,
                20,
                () => get(warnings),
                (warning) => warning,
                ($$anchor5, warning) => {
                  var span_6 = root_28();
                  var text_6 = only_child(span_6, true);
                  template_effect(() => set_text(text_6, warning.message));
                  append($$anchor5, span_6);
                },
              );
              reset(span_5);
              reset(span_4);
              template_effect(() =>
                set_attribute2(span_4, "id", `step-warning-${entry().id}`),
              );
              append($$anchor4, span_4);
            };
            var consequent_3 = ($$anchor4) => {
              var span_7 = root_44();
              var text_7 = only_child(span_7, true);
              template_effect(
                ($02) => set_text(text_7, $02),
                [
                  () =>
                    timingSummary(
                      entry(),
                      get(entries),
                      get(t),
                      $$props.panel.catalog.time_sources,
                      $$props.panel._hass.locale,
                    ),
                ],
              );
              append($$anchor4, span_7);
            };
            if_block(node_5, ($$render) => {
              if (get(warnings).length) $$render(consequent_2);
              else if (!get(editing)) $$render(consequent_3, 1);
            });
          }
          reset(button_1);
          reset(div_2);
          var node_6 = sibling(div_2, 2);
          {
            var consequent_5 = ($$anchor4) => {
              var div_3 = root_54();
              var node_7 = child(div_3);
              {
                var consequent_4 = ($$anchor5) => {
                  StepEditor($$anchor5, {
                    get panel() {
                      return $$props.panel;
                    },
                    get revision() {
                      return $$props.revision;
                    },
                  });
                };
                if_block(node_7, ($$render) => {
                  if ($$props.panel.stepEditor) $$render(consequent_4);
                });
              }
              reset(div_3);
              template_effect(() =>
                set_attribute2(div_3, "id", `step-editor-${entry().id}`),
              );
              append($$anchor4, div_3);
            };
            if_block(node_6, ($$render) => {
              if (get(expanded)) $$render(consequent_5);
            });
          }
          reset(div_1);
          template_effect(
            ($02, $12, $2) => {
              classes = set_class(div_1, 1, "step-card", null, classes, {
                "step-disabled": get(stepDisabled),
                "step-warning": get(warnings).length > 0,
              });
              set_attribute2(div_1, "data-step-id", entry().id);
              set_attribute2(button_1, "id", `step-card-${entry().id}`);
              classes_1 = set_class(button_1, 1, "step-row", null, classes_1, {
                editing: get(editing) && get(warnings).length === 0,
              });
              set_attribute2(button_1, "aria-label", $02);
              button_1.disabled = $$props.panel.busy;
              set_attribute2(button_1, "aria-expanded", get(expanded));
              set_attribute2(
                button_1,
                "aria-controls",
                `step-editor-${entry().id}`,
              );
              set_attribute2(
                button_1,
                "aria-describedby",
                get(warnings).length > 0
                  ? `step-warning-${entry().id}`
                  : void 0,
              );
              set_text(text_3, entry().name);
              set_text(
                text_5,
                `${$12 ?? ""} \xB7
                  ${$2 ?? ""}`,
              );
            },
            [
              () =>
                get(stepDisabled)
                  ? `${entry().name} \xB7 ${get(t)("disabled")}`
                  : entry().name,
              () => actionSummary(entry(), get(t)),
              () =>
                entitySummary(
                  $$props.panel.catalog,
                  actionTargets(entry()),
                  get(t),
                ),
            ],
          );
          delegated("click", button_1, () => openStep($$props.panel, entry()));
          append($$anchor3, div_1);
        };
        const createAction = ($$anchor3) => {
          var button_2 = root_72();
          var text_8 = only_child(button_2, true);
          template_effect(
            ($02) => {
              button_2.disabled = $$props.panel.busy;
              set_text(text_8, $02);
            },
            [() => get(t)("create_step")],
          );
          delegated("click", button_2, () => startStep($$props.panel));
          append($$anchor3, button_2);
        };
        let $0 = user_derived(
          () => `occupied:activity-order:${$$props.panel.selectedEntry}:steps`,
        );
        let $1 = user_derived(() => get(t)("steps"));
        ActivityList(node_2, {
          get entries() {
            return get(ordered);
          },
          parentId: (entry) => entry.timing.relative_to?.step,
          get storageKey() {
            return get($0);
          },
          get label() {
            return get($1);
          },
          get disabled() {
            return $$props.panel.busy;
          },
          get t() {
            return get(t);
          },
          children,
          createAction,
          $$slots: { default: true, createAction: true },
        });
      }
      reset(div);
      append($$anchor2, fragment_1);
    };
    if_block(node, ($$render) => {
      if (get(entries).length === 0) $$render(consequent);
      else $$render(alternate, -1);
    });
  }
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/src/lib/components/settings/RunConditionSettings.svelte
var root15 = from_html(
  `<p class="managed-warning svelte-111t7iy" role="alert"> </p>`,
);
var root_111 = from_html(
  `<fieldset class="svelte-111t7iy"><legend> </legend> <label for="run-condition-entity" class="svelte-111t7iy"> </label> <ha-selector></ha-selector> <!> <label for="run-condition-states" class="svelte-111t7iy"> </label> <ha-selector></ha-selector> <!> <label class="svelte-111t7iy"><input type="checkbox"/> </label> <p class="hint"> </p> <label for="run-condition-delay" class="svelte-111t7iy"> </label> <input id="run-condition-delay" type="text"/> <!> <p class="hint"> </p> <label for="run-condition-offEntities" class="svelte-111t7iy"> </label> <ha-selector></ha-selector> <!> <p class="hint"> </p> <!></fieldset>`,
  2,
);
var root_29 = from_html(`<p class="hint"> </p>`);
var root_37 = from_html(`<p> </p>`);
var root_45 = from_html(`<p role="status"> </p> <!>`, 1);
var root_55 = from_html(`<span> </span>`);
var root_65 = from_html(`<p class="counts svelte-111t7iy"></p>`);
var root_73 = from_html(`<li> </li>`);
var root_82 = from_html(
  `<details><summary> </summary> <!> <ul></ul></details>`,
);
var root_9 = from_html(
  `<section><h2> </h2> <label class="svelte-111t7iy"><input type="checkbox"/> </label> <!> <!> <div class="actions svelte-111t7iy"><button type="button" class="primary"> </button> <button type="button"> </button></div> <!> <!></section>`,
);
var $$css3 = {
  hash: "svelte-111t7iy",
  code: "fieldset.svelte-111t7iy {margin:12px 0;}label.svelte-111t7iy {display:block;margin:12px 0 6px;}.actions.svelte-111t7iy {display:flex;gap:8px;margin-top:12px;}.managed-warning.svelte-111t7iy {color:var(--warning-color, #e69500);}.counts.svelte-111t7iy {display:flex;flex-wrap:wrap;gap:12px;}",
};
function RunConditionSettings($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css3);
  let data = user_derived(() => {
    void $$props.revision;
    return {
      t: $$props.panel.t,
      form: $$props.panel.runConditionForm,
      errors: $$props.panel.runConditionErrors,
      snapshot: $$props.panel.runtimeSnapshot,
      managedExtras: managedOffEntities(
        $$props.panel.draft,
        $$props.panel.runConditionForm?.offEntities ?? [],
      ),
    };
  });
  let t = user_derived(() => get(data).t),
    form = user_derived(() => get(data).form),
    errors = user_derived(() => get(data).errors),
    snapshot2 = user_derived(() => get(data).snapshot),
    managedExtras = user_derived(() => get(data).managedExtras);
  let current = user_derived(() =>
    $$props.panel.catalog.entities.find(
      (item) => item.entity_id === get(form)?.entityId,
    ),
  );
  let now = state(proxy(Date.now()));
  let deadline = user_derived(
    () => get(snapshot2).run_condition?.activation_deadline,
  );
  let remaining = user_derived(() =>
    get(deadline)
      ? Math.max(0, Math.ceil((Date.parse(get(deadline)) - get(now)) / 1e3))
      : 0,
  );
  user_effect(() => {
    if ($$props.panel.runConditionForm) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        $$props.panel.openRunCondition();
      }
    });
    return () => {
      cancelled = true;
    };
  });
  user_effect(() => {
    if (!get(deadline)) {
      return;
    }
    const timer = setInterval(() => {
      set2(now, Date.now(), true);
    }, 1e3);
    return () => clearInterval(timer);
  });
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent_7 = ($$anchor2) => {
      var section = root_9();
      var h2 = child(section);
      var text2 = only_child(h2, true);
      var label = sibling(h2, 2);
      var input = child(label);
      remove_input_defaults(input);
      var text_1 = sibling(input);
      reset(label);
      var node_1 = sibling(label, 2);
      {
        var consequent_1 = ($$anchor3) => {
          var fieldset = root_111();
          var legend = child(fieldset);
          var text_2 = only_child(legend, true);
          var label_1 = sibling(legend, 2);
          var text_3 = only_child(label_1, true);
          var ha_selector = sibling(label_1, 2);
          set_custom_element_data(ha_selector, "id", "run-condition-entity");
          template_effect(
            ($0) => set_custom_element_data(ha_selector, "aria-label", $0),
            [() => get(t)("run_condition_entity")],
          );
          action(
            ha_selector,
            ($$node, $$action_arg) => properties?.($$node, $$action_arg),
            () => ({
              hass: $$props.panel._hass,
              selector: { entity: {} },
              value: get(form).entityId,
              disabled: $$props.panel.busy || $$props.panel.yamlDirty,
            }),
          );
          var node_2 = sibling(ha_selector, 2);
          FieldError(node_2, {
            get t() {
              return get(t);
            },
            get errors() {
              return get(errors);
            },
            key: "entityId",
            fieldPrefix: "run-condition-",
          });
          var label_2 = sibling(node_2, 2);
          var text_4 = only_child(label_2, true);
          var ha_selector_1 = sibling(label_2, 2);
          set_custom_element_data(ha_selector_1, "id", "run-condition-states");
          template_effect(
            ($0) => set_custom_element_data(ha_selector_1, "aria-label", $0),
            [() => get(t)("run_condition_states")],
          );
          action(
            ha_selector_1,
            ($$node, $$action_arg) => properties?.($$node, $$action_arg),
            () => ({
              hass: $$props.panel._hass,
              selector: {
                select: {
                  multiple: true,
                  custom_value: true,
                  options: runConditionStateOptions(
                    get(form).entityId,
                    get(form).states,
                    get(current)?.state,
                  ),
                },
              },
              value: get(form).states,
              disabled: $$props.panel.busy || $$props.panel.yamlDirty,
            }),
          );
          var node_3 = sibling(ha_selector_1, 2);
          FieldError(node_3, {
            get t() {
              return get(t);
            },
            get errors() {
              return get(errors);
            },
            key: "states",
            fieldPrefix: "run-condition-",
          });
          var label_3 = sibling(node_3, 2);
          var input_1 = child(label_3);
          remove_input_defaults(input_1);
          var text_5 = sibling(input_1);
          reset(label_3);
          var p = sibling(label_3, 2);
          var text_6 = only_child(p, true);
          var label_4 = sibling(p, 2);
          var text_7 = only_child(label_4, true);
          var input_2 = sibling(label_4, 2);
          remove_input_defaults(input_2);
          var node_4 = sibling(input_2, 2);
          FieldError(node_4, {
            get t() {
              return get(t);
            },
            get errors() {
              return get(errors);
            },
            key: "startDelay",
            fieldPrefix: "run-condition-",
          });
          var p_1 = sibling(node_4, 2);
          var text_8 = only_child(p_1, true);
          var label_5 = sibling(p_1, 2);
          var text_9 = only_child(label_5, true);
          var ha_selector_2 = sibling(label_5, 2);
          set_custom_element_data(
            ha_selector_2,
            "id",
            "run-condition-offEntities",
          );
          template_effect(
            ($0) => set_custom_element_data(ha_selector_2, "aria-label", $0),
            [() => get(t)("run_condition_off_entities")],
          );
          action(
            ha_selector_2,
            ($$node, $$action_arg) => properties?.($$node, $$action_arg),
            () => ({
              hass: $$props.panel._hass,
              selector: {
                entity: {
                  multiple: true,
                  filter: { domain: ["light", "switch"] },
                },
              },
              value: get(form).offEntities,
              disabled: $$props.panel.busy || $$props.panel.yamlDirty,
            }),
          );
          var node_5 = sibling(ha_selector_2, 2);
          FieldError(node_5, {
            get t() {
              return get(t);
            },
            get errors() {
              return get(errors);
            },
            key: "offEntities",
            fieldPrefix: "run-condition-",
          });
          var p_2 = sibling(node_5, 2);
          var text_10 = only_child(p_2, true);
          var node_6 = sibling(p_2, 2);
          {
            var consequent = ($$anchor4) => {
              var p_3 = root15();
              var text_11 = only_child(p_3);
              template_effect(
                ($0, $1) =>
                  set_text(
                    text_11,
                    `${$0 ?? ""}
            ${$1 ?? ""}`,
                  ),
                [
                  () => get(t)("run_condition_off_entities_warning"),
                  () => get(managedExtras).join(", "),
                ],
              );
              append($$anchor4, p_3);
            };
            if_block(node_6, ($$render) => {
              if (get(managedExtras).length > 0) $$render(consequent);
            });
          }
          reset(fieldset);
          template_effect(
            ($0, $1, $2, $3, $4, $5, $6, $7, $8) => {
              fieldset.disabled = $$props.panel.busy || $$props.panel.yamlDirty;
              set_text(text_2, $0);
              set_text(text_3, $1);
              set_text(text_4, $2);
              set_checked(input_1, get(form).enforceState);
              set_text(text_5, ` ${$3 ?? ""}`);
              set_text(text_6, $4);
              set_text(text_7, $5);
              set_value(input_2, get(form).startDelay);
              input_2.disabled = !get(form).enforceState;
              set_attribute2(input_2, "aria-invalid", !!get(errors).startDelay);
              set_text(text_8, $6);
              set_text(text_9, $7);
              set_text(text_10, $8);
            },
            [
              () => get(t)("run_condition"),
              () => get(t)("run_condition_entity"),
              () => get(t)("run_condition_states"),
              () => get(t)("run_condition_enforce"),
              () => get(t)("run_condition_enforce_hint"),
              () => get(t)("run_condition_delay"),
              () => get(t)("run_condition_delay_hint"),
              () => get(t)("run_condition_off_entities"),
              () => get(t)("run_condition_off_entities_hint"),
            ],
          );
          event("value-changed", ha_selector, (event2) => {
            if (!isValueChangedEvent(event2)) {
              return;
            }
            get(form).entityId =
              typeof event2.detail.value === "string"
                ? event2.detail.value
                : "";
            $$props.panel.updateRunCondition();
          });
          event("value-changed", ha_selector_1, (event2) => {
            if (!(
              isValueChangedEvent(event2) && Array.isArray(event2.detail.value)
            )) {
              return;
            }
            get(form).states = event2.detail.value;
            $$props.panel.updateRunCondition();
          });
          delegated("change", input_1, (event2) => {
            get(form).enforceState = event2.currentTarget.checked;
            $$props.panel.updateRunCondition();
          });
          delegated("input", input_2, (event2) => {
            get(form).startDelay = event2.currentTarget.value;
            $$props.panel.updateRunCondition();
          });
          event("value-changed", ha_selector_2, (event2) => {
            if (!(
              isValueChangedEvent(event2) && Array.isArray(event2.detail.value)
            )) {
              return;
            }
            get(form).offEntities = event2.detail.value;
            $$props.panel.updateRunCondition();
          });
          append($$anchor3, fieldset);
        };
        if_block(node_1, ($$render) => {
          if (get(form).enabled) $$render(consequent_1);
        });
      }
      var node_7 = sibling(node_1, 2);
      {
        var consequent_2 = ($$anchor3) => {
          var p_4 = root_29();
          var text_12 = only_child(p_4, true);
          template_effect(
            ($0) => set_text(text_12, $0),
            [() => get(t)("run_condition_yaml_hint")],
          );
          append($$anchor3, p_4);
        };
        if_block(node_7, ($$render) => {
          if ($$props.panel.yamlDirty) $$render(consequent_2);
        });
      }
      var div = sibling(node_7, 2);
      var button = child(div);
      var text_13 = only_child(button, true);
      var button_1 = sibling(button, 2);
      var text_14 = only_child(button_1, true);
      reset(div);
      var node_8 = sibling(div, 2);
      {
        var consequent_4 = ($$anchor3) => {
          var fragment_1 = root_45();
          var p_5 = first_child(fragment_1);
          var text_15 = only_child(p_5, true);
          var node_9 = sibling(p_5, 2);
          {
            var consequent_3 = ($$anchor4) => {
              var p_6 = root_37();
              var text_16 = only_child(p_6, true);
              template_effect(
                ($0) => set_text(text_16, $0),
                [
                  () =>
                    get(t)("run_condition_countdown").replace("{seconds}", () =>
                      String(get(remaining)),
                    ),
                ],
              );
              append($$anchor4, p_6);
            };
            if_block(node_9, ($$render) => {
              if (get(deadline)) $$render(consequent_3);
            });
          }
          template_effect(() => set_text(text_15, get(snapshot2).reason));
          append($$anchor3, fragment_1);
        };
        if_block(node_8, ($$render) => {
          if (get(snapshot2).run_condition) $$render(consequent_4);
        });
      }
      var node_10 = sibling(node_8, 2);
      {
        var consequent_6 = ($$anchor3) => {
          var details = root_82();
          var summary = child(details);
          var text_17 = only_child(summary);
          var node_11 = sibling(summary, 2);
          {
            var consequent_5 = ($$anchor4) => {
              var p_7 = root_65();
              each(
                p_7,
                21,
                () => Object.entries(get(snapshot2).reconciliation.counts),
                ([kind, count]) => kind,
                ($$anchor5, $$item) => {
                  var $$array = user_derived(() => to_array(get($$item), 2));
                  let kind = () => get($$array)[0];
                  let count = () => get($$array)[1];
                  var span = root_55();
                  var text_18 = only_child(span);
                  template_effect(
                    ($0) => set_text(text_18, `${$0 ?? ""}: ${count() ?? ""}`),
                    [() => get(t)(`run_condition_count_${kind()}`)],
                  );
                  append($$anchor5, span);
                },
              );
              reset(p_7);
              append($$anchor4, p_7);
            };
            if_block(node_11, ($$render) => {
              if (get(snapshot2).reconciliation.counts) $$render(consequent_5);
            });
          }
          var ul = sibling(node_11, 2);
          each(
            ul,
            21,
            () => Object.entries(get(snapshot2).reconciliation.results),
            ([entity, result]) => entity,
            ($$anchor4, $$item) => {
              var $$array_1 = user_derived(() => to_array(get($$item), 2));
              let entity = () => get($$array_1)[0];
              let result = () => get($$array_1)[1];
              var li = root_73();
              var text_19 = only_child(li);
              template_effect(
                ($0) =>
                  set_text(
                    text_19,
                    `${entity() ?? ""}: ${$0 ?? ""}${result().reason ? ` \xB7 ${result().reason}` : ""}`,
                  ),
                [() => get(t)(result().status)],
              );
              append($$anchor4, li);
            },
          );
          reset(ul);
          reset(details);
          template_effect(
            ($0, $1) => set_text(text_17, `${$0 ?? ""} \xB7 ${$1 ?? ""}`),
            [
              () => get(t)("run_condition_results"),
              () => get(t)(get(snapshot2).reconciliation.phase),
            ],
          );
          append($$anchor3, details);
        };
        var d = user_derived(
          () =>
            get(snapshot2).reconciliation &&
            Object.keys(get(snapshot2).reconciliation.results).length > 0,
        );
        if_block(node_10, ($$render) => {
          if (get(d)) $$render(consequent_6);
        });
      }
      reset(section);
      template_effect(
        ($0, $1, $2, $3) => {
          set_text(text2, $0);
          set_checked(input, get(form).enabled);
          input.disabled = $$props.panel.busy || $$props.panel.yamlDirty;
          set_text(text_1, ` ${$1 ?? ""}`);
          button.disabled =
            $$props.panel.busy ||
            $$props.panel.stale ||
            $$props.panel.yamlDirty ||
            !$$props.panel.hasRunConditionChanges;
          set_text(text_13, $2);
          button_1.disabled =
            $$props.panel.busy || !$$props.panel.hasRunConditionChanges;
          set_text(text_14, $3);
        },
        [
          () => get(t)("run_condition"),
          () => get(t)("run_condition_enable"),
          () =>
            get(t)(
              $$props.panel.document.source === "file"
                ? "add_to_draft"
                : "save_changes",
            ),
          () => get(t)("discard_changes"),
        ],
      );
      delegated("change", input, (event2) => {
        get(form).enabled = event2.currentTarget.checked;
        $$props.panel.updateRunCondition();
      });
      delegated("click", button, () => $$props.panel.saveRunCondition());
      delegated("click", button_1, () => $$props.panel.openRunCondition());
      append($$anchor2, section);
    };
    if_block(node, ($$render) => {
      if (get(form)) $$render(consequent_7);
    });
  }
  append($$anchor, fragment);
  pop();
}
delegate(["change", "input", "click"]);

// custom_components/occupied/frontend/src/lib/components/settings/SettingsView.svelte
var root16 = from_html(`<span class="changes svelte-g0xj3p"> </span>`);
var root_112 = from_html(
  `<!> <section><h2> <!></h2> <p class="hint"> </p> <input type="file" accept=".yaml,.yml,.json"/> <ha-code-editor></ha-code-editor> <div class="yaml-actions svelte-g0xj3p"><button type="button" class="primary"> </button> <button type="button"> </button> <button type="button" class="download svelte-g0xj3p"> </button></div></section>`,
  3,
);
var $$css4 = {
  hash: "svelte-g0xj3p",
  code: ".yaml-actions.svelte-g0xj3p {display:flex;align-items:center;flex-wrap:wrap;gap:8px;}.yaml-actions.svelte-g0xj3p .download:where(.svelte-g0xj3p) {margin-left:auto;}ha-code-editor.svelte-g0xj3p {display:block;width:100%;margin:8px 0;--code-mirror-height: 420px;--code-mirror-max-height: 60vh;}section.yaml-panel.svelte-g0xj3p {border-color:var(--divider-color, #d5dce3);border-left-color:var(--divider-color, #d5dce3);background:var(--card-background-color, #fff);}section.yaml-panel.has-changes.svelte-g0xj3p {border-color:var(--warning-color, #e69500);border-left-color:var(--warning-color, #e69500);background:color-mix(\n      in srgb,\n      var(--warning-color, #e69500) 18%,\n      var(--card-background-color, #fff)\n    );}.changes.svelte-g0xj3p {color:var(--warning-color, #e69500);font-size:0.75em;font-weight:500;}",
};
function SettingsView($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css4);
  let panel = prop($$props, "panel", 7);
  let data = user_derived(() => {
    void $$props.revision;
    return { t: panel().t };
  });
  let t = user_derived(() => get(data).t);
  let yamlDirty = user_derived(() => panel().yamlDirty);
  let autoExportStarted = false;
  user_effect(() => {
    void $$props.revision;
    if (autoExportStarted || panel().busy) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      autoExportStarted = true;
      void panel().exportYaml();
    });
    return () => {
      cancelled = true;
    };
  });
  var fragment = root_112();
  var node = first_child(fragment);
  RunConditionSettings(node, {
    get panel() {
      return panel();
    },
    get revision() {
      return $$props.revision;
    },
  });
  var section = sibling(node, 2);
  let classes;
  var h2 = child(section);
  var text2 = child(h2);
  var node_1 = sibling(text2);
  {
    var consequent = ($$anchor2) => {
      var span = root16();
      var text_1 = only_child(span);
      template_effect(
        ($0) => set_text(text_1, `(${$0 ?? ""})`),
        [() => get(t)("changes")],
      );
      append($$anchor2, span);
    };
    if_block(node_1, ($$render) => {
      if (get(yamlDirty)) $$render(consequent);
    });
  }
  reset(h2);
  var p = sibling(h2, 2);
  var text_2 = only_child(p, true);
  var input = sibling(p, 2);
  var ha_code_editor = sibling(input, 2);
  set_custom_element_data(ha_code_editor, "role", "group");
  template_effect(
    ($0) => set_custom_element_data(ha_code_editor, "aria-label", $0),
    [() => get(t)("occupied_yaml")],
  );
  set_custom_element_data(ha_code_editor, "dir", "ltr");
  set_class(ha_code_editor, 1, "svelte-g0xj3p");
  action(
    ha_code_editor,
    ($$node, $$action_arg) => properties?.($$node, $$action_arg),
    () => ({ mode: "yaml", value: panel().yaml, linewrap: true }),
  );
  var div = sibling(ha_code_editor, 2);
  var button = child(div);
  var text_3 = only_child(button, true);
  var button_1 = sibling(button, 2);
  var text_4 = only_child(button_1, true);
  var button_2 = sibling(button_1, 2);
  var text_5 = only_child(button_2, true);
  reset(div);
  reset(section);
  template_effect(
    ($0, $1, $2, $3, $4, $5) => {
      classes = set_class(
        section,
        1,
        "yaml-panel svelte-g0xj3p",
        null,
        classes,
        { "has-changes": get(yamlDirty) },
      );
      set_text(text2, `${$0 ?? ""} `);
      set_text(text_2, $1);
      set_attribute2(input, "aria-label", $2);
      ha_code_editor.dir = ha_code_editor.dir;
      button.disabled =
        panel().busy ||
        panel().stale ||
        panel().document.source === "file" ||
        !get(yamlDirty) ||
        !panel().yaml ||
        panel().hasRunConditionChanges;
      set_text(text_3, $3);
      button_1.disabled = panel().busy || !get(yamlDirty);
      set_text(text_4, $4);
      button_2.disabled = panel().busy || !panel().yaml;
      set_text(text_5, $5);
    },
    [
      () => get(t)("yaml"),
      () => get(t)("yaml_editor_hint"),
      () => get(t)("choose_configuration_file"),
      () => get(t)("save_changes"),
      () => get(t)("discard_changes"),
      () => get(t)("download"),
    ],
  );
  delegated("change", input, async (event2) => {
    const file = event2.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    const epoch = panel().epoch;
    const yaml = await file.text();
    if (epoch !== panel().epoch) {
      return;
    }
    panel().yaml = yaml;
    panel().flush();
  });
  event("value-changed", ha_code_editor, (event2) => {
    if (
      !isValueChangedEvent(event2) ||
      typeof event2.detail.value !== "string"
    ) {
      return;
    }
    panel().yaml = event2.detail.value;
    panel().flush();
  });
  delegated("click", button, () => panel().saveYaml());
  delegated("click", button_1, () => panel().discardYaml());
  delegated("click", button_2, () =>
    download("occupied.yaml", panel().yaml, "text/yaml"),
  );
  append($$anchor, fragment);
  pop();
}
delegate(["change", "click"]);

// custom_components/occupied/frontend/src/lib/controllers/random-editor-controller.ts
function openRandom(panel, entry) {
  if (panel.busy) {
    return;
  }
  if (panel.activeEditor) {
    const same = !!entry && panel.randomEditor?.id === entry.id;
    panel.requestStepExit(() => {
      if (!same) {
        openRandom(panel, entry);
      }
    });
    return;
  }
  panel.randomEditor = randomEditor(panel.draft, entry);
  panel.tab = "random";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel, "name");
  if (entry) {
    panel.shadowRoot
      .getElementById(`random-editor-${entry.id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
function createRandomEditorContext(panel) {
  const editor = panel.randomEditor,
    form = editor.form,
    t = panel.t;
  const epoch = panel.epoch;
  const isCurrent = () =>
    panel.epoch === epoch && panel.activeEditor === editor;
  const refresh = (key2) => {
    panel.flush();
    focusEditor(panel, key2);
  };
  const changed = (key2) => {
    if (
      !["entities", "cover"].includes(form.on.kind) ||
      form.on.kind !== form.off.kind
    ) {
      form.sameEntities = false;
    }
    if (form.sameEntities) {
      form.off.entities = [...form.on.entities];
    }
    panel.version++;
    panel.validatedVersion = -1;
    const errors = randomErrors(panel.draft, editor);
    for (const field of Object.keys(editor.errors)) {
      if (errors[field]) {
        editor.errors[field] = errors[field];
      } else {
        delete editor.errors[field];
      }
    }
    delete editor.errors[key2];
    panel.flush();
  };
  const scopedEditor = (prefix, options) =>
    new Proxy(editor, {
      get(target, key2) {
        if (key2 === "errors") {
          return Object.fromEntries(
            Object.entries(target.errors)
              .filter(([field]) => field.startsWith(prefix))
              .map(([field, message]) => [field.slice(prefix.length), message]),
          );
        }
        return options && (key2 === "showEndTime" || key2 === "showEndOffset")
          ? options[key2]
          : Reflect.get(target, key2);
      },
      set(target, key2, value) {
        if (options && (key2 === "showEndTime" || key2 === "showEndOffset")) {
          options[key2] = value;
          return true;
        }
        return Reflect.set(target, key2, value);
      },
    });
  const timing = (edge) => ({
    editor: scopedEditor(`${edge}.`, editor[`${edge}Options`]),
    form: new Proxy(form, {}),
    time: new Proxy(form[edge], {}),
    t,
    fieldPrefix: `${edge}.`,
    ...(edge === "start" && { randomId: editor.id }),
    changed: (key2) => changed(`${edge}.${key2}`),
    refresh: (key2) => refresh(key2 ? `${edge}.${key2}` : void 0),
  });
  const action2 = (phase) => ({
    editor: scopedEditor(`${phase}.`),
    setErrors: (errors) => {
      for (const [key2, message] of Object.entries(errors)) {
        editor.errors[`${phase}.${key2}`] = message;
      }
    },
    form: new Proxy(form[phase], {}),
    t,
    fieldPrefix: `${phase}.`,
    changed: (key2) => changed(`${phase}.${key2}`),
  });
  const submit = async () => {
    if (!isCurrent()) {
      return;
    }
    editor.errors = randomErrors(panel.draft, editor);
    if (Object.keys(editor.errors).length > 0) {
      return refresh(Object.keys(editor.errors)[0]);
    }
    try {
      for (const phase of ["on", "off"]) {
        try {
          await prepareCustomAction(panel, form[phase]);
          if (!isCurrent()) {
            return;
          }
        } catch (error) {
          if (!isCurrent()) {
            return;
          }
          editor.errors[`${phase}.customYaml`] =
            error instanceof Error ? error.message : String(error);
          return refresh(`${phase}.customYaml`);
        }
      }
      const candidate = buildRandom(panel.draft, editor);
      editor.candidatePath = ["random", editor.id];
      if (panel.document?.source === "file") {
        if (form.on.kind === "custom" || form.off.kind === "custom") {
          const version = panel.version;
          const validation = await panel.ws("editor_validate", {
            program: candidate,
          });
          if (panel.version !== version || !isCurrent()) {
            return;
          }
          if (!validation.valid) {
            panel.showIssues(validation);
            if (validation.issues.length > 0) {
              panel.focusIssue(validation.issues[0]);
            }
            return;
          }
        }
        panel.randomEditor = null;
        panel.change([], candidate, true);
      } else {
        await panel.save(candidate);
      }
    } catch (error) {
      if (isCurrent()) {
        panel.fail(error);
      }
    }
  };
  const cancel = () =>
    panel.requestStepExit(() =>
      panel.shadowRoot.getElementById(`random-card-${editor.id}`)?.focus(),
    );
  const context = { editor: new Proxy(editor, {}), t, changed };
  return {
    ...context,
    form: new Proxy(form, {}),
    timing,
    action: action2,
    submit,
    cancel,
  };
}
async function deleteRandom(panel) {
  const editor = panel.randomEditor;
  if (!editor || panel.busy) {
    return;
  }
  const candidate = copy(panel.draft);
  if (randomReferences(candidate, editor.id).length > 0) {
    panel.error = panel.t("random_dependents_error");
    panel.flush();
    return;
  }
  delete candidate.random?.[editor.id];
  if (panel.document?.source === "file") {
    panel.randomEditor = null;
    panel.change([], candidate, true);
    return;
  }
  await panel.save(candidate);
}

// custom_components/occupied/frontend/src/lib/actions/timeline-now.ts
function timelineNow(node, options) {
  const chart = node;
  const generate = chart._generateData;
  if (typeof generate !== "function") {
    return;
  }
  let current = typeof options === "string" ? { label: options } : options;
  const markerId = "occupied-now";
  const eventMarkerId = "occupied-event";
  const refresh = () => {
    const now = Date.now();
    const showNow =
      (current.startTime === void 0 || now >= Date.parse(current.startTime)) &&
      (current.endTime === void 0 || now < Date.parse(current.endTime));
    if (!showNow) {
      current.onNowPosition?.(null);
    }
    if (!chart._chartData) {
      return;
    }
    const color =
      getComputedStyle(node).getPropertyValue("--primary-text-color").trim() ||
      "#333";
    const eventTime = current.eventTime ? Date.parse(current.eventTime) : NaN;
    const markers = [
      ...(showNow
        ? [
            {
              id: markerId,
              time: now,
              text: current.onNowPosition ? "" : current.label,
              color,
              dashed: true,
            },
          ]
        : []),
      ...(Number.isFinite(eventTime)
        ? [
            {
              id: eventMarkerId,
              time: eventTime,
              text: "",
              color:
                getComputedStyle(node)
                  .getPropertyValue("--info-color")
                  .trim() || "#039be5",
              dashed: false,
            },
          ]
        : []),
    ];
    chart._chartData = [
      ...chart._chartData.filter(
        (series) => series.id !== markerId && series.id !== eventMarkerId,
      ),
      ...markers.map((marker) => ({
        id: marker.id,
        type: "custom",
        silent: true,
        animation: false,
        z: 10,
        tooltip: { show: false },
        encode: { x: 0 },
        data: [[marker.time]],
        renderItem: (params, api) => {
          const { x, y, width, height } = params.coordSys;
          const position = api.coord([api.value(0), 0])[0];
          if (position < x || position > x + width) {
            if (marker.id === markerId) {
              current.onNowPosition?.(null);
            }
            return null;
          }
          const alignRight = position > x + width - 40;
          if (marker.id === markerId) {
            current.onNowPosition?.({ x: position, alignRight });
          }
          return {
            type: "group",
            children: [
              {
                type: "line",
                shape: { x1: position, x2: position, y1: y, y2: y + height },
                style: {
                  stroke: marker.color,
                  lineWidth: 2,
                  lineDash: marker.dashed ? [4, 3] : [],
                },
              },
              {
                type: "text",
                style: {
                  x: position + (alignRight ? -4 : 4),
                  y: y + 2,
                  text: marker.text,
                  fill: marker.color,
                  fontSize: 12,
                  fontWeight: "bold",
                  align: alignRight ? "right" : "left",
                  verticalAlign: "top",
                },
              },
            ],
          };
        },
      })),
    ];
  };
  chart._generateData = () => {
    generate.call(chart);
    refresh();
  };
  refresh();
  const timer = globalThis.setInterval(refresh, 3e4);
  return {
    update(next2) {
      current = typeof next2 === "string" ? { label: next2 } : next2;
      refresh();
    },
    destroy() {
      globalThis.clearInterval(timer);
      chart._generateData = generate;
      chart._chartData = chart._chartData?.filter(
        (series) => series.id !== markerId && series.id !== eventMarkerId,
      );
    },
  };
}

// custom_components/occupied/frontend/src/lib/actions/timeline-tooltip.ts
function timelineTooltip(node, data) {
  const chart = node;
  const render = chart._renderTooltip;
  if (typeof render !== "function") {
    return;
  }
  let histories = data;
  const adapt = (point) => {
    const [entity, start] = point.value;
    const end = histories
      .find((history2) => history2.entity_id === entity)
      ?.data.find((state2) => state2.last_changed === Number(start))?.end_time;
    return end === void 0
      ? point
      : {
          ...point,
          value: [entity, start, new Date(end), ...point.value.slice(3)],
        };
  };
  chart._renderTooltip = (point) =>
    render.call(
      chart,
      Array.isArray(point) ? point.map((item) => adapt(item)) : adapt(point),
    );
  return {
    update(next2) {
      histories = next2;
    },
    destroy() {
      chart._renderTooltip = render;
    },
  };
}

// custom_components/occupied/frontend/src/lib/actions/history-chart.ts
function historyChartProperties(node, values) {
  const binding = properties(node, values);
  return {
    update: binding.update,
    destroy() {
      Object.assign(node, { data: [] });
    },
  };
}

// custom_components/occupied/frontend/src/lib/services/ha-controls.ts
async function loadHaControls() {
  if (
    customElements.get("ha-selector") &&
    customElements.get("ha-generic-picker") &&
    customElements.get("ha-top-app-bar-fixed") &&
    customElements.get("ha-code-editor")
  ) {
    return;
  }
  await customElements.whenDefined("partial-panel-resolver");
  const resolver = document.createElement("partial-panel-resolver");
  await resolver
    ._getRoutes([{ url_path: "config", component_name: "config" }])
    .routes.config.load();
  await customElements.whenDefined("ha-panel-config");
  const config = document.createElement("ha-panel-config");
  await Promise.all([
    config.routerOptions.routes.automation.load(),
    config.routerOptions.routes.integrations.load(),
  ]);
  if (!customElements.get("ha-top-app-bar-fixed")) {
    await resolver
      ._getRoutes([{ url_path: "history", component_name: "history" }])
      .routes.history.load();
  }
  await Promise.all([
    customElements.whenDefined("ha-selector"),
    customElements.whenDefined("ha-generic-picker"),
    customElements.whenDefined("ha-top-app-bar-fixed"),
    customElements.whenDefined("ha-code-editor"),
  ]);
}
var historyChartLoad;
function loadHaHistoryChart() {
  if (customElements.get("state-history-chart-timeline")) {
    return Promise.resolve();
  }
  historyChartLoad ??= (async () => {
    await customElements.whenDefined("partial-panel-resolver");
    const resolver = document.createElement("partial-panel-resolver");
    await resolver
      ._getRoutes([{ url_path: "history", component_name: "history" }])
      .routes.history.load();
    if (!customElements.get("state-history-chart-timeline")) {
      throw new Error("Home Assistant history chart is unavailable");
    }
  })().catch((error) => {
    historyChartLoad = void 0;
    throw error;
  });
  return historyChartLoad;
}

// custom_components/occupied/frontend/src/lib/utils/timeline.ts
function calendarDayPlan(plans, date) {
  const current = plans.find((plan) => plan.simulation_date === date);
  if (!current) {
    return void 0;
  }
  const start = calendarMidnight(date, current.timezone);
  const end = calendarMidnight(shiftScheduleDate(date, 1), current.timezone);
  const within = (time) =>
    Date.parse(time) >= Date.parse(start) && Date.parse(time) < Date.parse(end);
  return {
    ...current,
    start,
    end,
    events: plans
      .flatMap((plan) => plan.events)
      .filter((event2) => within(event2.time))
      .sort((a, b) => Date.parse(a.time) - Date.parse(b.time)),
    issues: plans.flatMap((plan) => plan.issues),
  };
}
function previewStateHistory(plan, program, names = {}, t = translator()) {
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end);
  const entities = /* @__PURE__ */ new Map();
  const covers = /* @__PURE__ */ new Map();
  const stateLabels = {
    on: "on_label",
    off: "off_label",
  };
  const label = (state2) => t(stateLabels[state2] || "unknown");
  const extraEntities = program.run_condition?.off_entities ?? [];
  const managedExtras = new Set(managedOffEntities(program, extraEntities));
  for (const entity of extraEntities) {
    if (managedExtras.has(entity)) {
      continue;
    }
    const state2 = "off";
    entities.set(entity, {
      entity_id: entity,
      name: names[entity] || entity,
      data: [
        { state: state2, state_localize: label(state2), last_changed: start },
      ],
    });
  }
  for (const event2 of [
    ...(plan.history_events || []),
    ...plan.events,
    ...(plan.future_events || []),
  ].sort((a, b) => Date.parse(a.time) - Date.parse(b.time))) {
    if (event2.superseded) {
      continue;
    }
    const at = Date.parse(event2.time);
    const typed = /^(light|switch)\.turn_(on|off)$/.test(event2.action.action);
    for (const entity of event2.action.entities) {
      if (!/^(light|switch|cover)\./.test(entity)) {
        continue;
      }
      let history2 = entities.get(entity);
      if (
        at >= end &&
        (!history2 || history2.data.at(-1)?.end_time !== void 0)
      ) {
        continue;
      }
      if (!history2) {
        const initialState = entity.startsWith("cover.") ? "unknown" : "off";
        history2 = {
          entity_id: entity,
          name: names[entity] || entity,
          data: [
            {
              state: initialState,
              state_localize: label(initialState),
              last_changed: start,
            },
          ],
        };
        entities.set(entity, history2);
      }
      const intended = event2.action.action.endsWith("turn_on") ? "on" : "off";
      let state2 =
        typed && event2.action.action.startsWith(`${entity.split(".", 1)[0]}.`)
          ? intended
          : "unknown";
      let localized = label(state2);
      if (entity.startsWith("cover.")) {
        const target = coverTarget(event2.action, covers.get(entity));
        covers.set(entity, target);
        const parts = [];
        if (target.position !== void 0) {
          let position = t("cover_position_summary").replace("{position}", () =>
            String(target.position),
          );
          if (target.position === 100) {
            position = t("open");
          } else if (target.position === 0) {
            position = t("closed");
          }
          parts.push(position);
        }
        if (target.tilt_position !== void 0) {
          parts.push(
            t("cover_tilt_summary").replace("{position}", () =>
              String(target.tilt_position),
            ),
          );
        }
        state2 = parts.length > 0 ? JSON.stringify(target) : "unknown";
        localized = parts.length > 0 ? parts.join(" \xB7 ") : label("unknown");
      }
      const previous = history2.data.at(-1);
      if (at >= end) {
        if (previous.state !== state2) {
          previous.end_time = at;
        }
        continue;
      }
      const time = Math.max(start, at);
      if (previous.last_changed === time) {
        previous.state = state2;
        previous.state_localize = localized;
      } else if (previous.state !== state2) {
        history2.data.push({
          state: state2,
          state_localize: localized,
          last_changed: time,
        });
      }
    }
  }
  for (const entity of managedExtras) {
    if (!entities.has(entity)) {
      entities.set(entity, {
        entity_id: entity,
        name: names[entity] || entity,
        data: [
          {
            state: "unknown",
            state_localize: label("unknown"),
            last_changed: start,
          },
        ],
      });
    }
  }
  return [...entities.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function calendarStateHistory(
  plans,
  day2,
  program,
  names = {},
  t = translator(),
) {
  const start = Date.parse(day2.start),
    end = Date.parse(day2.end);
  const events = plans
    .flatMap((plan) => plan.events)
    .filter(
      (event2) =>
        Date.parse(event2.time) >= start && Date.parse(event2.time) < end,
    );
  return previewStateHistory({ ...day2, events }, program, names, t);
}
function stamp(value, zone, locale) {
  if (!value) {
    return "\u2014";
  }
  try {
    return formatTimestamp(value, zone, locale);
  } catch {
    return value;
  }
}
function eventDetails(event2, label, timezone, t, locale, entityNames = {}) {
  const kinds = {
    random_start: "random_start",
    random_end: "random_end",
  };
  const actionLabels2 = {
    turn_on: "on_label",
    turn_off: "off_label",
    "scene.turn_on": "activate_scene",
    ...Object.fromEntries(coverActions),
  };
  const service = event2.action.action;
  const shortService = service.split(".").at(-1);
  const actionLabel = actionLabels2[service] || actionLabels2[shortService];
  let action2 = actionLabel ? t(actionLabel) : service;
  const positionFields = {
    "cover.set_cover_position": "position",
    "cover.set_cover_tilt_position": "tilt_position",
  };
  const positionField = positionFields[service];
  if (positionField && event2.action.data?.[positionField] !== void 0) {
    action2 += ` \xB7 ${event2.action.data[positionField]}%`;
  }
  if (event2.superseded) {
    action2 += ` \xB7 ${t("superseded")}`;
  }
  return {
    time: formatEventTime(event2.time, timezone, locale),
    source: `${label} \xB7 ${t(kinds[event2.kind] || event2.kind)}`,
    action: action2,
    actionState: ["on_label", "off_label"].includes(actionLabel)
      ? shortService.slice(5)
      : void 0,
    targets: event2.action.entities
      .map((entity) => entityNames[entity] || entity)
      .join(", "),
  };
}
function groupPreviewEvents(events) {
  const groups = /* @__PURE__ */ new Map();
  const actionKeys = /* @__PURE__ */ new Map();
  for (const event2 of events) {
    const key2 = JSON.stringify([
      Date.parse(event2.time),
      event2.source_id,
      event2.kind,
      event2.source_date,
    ]);
    let group = groups.get(key2);
    if (!group) {
      group = { key: key2, event: event2, actions: [] };
      groups.set(key2, group);
      actionKeys.set(key2, /* @__PURE__ */ new Map());
    }
    const service = /^(?:light|switch|homeassistant)\.turn_(on|off)$/.test(
      event2.action.action,
    )
      ? event2.action.action.split(".", 2)[1]
      : event2.action.action;
    const actionKey = JSON.stringify([
      service,
      Object.entries(event2.action.data || {}).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
      !!event2.superseded,
    ]);
    const keys = actionKeys.get(key2);
    let index2 = keys.get(actionKey);
    if (index2 === void 0) {
      index2 = group.actions.length;
      keys.set(actionKey, index2);
      group.actions.push({
        key: actionKey,
        event: event2,
        events: [],
        entities: [],
      });
    }
    const action2 = group.actions[index2];
    action2.events.push(event2);
    for (const entity of event2.action.entities) {
      if (!action2.entities.includes(entity)) {
        action2.entities.push(entity);
      }
    }
  }
  return [...groups.values()];
}

// custom_components/occupied/frontend/src/lib/components/preview/PreviewStateGraph.svelte
var root17 = from_html(`<p class="hint"> </p>`);
var root_113 = from_html(
  `<span class="now-label svelte-1kps2qf" aria-hidden="true"> </span>`,
);
var root_210 = from_html(
  `<div><!> <state-history-chart-timeline></state-history-chart-timeline></div>`,
  2,
);
var root_38 = from_html(`<p role="status"> </p>`);
var root_46 = from_html(`<!> <!> <!>`, 1);
var $$css5 = {
  hash: "svelte-1kps2qf",
  code: ".preview-graph.svelte-1kps2qf {position:relative;padding-top:18px;}.preview-graph.empty.svelte-1kps2qf {display:none;}.now-label.svelte-1kps2qf {position:absolute;top:0;color:var(--secondary-text-color, #727272);font-size:12px;line-height:16px;transform:translateX(-50%);pointer-events:none;}state-history-chart-timeline.svelte-1kps2qf {display:block;width:100%;}state-history-chart-timeline[hidden].svelte-1kps2qf {display:none;}",
};
function PreviewStateGraph($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css5);
  let names = prop($$props, "names", 19, () => ({})),
    eventTime = prop($$props, "eventTime", 3, null);
  let ready = state(false);
  let failed = state(false);
  let narrow = state(false);
  let nowPosition = state(null);
  function updateNowPosition(position) {
    if (
      position?.x !== get(nowPosition)?.x ||
      position?.alignRight !== get(nowPosition)?.alignRight
    ) {
      set2(nowPosition, position, true);
    }
  }
  let data = user_derived(() =>
    $$props.schedulePlans
      ? calendarStateHistory(
          $$props.schedulePlans,
          $$props.plan,
          $$props.program,
          names(),
          $$props.t,
        )
      : previewStateHistory($$props.plan, $$props.program, names(), $$props.t),
  );
  let config = user_derived(() => $$props.hass.config);
  let locale = user_derived(() => $$props.hass.locale);
  let zone = user_derived(() => $$props.plan.timezone);
  let start = user_derived(() => $$props.plan.start);
  let end = user_derived(() => $$props.plan.end);
  let startTime = user_derived(() => new Date(get(start)));
  let endTime = user_derived(() => new Date(get(end)));
  let chartHass = user_derived(() => ({
    ...untrack(() => $$props.hass),
    config: { ...get(config), time_zone: get(zone) },
    locale: { ...get(locale), time_zone: "server" },
    get states() {
      return $$props.hass.states;
    },
  }));
  onMount(() => {
    let disposed = false;
    const media = globalThis.matchMedia("(max-width: 600px)");
    const updateNarrow = () => {
      set2(narrow, media.matches, true);
    };
    updateNarrow();
    media.addEventListener("change", updateNarrow);
    void loadHaHistoryChart()
      .then(() => {
        if (!disposed) {
          set2(ready, true);
        }
      })
      .catch(() => {
        if (!disposed) {
          set2(failed, true);
        }
      });
    return () => {
      disposed = true;
      media.removeEventListener("change", updateNarrow);
    };
  });
  var fragment = root_46();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      var p = root17();
      var text2 = only_child(p, true);
      template_effect(
        ($0) => set_text(text2, $0),
        [
          () =>
            $$props.t(
              $$props.plan.events.length === 0
                ? "schedule_empty_hint"
                : "preview_devices_empty_hint",
            ),
        ],
      );
      append($$anchor2, p);
    };
    if_block(node, ($$render) => {
      if (get(data).length === 0) $$render(consequent);
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var p_1 = root17();
      var text_1 = only_child(p_1, true);
      template_effect(
        ($0) => set_text(text_1, $0),
        [() => $$props.t("preview_covers_hint")],
      );
      append($$anchor2, p_1);
    };
    var d = user_derived(() =>
      get(data).some((entity) => entity.entity_id.startsWith("cover.")),
    );
    if_block(node_1, ($$render) => {
      if (get(d)) $$render(consequent_1);
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var p_2 = root17();
      var text_2 = only_child(p_2, true);
      template_effect(
        ($0) => set_text(text_2, $0),
        [() => $$props.t("preview_graph_error")],
      );
      append($$anchor2, p_2);
    };
    var consequent_4 = ($$anchor2) => {
      var div = root_210();
      let classes;
      var node_3 = child(div);
      {
        var consequent_3 = ($$anchor3) => {
          var span = root_113();
          let styles;
          var text_3 = only_child(span, true);
          template_effect(
            ($0) => {
              styles = set_style(span, "", styles, {
                left: `${get(nowPosition).x}px`,
              });
              set_text(text_3, $0);
            },
            [() => $$props.t("preview_now")],
          );
          append($$anchor3, span);
        };
        if_block(node_3, ($$render) => {
          if (get(nowPosition)) $$render(consequent_3);
        });
      }
      var state_history_chart_timeline = sibling(node_3, 2);
      template_effect(() =>
        set_custom_element_data(
          state_history_chart_timeline,
          "hidden",
          get(data).length === 0,
        ),
      );
      template_effect(
        ($0) =>
          set_custom_element_data(
            state_history_chart_timeline,
            "aria-label",
            $0,
          ),
        [() => $$props.t("planned_device_states")],
      );
      set_class(state_history_chart_timeline, 1, "svelte-1kps2qf");
      action(
        state_history_chart_timeline,
        ($$node, $$action_arg) => timelineTooltip?.($$node, $$action_arg),
        () => get(data),
      );
      action(
        state_history_chart_timeline,
        ($$node, $$action_arg) => timelineNow?.($$node, $$action_arg),
        () => ({
          label: $$props.t("preview_now"),
          eventTime: eventTime(),
          startTime: $$props.plan.start,
          endTime: $$props.plan.end,
          onNowPosition: updateNowPosition,
        }),
      );
      action(
        state_history_chart_timeline,
        ($$node, $$action_arg) =>
          historyChartProperties?.($$node, $$action_arg),
        () => ({
          hass: get(chartHass),
          data: get(data),
          names: names(),
          startTime: get(startTime),
          endTime: get(endTime),
          showNames: true,
          narrow: get(narrow),
          paddingYAxis: 0,
          clickForMoreInfo: false,
        }),
      );
      reset(div);
      template_effect(
        () =>
          (classes = set_class(
            div,
            1,
            "preview-graph svelte-1kps2qf",
            null,
            classes,
            { empty: get(data).length === 0 },
          )),
      );
      append($$anchor2, div);
    };
    var consequent_5 = ($$anchor2) => {
      var p_3 = root_38();
      var text_4 = only_child(p_3, true);
      template_effect(
        ($0) => set_text(text_4, $0),
        [() => $$props.t("loading_graph")],
      );
      append($$anchor2, p_3);
    };
    if_block(node_2, ($$render) => {
      if (get(failed) && get(data).length > 0) $$render(consequent_2);
      else if (get(ready)) $$render(consequent_4, 1);
      else if (get(data).length > 0) $$render(consequent_5, 2);
    });
  }
  append($$anchor, fragment);
  pop();
}

// custom_components/occupied/frontend/src/lib/utils/live-preview.ts
function liveRunning(session) {
  return (
    !!session && ["ready", "executing", "stopping"].includes(session.state)
  );
}
function liveSessionStatus(session) {
  if (session.state === "ready") {
    return session.cursor === 0 ? "ready_to_start" : "ready_for_next_event";
  }
  const labels = {
    completed: "day_complete",
    executing: "running",
    stopping: "stopping",
    stopped: "stopped",
    interrupted: "interrupted",
  };
  return labels[session.state];
}
function mergeLiveSession(previous, incoming) {
  if (!incoming || previous?.id !== incoming.id) {
    return incoming;
  }
  if (incoming.cursor < previous.cursor) {
    return previous;
  }
  const states = [
    "ready",
    "executing",
    "stopping",
    "completed",
    "stopped",
    "interrupted",
  ];
  if (
    incoming.cursor === previous.cursor &&
    states.indexOf(incoming.state) < states.indexOf(previous.state)
  ) {
    return previous;
  }
  const terminal = /* @__PURE__ */ new Set([
    "completed",
    "stopped",
    "interrupted",
  ]);
  if (terminal.has(previous.state) && !terminal.has(incoming.state)) {
    return previous;
  }
  return {
    ...incoming,
    outcomes: { ...previous.outcomes, ...incoming.outcomes },
  };
}
function eventLiveResult(event2, session) {
  if (!session || !event2.group_id) {
    return;
  }
  const outcome = event2.id ? session.outcomes[event2.id] : void 0;
  const current =
    session.next_group?.id === event2.group_id && liveRunning(session);
  return { current, outcome };
}
function lastGroupResult(session) {
  const outcomes = Object.values(session.outcomes).filter(
    (outcome) => outcome.group_id === session.last_group_id,
  );
  if (outcomes.length === 0) {
    return "";
  }
  const succeeded = outcomes.filter(
    (outcome) => outcome.status === "dispatched",
  ).length;
  if (succeeded === outcomes.length) {
    return "dispatched_label";
  }
  return succeeded > 0 ? "partial_success" : "event_failed_or_interrupted";
}

// custom_components/occupied/frontend/src/lib/components/preview/Timeline.svelte
var root18 = from_html(`<h2> </h2>`);
var root_114 = from_html(`<th scope="col" class="svelte-1iz1525"> </th>`);
var root_211 = from_html(
  `<td class="planned-time svelte-1iz1525"><svg class="hover-indicator svelte-1iz1525" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2 8 6 4 10"></path></svg> </td>`,
);
var root_39 = from_html(`<span aria-hidden="true"></span>`);
var root_47 = from_html(`<span> </span>`);
var root_56 = from_html(`<div><!> <span> </span> <div> </div></div>`);
var root_66 = from_html(`<div> </div>`);
var root_74 = from_html(`<td class="svelte-1iz1525"></td>`);
var root_83 = from_html(
  `<button type="button" class="text-button source-link svelte-1iz1525"> </button>`,
);
var root_92 = from_html(`<td class="svelte-1iz1525"><!></td>`);
var root_10 = from_html(
  `<tr><!><td class="svelte-1iz1525"> </td><td class="svelte-1iz1525"><span class="event-action svelte-1iz1525"><!> </span></td><!><!></tr>`,
);
var root_11 = from_html(`<tbody class="svelte-1iz1525"></tbody>`);
var root_122 = from_html(
  `<div class="row"><button type="button"> </button> <span> </span> <button type="button"> </button></div>`,
);
var root_132 = from_html(
  `<div class="event-details"><div><div class="table-wrap"><table><thead><tr><!><!><th scope="col" class="svelte-1iz1525"> </th></tr></thead><!></table></div> <!></div></div>`,
);
var root_142 = from_html(`<p> </p>`);
var root_152 = from_html(`<!> <!> <!>`, 1);
var root_162 = from_html(`<p role="status"> </p>`);
var root_172 = from_html(`<section><!> <!></section>`);
var $$css6 = {
  hash: "svelte-1iz1525",
  code: "th.svelte-1iz1525,\n  td.svelte-1iz1525 {padding:6px 9px;}tbody.svelte-1iz1525 tr:where(.svelte-1iz1525):not(:last-child) td:where(.svelte-1iz1525):not([rowspan]) {border-bottom:0;}td[rowspan].svelte-1iz1525 {vertical-align:top;}th.svelte-1iz1525:first-child,\n  .planned-time.svelte-1iz1525 {padding-left:24px;}.planned-time.svelte-1iz1525 {position:relative;}.hover-indicator.svelte-1iz1525 {position:absolute;left:6px;top:50%;transform:translateY(-50%);width:12px;height:12px;fill:none;stroke:var(--info-color, #039be5);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;opacity:0;pointer-events:none;}tbody.svelte-1iz1525:hover .hover-indicator:where(.svelte-1iz1525),\n  tbody.svelte-1iz1525:focus-within .hover-indicator:where(.svelte-1iz1525) {opacity:0.7;}.source-link.svelte-1iz1525 {min-height:30px;padding:3px 4px;margin:0;text-align:left;}.event-action.svelte-1iz1525 {display:inline-flex;align-items:center;gap:7px;}.action-indicator.svelte-1iz1525 {display:inline-block;width:12px;height:12px;flex:0 0 12px;box-sizing:border-box;border:2px solid var(--info-color, #039be5);border-radius:50%;}.action-indicator.on.svelte-1iz1525 {background:var(--info-color, #039be5);}tr.current.svelte-1iz1525 {background:var(--secondary-background-color, #eef4ff);outline:2px solid var(--primary-color, #03a9f4);outline-offset:-2px;}tr.completed.svelte-1iz1525 {background:color-mix(\n      in srgb,\n      var(--success-color, #4caf50) 12%,\n      transparent\n    );}",
};
function Timeline($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css6);
  let t = prop($$props, "t", 19, translator),
    entityNames = prop($$props, "entityNames", 19, () => ({})),
    loading = prop($$props, "loading", 3, false),
    showLoading = prop($$props, "showLoading", 19, loading),
    liveSession = prop($$props, "liveSession", 3, null);
  let catalog = user_derived(() => ({
    entities: Object.entries(entityNames()).map(([entity_id, name]) => ({
      entity_id,
      name,
    })),
  }));
  let labels = user_derived(
    () =>
      new Map([
        ...stepEntries($$props.program || {}, get(catalog), t()).map(
          (resource) => [`step:${resource.id}`, resource.name],
        ),
        ...randomEntries($$props.program || {}, get(catalog)).map(
          (resource) => [`random:${resource.id}`, resource.name],
        ),
      ]),
  );
  function eventLabel(event2) {
    return (
      get(labels).get(
        `${event2.kind.startsWith("random_") ? "random" : "step"}:${event2.source_id}`,
      ) || event2.source_id
    );
  }
  let page = state(0);
  let hoveredEventTime = state(null);
  let scheduleDate = user_derived(() => $$props.plan?.simulation_date);
  user_effect(() => {
    void get(scheduleDate);
    set2(hoveredEventTime, null);
    set2(page, 0);
  });
  let events = user_derived(() => $$props.plan?.events ?? []);
  let groups = user_derived(() => groupPreviewEvents(get(events)));
  let currentPage = user_derived(() =>
    Math.max(0, Math.min(get(page), Math.ceil(get(groups).length / 50) - 1)),
  );
  var section = root_172();
  var node = child(section);
  {
    var consequent = ($$anchor2) => {
      var fragment = comment();
      var node_1 = first_child(fragment);
      snippet(node_1, () => $$props.heading);
      append($$anchor2, fragment);
    };
    var consequent_1 = ($$anchor2) => {
      var h2 = root18();
      var text2 = only_child(h2, true);
      template_effect(
        ($0) => set_text(text2, $0),
        [
          () =>
            formatScheduleDate($$props.plan.simulation_date, $$props.locale),
        ],
      );
      append($$anchor2, h2);
    };
    if_block(node, ($$render) => {
      if ($$props.heading) $$render(consequent);
      else if ($$props.plan) $$render(consequent_1, 1);
    });
  }
  var node_2 = sibling(node, 2);
  {
    var consequent_13 = ($$anchor2) => {
      var fragment_1 = root_152();
      var node_3 = first_child(fragment_1);
      PreviewStateGraph(node_3, {
        get plan() {
          return $$props.plan;
        },
        get schedulePlans() {
          return $$props.schedulePlans;
        },
        get program() {
          return $$props.program;
        },
        get hass() {
          return $$props.hass;
        },
        get names() {
          return entityNames();
        },
        get t() {
          return t();
        },
        get eventTime() {
          return get(hoveredEventTime);
        },
      });
      var node_4 = sibling(node_3, 2);
      {
        var consequent_12 = ($$anchor3) => {
          var div = root_132();
          var div_1 = child(div);
          var div_2 = child(div_1);
          var table = child(div_2);
          var thead = child(table);
          var tr = child(thead);
          var node_5 = child(tr);
          each(
            node_5,
            16,
            () => ["planned_time", "targets", "action"],
            (label) => label,
            ($$anchor4, label) => {
              var th = root_114();
              var text_1 = only_child(th, true);
              template_effect(($0) => set_text(text_1, $0), [() => t()(label)]);
              append($$anchor4, th);
            },
          );
          var node_6 = sibling(node_5);
          {
            var consequent_2 = ($$anchor4) => {
              var th_1 = root_114();
              var text_2 = only_child(th_1, true);
              template_effect(
                ($0) => set_text(text_2, $0),
                [() => t()("result")],
              );
              append($$anchor4, th_1);
            };
            if_block(node_6, ($$render) => {
              if (liveSession()) $$render(consequent_2);
            });
          }
          var th_2 = sibling(node_6);
          var text_3 = only_child(th_2, true);
          reset(tr);
          reset(thead);
          var node_7 = sibling(thead);
          each(
            node_7,
            17,
            () =>
              get(groups).slice(
                get(currentPage) * 50,
                get(currentPage) * 50 + 50,
              ),
            (group) => group.key,
            ($$anchor4, group) => {
              var tbody = root_11();
              each(
                tbody,
                23,
                () => get(group).actions,
                (action2) => action2.key,
                ($$anchor5, action2, index2) => {
                  const event2 = user_derived(() => get(action2).event);
                  const results = user_derived(() =>
                    get(action2).events.map((event3) => ({
                      event: event3,
                      live: eventLiveResult(event3, liveSession()),
                    })),
                  );
                  const current = user_derived(() =>
                    get(results).some(({ live }) => live?.current),
                  );
                  const details = user_derived(() =>
                    eventDetails(
                      {
                        ...get(event2),
                        action: {
                          ...get(event2).action,
                          entities: get(action2).entities,
                        },
                      },
                      eventLabel(get(event2)),
                      $$props.plan.timezone,
                      t(),
                      $$props.locale,
                      entityNames(),
                    ),
                  );
                  var tr_1 = root_10();
                  let classes;
                  var node_8 = child(tr_1);
                  {
                    var consequent_3 = ($$anchor6) => {
                      var td = root_211();
                      var text_4 = sibling(child(td));
                      reset(td);
                      template_effect(() => {
                        set_attribute2(
                          td,
                          "rowspan",
                          get(group).actions.length,
                        );
                        set_text(text_4, ` ${get(details).time ?? ""}`);
                      });
                      append($$anchor6, td);
                    };
                    if_block(node_8, ($$render) => {
                      if (get(index2) === 0) $$render(consequent_3);
                    });
                  }
                  var td_1 = sibling(node_8);
                  var text_5 = only_child(td_1, true);
                  var td_2 = sibling(td_1);
                  var span = child(td_2);
                  var node_9 = child(span);
                  {
                    var consequent_4 = ($$anchor6) => {
                      var span_1 = root_39();
                      let classes_1;
                      template_effect(
                        () =>
                          (classes_1 = set_class(
                            span_1,
                            1,
                            "action-indicator svelte-1iz1525",
                            null,
                            classes_1,
                            { on: get(details).actionState === "on" },
                          )),
                      );
                      append($$anchor6, span_1);
                    };
                    if_block(node_9, ($$render) => {
                      if (get(details).actionState) $$render(consequent_4);
                    });
                  }
                  var text_6 = sibling(node_9);
                  reset(span);
                  reset(td_2);
                  var node_10 = sibling(td_2);
                  {
                    var consequent_8 = ($$anchor6) => {
                      var td_3 = root_74();
                      each(
                        td_3,
                        23,
                        () => get(results),
                        (result, resultIndex) => result.event.id || resultIndex,
                        ($$anchor7, result) => {
                          var fragment_2 = comment();
                          var node_11 = first_child(fragment_2);
                          {
                            var consequent_6 = ($$anchor8) => {
                              var div_3 = root_56();
                              var node_12 = child(div_3);
                              {
                                var consequent_5 = ($$anchor9) => {
                                  var span_2 = root_47();
                                  var text_7 = only_child(span_2);
                                  template_effect(
                                    ($0) => set_text(text_7, `${$0 ?? ""}:`),
                                    [
                                      () =>
                                        get(result)
                                          .event.action.entities.map(
                                            (entity) =>
                                              entityNames()[entity] || entity,
                                          )
                                          .join(", "),
                                    ],
                                  );
                                  append($$anchor9, span_2);
                                };
                                if_block(node_12, ($$render) => {
                                  if (get(results).length > 1)
                                    $$render(consequent_5);
                                });
                              }
                              var span_3 = sibling(node_12, 2);
                              var text_8 = only_child(span_3, true);
                              var div_4 = sibling(span_3, 2);
                              var text_9 = only_child(div_4, true);
                              reset(div_3);
                              template_effect(
                                ($0) => {
                                  set_class(
                                    span_3,
                                    1,
                                    clsx2(
                                      get(result).live.outcome.status ===
                                        "dispatched"
                                        ? "hint"
                                        : "error",
                                    ),
                                  );
                                  set_text(text_8, $0);
                                  set_text(
                                    text_9,
                                    get(result).live.outcome.detail,
                                  );
                                },
                                [() => t()(get(result).live.outcome.status)],
                              );
                              append($$anchor8, div_3);
                            };
                            var consequent_7 = ($$anchor8) => {
                              var div_5 = root_66();
                              var text_10 = only_child(div_5, true);
                              template_effect(
                                ($0) => set_text(text_10, $0),
                                [() => t()("next_event")],
                              );
                              append($$anchor8, div_5);
                            };
                            if_block(node_11, ($$render) => {
                              if (get(result).live?.outcome)
                                $$render(consequent_6);
                              else if (get(result).live?.current)
                                $$render(consequent_7, 1);
                            });
                          }
                          append($$anchor7, fragment_2);
                        },
                      );
                      reset(td_3);
                      append($$anchor6, td_3);
                    };
                    if_block(node_10, ($$render) => {
                      if (liveSession()) $$render(consequent_8);
                    });
                  }
                  var node_13 = sibling(node_10);
                  {
                    var consequent_10 = ($$anchor6) => {
                      var td_4 = root_92();
                      var node_14 = child(td_4);
                      {
                        var consequent_9 = ($$anchor7) => {
                          var button = root_83();
                          var text_11 = only_child(button, true);
                          template_effect(() => {
                            button.disabled = loading();
                            set_text(text_11, get(details).source);
                          });
                          delegated("click", button, () =>
                            $$props.onOpenSource?.(get(group).event),
                          );
                          append($$anchor7, button);
                        };
                        var alternate = ($$anchor7) => {
                          var text_12 = text();
                          template_effect(() =>
                            set_text(text_12, get(details).source),
                          );
                          append($$anchor7, text_12);
                        };
                        if_block(node_14, ($$render) => {
                          if ($$props.onOpenSource) $$render(consequent_9);
                          else $$render(alternate, -1);
                        });
                      }
                      reset(td_4);
                      template_effect(() =>
                        set_attribute2(
                          td_4,
                          "rowspan",
                          get(group).actions.length,
                        ),
                      );
                      append($$anchor6, td_4);
                    };
                    if_block(node_13, ($$render) => {
                      if (get(index2) === 0) $$render(consequent_10);
                    });
                  }
                  reset(tr_1);
                  template_effect(
                    ($0) => {
                      set_attribute2(
                        tr_1,
                        "aria-current",
                        get(current) ? "step" : void 0,
                      );
                      classes = set_class(
                        tr_1,
                        1,
                        "svelte-1iz1525",
                        null,
                        classes,
                        { current: get(current), completed: $0 },
                      );
                      set_text(text_5, get(details).targets);
                      set_text(text_6, ` ${get(details).action ?? ""}`);
                    },
                    [
                      () =>
                        get(results).every(
                          ({ live }) => live?.outcome?.status === "dispatched",
                        ),
                    ],
                  );
                  append($$anchor5, tr_1);
                },
              );
              reset(tbody);
              event("pointerenter", tbody, () =>
                set2(hoveredEventTime, get(group).event.time, true),
              );
              event("pointerleave", tbody, () => set2(hoveredEventTime, null));
              delegated("focusin", tbody, () =>
                set2(hoveredEventTime, get(group).event.time, true),
              );
              delegated("focusout", tbody, () => set2(hoveredEventTime, null));
              append($$anchor4, tbody);
            },
          );
          reset(table);
          reset(div_2);
          var node_15 = sibling(div_2, 2);
          {
            var consequent_11 = ($$anchor4) => {
              var div_6 = root_122();
              var button_1 = child(div_6);
              var text_13 = only_child(button_1, true);
              var span_4 = sibling(button_1, 2);
              var text_14 = only_child(span_4);
              var button_2 = sibling(span_4, 2);
              var text_15 = only_child(button_2, true);
              reset(div_6);
              template_effect(
                ($0, $1, $2, $3) => {
                  button_1.disabled = get(currentPage) === 0;
                  set_text(text_13, $0);
                  set_text(
                    text_14,
                    `${get(events).length ?? ""}
                ${$1 ?? ""} \xB7 ${get(currentPage) + 1}/${$2 ?? ""}`,
                  );
                  button_2.disabled =
                    (get(currentPage) + 1) * 50 >= get(groups).length;
                  set_text(text_15, $3);
                },
                [
                  () => t()("previous"),
                  () => t()("events"),
                  () => Math.max(1, Math.ceil(get(groups).length / 50)),
                  () => t()("next"),
                ],
              );
              delegated("click", button_1, () =>
                set2(page, get(currentPage) - 1),
              );
              delegated("click", button_2, () =>
                set2(page, get(currentPage) + 1),
              );
              append($$anchor4, div_6);
            };
            if_block(node_15, ($$render) => {
              if (get(groups).length > 50) $$render(consequent_11);
            });
          }
          reset(div_1);
          reset(div);
          template_effect(($0) => set_text(text_3, $0), [() => t()("source")]);
          append($$anchor3, div);
        };
        if_block(node_4, ($$render) => {
          if ($$props.plan.events.length > 0) $$render(consequent_12);
        });
      }
      var node_16 = sibling(node_4, 2);
      each(
        node_16,
        16,
        () =>
          $$props.plan.issues.filter(
            (issue) =>
              issue.severity !== "info" ||
              ["latest_at_applied", "only_before_skipped"].includes(
                issue.code || "",
              ),
          ),
        (issue) => issue,
        ($$anchor3, issue) => {
          var p = root_142();
          var text_16 = only_child(p);
          template_effect(() => {
            set_class(
              p,
              1,
              clsx2(issue.severity === "error" ? "error" : "hint"),
            );
            set_text(text_16, `${issue.code ?? ""}: ${issue.message ?? ""}`);
          });
          append($$anchor3, p);
        },
      );
      append($$anchor2, fragment_1);
    };
    var consequent_14 = ($$anchor2) => {
      var p_1 = root_162();
      var text_17 = only_child(p_1, true);
      template_effect(
        ($0) => set_text(text_17, $0),
        [() => t()("loading_schedule")],
      );
      append($$anchor2, p_1);
    };
    if_block(node_2, ($$render) => {
      if ($$props.plan) $$render(consequent_13);
      else if (showLoading()) $$render(consequent_14, 1);
    });
  }
  reset(section);
  template_effect(() => set_attribute2(section, "aria-busy", loading()));
  append($$anchor, section);
  pop();
}
delegate(["focusin", "focusout", "click"]);

// custom_components/occupied/frontend/src/lib/components/preview/LivePreviewControls.svelte
var root19 = from_html(
  `<button type="button" class="primary svelte-jw9j7k"> </button> <button type="button" class="svelte-jw9j7k"> </button>`,
  1,
);
var root_115 = from_html(
  `<button type="button" class="svelte-jw9j7k"> </button>`,
);
var root_212 = from_html(
  `<button type="button" class="primary svelte-jw9j7k"> </button> <!>`,
  1,
);
var root_310 = from_html(`<div class="live-actions svelte-jw9j7k"><!></div>`);
var root_48 = from_html(`<p class="svelte-jw9j7k"> </p>`);
var root_57 = from_html(`<p class="error svelte-jw9j7k"> </p>`);
var root_67 = from_html(`<p class="hint svelte-jw9j7k"> </p>`);
var root_75 = from_html(`<p class="call svelte-jw9j7k"> <!></p>`);
var root_84 = from_html(
  `<p class="svelte-jw9j7k"><strong> </strong></p> <!>`,
  1,
);
var root_93 = from_html(
  `<div role="status" aria-live="polite" aria-atomic="true"><strong> </strong> <p class="svelte-jw9j7k"> </p> <!> <!></div> <!> <!> <!> <!> <!>`,
  1,
);
var root_102 = from_html(`<p role="status" class="hint svelte-jw9j7k"> </p>`);
var root_116 = from_html(
  `<section class="live-card svelte-jw9j7k"><h2 class="svelte-jw9j7k"> </h2> <!> <!></section>`,
);
var root_123 = from_html(`<!> <!> <!>`, 1);
var $$css7 = {
  hash: "svelte-jw9j7k",
  code: ".live-card.svelte-jw9j7k {border:1px solid var(--divider-color, #ddd);border-radius:12px;padding:16px;margin-bottom:16px;}h2.svelte-jw9j7k {margin:0;}p.svelte-jw9j7k {margin:8px 0;}.call.svelte-jw9j7k {overflow-wrap:anywhere;}.live-actions.svelte-jw9j7k {display:flex;flex-wrap:wrap;gap:8px;padding:12px;margin-bottom:16px;background:var(--card-background-color, white);border:1px solid var(--divider-color, #ddd);border-radius:12px;}.live-actions.svelte-jw9j7k button:where(.svelte-jw9j7k) {min-height:48px;margin:0;}.primary.svelte-jw9j7k {flex:1;}\n\n  @media (max-width: 600px) {.live-actions.svelte-jw9j7k {padding-bottom:max(12px, env(safe-area-inset-bottom, 0px));}\n  }",
};
function LivePreviewControls($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css7);
  const actionControls = ($$anchor2) => {
    var div = root_310();
    var node = child(div);
    {
      var consequent = ($$anchor3) => {
        var fragment = root19();
        var button = first_child(fragment);
        var text2 = only_child(button, true);
        var button_1 = sibling(button, 2);
        var text_1 = only_child(button_1, true);
        template_effect(
          ($0, $1) => {
            button.disabled =
              !$$props.panel.liveReady ||
              !$$props.panel.liveCanAdvance ||
              get(executing) ||
              $$props.panel.liveStopping ||
              get(session)?.state !== "ready";
            set_text(text2, $0);
            button_1.disabled =
              $$props.panel.liveStopping || get(session)?.state === "stopping";
            set_text(text_1, $1);
          },
          [
            () => get(t)(get(executing) ? "running" : "next_event"),
            () => get(t)($$props.panel.liveStopping ? "stopping" : "stop"),
          ],
        );
        delegated("click", button, () => $$props.panel.nextLiveEvent());
        delegated("click", button_1, () => $$props.panel.stopLivePreview());
        append($$anchor3, fragment);
      };
      var alternate = ($$anchor3) => {
        var fragment_1 = root_212();
        var button_2 = first_child(fragment_1);
        var text_2 = only_child(button_2, true);
        var node_1 = sibling(button_2, 2);
        {
          var consequent_1 = ($$anchor4) => {
            var button_3 = root_115();
            var text_3 = only_child(button_3, true);
            template_effect(
              ($0) => {
                button_3.disabled =
                  $$props.panel.busy ||
                  $$props.panel.liveBusy ||
                  !$$props.panel.liveReady;
                set_text(text_3, $0);
              },
              [() => get(t)("resume_scheduling")],
            );
            delegated("click", button_3, () =>
              $$props.panel.resumeScheduling(),
            );
            append($$anchor4, button_3);
          };
          if_block(node_1, ($$render) => {
            if ($$props.panel.schedulingPaused) $$render(consequent_1);
          });
        }
        template_effect(
          ($0) => {
            button_2.disabled = !get(canStart);
            set_text(text_2, $0);
          },
          [() => get(t)(get(session) ? "run_again" : "start_live_preview")],
        );
        delegated("click", button_2, () => $$props.panel.startLivePreview());
        append($$anchor3, fragment_1);
      };
      if_block(node, ($$render) => {
        if (get(running)) $$render(consequent);
        else $$render(alternate, -1);
      });
    }
    reset(div);
    template_effect(
      ($0) => set_attribute2(div, "aria-label", $0),
      [() => get(t)("live_preview_controls")],
    );
    append($$anchor2, div);
  };
  let t = user_derived(() => $$props.panel.t);
  let session = user_derived(() =>
    $$props.panel.liveVisible ? $$props.panel.liveSession : null,
  );
  let running = user_derived(() => $$props.panel.liveRunning);
  let executing = user_derived(
    () => $$props.panel.liveBusy || get(session)?.state === "executing",
  );
  let lastResult = user_derived(() =>
    get(session) ? lastGroupResult(get(session)) : "",
  );
  let canStart = user_derived(
    () =>
      $$props.panel.liveReady &&
      !$$props.panel.busy &&
      !$$props.panel.liveBusy &&
      !get(running) &&
      (get(session)
        ? !get(session).storage_failed
        : !!$$props.panel.preview?.valid &&
          !!$$props.panel.preview?.plans[0]?.events.length),
  );
  let currentOutcomes = user_derived(() =>
    Object.values(get(session)?.outcomes || {}).filter(
      (outcome) => outcome.group_id === get(session)?.last_group_id,
    ),
  );
  var fragment_2 = root_123();
  var node_2 = first_child(fragment_2);
  {
    var consequent_2 = ($$anchor2) => {
      actionControls($$anchor2);
    };
    if_block(node_2, ($$render) => {
      if (get(session)) $$render(consequent_2);
    });
  }
  var node_3 = sibling(node_2, 2);
  {
    var consequent_12 = ($$anchor2) => {
      var section = root_116();
      var h2 = child(section);
      var text_4 = only_child(h2, true);
      var node_4 = sibling(h2, 2);
      {
        var consequent_10 = ($$anchor3) => {
          var fragment_4 = root_93();
          var div_1 = first_child(fragment_4);
          var strong = child(div_1);
          var text_5 = only_child(strong, true);
          var p = sibling(strong, 2);
          var text_6 = only_child(p);
          var node_5 = sibling(p, 2);
          {
            var consequent_3 = ($$anchor4) => {
              var p_1 = root_48();
              var text_7 = only_child(p_1);
              template_effect(
                ($0, $1) => set_text(text_7, `${$0 ?? ""}: ${$1 ?? ""}`),
                [
                  () => get(t)("simulated_time"),
                  () =>
                    stamp(
                      get(session).simulated_time,
                      $$props.panel.livePlan.timezone,
                      $$props.panel._hass.locale,
                    ),
                ],
              );
              append($$anchor4, p_1);
            };
            if_block(node_5, ($$render) => {
              if (get(session).simulated_time && $$props.panel.livePlan)
                $$render(consequent_3);
            });
          }
          var node_6 = sibling(node_5, 2);
          {
            var consequent_4 = ($$anchor4) => {
              var p_2 = root_48();
              var text_8 = only_child(p_2);
              template_effect(
                ($0, $1) => set_text(text_8, `${$0 ?? ""}: ${$1 ?? ""}`),
                [() => get(t)("last_result"), () => get(t)(get(lastResult))],
              );
              append($$anchor4, p_2);
            };
            if_block(node_6, ($$render) => {
              if (get(lastResult)) $$render(consequent_4);
            });
          }
          reset(div_1);
          var node_7 = sibling(div_1, 2);
          {
            var consequent_5 = ($$anchor4) => {
              var p_3 = root_57();
              var text_9 = only_child(p_3, true);
              template_effect(() => set_text(text_9, get(session).detail));
              append($$anchor4, p_3);
            };
            if_block(node_7, ($$render) => {
              if (get(session).state === "interrupted") $$render(consequent_5);
            });
          }
          var node_8 = sibling(node_7, 2);
          {
            var consequent_6 = ($$anchor4) => {
              var p_4 = root_67();
              var text_10 = only_child(p_4, true);
              template_effect(
                ($0) => set_text(text_10, $0),
                [() => get(t)("live_preview_revision_hint")],
              );
              append($$anchor4, p_4);
            };
            if_block(node_8, ($$render) => {
              if (get(session).earlier_revision) $$render(consequent_6);
            });
          }
          var node_9 = sibling(node_8, 2);
          {
            var consequent_7 = ($$anchor4) => {
              var p_5 = root_67();
              var text_11 = only_child(p_5, true);
              template_effect(
                ($0) => set_text(text_11, $0),
                [() => get(t)("live_preview_owner_hint")],
              );
              append($$anchor4, p_5);
            };
            if_block(node_9, ($$render) => {
              if (!$$props.panel.liveCanAdvance && get(running))
                $$render(consequent_7);
            });
          }
          var node_10 = sibling(node_9, 2);
          {
            var consequent_9 = ($$anchor4) => {
              var fragment_5 = root_84();
              var p_6 = first_child(fragment_5);
              var strong_1 = child(p_6);
              var text_12 = only_child(strong_1);
              reset(p_6);
              var node_11 = sibling(p_6, 2);
              each(
                node_11,
                17,
                () => get(session).next_group.calls,
                (call) => call.id,
                ($$anchor5, call) => {
                  var p_7 = root_75();
                  var text_13 = child(p_7);
                  var node_12 = sibling(text_13);
                  {
                    var consequent_8 = ($$anchor6) => {
                      var text_14 = text();
                      template_effect(
                        ($0) => set_text(text_14, `\xB7 ${$0 ?? ""}`),
                        [
                          () =>
                            get(t)("tick_progress")
                              .replace("{tick}", () => String(get(call).tick))
                              .replace("{count}", () =>
                                String(get(call).tick_count),
                              ),
                        ],
                      );
                      append($$anchor6, text_14);
                    };
                    if_block(node_12, ($$render) => {
                      if (get(call).tick) $$render(consequent_8);
                    });
                  }
                  reset(p_7);
                  template_effect(
                    ($0) =>
                      set_text(
                        text_13,
                        `${get(call).action.action ?? ""} \xB7 ${$0 ?? ""} `,
                      ),
                    [() => get(call).action.entities.join(", ")],
                  );
                  append($$anchor5, p_7);
                },
              );
              template_effect(
                ($0) =>
                  set_text(
                    text_12,
                    `${$0 ?? ""}: ${get(session).next_group.title ?? ""}`,
                  ),
                [() => get(t)("next_event")],
              );
              append($$anchor4, fragment_5);
            };
            if_block(node_10, ($$render) => {
              if (get(session).next_group && get(running))
                $$render(consequent_9);
            });
          }
          var node_13 = sibling(node_10, 2);
          each(
            node_13,
            16,
            () =>
              get(currentOutcomes).filter(
                (outcome) => outcome.status !== "dispatched",
              ),
            (outcome) => outcome,
            ($$anchor4, outcome) => {
              var p_8 = root_57();
              var text_15 = only_child(p_8);
              template_effect(() =>
                set_text(
                  text_15,
                  `${(outcome.action?.action || "") ?? ""}: ${outcome.detail ?? ""}`,
                ),
              );
              append($$anchor4, p_8);
            },
          );
          template_effect(
            ($0, $1) => {
              set_text(text_5, $0);
              set_text(text_6, `${get(session).date ?? ""} \xB7 ${$1 ?? ""}`);
            },
            [
              () => get(t)(liveSessionStatus(get(session))),
              () =>
                get(t)("live_preview_progress")
                  .replace("{done}", () => String(get(session).cursor))
                  .replace("{total}", () => String(get(session).total)),
            ],
          );
          append($$anchor3, fragment_4);
        };
        if_block(node_4, ($$render) => {
          if (get(session)) $$render(consequent_10);
        });
      }
      var node_14 = sibling(node_4, 2);
      {
        var consequent_11 = ($$anchor3) => {
          var p_9 = root_102();
          var text_16 = only_child(p_9, true);
          template_effect(
            ($0) => set_text(text_16, $0),
            [() => get(t)("recovering_live_preview")],
          );
          append($$anchor3, p_9);
        };
        if_block(node_14, ($$render) => {
          if (!$$props.panel.liveReady) $$render(consequent_11);
        });
      }
      reset(section);
      template_effect(
        ($0, $1) => {
          set_attribute2(section, "aria-label", $0);
          set_text(text_4, $1);
        },
        [() => get(t)("live_preview"), () => get(t)("live_preview")],
      );
      append($$anchor2, section);
    };
    if_block(node_3, ($$render) => {
      if (get(session) || !$$props.panel.liveReady) $$render(consequent_12);
    });
  }
  var node_15 = sibling(node_3, 2);
  {
    var consequent_13 = ($$anchor2) => {
      actionControls($$anchor2);
    };
    if_block(node_15, ($$render) => {
      if (!get(session)) $$render(consequent_13);
    });
  }
  append($$anchor, fragment_2);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/src/lib/components/preview/PreviewView.svelte
var root20 = from_html(
  `<button type="button" class="refresh-button svelte-1gez8n9"><svg viewBox="0 0 24 24" aria-hidden="true" class="svelte-1gez8n9"><path></path></svg></button>`,
);
var root_117 = from_html(`<span class="hint" role="status"> </span>`);
var root_213 = from_html(
  `<div class="schedule-heading svelte-1gez8n9"><div class="schedule-title svelte-1gez8n9"><h2 aria-live="polite" class="svelte-1gez8n9"> </h2> <!></div> <!> <div class="day-navigation svelte-1gez8n9" role="group"><ha-icon-button></ha-icon-button> <button type="button" class="text-button svelte-1gez8n9"> </button>  <ha-icon-button></ha-icon-button></div></div>`,
  2,
);
var root_311 = from_html(`<!> <!>`, 1);
var $$css8 = {
  hash: "svelte-1gez8n9",
  code: ".schedule-heading.svelte-1gez8n9 {display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin-bottom:20px;}h2.svelte-1gez8n9 {margin:0;line-height:1.25;}.schedule-title.svelte-1gez8n9 {display:flex;align-items:center;gap:8px;}.refresh-button.svelte-1gez8n9 {display:grid;place-items:center;flex:0 0 36px;width:36px;min-height:36px;padding:0;border:0;border-radius:50%;background:transparent;}.refresh-button.svelte-1gez8n9:hover:not(:disabled) {background:var(--secondary-background-color, #eee);}.refresh-button.svelte-1gez8n9 svg:where(.svelte-1gez8n9) {width:24px;height:24px;fill:currentColor;}.day-navigation.svelte-1gez8n9 {display:flex;align-items:center;gap:4px;margin-left:auto;}.day-navigation.svelte-1gez8n9 button:where(.svelte-1gez8n9) {margin:0;}",
};
function PreviewView($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css8);
  const dayHeading = ($$anchor2) => {
    var div = root_213();
    var div_1 = child(div);
    var h2 = child(div_1);
    var text2 = only_child(h2, true);
    var node = sibling(h2, 2);
    {
      var consequent = ($$anchor3) => {
        var button = root20();
        var svg = child(button);
        var path = child(svg);
        set_attribute2(path, "d", refreshIcon);
        reset(svg);
        reset(button);
        template_effect(
          ($0, $1) => {
            set_attribute2(button, "title", $0);
            set_attribute2(button, "aria-label", $1);
            button.disabled = $$props.panel.busy || $$props.panel.liveBusy;
          },
          [() => get(t)("refresh_preview"), () => get(t)("refresh_preview")],
        );
        delegated("click", button, () =>
          $$props.panel.refreshPreviewSchedule(),
        );
        append($$anchor3, button);
      };
      if_block(node, ($$render) => {
        if (!$$props.panel.liveRunning) $$render(consequent);
      });
    }
    reset(div_1);
    var node_1 = sibling(div_1, 2);
    {
      var consequent_1 = ($$anchor3) => {
        var span = root_117();
        var text_1 = only_child(span, true);
        template_effect(
          ($0) => set_text(text_1, $0),
          [() => get(t)("loading_schedule")],
        );
        append($$anchor3, span);
      };
      if_block(node_1, ($$render) => {
        if (get(showLoading) && get(plan)) $$render(consequent_1);
      });
    }
    var div_2 = sibling(node_1, 2);
    var ha_icon_button = child(div_2);
    template_effect(
      ($0) => set_custom_element_data(ha_icon_button, "title", $0),
      [() => get(t)("previous_day")],
    );
    action(
      ha_icon_button,
      ($$node, $$action_arg) => properties?.($$node, $$action_arg),
      () => ({
        path: previousIcon,
        label: get(t)("previous_day"),
        disabled:
          $$props.panel.busy ||
          $$props.panel.liveRunning ||
          $$props.panel.liveBusy,
      }),
    );
    var button_1 = sibling(ha_icon_button, 2);
    var text_2 = only_child(button_1, true);
    var ha_icon_button_1 = sibling(button_1, 2);
    template_effect(
      ($0) => set_custom_element_data(ha_icon_button_1, "title", $0),
      [() => get(t)("next_day")],
    );
    action(
      ha_icon_button_1,
      ($$node, $$action_arg) => properties?.($$node, $$action_arg),
      () => ({
        path: nextIcon,
        label: get(t)("next_day"),
        disabled:
          $$props.panel.busy ||
          $$props.panel.liveRunning ||
          $$props.panel.liveBusy,
      }),
    );
    reset(div_2);
    reset(div);
    template_effect(
      ($0, $1, $2) => {
        set_text(text2, $0);
        set_attribute2(div_2, "aria-label", $1);
        button_1.disabled =
          $$props.panel.busy ||
          $$props.panel.liveRunning ||
          $$props.panel.liveBusy ||
          get(date) === $$props.panel.document.simulation_date;
        set_text(text_2, $2);
      },
      [
        () =>
          formatPreviewDate(
            get(date),
            $$props.panel.document.simulation_date,
            $$props.panel._hass.locale,
            get(t),
          ),
        () => get(t)("schedule_day"),
        () => get(t)("today"),
      ],
    );
    delegated("click", ha_icon_button, () => $$props.panel.movePreviewDay(-1));
    delegated("click", button_1, () =>
      $$props.panel.selectPreviewDate($$props.panel.document.simulation_date),
    );
    delegated("click", ha_icon_button_1, () => $$props.panel.movePreviewDay(1));
    append($$anchor2, div);
  };
  let showLoading = state(false);
  user_effect(() => {
    void $$props.revision;
    if (!$$props.panel.busy) {
      set2(showLoading, false);
      return;
    }
    set2(showLoading, false);
    const timeout = globalThis.setTimeout(() => {
      set2(showLoading, true);
    }, 250);
    return () => globalThis.clearTimeout(timeout);
  });
  let t = user_derived(() => $$props.panel.t);
  let preview = user_derived(() => $$props.panel.preview);
  let previewDate = user_derived(() => $$props.panel.previewDate);
  let liveVisible = user_derived(() => $$props.panel.liveVisible);
  let livePlan = user_derived(() => $$props.panel.livePlan);
  let liveProgram = user_derived(() => $$props.panel.liveProgram);
  let previewProgram = user_derived(() => $$props.panel.previewProgram);
  let draft = user_derived(() => $$props.panel.draft);
  let schedulePlans = user_derived(() =>
    get(liveVisible) && get(livePlan) ? [get(livePlan)] : get(preview)?.plans,
  );
  let program = user_derived(() =>
    get(liveVisible) && get(liveProgram)
      ? get(liveProgram)
      : (get(previewProgram) ?? get(draft)),
  );
  let plan = user_derived(() =>
    get(liveVisible) && get(livePlan)
      ? get(livePlan)
      : calendarDayPlan(
          get(preview)?.plans || [],
          get(preview)?.plans.at(-1)?.simulation_date || get(previewDate),
        ),
  );
  let date = user_derived(
    () =>
      get(plan)?.simulation_date ||
      $$props.panel.previewDate ||
      $$props.panel.document.simulation_date,
  );
  function openSource(event2) {
    if (event2.kind.startsWith("random_")) {
      const entry = randomEntries(
        $$props.panel.draft,
        $$props.panel.catalog,
      ).find((entry2) => entry2.id === event2.source_id);
      if (entry) {
        openRandom($$props.panel, entry);
      }
    } else {
      const entry = stepEntries(
        $$props.panel.draft,
        $$props.panel.catalog,
        $$props.panel.t,
      ).find((entry2) => entry2.id === event2.source_id);
      if (entry) {
        openStep($$props.panel, entry);
      }
    }
  }
  const previousIcon =
    "M15.41,16.59L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.59Z";
  const nextIcon =
    "M8.59,16.59L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.59Z";
  const refreshIcon =
    "M17.65,6.35C16.2,4.9 14.21,4 12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18C8.69,18 6,15.31 6,12C6,8.69 8.69,6 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z";
  let entities = user_derived(() => $$props.panel.catalog.entities);
  let entityNames = user_derived(() =>
    Object.fromEntries(
      get(entities).map((entity) => [entity.entity_id, entity.name]),
    ),
  );
  var fragment = root_311();
  var node_2 = first_child(fragment);
  {
    let $0 = user_derived(() =>
      $$props.panel.liveVisible ? $$props.panel.liveSession : null,
    );
    Timeline(node_2, {
      get plan() {
        return get(plan);
      },
      get schedulePlans() {
        return get(schedulePlans);
      },
      get program() {
        return get(program);
      },
      get liveSession() {
        return get($0);
      },
      get t() {
        return get(t);
      },
      get locale() {
        return $$props.panel._hass.locale;
      },
      get hass() {
        return $$props.panel._hass;
      },
      get entityNames() {
        return get(entityNames);
      },
      onOpenSource: openSource,
      get heading() {
        return dayHeading;
      },
      get loading() {
        return $$props.panel.busy;
      },
      get showLoading() {
        return get(showLoading);
      },
    });
  }
  var node_3 = sibling(node_2, 2);
  LivePreviewControls(node_3, {
    get panel() {
      return $$props.panel;
    },
  });
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/src/lib/components/shared/UnsavedStepDialog.svelte
var root21 = from_html(
  `<div class="step-exit-overlay"><dialog open="" class="step-exit-dialog" role="alertdialog" aria-modal="true" aria-labelledby="step-exit-title" aria-describedby="step-exit-description"><h2 id="step-exit-title"> </h2> <p id="step-exit-description"> </p> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="danger"> </button></div></dialog></div>`,
);
function UnsavedStepDialog($$anchor, $$props) {
  push($$props, true);
  let t = user_derived(() => $$props.panel.t);
  let keepEditing;
  onMount(() => keepEditing.focus());
  var div = root21();
  var dialog = child(div);
  var h2 = child(dialog);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var div_1 = sibling(p, 2);
  var button = child(div_1);
  var text_2 = only_child(button, true);
  bind_this(
    button,
    ($$value) => (keepEditing = $$value),
    () => keepEditing,
  );
  var button_1 = sibling(button, 2);
  var text_3 = only_child(button_1, true);
  reset(div_1);
  reset(dialog);
  reset(div);
  template_effect(
    ($0, $1, $2, $3) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      set_text(text_2, $2);
      set_text(text_3, $3);
    },
    [
      () => get(t)("unsaved_changes"),
      () =>
        get(t)(
          $$props.panel.randomEditor
            ? "random_unsaved_confirm"
            : "step_unsaved_confirm",
        ),
      () => get(t)("keep_editing"),
      () => get(t)("discard_changes"),
    ],
  );
  delegated("click", button, () => $$props.panel.cancelStepExit());
  delegated("click", button_1, () => $$props.panel.confirmStepExit());
  append($$anchor, div);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/src/lib/components/random/DeleteRandomDialog.svelte
var root22 = from_html(`<li> </li>`);
var root_118 = from_html(`<p> </p> <ul></ul> <p class="hint"> </p>`, 1);
var root_214 = from_html(
  `<dialog class="step-delete-dialog" aria-labelledby="random-delete-title"><h2 id="random-delete-title"> </h2> <p> </p> <!> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="danger"> </button></div></dialog>`,
);
function DeleteRandomDialog($$anchor, $$props) {
  push($$props, true);
  let dialog;
  let dependents = user_derived(() =>
    randomEntries($$props.panel.draft, $$props.panel.catalog).filter((entry) =>
      randomReferences(
        $$props.panel.draft,
        $$props.panel.randomEditor?.id || "",
      ).some((path) => path[1] === entry.id),
    ),
  );
  onMount(() => {
    dialog.showModal();
    dialog.querySelector("button")?.focus();
  });
  var dialog_1 = root_214();
  var h2 = child(dialog_1);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var node = sibling(p, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment = root_118();
      var p_1 = first_child(fragment);
      var text_2 = only_child(p_1);
      var ul = sibling(p_1, 2);
      each(
        ul,
        21,
        () => get(dependents),
        (entry) => entry.id,
        ($$anchor3, entry) => {
          var li = root22();
          var text_3 = only_child(li, true);
          template_effect(() => set_text(text_3, get(entry).name));
          append($$anchor3, li);
        },
      );
      reset(ul);
      var p_2 = sibling(ul, 2);
      var text_4 = only_child(p_2, true);
      template_effect(
        ($0, $1) => {
          set_text(text_2, `${$0 ?? ""}:`);
          set_text(text_4, $1);
        },
        [
          () => $$props.panel.t("used_by"),
          () => $$props.panel.t("delete_dependents_hint"),
        ],
      );
      append($$anchor2, fragment);
    };
    if_block(node, ($$render) => {
      if (get(dependents).length) $$render(consequent);
    });
  }
  var div = sibling(node, 2);
  var button = child(div);
  var text_5 = only_child(button, true);
  var button_1 = sibling(button, 2);
  var text_6 = only_child(button_1, true);
  reset(div);
  reset(dialog_1);
  bind_this(
    dialog_1,
    ($$value) => (dialog = $$value),
    () => dialog,
  );
  template_effect(
    ($0, $1, $2, $3) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      button.disabled = $$props.panel.busy;
      set_text(text_5, $2);
      button_1.disabled =
        $$props.panel.busy || $$props.panel.stale || get(dependents).length > 0;
      set_text(text_6, $3);
    },
    [
      () => $$props.panel.t("delete_random_event_confirm"),
      () => $$props.panel.t("delete_random_event_hint"),
      () => $$props.panel.t("cancel"),
      () => $$props.panel.t("delete_random_event"),
    ],
  );
  event("close", dialog_1, function (...$$args) {
    $$props.onClose?.apply(this, $$args);
  });
  delegated("click", button, () => dialog.close());
  delegated("click", button_1, async () => {
    await deleteRandom($$props.panel);
    if (!$$props.panel.error && !$$props.panel.randomEditor) {
      dialog.close();
    }
  });
  append($$anchor, dialog_1);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/src/lib/components/random/AdvancedRandomSettings.svelte
var root23 = from_html(`<button type="button"> </button>`);
var root_119 = from_html(
  `<label class="step-weekday-option"><input type="checkbox"/><span> </span></label>`,
);
var root_215 = from_html(`<h3> </h3> <!>`, 1);
var root_312 = from_html(
  `<dialog class="step-advanced-dialog" aria-labelledby="random-advanced-title" aria-describedby="random-weekdays-description"><h2 id="random-advanced-title"> </h2> <p id="random-weekdays-description" class="hint"> </p> <fieldset class="step-weekdays"><legend> </legend> <div class="step-weekday-presets"></div> <div class="step-weekday-options"></div></fieldset> <!> <!> <!> <p class="hint"> </p> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="primary"> </button></div></dialog>`,
);
function AdvancedRandomSettings($$anchor, $$props) {
  push($$props, true);
  let form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t),
    changed = user_derived(() => $$props.context.changed);
  let selectedDays = state(proxy(untrack(() => [...get(form).days])));
  let startStagger = state(proxy(untrack(() => staggerSettings(get(form).on))));
  let endStagger = state(proxy(untrack(() => staggerSettings(get(form).off))));
  let canStartStagger = user_derived(() => supportsStagger(get(form).on));
  let canEndStagger = user_derived(() => supportsStagger(get(form).off));
  let staggerError = user_derived(
    () =>
      (get(canStartStagger) && staggerPeriodError(get(startStagger))) ||
      (get(canEndStagger) && staggerPeriodError(get(endStagger))),
  );
  let dialog;
  const presets = [
    ["every_day_label", days],
    ["weekdays", days.slice(0, 5)],
    ["weekends", days.slice(5)],
  ];
  const weekdays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  let dayError = user_derived(() =>
    get(selectedDays).length > 0 ? void 0 : get(t)("days_required_error"),
  );
  onMount(() => {
    dialog.showModal();
    dialog.querySelector("input")?.focus();
  });
  function apply2() {
    if ($$props.panel.busy || get(dayError) || get(staggerError)) {
      return;
    }
    get(form).days = [...get(selectedDays)];
    get(changed)("days");
    if (get(canStartStagger)) {
      applyStagger(get(form).on, get(startStagger));
      get(changed)("on.stagger");
    }
    if (get(canEndStagger)) {
      applyStagger(get(form).off, get(endStagger));
      get(changed)("off.stagger");
    }
    dialog.close();
  }
  var dialog_1 = root_312();
  var h2 = child(dialog_1);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var fieldset = sibling(p, 2);
  var legend = child(fieldset);
  var text_2 = only_child(legend, true);
  var div = sibling(legend, 2);
  each(
    div,
    21,
    () => presets,
    ([label, selection]) => label,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array(get($$item), 2));
      let label = () => get($$array)[0];
      let selection = () => get($$array)[1];
      var button = root23();
      var text_3 = only_child(button, true);
      template_effect(
        ($0, $1) => {
          set_attribute2(button, "aria-pressed", $0);
          set_text(text_3, $1);
        },
        [
          () =>
            get(selectedDays).length === selection().length &&
            selection().every((day2) => get(selectedDays).includes(day2)),
          () => get(t)(label()),
        ],
      );
      delegated("click", button, () =>
        set2(selectedDays, [...selection()], true),
      );
      append($$anchor2, button);
    },
  );
  reset(div);
  var div_1 = sibling(div, 2);
  each(
    div_1,
    22,
    () => days,
    (day2) => day2,
    ($$anchor2, day2, index2) => {
      var label_1 = root_119();
      var input = child(label_1);
      remove_input_defaults(input);
      var span = sibling(input);
      var text_4 = only_child(span, true);
      reset(label_1);
      template_effect(
        ($0, $1) => {
          set_checked(input, $0);
          set_text(text_4, $1);
        },
        [
          () => get(selectedDays).includes(day2),
          () => get(t)(weekdays[get(index2)]),
        ],
      );
      delegated("change", input, (event2) => {
        const checked = event2.currentTarget.checked;
        set2(
          selectedDays,
          days.filter((candidate) =>
            candidate === day2
              ? checked
              : get(selectedDays).includes(candidate),
          ),
          true,
        );
      });
      append($$anchor2, label_1);
    },
  );
  reset(div_1);
  reset(fieldset);
  var node = sibling(fieldset, 2);
  {
    let $0 = user_derived(() => (get(dayError) ? { days: get(dayError) } : {}));
    FieldError(node, {
      get t() {
        return get(t);
      },
      key: "days",
      get errors() {
        return get($0);
      },
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment = root_215();
      var h3 = first_child(fragment);
      var text_5 = only_child(h3, true);
      var node_2 = sibling(h3, 2);
      StaggerSettings(node_2, {
        get t() {
          return get(t);
        },
        id: "random-start-stagger",
        get disabled() {
          return $$props.panel.busy;
        },
        get settings() {
          return get(startStagger);
        },
        set settings($$value) {
          set2(startStagger, $$value, true);
        },
      });
      template_effect(
        ($0) => set_text(text_5, $0),
        [() => get(t)("start_action")],
      );
      append($$anchor2, fragment);
    };
    if_block(node_1, ($$render) => {
      if (get(canStartStagger)) $$render(consequent);
    });
  }
  var node_3 = sibling(node_1, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var fragment_1 = root_215();
      var h3_1 = first_child(fragment_1);
      var text_6 = only_child(h3_1, true);
      var node_4 = sibling(h3_1, 2);
      StaggerSettings(node_4, {
        get t() {
          return get(t);
        },
        id: "random-end-stagger",
        get disabled() {
          return $$props.panel.busy;
        },
        get settings() {
          return get(endStagger);
        },
        set settings($$value) {
          set2(endStagger, $$value, true);
        },
      });
      template_effect(
        ($0) => set_text(text_6, $0),
        [() => get(t)("end_action")],
      );
      append($$anchor2, fragment_1);
    };
    if_block(node_3, ($$render) => {
      if (get(canEndStagger)) $$render(consequent_1);
    });
  }
  var p_1 = sibling(node_3, 2);
  var text_7 = only_child(p_1, true);
  var div_2 = sibling(p_1, 2);
  var button_1 = child(div_2);
  var text_8 = only_child(button_1, true);
  var button_2 = sibling(button_1, 2);
  var text_9 = only_child(button_2, true);
  reset(div_2);
  reset(dialog_1);
  bind_this(
    dialog_1,
    ($$value) => (dialog = $$value),
    () => dialog,
  );
  template_effect(
    ($0, $1, $2, $3, $4, $5) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      set_attribute2(
        fieldset,
        "aria-describedby",
        get(dayError) ? "step-error-days" : void 0,
      );
      fieldset.disabled = $$props.panel.busy;
      set_text(text_2, $2);
      set_text(text_7, $3);
      set_text(text_8, $4);
      button_2.disabled =
        $$props.panel.busy || !!get(dayError) || !!get(staggerError);
      set_text(text_9, $5);
    },
    [
      () => get(t)("advanced_settings"),
      () => get(t)("random_days_hint"),
      () => get(t)("run_on"),
      () => get(t)("random_settings_hint"),
      () => get(t)("cancel"),
      () => get(t)("apply"),
    ],
  );
  event("close", dialog_1, function (...$$args) {
    $$props.onClose?.apply(this, $$args);
  });
  delegated("click", button_1, () => dialog.close());
  delegated("click", button_2, apply2);
  append($$anchor, dialog_1);
  pop();
}
delegate(["click", "change"]);

// custom_components/occupied/frontend/src/lib/components/random/RandomActions.svelte
var root24 = from_html(
  `<div role="separator"></div> <button type="button" role="menuitem" tabindex="-1" class="danger"> </button>`,
  1,
);
var root_120 = from_html(
  `<div class="step-editor-actions"><button type="button" class="icon-button" aria-haspopup="menu" data-random-actions=""><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path></svg></button> <div class="step-actions-menu" popover="auto" role="menu" tabindex="-1"><button type="button" role="menuitem" tabindex="-1"> </button> <!></div></div> <!> <!>`,
  1,
);
function RandomActions($$anchor, $$props) {
  push($$props, true);
  let context = prop($$props, "context", 7),
    advancedOpen = prop($$props, "advancedOpen", 15, false);
  let menuOpen = state(false);
  let deleteOpen = state(false);
  let trigger;
  let menu;
  let menuId = user_derived(() => `random-actions-${context().editor.id}`);
  function closeDialog() {
    const focusTarget =
      advancedOpen() && $$props.advancedTrigger
        ? $$props.advancedTrigger
        : trigger;
    flushSync(() => {
      set2(deleteOpen, false);
      advancedOpen(false);
    });
    if (focusTarget.isConnected) {
      focusTarget.focus();
    }
  }
  function closeMenu(restoreFocus = true) {
    menu.hidePopover();
    set2(menuOpen, false);
    if (restoreFocus) {
      trigger.focus();
    }
  }
  function positionMenu() {
    if (!menu.matches(":popover-open")) {
      return;
    }
    const anchor = trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const above = anchor.top - bounds.height - 8;
    const top = above >= 16 ? above : anchor.bottom + 8;
    menu.style.left = `${Math.max(16, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 16))}px`;
    menu.style.top = `${Math.max(16, Math.min(top, window.innerHeight - bounds.height - 16))}px`;
  }
  function openMenu(last = false) {
    menu.showPopover();
    set2(menuOpen, true);
    positionMenu();
    const items = [...menu.querySelectorAll("button:not(:disabled)")];
    (last ? items.at(-1) : items[0])?.focus({ preventScroll: true });
  }
  function menuKeydown(event2) {
    const items = [...menu.querySelectorAll("button:not(:disabled)")];
    const index2 = items.indexOf($$props.panel.shadowRoot.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event2.key)) {
      event2.preventDefault();
      let next2 =
        (index2 + (event2.key === "ArrowDown" ? 1 : -1) + items.length) %
        items.length;
      if (event2.key === "Home") {
        next2 = 0;
      } else if (event2.key === "End") {
        next2 = items.length - 1;
      }
      items[next2]?.focus();
    } else if (event2.key === "Escape") {
      event2.preventDefault();
      closeMenu();
    } else if (event2.key === "Tab") {
      closeMenu();
    }
  }
  var fragment = root_120();
  event("resize", $window, positionMenu);
  event("scroll", $window, positionMenu);
  var div = first_child(fragment);
  var button = child(div);
  bind_this(
    button,
    ($$value) => (trigger = $$value),
    () => trigger,
  );
  var div_1 = sibling(button, 2);
  var button_1 = child(div_1);
  var text2 = only_child(button_1, true);
  var node = sibling(button_1, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment_1 = root24();
      var button_2 = sibling(first_child(fragment_1), 2);
      var text_1 = only_child(button_2, true);
      template_effect(
        ($0) => {
          button_2.disabled = $$props.panel.busy || $$props.panel.stale;
          set_text(text_1, $0);
        },
        [() => $$props.panel.t("delete_random_event")],
      );
      delegated("click", button_2, () => {
        closeMenu(false);
        flushSync(() => set2(deleteOpen, true));
      });
      append($$anchor2, fragment_1);
    };
    if_block(node, ($$render) => {
      if (context().editor.existing) $$render(consequent);
    });
  }
  reset(div_1);
  bind_this(
    div_1,
    ($$value) => (menu = $$value),
    () => menu,
  );
  reset(div);
  var node_1 = sibling(div, 2);
  {
    var consequent_1 = ($$anchor2) => {
      DeleteRandomDialog($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        onClose: closeDialog,
      });
    };
    if_block(node_1, ($$render) => {
      if (get(deleteOpen)) $$render(consequent_1);
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent_2 = ($$anchor2) => {
      AdvancedRandomSettings($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return context();
        },
        onClose: closeDialog,
      });
    };
    if_block(node_2, ($$render) => {
      if (advancedOpen()) $$render(consequent_2);
    });
  }
  template_effect(
    ($0, $1, $2, $3) => {
      set_attribute2(button, "aria-label", $0);
      set_attribute2(button, "title", $1);
      set_attribute2(button, "aria-expanded", get(menuOpen));
      set_attribute2(button, "aria-controls", get(menuId));
      button.disabled = $$props.panel.busy;
      set_attribute2(div_1, "id", get(menuId));
      set_attribute2(div_1, "aria-label", $2);
      button_1.disabled = $$props.panel.busy;
      set_text(text2, $3);
    },
    [
      () => $$props.panel.t("random_event_actions"),
      () => $$props.panel.t("random_event_actions"),
      () => $$props.panel.t("random_event_actions"),
      () => $$props.panel.t(context().form.enabled ? "disable" : "enable"),
    ],
  );
  delegated("click", button, () => (get(menuOpen) ? closeMenu() : openMenu()));
  delegated("keydown", button, (event2) => {
    if (!(event2.key === "ArrowDown" || event2.key === "ArrowUp")) {
      return;
    }
    event2.preventDefault();
    openMenu(event2.key === "ArrowUp");
  });
  event("toggle", div_1, (event2) =>
    set2(menuOpen, event2.newState === "open"),
  );
  delegated("keydown", div_1, menuKeydown);
  delegated("click", button_1, () => {
    closeMenu();
    context().form.enabled = !context().form.enabled;
    context().changed("enabled");
  });
  append($$anchor, fragment);
  pop();
}
delegate(["click", "keydown"]);

// custom_components/occupied/frontend/src/lib/utils/random-explanation.ts
function randomExplanation(form, program, catalog, t = translator(), locale) {
  const say = (text2, values = {}) => {
    let message = t(text2);
    for (const [key2, value] of Object.entries(values)) {
      message = message.replaceAll(`{${key2}}`, () => String(value));
    }
    return message;
  };
  const entries = [
    ...stepEntries(program, catalog, t),
    ...randomEntries(program, catalog).map((entry) => ({
      id: `random:${entry.id}`,
      name: entry.name,
    })),
  ];
  const start = timingExplanation(
    form.start,
    entries,
    t,
    catalog.time_sources,
    {
      includeHints: false,
      subject: "window_starts",
      days: form.days,
      locale,
    },
  );
  let end = timingExplanation(form.end, entries, t, catalog.time_sources, {
    includeHints: false,
    subject: "window_ends",
    locale,
  });
  let windowSeconds;
  const clockSeconds2 = (value) =>
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
      ? value
          .split(":")
          .reduce(
            (total, part, index2) =>
              total + Number(part) * [3600, 60, 1][index2],
            0,
          )
      : NaN;
  if (
    form.start.mode === "absolute" &&
    form.end.mode === "absolute" &&
    !form.start.end &&
    !form.end.end
  ) {
    const difference =
      clockSeconds2(form.end.start) - clockSeconds2(form.start.start);
    if (Number.isFinite(difference)) {
      windowSeconds = difference < 0 ? difference + 86400 : difference;
      if (difference < 0) {
        end += ` ${t("the_next_day")}`;
      }
    }
  }
  if (form.end.mode === "duration") {
    const duration2 = durationSeconds(
      form.end.maxDuration || form.end.minDuration || "",
    );
    if (Number.isFinite(duration2) && duration2 > 0) {
      windowSeconds = duration2;
    }
  }
  const minDuration = durationSeconds(form.minDuration);
  const maxDuration = durationSeconds(form.maxDuration);
  const cannotFit =
    windowSeconds !== void 0 &&
    Number.isFinite(minDuration) &&
    minDuration > windowSeconds;
  const sentences = [
    ...(form.enabled ? [] : [t("random_disabled_hint")]),
    `${start}.`,
    `${end}.`,
  ];
  const minimum = Number(form.minCount);
  const maximum = Number(form.maxCount);
  const validCount = (value) =>
    Number.isSafeInteger(value) && value >= 0 && value <= 1e3;
  const validCounts =
    !!form.minCount.trim() &&
    !!form.maxCount.trim() &&
    validCount(minimum) &&
    validCount(maximum) &&
    maximum >= minimum;
  if (validCounts && maximum === 0) {
    sentences.push(
      t("random_zero_count_hint"),
      t("random_dependents_skip_hint"),
    );
    return sentences.join(" ");
  }
  if (cannotFit) {
    sentences.push(t("random_duration_exceeds_window"));
  } else if (!validCounts) {
    sentences.push(t("random_counts_prompt"));
  } else if (minimum === maximum) {
    sentences.push(
      minimum === 1
        ? t("random_single_event_summary")
        : say("random_count_summary", {
            count: minimum,
          }),
    );
  } else {
    sentences.push(
      say("random_count_range_summary", {
        min: minimum,
        max: maximum,
      }),
    );
  }
  if (validCounts && minimum === 0) {
    sentences.push(t("random_empty_window_hint"));
  }
  const duration = (seconds) => durationLabel(seconds, t);
  if (
    !Number.isFinite(minDuration) ||
    !Number.isFinite(maxDuration) ||
    minDuration <= 0 ||
    maxDuration < minDuration ||
    maxDuration > 604800
  ) {
    sentences.push(t("random_durations_prompt"));
  } else if (windowSeconds !== void 0 && minDuration > windowSeconds) {
    sentences.push(t("random_duration_fit_hint"));
  } else {
    const longest =
      windowSeconds === void 0
        ? maxDuration
        : Math.min(maxDuration, windowSeconds);
    sentences.push(
      minDuration === longest
        ? say("random_duration_summary", {
            duration: duration(minDuration),
          })
        : say("random_duration_range_summary", {
            min: duration(minDuration),
            max: duration(longest),
          }),
    );
  }
  const action2 = (selected) => {
    if (selected.kind === "custom") {
      return t("custom_yaml_summary");
    }
    const names = [...new Set(selected.entities)].map((id) =>
      entityName(catalog, id),
    );
    if (names.length === 0) {
      return "";
    }
    const last = names.pop();
    const entities =
      names.length > 0 ? `${names.join(", ")} ${t("and")} ${last}` : last;
    if (selected.kind === "scene") {
      return say("action_activate_summary", { entities });
    }
    if (selected.kind === "cover") {
      const descriptions = {
        "cover.open_cover": "action_open_summary",
        "cover.close_cover": "action_close_summary",
        "cover.stop_cover": "action_stop_summary",
        "cover.set_cover_position": "action_position_summary",
        "cover.open_cover_tilt": "action_open_tilt_summary",
        "cover.close_cover_tilt": "action_close_tilt_summary",
        "cover.stop_cover_tilt": "action_stop_tilt_summary",
        "cover.set_cover_tilt_position": "action_tilt_position_summary",
      };
      const description = descriptions[selected.service];
      if (!description) {
        return "";
      }
      const position =
        selected.service === "cover.set_cover_position"
          ? selected.position
          : selected.tiltPosition;
      return t(description).includes("{position}") &&
        (!position.trim() ||
          !Number.isSafeInteger(Number(position)) ||
          Number(position) < 0 ||
          Number(position) > 100)
        ? ""
        : say(description, { entities, position });
    }
    if (selected.kind === "service") {
      return selected.service.trim()
        ? say("action_service_summary", {
            service: selected.service.trim(),
            entities,
          })
        : "";
    }
    return say(
      selected.action === "turn_off"
        ? "action_turn_off_summary"
        : "action_turn_on_summary",
      { entities },
    );
  };
  const on2 = action2(form.on);
  const off = action2(
    form.sameEntities ? { ...form.off, entities: form.on.entities } : form.off,
  );
  if (on2 && !cannotFit) {
    sentences.push(say("random_start_action_summary", { action: on2 }));
  }
  if (off && !cannotFit) {
    sentences.push(say("random_end_action_summary", { action: off }));
  }
  const conclusion =
    validCounts && maximum === 1
      ? "random_single_finish_hint"
      : "random_overlap_hint";
  sentences.push(t(cannotFit ? "random_duration_priority_hint" : conclusion));
  return sentences.join(" ");
}

// custom_components/occupied/frontend/src/lib/components/random/RandomEventEditor.svelte
var root25 = from_html(`<button type="button" class="text-button"> </button>`);
var root_121 = from_html(
  `<label class="same-entities svelte-1n39iyr"><input type="checkbox"/> </label>`,
);
var root_216 = from_html(
  `<section class="step-editor random-editor"><div class="step-name-editor"><!></div> <p class="hint"> </p> <div class="editor-sections"><!> <!></div> <button type="button" aria-haspopup="dialog" data-builder-field="days" data-random-advanced=""> </button> <!> <h3> </h3> <div class="random-frequency svelte-1n39iyr"><div><!> <!></div> <div><!></div> <!> <!></div> <p class="hint" data-random-explanation="" aria-live="polite"> </p> <p class="hint"> </p> <div class="editor-sections"><!> <div><!> <!></div></div> <div class="builder-footer"><button type="button"> </button> <!> <button type="button" class="primary" data-random-submit=""> </button></div></section>`,
);
var $$css9 = {
  hash: "svelte-1n39iyr",
  code: ".random-advanced-button.svelte-1n39iyr {margin-top:16px;}.random-frequency.svelte-1n39iyr {display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px;}.same-entities.svelte-1n39iyr {display:flex;align-items:center;gap:8px;margin-top:16px;}\n\n  @media (max-width: 600px) {.random-frequency.svelte-1n39iyr {grid-template-columns:1fr;gap:0;}\n  }",
};
function RandomEventEditor($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css9);
  let context = user_derived(() => {
    void $$props.revision;
    return createRandomEditorContext($$props.panel);
  });
  let editor = user_derived(() => get(context).editor),
    form = user_derived(() => get(context).form),
    t = user_derived(() => get(context).t),
    changed = user_derived(() => get(context).changed),
    submit = user_derived(() => get(context).submit),
    cancel = user_derived(() => get(context).cancel);
  let advancedOpen = state(false);
  let advancedButton;
  let advancedTrigger = state(void 0);
  let showMaxCount = state(
    proxy(
      untrack(() => Number(get(form).minCount) !== Number(get(form).maxCount)),
    ),
  );
  let maxCountVisible = user_derived(
    () =>
      get(showMaxCount) ||
      Number(get(form).minCount) !== Number(get(form).maxCount) ||
      !!get(editor).errors.maxCount,
  );
  async function save2() {
    await get(submit)();
    if (!$$props.panel.randomEditor?.errors.days) {
      return;
    }
    set2(advancedTrigger, advancedButton, true);
    set2(advancedOpen, true);
  }
  var section = root_216();
  var div = child(section);
  var node = child(div);
  {
    let $0 = user_derived(() => ({
      hideLabel: true,
      placeholder: get(t)("optional_title"),
    }));
    EditorField(node, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get(context);
      },
      key: "name",
      label: "random_event_name",
      get value() {
        return get(form).name;
      },
      update: (value) => (get(form).name = value),
      get options() {
        return get($0);
      },
    });
  }
  reset(div);
  var p = sibling(div, 2);
  var text2 = only_child(p, true);
  var div_1 = sibling(p, 2);
  var node_1 = child(div_1);
  {
    let $0 = user_derived(() => get(context).timing("start"));
    TimingEditor(node_1, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get($0);
      },
      heading: "window_starts",
      clockLabel: "window_start",
      windowEndLabel: "latest_window_start_optional",
      addWindowEndLabel: "randomize_window_start",
      explanationSubject: "window_starts",
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    let $0 = user_derived(() => get(context).timing("end"));
    TimingEditor(node_2, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get($0);
      },
      heading: "window_ends",
      clockLabel: "window_end",
      windowEndLabel: "latest_window_end_optional",
      addWindowEndLabel: "randomize_window_end",
      explanationSubject: "window_ends",
      modes: [
        ["absolute", "absolute_time"],
        ["duration", "duration"],
      ],
    });
  }
  reset(div_1);
  var button = sibling(div_1, 2);
  let classes;
  var text_1 = only_child(button, true);
  bind_this(
    button,
    ($$value) => (advancedButton = $$value),
    () => advancedButton,
  );
  var node_3 = sibling(button, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node_3, {
      get t() {
        return get(t);
      },
      key: "days",
      get errors() {
        return get($0);
      },
    });
  }
  var h3 = sibling(node_3, 2);
  var text_2 = only_child(h3, true);
  var div_2 = sibling(h3, 2);
  var div_3 = child(div_2);
  var node_4 = child(div_3);
  EditorField(node_4, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
    key: "minCount",
    label: "minimum_events_per_window",
    get value() {
      return get(form).minCount;
    },
    update: (value) => {
      if (!get(maxCountVisible)) {
        get(form).maxCount = value;
      }
      get(form).minCount = value;
    },
    options: { type: "number", min: 0, max: 1e3, step: 1 },
  });
  var node_5 = sibling(node_4, 2);
  {
    var consequent = ($$anchor2) => {
      var button_1 = root25();
      var text_3 = only_child(button_1, true);
      template_effect(
        ($0) => {
          button_1.disabled = $$props.panel.busy;
          set_text(text_3, $0);
        },
        [() => get(t)("add_maximum_events")],
      );
      delegated("click", button_1, () => {
        set2(showMaxCount, true);
        get(changed)("maxCount");
        focusEditor($$props.panel, "maxCount");
      });
      append($$anchor2, button_1);
    };
    if_block(node_5, ($$render) => {
      if (!get(maxCountVisible)) $$render(consequent);
    });
  }
  reset(div_3);
  var div_4 = sibling(div_3, 2);
  var node_6 = child(div_4);
  {
    var consequent_1 = ($$anchor2) => {
      {
        const trailing = ($$anchor3) => {
          var button_2 = root25();
          var text_4 = only_child(button_2, true);
          template_effect(
            ($0) => {
              button_2.disabled = $$props.panel.busy;
              set_text(text_4, $0);
            },
            [() => get(t)("remove_maximum_events")],
          );
          delegated("click", button_2, () => {
            get(form).maxCount = get(form).minCount;
            set2(showMaxCount, false);
            get(changed)("maxCount");
            focusEditor($$props.panel, "minCount");
          });
          append($$anchor3, button_2);
        };
        EditorField($$anchor2, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return get(context);
          },
          key: "maxCount",
          label: "maximum_events_per_window",
          get value() {
            return get(form).maxCount;
          },
          update: (value) => (get(form).maxCount = value),
          options: { type: "number", min: 0, max: 1e3, step: 1 },
          trailing,
          $$slots: { trailing: true },
        });
      }
    };
    if_block(node_6, ($$render) => {
      if (get(maxCountVisible)) $$render(consequent_1);
    });
  }
  reset(div_4);
  var node_7 = sibling(div_4, 2);
  EditorField(node_7, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
    key: "minDuration",
    label: "minimum_duration",
    get value() {
      return get(form).minDuration;
    },
    update: (value) => (get(form).minDuration = value),
    options: { placeholder: "5m" },
  });
  var node_8 = sibling(node_7, 2);
  EditorField(node_8, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
    key: "maxDuration",
    label: "maximum_duration",
    get value() {
      return get(form).maxDuration;
    },
    update: (value) => (get(form).maxDuration = value),
    options: { placeholder: "15m" },
  });
  reset(div_2);
  var p_1 = sibling(div_2, 2);
  var text_5 = only_child(p_1, true);
  var p_2 = sibling(p_1, 2);
  var text_6 = only_child(p_2, true);
  var div_5 = sibling(p_2, 2);
  var node_9 = child(div_5);
  {
    let $0 = user_derived(() => get(context).action("on"));
    ActionEditor(node_9, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get($0);
      },
      heading: "when_event_starts",
      kindLabel: "start_action",
      entityLabel: "start_entities",
    });
  }
  var div_6 = sibling(node_9, 2);
  var node_10 = child(div_6);
  {
    let $0 = user_derived(() => get(context).action("off"));
    ActionEditor(node_10, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get($0);
      },
      heading: "when_event_ends",
      kindLabel: "end_action",
      entityLabel: "end_entities",
      get hideEntities() {
        return get(form).sameEntities;
      },
    });
  }
  var node_11 = sibling(node_10, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var label = root_121();
      var input = child(label);
      remove_input_defaults(input);
      var text_7 = sibling(input, 1, true);
      reset(label);
      template_effect(
        ($0) => {
          set_checked(input, get(form).sameEntities);
          set_text(text_7, $0);
        },
        [() => get(t)("use_the_same_entities")],
      );
      delegated("change", input, (event2) => {
        get(form).sameEntities = event2.currentTarget.checked;
        get(changed)("sameEntities");
      });
      append($$anchor2, label);
    };
    var d = user_derived(
      () =>
        ["entities", "cover"].includes(get(form).on.kind) &&
        get(form).on.kind === get(form).off.kind,
    );
    if_block(node_11, ($$render) => {
      if (get(d)) $$render(consequent_2);
    });
  }
  reset(div_6);
  reset(div_5);
  var div_7 = sibling(div_5, 2);
  var button_3 = child(div_7);
  var text_8 = only_child(button_3, true);
  var node_12 = sibling(button_3, 2);
  RandomActions(node_12, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
    get advancedOpen() {
      return get(advancedOpen);
    },
    set advancedOpen($$value) {
      set2(advancedOpen, $$value, true);
    },
    get advancedTrigger() {
      return get(advancedTrigger);
    },
    set advancedTrigger($$value) {
      set2(advancedTrigger, $$value, true);
    },
  });
  var button_4 = sibling(node_12, 2);
  var text_9 = only_child(button_4, true);
  reset(div_7);
  reset(section);
  template_effect(
    ($0, $1, $2, $3, $4, $5, $6) => {
      set_text(text2, $0);
      classes = set_class(
        button,
        1,
        "random-advanced-button svelte-1n39iyr",
        null,
        classes,
        { error: !!get(editor).errors.days },
      );
      set_attribute2(button, "aria-expanded", get(advancedOpen));
      set_attribute2(
        button,
        "aria-describedby",
        get(editor).errors.days ? "step-error-days" : void 0,
      );
      button.disabled = $$props.panel.busy;
      set_text(text_1, $1);
      set_text(text_2, $2);
      set_text(text_5, $3);
      set_text(text_6, $4);
      button_3.disabled = $$props.panel.busy;
      set_text(text_8, $5);
      button_4.disabled = $$props.panel.busy || $$props.panel.stale;
      set_text(text_9, $6);
    },
    [
      () => get(t)("random_create_hint"),
      () => get(t)("advanced_settings"),
      () => get(t)("frequency_and_duration"),
      () =>
        randomExplanation(
          get(form),
          $$props.panel.draft,
          $$props.panel.catalog,
          get(t),
          $$props.panel._hass.locale,
        ),
      () => get(t)("duration_hint"),
      () => get(t)("cancel"),
      () =>
        get(t)(
          $$props.panel.document?.source === "file"
            ? "add_to_draft"
            : "save_random_event",
        ),
    ],
  );
  delegated("click", button, (event2) => {
    set2(advancedTrigger, event2.currentTarget, true);
    set2(advancedOpen, true);
  });
  delegated("click", button_3, function (...$$args) {
    get(cancel)?.apply(this, $$args);
  });
  delegated("click", button_4, save2);
  append($$anchor, section);
  pop();
}
delegate(["click", "change"]);

// custom_components/occupied/frontend/src/lib/components/random/RandomView.svelte
var root26 = from_html(
  `<section class="step-empty"><h2> </h2> <p class="hint"> </p> <button type="button" class="primary" data-create-random=""> </button></section>`,
);
var root_124 = from_html(`<span class="step-status-badge"> </span>`);
var root_217 = from_html(`<span class="step-row-time"> </span>`);
var root_313 = from_html(
  `<div style="--depth:0"><div class="step-card-header"><!> <button type="button"><span class="step-row-content"><span class="step-row-heading"><strong> </strong><!></span> <span class="hint"> </span></span> <!></button></div> <div><!></div></div>`,
);
var root_49 = from_html(
  `<button type="button" class="primary" data-create-random=""> </button>`,
);
var root_58 = from_html(`<!> <!>`, 1);
function RandomView($$anchor, $$props) {
  push($$props, true);
  let data = user_derived(() => {
    void $$props.revision;
    return {
      t: $$props.panel.t,
      entries: chronologicalEntries(
        randomEntries($$props.panel.draft, $$props.panel.catalog),
        $$props.panel.draft,
        "random",
        $$props.panel._hass,
      ),
      steps: [
        ...stepEntries(
          $$props.panel.draft,
          $$props.panel.catalog,
          $$props.panel.t,
        ),
        ...randomEntries($$props.panel.draft, $$props.panel.catalog).map(
          (entry) => ({ id: `random:${entry.id}`, name: entry.name }),
        ),
      ],
    };
  });
  let t = user_derived(() => get(data).t),
    entries = user_derived(() => get(data).entries),
    steps = user_derived(() => get(data).steps);
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      var section = root26();
      var h2 = child(section);
      var text2 = only_child(h2, true);
      var p = sibling(h2, 2);
      var text_1 = only_child(p, true);
      var button = sibling(p, 2);
      var text_2 = only_child(button, true);
      reset(section);
      template_effect(
        ($0, $1, $2) => {
          set_text(text2, $0);
          set_text(text_1, $1);
          button.disabled = $$props.panel.busy;
          set_text(text_2, $2);
        },
        [
          () => get(t)("random_activity"),
          () => get(t)("random_activity_hint"),
          () => get(t)("create_your_first_random_event"),
        ],
      );
      delegated("click", button, () => openRandom($$props.panel));
      append($$anchor2, section);
    };
    var alternate = ($$anchor2) => {
      var fragment_1 = root_58();
      var node_1 = first_child(fragment_1);
      {
        let $0 = user_derived(() => get(t)("random_activity"));
        let $1 = user_derived(() => get(t)("random_activity_hint"));
        ActivityIntro(node_1, {
          get title() {
            return get($0);
          },
          get description() {
            return get($1);
          },
        });
      }
      var node_2 = sibling(node_1, 2);
      {
        const children = ($$anchor3, entry = noop, dragHandle = noop) => {
          const editing = user_derived(
            () =>
              $$props.panel.randomEditor?.existing &&
              $$props.panel.randomEditor.id === entry().id,
          );
          const disabled = user_derived(
            () =>
              (get(editing)
                ? $$props.panel.randomEditor?.form.enabled
                : entry().enabled) === false,
          );
          var div = root_313();
          let classes;
          var div_1 = child(div);
          var node_3 = child(div_1);
          snippet(node_3, dragHandle);
          var button_1 = sibling(node_3, 2);
          let classes_1;
          var span = child(button_1);
          var span_1 = child(span);
          var strong = child(span_1);
          var text_3 = only_child(strong, true);
          var node_4 = sibling(strong);
          {
            var consequent_1 = ($$anchor4) => {
              var span_2 = root_124();
              var text_4 = only_child(span_2, true);
              template_effect(
                ($02) => set_text(text_4, $02),
                [() => get(t)("disabled")],
              );
              append($$anchor4, span_2);
            };
            if_block(node_4, ($$render) => {
              if (get(disabled)) $$render(consequent_1);
            });
          }
          reset(span_1);
          var span_3 = sibling(span_1, 2);
          var text_5 = only_child(span_3);
          reset(span);
          var node_5 = sibling(span, 2);
          {
            var consequent_2 = ($$anchor4) => {
              var span_4 = root_217();
              var text_6 = only_child(span_4);
              template_effect(
                ($02, $12) =>
                  set_text(text_6, `${$02 ?? ""} \u2192 ${$12 ?? ""}`),
                [
                  () =>
                    timingSummary(
                      { timing: entry().start },
                      get(steps),
                      get(t),
                      $$props.panel.catalog.time_sources,
                      $$props.panel._hass.locale,
                    ),
                  () =>
                    timingExplanation(
                      timingForm(entry().end),
                      get(steps),
                      get(t),
                      $$props.panel.catalog.time_sources,
                      {
                        subject: "window_ends",
                        includeHints: false,
                        locale: $$props.panel._hass.locale,
                      },
                    ),
                ],
              );
              append($$anchor4, span_4);
            };
            if_block(node_5, ($$render) => {
              if (!get(editing)) $$render(consequent_2);
            });
          }
          reset(button_1);
          reset(div_1);
          var div_2 = sibling(div_1, 2);
          var node_6 = child(div_2);
          {
            var consequent_3 = ($$anchor4) => {
              RandomEventEditor($$anchor4, {
                get panel() {
                  return $$props.panel;
                },
                get revision() {
                  return $$props.revision;
                },
              });
            };
            if_block(node_6, ($$render) => {
              if (get(editing)) $$render(consequent_3);
            });
          }
          reset(div_2);
          reset(div);
          template_effect(
            ($02, $12, $2, $3) => {
              classes = set_class(div, 1, "step-card", null, classes, {
                "step-disabled": get(disabled),
              });
              set_attribute2(div, "data-random-id", entry().id);
              set_attribute2(button_1, "id", `random-card-${entry().id}`);
              classes_1 = set_class(button_1, 1, "step-row", null, classes_1, {
                editing: get(editing),
              });
              set_attribute2(button_1, "aria-label", $02);
              set_attribute2(button_1, "aria-expanded", get(editing));
              set_attribute2(
                button_1,
                "aria-controls",
                `random-editor-${entry().id}`,
              );
              button_1.disabled = $$props.panel.busy;
              set_text(text_3, entry().name);
              set_text(
                text_5,
                `${$12 ?? ""}
                ${$2 ?? ""} \xB7 ${(entry().min_duration || "5m") ?? ""}\u2013${(entry().max_duration || "15m") ?? ""} \xB7 ${$3 ?? ""}`,
              );
              set_attribute2(div_2, "id", `random-editor-${entry().id}`);
            },
            [
              () =>
                get(disabled)
                  ? `${entry().name} \xB7 ${get(t)("disabled")}`
                  : entry().name,
              () => countSummary(entry().count),
              () => get(t)("times_per_window"),
              () =>
                entitySummary(
                  $$props.panel.catalog,
                  actionTargets(entry().on),
                  get(t),
                ),
            ],
          );
          delegated("click", button_1, () =>
            openRandom($$props.panel, entry()),
          );
          append($$anchor3, div);
        };
        const createAction = ($$anchor3) => {
          var button_2 = root_49();
          var text_7 = only_child(button_2, true);
          template_effect(
            ($02) => {
              button_2.disabled = $$props.panel.busy;
              set_text(text_7, $02);
            },
            [() => get(t)("create_random_event")],
          );
          delegated("click", button_2, () => openRandom($$props.panel));
          append($$anchor3, button_2);
        };
        let $0 = user_derived(
          () => `occupied:activity-order:${$$props.panel.selectedEntry}:random`,
        );
        let $1 = user_derived(() => get(t)("random_events"));
        ActivityList(node_2, {
          get entries() {
            return get(entries);
          },
          get storageKey() {
            return get($0);
          },
          get label() {
            return get($1);
          },
          get disabled() {
            return $$props.panel.busy;
          },
          get t() {
            return get(t);
          },
          children,
          createAction,
          $$slots: { default: true, createAction: true },
        });
      }
      append($$anchor2, fragment_1);
    };
    if_block(node, ($$render) => {
      if (get(entries).length === 0) $$render(consequent);
      else $$render(alternate, -1);
    });
  }
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/src/App.svelte
var root27 = from_html(`<button type="button"> </button>`);
var root_125 = from_html(`<div id="toolbar" class="toolbar"><!></div>`);
var root_218 = from_html(`<p> </p>`);
var root_314 = from_html(`<header><p class="hint"> </p></header>`);
var root_410 = from_html(`<p class="banner" role="status"> </p>`);
var root_59 = from_html(`<button type="button" class="text-button"> </button>`);
var root_68 = from_html(`<p class="error"> </p> <p class="error"> </p>`, 1);
var root_76 = from_html(`<p> </p> <button type="button"> </button>`, 1);
var root_85 = from_html(
  `<ha-top-app-bar-fixed><div slot="title">Occupied</div> <main><!> <!> <!> <div id="notice" class="banner" role="status"> </div> <div id="error" class="error" role="alert"> </div> <nav></nav> <div id="secondary-nav"><!></div> <div id="issues"></div> <div id="view"><!></div></main></ha-top-app-bar-fixed> <!>`,
  3,
);
function App($$anchor, $$props) {
  push($$props, true);
  const $updates = () => store_get($$props.updates, "$updates", $$stores);
  const [$$stores, $$cleanup] = setup_stores();
  const toolbar = ($$anchor2) => {
    var div = root_125();
    var node = child(div);
    {
      var consequent = ($$anchor3) => {
        var button = root27();
        var text_1 = only_child(button, true);
        template_effect(
          ($0) => {
            button.disabled = get(panel).busy;
            set_text(text_1, $0);
          },
          [() => get(t)("reload_saved_program")],
        );
        delegated("click", button, () => get(panel).reloadSaved(true));
        append($$anchor3, button);
      };
      if_block(node, ($$render) => {
        if (get(panel).stale) $$render(consequent);
      });
    }
    reset(div);
    template_effect(() =>
      set_attribute2(
        div,
        "hidden",
        !get(panel).selectedInstance?.loaded || !get(panel).stale,
      ),
    );
    append($$anchor2, div);
  };
  const renderIssue = ($$anchor2, item = noop, primary2 = noop) => {
    const className = user_derived(() =>
      item().severity === "warning" ? "hint" : "error",
    );
    const text2 = user_derived(() =>
      primary2()
        ? item().message
        : `${item().severity || "error"} \xB7 ${item().path || "$"}: ${item().message}`,
    );
    var fragment = comment();
    var node_1 = first_child(fragment);
    {
      var consequent_1 = ($$anchor3) => {
        var button_1 = root27();
        var text_2 = only_child(button_1, true);
        template_effect(() => {
          set_class(button_1, 1, clsx2(get(className)));
          set_text(text_2, get(text2));
        });
        delegated("click", button_1, () => get(panel).focusIssue(item()));
        append($$anchor3, button_1);
      };
      var alternate = ($$anchor3) => {
        var p = root_218();
        var text_3 = only_child(p, true);
        template_effect(() => {
          set_class(p, 1, clsx2(get(className)));
          set_text(text_3, get(text2));
        });
        append($$anchor3, p);
      };
      if_block(node_1, ($$render) => {
        if (get(panel).activeEditor && item().severity !== "warning")
          $$render(consequent_1);
        else $$render(alternate, -1);
      });
    }
    append($$anchor2, fragment);
  };
  const methods = {};
  let panel = user_derived(() => {
    void $updates();
    return new Proxy($$props.panel, {
      get(target, key2) {
        const value = Reflect.get(target, key2, target);
        if (typeof value === "function") {
          const previous = methods[key2];
          if (previous?.target === target && previous.value === value) {
            return previous.bound;
          }
          const bound = value.bind(target);
          methods[key2] = { target, value, bound };
          return bound;
        }
        return value;
      },
    });
  });
  let revision = user_derived($updates);
  let state2 = user_derived(() => {
    void get(revision);
    const showingSteps =
      get(panel).tab === "steps" &&
      get(panel).draft &&
      get(panel).selectedInstance?.loaded &&
      !get(panel)._loading &&
      (!get(panel).stepEditor || get(panel).stepEditor.existing);
    const entries = showingSteps ? stepEntries(get(panel).draft) : [];
    return {
      t: get(panel).t,
      notices: get(panel).notices(),
      primary: primaryTabs.some(([id]) => id === get(panel).tab),
      issues: get(panel)
        .visibleIssues()
        .filter((issue) => !warningStepId(issue, entries)),
    };
  });
  let t = user_derived(() => get(state2).t),
    notices = user_derived(() => get(state2).notices),
    primary = user_derived(() => get(state2).primary),
    issues = user_derived(() => get(state2).issues);
  const primaryTabs = [
    ["steps", "steps"],
    ["random", "random"],
    ["preview", "preview"],
    ["settings", "settings"],
  ];
  var fragment_1 = root_85();
  var ha_top_app_bar_fixed = first_child(fragment_1);
  set_custom_element_data(ha_top_app_bar_fixed, "back-button", true);
  template_effect(
    ($0) => set_custom_element_data(ha_top_app_bar_fixed, "narrow", $0),
    [() => get(panel).hasAttribute("narrow")],
  );
  var main = sibling(child(ha_top_app_bar_fixed), 2);
  var node_2 = child(main);
  {
    var consequent_2 = ($$anchor2) => {
      var header = root_314();
      var p_1 = child(header);
      var text_4 = only_child(p_1, true);
      reset(header);
      template_effect(
        ($0) => set_text(text_4, $0),
        [() => get(t)("managed_file")],
      );
      append($$anchor2, header);
    };
    if_block(node_2, ($$render) => {
      if (get(panel).selectedInstance?.source === "file")
        $$render(consequent_2);
    });
  }
  var node_3 = sibling(node_2, 2);
  each(
    node_3,
    17,
    () => get(panel).selectedInstance?.overlaps || [],
    (overlap) => overlap.config_entry_id,
    ($$anchor2, overlap) => {
      var p_2 = root_410();
      var text_5 = only_child(p_2);
      template_effect(
        ($0, $1, $2) =>
          set_text(
            text_5,
            `${$0 ?? ""}
        ${get(overlap).name ?? ""}: ${$1 ?? ""}. ${$2 ?? ""}`,
          ),
        [
          () => get(t)("shared_devices_with"),
          () => get(overlap).entities.join(", "),
          () => get(t)("instance_overlap_hint"),
        ],
      );
      append($$anchor2, p_2);
    },
  );
  var node_4 = sibling(node_3, 2);
  toolbar(node_4);
  var div_1 = sibling(node_4, 2);
  var text_6 = only_child(div_1, true);
  var div_2 = sibling(div_1, 2);
  var text_7 = only_child(div_2, true);
  var nav = sibling(div_2, 2);
  each(
    nav,
    21,
    () => primaryTabs,
    ([id, label]) => id,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array(get($$item), 2));
      let id = () => get($$array)[0];
      let label = () => get($$array)[1];
      var button_2 = root27();
      var text_8 = only_child(button_2, true);
      template_effect(
        ($0) => {
          set_attribute2(button_2, "data-tab", id());
          set_attribute2(
            button_2,
            "aria-current",
            get(panel).tab === id() ? "page" : "false",
          );
          button_2.disabled = !get(panel).selectedInstance?.loaded;
          set_text(text_8, $0);
        },
        [() => get(t)(label())],
      );
      delegated("click", button_2, () => get(panel).navigate(id()));
      append($$anchor2, button_2);
    },
  );
  reset(nav);
  var div_3 = sibling(nav, 2);
  var node_5 = child(div_3);
  {
    var consequent_3 = ($$anchor2) => {
      var button_3 = root_59();
      var text_9 = only_child(button_3, true);
      template_effect(
        ($0) => set_text(text_9, $0),
        [() => get(t)("back_to_steps")],
      );
      delegated("click", button_3, () => get(panel).navigate("steps"));
      append($$anchor2, button_3);
    };
    if_block(node_5, ($$render) => {
      if (!get(primary)) $$render(consequent_3);
    });
  }
  reset(div_3);
  var div_4 = sibling(div_3, 2);
  each(
    div_4,
    20,
    () => get(issues),
    (issue) => issue,
    ($$anchor2, issue) => {
      renderIssue(
        $$anchor2,
        () => issue,
        () => get(primary),
      );
    },
  );
  reset(div_4);
  var div_5 = sibling(div_4, 2);
  var node_6 = child(div_5);
  key(
    node_6,
    () => `${get(panel).selectedEntry}:${get(panel).tab}`,
    ($$anchor2) => {
      var fragment_3 = comment();
      var node_7 = first_child(fragment_3);
      {
        const failed = ($$anchor3, error = noop) => {
          var fragment_4 = root_68();
          var p_3 = first_child(fragment_4);
          var text_10 = only_child(p_3, true);
          var p_4 = sibling(p_3, 2);
          var text_11 = only_child(p_4, true);
          template_effect(
            ($0, $1) => {
              set_text(text_10, $0);
              set_text(text_11, $1);
            },
            [
              () => get(t)(errorMessage(error())),
              () => get(t)("draft_invalid_hint"),
            ],
          );
          append($$anchor3, fragment_4);
        };
        boundary(node_7, { failed }, ($$anchor3) => {
          var fragment_5 = comment();
          var node_8 = first_child(fragment_5);
          {
            var consequent_4 = ($$anchor4) => {
              var fragment_6 = root_76();
              var p_5 = first_child(fragment_6);
              var text_12 = only_child(p_5, true);
              var button_4 = sibling(p_5, 2);
              var text_13 = only_child(button_4, true);
              template_effect(
                ($0, $1) => {
                  set_text(text_12, $0);
                  set_text(text_13, $1);
                },
                [
                  () => get(t)("instance_unavailable_hint"),
                  () => get(t)("retry"),
                ],
              );
              delegated("click", button_4, () => get(panel).retry());
              append($$anchor4, fragment_6);
            };
            var consequent_6 = ($$anchor4) => {
              var fragment_7 = comment();
              var node_9 = first_child(fragment_7);
              {
                var consequent_5 = ($$anchor5) => {
                  var button_5 = root27();
                  var text_14 = only_child(button_5, true);
                  template_effect(
                    ($0) => set_text(text_14, $0),
                    [() => get(t)("retry")],
                  );
                  delegated("click", button_5, () => get(panel).retry());
                  append($$anchor5, button_5);
                };
                if_block(node_9, ($$render) => {
                  if (get(panel).error && !get(panel)._loading)
                    $$render(consequent_5);
                });
              }
              append($$anchor4, fragment_7);
            };
            var consequent_7 = ($$anchor4) => {
              StepEditor($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_8 = ($$anchor4) => {
              RandomEventEditor($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_9 = ($$anchor4) => {
              StepsView($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_10 = ($$anchor4) => {
              RandomView($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_11 = ($$anchor4) => {
              SettingsView($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_12 = ($$anchor4) => {
              PreviewView($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            if_block(node_8, ($$render) => {
              if (
                get(panel).selectedEntry &&
                !get(panel).selectedInstance?.loaded
              )
                $$render(consequent_4);
              else if (get(panel)._loading || !get(panel).draft)
                $$render(consequent_6, 1);
              else if (get(panel).stepEditor && !get(panel).stepEditor.existing)
                $$render(consequent_7, 2);
              else if (
                get(panel).randomEditor &&
                !get(panel).randomEditor.existing
              )
                $$render(consequent_8, 3);
              else if (get(panel).tab === "steps") $$render(consequent_9, 4);
              else if (get(panel).tab === "random") $$render(consequent_10, 5);
              else if (get(panel).tab === "settings")
                $$render(consequent_11, 6);
              else if (get(panel).tab === "preview") $$render(consequent_12, 7);
            });
          }
          append($$anchor3, fragment_5);
        });
      }
      append($$anchor2, fragment_3);
    },
  );
  reset(div_5);
  reset(main);
  reset(ha_top_app_bar_fixed);
  var node_10 = sibling(ha_top_app_bar_fixed, 2);
  {
    var consequent_13 = ($$anchor2) => {
      UnsavedStepDialog($$anchor2, {
        get panel() {
          return get(panel);
        },
      });
    };
    if_block(node_10, ($$render) => {
      if (get(panel).pendingStepExit) $$render(consequent_13);
    });
  }
  template_effect(
    ($0) => {
      set_attribute2(div_1, "hidden", !get(notices));
      set_text(text_6, get(notices));
      set_attribute2(div_2, "hidden", !get(panel).error);
      set_text(text_7, get(panel).error);
      set_attribute2(nav, "aria-label", $0);
    },
    [() => get(t)("occupied")],
  );
  append($$anchor, fragment_1);
  pop();
  $$cleanup();
}
delegate(["click"]);

// custom_components/occupied/frontend/src/lib/controllers/preview-controller.ts
var PreviewController = class {
  constructor(panel, getEntryId) {
    this.panel = panel;
    this.getEntryId = getEntryId;
  }
  panel;
  getEntryId;
  recoveryEpoch = 0;
  connection;
  invalidate() {
    this.panel.liveReady = false;
    this.recoveryEpoch++;
  }
  connect(connection) {
    this.connection = connection;
    connection.addEventListener?.("ready", this.connected);
    connection.addEventListener?.("disconnected", this.disconnected);
  }
  disconnect() {
    this.connection?.removeEventListener?.("ready", this.connected);
    this.connection?.removeEventListener?.("disconnected", this.disconnected);
    this.connection = void 0;
    this.invalidate();
  }
  movePreviewDay(days2) {
    return this.selectPreviewDate(
      shiftScheduleDate(
        this.panel.previewDate || this.panel.document.simulation_date,
        days2,
      ),
    );
  }
  selectPreviewDate(date) {
    if (
      this.panel.busy ||
      this.panel.liveBusy ||
      this.panel.liveRunning ||
      this.panel.tab !== "preview" ||
      date === this.panel.previewDate
    ) {
      return;
    }
    this.panel.previewDate = date;
    this.panel.liveVisible = false;
    return this.loadPreview();
  }
  loadPreview() {
    if (
      this.panel.busy ||
      !this.panel.draft ||
      !this.panel.document ||
      this.panel.liveRunning ||
      (this.panel.liveVisible && this.panel.livePlan)
    ) {
      return;
    }
    const version = this.panel.version,
      draft = copy(this.panel.draft),
      date = this.panel.previewDate || this.panel.document.simulation_date;
    this.panel.previewDate = date;
    return this.panel.run(async (epoch) => {
      const result = await this.panel.ws("preview", {
        program: draft,
        date,
        days: 1,
        seed: "preview-1",
      });
      if (
        epoch !== this.panel.epoch ||
        version !== this.panel.version ||
        date !== this.panel.previewDate
      ) {
        return;
      }
      this.panel.preview = result;
      this.panel.previewProgram = draft;
      this.panel.showIssues(result);
    });
  }
  disconnected = () => {
    this.invalidate();
    this.panel.flush();
  };
  connected = () => void this.recoverLivePreview();
  visibilityChanged = () => {
    if (document.visibilityState === "visible") {
      void this.recoverLivePreview();
    } else {
      this.disconnected();
    }
  };
  adoptLive(result) {
    this.panel.liveSession = mergeLiveSession(
      this.panel.liveSession,
      result.session,
    );
    if (this.panel.liveSession && result.call_outcomes) {
      this.panel.liveSession.outcomes = {
        ...this.panel.liveSession.outcomes,
        ...result.call_outcomes,
      };
    }
    this.panel.liveCanAdvance = result.can_advance;
    this.panel.schedulingPaused =
      this.panel.liveSession?.paused ?? this.panel.schedulingPaused;
    if (result.plan && result.program) {
      this.panel.livePlan = result.plan;
      this.panel.liveProgram = result.program;
      this.panel.liveVisible =
        !!result.session && (this.panel.liveRunning || result.session.paused);
      if (this.panel.liveVisible) {
        this.panel.previewDate = result.session.date;
      }
    }
    this.panel.flush();
  }
  async recoverLivePreview() {
    if (!this.getEntryId() || !this.panel.isConnected) {
      return;
    }
    const epoch = this.panel.epoch,
      recovery = ++this.recoveryEpoch;
    this.panel.liveReady = false;
    this.panel.flush();
    try {
      const result = await this.panel.ws("live_preview/status");
      if (epoch !== this.panel.epoch || recovery !== this.recoveryEpoch) {
        return;
      }
      this.adoptLive(result);
      this.panel.liveReady = true;
    } catch (error) {
      if (epoch === this.panel.epoch && recovery === this.recoveryEpoch) {
        this.panel.fail(error);
      }
    } finally {
      if (epoch === this.panel.epoch && recovery === this.recoveryEpoch) {
        this.panel.flush();
      }
    }
  }
  async startLivePreview() {
    if (
      this.panel.liveBusy ||
      this.panel.liveRunning ||
      !this.panel.liveReady ||
      this.panel.busy
    ) {
      return;
    }
    const frozen = this.panel.liveVisible && this.panel.liveSession;
    const program = frozen ? this.panel.liveProgram : this.panel.previewProgram;
    const fingerprint = frozen
      ? this.panel.liveSession?.plan_fingerprint
      : this.panel.preview?.plan_fingerprint;
    if (!program || !fingerprint) {
      return;
    }
    const epoch = this.panel.epoch;
    this.panel.liveBusy = true;
    this.panel.error = "";
    this.panel.flush();
    try {
      const result = await this.panel.ws("live_preview/start", {
        program: copy(program),
        date: this.panel.previewDate,
        seed: "preview-1",
        expected_plan_fingerprint: fingerprint,
        request_id: crypto.randomUUID(),
      });
      if (epoch === this.panel.epoch) {
        this.adoptLive(result);
      }
    } catch (error) {
      if (epoch === this.panel.epoch) {
        this.panel.fail(error);
        await this.recoverLivePreview();
      }
    } finally {
      if (epoch === this.panel.epoch) {
        this.panel.liveBusy = false;
        this.panel.flush();
      }
    }
  }
  async nextLiveEvent() {
    const session = this.panel.liveSession;
    if (
      !session?.next_group ||
      session.state !== "ready" ||
      !this.panel.liveReady ||
      !this.panel.liveCanAdvance ||
      this.panel.liveBusy ||
      this.panel.liveStopping
    ) {
      return;
    }
    const epoch = this.panel.epoch;
    this.panel.liveBusy = true;
    this.panel.error = "";
    this.panel.flush();
    try {
      const result = await this.panel.ws("live_preview/next", {
        session_id: session.id,
        expected_group_id: session.next_group.id,
        request_id: crypto.randomUUID(),
      });
      if (
        epoch === this.panel.epoch &&
        this.panel.liveSession?.id === session.id
      ) {
        this.adoptLive(result);
      }
    } catch (error) {
      if (epoch === this.panel.epoch) {
        this.panel.fail(error);
        await this.recoverLivePreview();
      }
    } finally {
      if (epoch === this.panel.epoch) {
        this.panel.liveBusy = false;
        this.panel.flush();
      }
    }
  }
  async stopLivePreview() {
    const session = this.panel.liveSession;
    if (!session || !this.panel.liveRunning || this.panel.liveStopping) {
      return;
    }
    const epoch = this.panel.epoch;
    this.panel.liveStopping = true;
    this.panel.flush();
    try {
      const result = await this.panel.ws("live_preview/stop", {
        session_id: session.id,
      });
      if (
        epoch === this.panel.epoch &&
        this.panel.liveSession?.id === session.id
      ) {
        this.adoptLive(result);
      }
    } catch (error) {
      if (epoch === this.panel.epoch) {
        this.panel.fail(error);
        await this.recoverLivePreview();
      }
    } finally {
      if (epoch === this.panel.epoch) {
        this.panel.liveStopping = false;
        this.panel.flush();
      }
    }
  }
  resumeScheduling() {
    return this.panel.run(async (epoch) => {
      await this.panel._hass.callWS({
        type: "call_service",
        domain: "occupied",
        service: "resume",
        service_data: { config_entry_id: this.getEntryId() },
      });
      if (epoch === this.panel.epoch) {
        await this.recoverLivePreview();
      }
    });
  }
  refreshPreviewSchedule() {
    if (this.panel.liveRunning || this.panel.liveBusy) {
      return;
    }
    this.panel.liveVisible = false;
    return this.loadPreview();
  }
};

// custom_components/occupied/frontend/src/lib/services/subscription.ts
var PanelSubscription = class {
  constructor(isConnected, onError) {
    this.isConnected = isConnected;
    this.onError = onError;
  }
  isConnected;
  onError;
  epoch = 0;
  pending = false;
  unsubscribe = null;
  get active() {
    return this.pending || this.unsubscribe !== null;
  }
  dispose() {
    this.epoch++;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.pending = false;
  }
  async subscribe(connection, message, onValue, onSubscribed) {
    if (this.active || !this.isConnected()) {
      return;
    }
    this.pending = true;
    const epoch = this.epoch;
    const isCurrent = () => epoch === this.epoch && this.isConnected();
    try {
      const unsubscribe = await connection.subscribeMessage((value) => {
        if (isCurrent()) {
          onValue(value);
        }
      }, message);
      if (isCurrent()) {
        this.unsubscribe = unsubscribe;
        await onSubscribed?.();
      } else {
        unsubscribe();
      }
    } catch (error) {
      if (epoch === this.epoch) {
        this.onError(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this.pending = false;
      }
    }
  }
};

// custom_components/occupied/frontend/src/occupied-panel.ts
var OccupiedPanel = class extends HTMLElement {
  draft;
  saved;
  document;
  catalog = { entities: [], services: {} };
  revision = "";
  stale = false;
  dirty = false;
  // Draft edits bump version; validatedVersion records the last valid one.
  version = 0;
  validatedVersion = -1;
  issues = [];
  error = "";
  busy = false;
  // Incremented on reload/disconnect so late responses are discarded.
  epoch = 0;
  // View state
  tab = "steps";
  t = translator("en");
  stepEditor = null;
  randomEditor = null;
  get activeEditor() {
    return this.stepEditor || this.randomEditor;
  }
  get hasEditorChanges() {
    return this.stepEditor
      ? hasStepChanges(this.stepEditor)
      : this.hasRunConditionChanges ||
          (!!this.randomEditor && hasRandomChanges(this.randomEditor));
  }
  pendingStepExit = null;
  selectedStep = null;
  preview;
  previewProgram;
  previewDate = "";
  liveSession = null;
  livePlan;
  liveProgram;
  liveVisible = false;
  liveReady = false;
  liveBusy = false;
  liveStopping = false;
  liveCanAdvance = false;
  schedulingPaused = false;
  runtimeSnapshot = {};
  runConditionForm = null;
  runConditionOriginal = null;
  runConditionErrors = {};
  get hasRunConditionChanges() {
    return (
      JSON.stringify(this.runConditionForm) !==
      JSON.stringify(this.runConditionOriginal)
    );
  }
  openRunCondition() {
    this.runConditionForm = runConditionForm(this.draft.run_condition);
    this.runConditionOriginal = copy(this.runConditionForm);
    this.runConditionErrors = {};
    this.flush();
  }
  updateRunCondition() {
    if (this.runConditionForm) {
      this.runConditionForm = {
        ...this.runConditionForm,
        states: [...this.runConditionForm.states],
      };
    }
    this.version++;
    this.runConditionErrors = {};
    this.flush();
  }
  async saveRunCondition() {
    if (!this.runConditionForm || this.yamlDirty || this.busy) {
      return;
    }
    this.runConditionErrors = runConditionErrors(this.runConditionForm);
    if (Object.keys(this.runConditionErrors).length > 0) {
      this.flush();
      return;
    }
    const candidate = copy(this.draft);
    const config = runConditionValue(this.runConditionForm);
    if (config) {
      candidate.run_condition = config;
    } else {
      delete candidate.run_condition;
    }
    if (this.document.source === "file") {
      this.change([], candidate);
      this.openRunCondition();
      await this.exportYaml();
      return;
    }
    await this.save(candidate);
    if (
      this.dirty ||
      this.error ||
      this.issues.some((issue) => issue.severity === "error")
    ) {
      return;
    }
    this.openRunCondition();
    await this.exportYaml();
  }
  get liveRunning() {
    return liveRunning(this.liveSession);
  }
  yaml = "";
  yamlSaved = "";
  yamlRevision = "";
  get yamlDirty() {
    return this.yaml !== this.yamlSaved;
  }
  _hass;
  _loading = false;
  instances = [];
  selectedEntry = null;
  _instancesReady = false;
  _instancesFailed = false;
  _instancesRequest;
  _instancesEpoch = 0;
  _panel;
  _loadedEntry = null;
  _failedEntry = null;
  updates = writable(0);
  updateRevision = 0;
  component;
  instanceSubscription = new PanelSubscription(
    () => this.isConnected,
    (error) => this.fail(error),
  );
  runtimeSubscription = new PanelSubscription(
    () => this.isConnected,
    (error) => this.fail(error),
  );
  previewController = new PreviewController(this, () => this._loadedEntry);
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  set hass(value) {
    const localeChanged =
      this._hass?.locale?.language !== value?.locale?.language ||
      this._hass?.locale?.time_format !== value?.locale?.time_format;
    const changed = this._hass?.connection !== value?.connection;
    const languageChanged = this._hass?.language !== value?.language;
    this._hass = value;
    if (languageChanged) {
      this.t = translator(value?.language);
    }
    for (const selector of this.shadowRoot.querySelectorAll(
      "ha-selector,ha-generic-picker",
    )) {
      selector.hass = value;
    }
    if (localeChanged) {
      this.flush();
    }
    if (changed) {
      this._disposeSubscription();
      this._disposeInstances();
      this._instancesReady = false;
      void this._subscribe();
    }
    void this._load();
  }
  set panel(value) {
    this._panel = value;
    void this._load();
  }
  set narrow(value) {
    const narrow = !!value;
    if (this.hasAttribute("narrow") === narrow) {
      return;
    }
    this.toggleAttribute("narrow", narrow);
    this.flush();
  }
  set route(_value) {
    void this._load();
  }
  get selectedInstance() {
    return this.instances.find(
      (item) => item.config_entry_id === this.selectedEntry,
    );
  }
  connectedCallback() {
    if (!this.component) {
      const style = document.createElement("style");
      style.textContent = app_default;
      this.shadowRoot.append(style);
      this.component = mount(App, {
        target: this.shadowRoot,
        props: { panel: this, updates: this.updates },
      });
      this.flush();
    }
    void this._load();
    window.addEventListener("beforeunload", this._beforeUnload);
    globalThis.addEventListener("location-changed", this._locationChanged);
    globalThis.addEventListener("popstate", this._locationChanged);
    document.addEventListener(
      "visibilitychange",
      this.previewController.visibilityChanged,
    );
  }
  disconnectedCallback() {
    if (this.component) {
      void unmount(this.component);
      this.component = void 0;
    }
    this.shadowRoot.replaceChildren();
    this._invalidateRequests();
    this._loadedEntry = null;
    this._disposeSubscription();
    this._disposeInstances();
    this._instancesReady = false;
    window.removeEventListener("beforeunload", this._beforeUnload);
    globalThis.removeEventListener("location-changed", this._locationChanged);
    globalThis.removeEventListener("popstate", this._locationChanged);
    document.removeEventListener(
      "visibilitychange",
      this.previewController.visibilityChanged,
    );
  }
  _locationChanged = () => void this._load();
  _beforeUnload = (event2) => {
    if (!(this.dirty || this.yamlDirty || this.hasEditorChanges)) {
      return;
    }
    event2.preventDefault();
    event2.returnValue = "";
  };
  _disposeInstances() {
    this._instancesEpoch++;
    this._instancesRequest = void 0;
    this._instancesFailed = false;
    this._failedEntry = null;
    this.instanceSubscription.dispose();
  }
  _subscribeInstances() {
    return this.instanceSubscription.subscribe(
      this._hass.connection,
      { type: "occupied/instances_subscribe" },
      (instances) => {
        this.instances = instances;
        this.flush();
        if (!this.selectedInstance?.loaded && this._loadedEntry) {
          this._invalidateRequests();
          this._loadedEntry = null;
          this._disposeSubscription();
        }
        void this._load();
      },
    );
  }
  _writeSelection(entry, replace = false) {
    const url = new URL(location.href);
    url.searchParams.set("config_entry", entry);
    history[replace ? "replaceState" : "pushState"](null, "", url);
    globalThis.dispatchEvent(new Event("location-changed"));
  }
  _canSwitchInstance() {
    return (
      !(this.dirty || this.yamlDirty || this.hasEditorChanges) ||
      globalThis.confirm(this.t("instance_switch_confirm"))
    );
  }
  _invalidateRequests() {
    this.epoch++;
    this._loading = this.busy = this.liveBusy = this.liveStopping = false;
  }
  _resetInstance(entry) {
    this._invalidateRequests();
    this._disposeSubscription();
    this._loadedEntry = null;
    this._failedEntry = null;
    this.selectedEntry = entry;
    Object.assign(this, {
      draft: void 0,
      saved: void 0,
      document: void 0,
      catalog: { entities: [], services: {} },
      revision: "",
      stale: false,
      dirty: false,
      version: 0,
      validatedVersion: -1,
      issues: [],
      error: "",
      tab: "steps",
      stepEditor: null,
      randomEditor: null,
      pendingStepExit: null,
      selectedStep: null,
      preview: void 0,
      previewProgram: void 0,
      previewDate: "",
      liveSession: null,
      livePlan: void 0,
      liveProgram: void 0,
      liveVisible: false,
      liveReady: false,
      liveCanAdvance: false,
      schedulingPaused: false,
      runtimeSnapshot: {},
      runConditionForm: null,
      runConditionOriginal: null,
      runConditionErrors: {},
      yaml: "",
      yamlSaved: "",
      yamlRevision: "",
    });
    this.renderView();
  }
  ws(type, data = {}) {
    return this._hass.callWS({
      type: `occupied/${type}`,
      config_entry_id: this._loadedEntry,
      ...data,
    });
  }
  _disposeSubscription() {
    this.previewController.disconnect();
    this.runtimeSubscription.dispose();
  }
  async _subscribe() {
    if (
      !this.isConnected ||
      !this._loadedEntry ||
      !this._hass?.connection ||
      this.runtimeSubscription.active
    ) {
      return;
    }
    this.previewController.connect(this._hass.connection);
    await this.runtimeSubscription.subscribe(
      this._hass.connection,
      { type: "occupied/subscribe", config_entry_id: this._loadedEntry },
      (snapshot2) => this._onSnapshot(snapshot2),
      () => this.recoverLivePreview(),
    );
  }
  _onSnapshot(snapshot2) {
    this.runtimeSnapshot = snapshot2;
    if (snapshot2.loaded === false) {
      this.previewController.invalidate();
    }
    this.schedulingPaused = snapshot2.paused ?? this.schedulingPaused;
    if (snapshot2.live_preview !== void 0) {
      const changedSession =
        this.liveSession?.id !== snapshot2.live_preview?.id;
      this.liveSession = mergeLiveSession(
        this.liveSession,
        snapshot2.live_preview,
      );
      if (changedSession) {
        this.liveReady = false;
        void this.recoverLivePreview();
      }
    }
    if (snapshot2.configuration_source && this.document) {
      this.document.configuration_source = snapshot2.configuration_source;
      this.document.source = snapshot2.configuration_source.mode;
    }
    this.stale = !!(
      snapshot2.source_revision &&
      this.revision &&
      snapshot2.source_revision !== this.revision
    );
    this.flush();
    if (
      this.stale &&
      !this.dirty &&
      !this.busy &&
      !this.activeEditor &&
      !this.hasRunConditionChanges
    ) {
      void this.reloadSaved();
    }
  }
  async _loadInstances() {
    if (this._instancesReady) {
      return true;
    }
    if (this._instancesFailed) {
      return false;
    }
    if (!this._instancesRequest) {
      const epoch = this._instancesEpoch;
      this._instancesRequest = (async () => {
        try {
          const instances = await this._hass.callWS({
            type: "occupied/instances",
          });
          if (epoch !== this._instancesEpoch || !this.isConnected) {
            return false;
          }
          this.instances = instances;
          this._instancesReady = true;
          this.error = "";
          void this._subscribeInstances();
          return true;
        } catch (error) {
          if (epoch === this._instancesEpoch) {
            this._instancesFailed = true;
            this.fail(error);
          }
          return false;
        }
      })();
    }
    const request = this._instancesRequest;
    try {
      return await request;
    } finally {
      if (this._instancesRequest === request) {
        this._instancesRequest = void 0;
      }
    }
  }
  async _load() {
    if (!this.isConnected || !this._hass || !this._panel) {
      return;
    }
    if (!this._instancesReady && !(await this._loadInstances())) {
      return;
    }
    const entry =
      new URLSearchParams(location.search).get("config_entry") ||
      this._panel.config?.config_entry_id ||
      this.selectedEntry ||
      this.instances.find((item) => item.loaded)?.config_entry_id ||
      this.instances[0]?.config_entry_id;
    if (!entry) {
      this.flush();
      return;
    }
    if (entry !== this.selectedEntry) {
      if (this.busy || !this._canSwitchInstance()) {
        if (this.selectedEntry) {
          this._writeSelection(this.selectedEntry, true);
        }
        return;
      }
      this._resetInstance(entry);
    }
    if (
      !this.selectedInstance?.loaded ||
      this._loading ||
      this._failedEntry === entry ||
      this._loadedEntry === entry
    ) {
      return;
    }
    this._loading = true;
    this.flush();
    this._disposeSubscription();
    const epoch = ++this.epoch;
    this._loadedEntry = entry;
    try {
      const [doc, catalog] = await Promise.all([
        this.ws("program"),
        this.ws("catalog"),
        loadHaControls(),
      ]);
      if (epoch !== this.epoch) {
        return;
      }
      if (
        this.draft &&
        (this.dirty ||
          this.yamlDirty ||
          this.activeEditor ||
          this.hasRunConditionChanges)
      ) {
        this.document = doc;
        this.saved = doc.program;
        this.stale = doc.revision !== this.revision;
      } else {
        this.adopt(doc);
        this.resetDraft();
      }
      this.catalog = catalog;
      this._failedEntry = null;
      this.error = "";
      this.renderView();
      void this._subscribe();
    } catch (error) {
      if (epoch === this.epoch) {
        this._loadedEntry = null;
        this._failedEntry = entry;
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this._loading = false;
        this.flush();
      }
    }
  }
  flush() {
    if (this.component) {
      flushSync(() => this.updates.set(++this.updateRevision));
    }
  }
  renderView() {
    if (this.tab === "preview") {
      void this.previewController.loadPreview();
    }
    this.flush();
  }
  navigate(tab) {
    if (this.activeEditor) {
      this.requestStepExit(() => {
        this.navigate(tab);
      });
      return;
    }
    if (this.tab === tab) {
      return;
    }
    if (this.yamlDirty || this.hasRunConditionChanges) {
      if (!globalThis.confirm(this.t("view_switch_confirm"))) {
        return;
      }
      this.yaml = this.yamlSaved;
      this.runConditionForm = null;
      this.runConditionOriginal = null;
      this.runConditionErrors = {};
      this.error = "";
      this.issues = [];
    }
    this.tab = tab;
    if (tab === "preview") {
      void this.recoverLivePreview();
    }
    this.renderView();
  }
  requestStepExit(action2) {
    const editor = this.activeEditor;
    if (!editor) {
      action2();
      return;
    }
    if (this.hasEditorChanges) {
      this.pendingStepExit = action2;
      this.flush();
      return;
    }
    this.finishStepExit(action2);
  }
  cancelStepExit() {
    this.pendingStepExit = null;
    this.flush();
  }
  confirmStepExit() {
    const action2 = this.pendingStepExit;
    if (action2) {
      this.finishStepExit(action2);
    }
  }
  finishStepExit(action2) {
    this.pendingStepExit = null;
    this.stepEditor = null;
    this.randomEditor = null;
    this.selectedStep = null;
    this.error = "";
    this.issues = [];
    this.version++;
    action2();
    this.renderView();
  }
  retry() {
    this._failedEntry = null;
    this._instancesFailed = false;
    this._instancesReady = false;
    void this._load();
  }
  notices() {
    const t = this.t;
    const programNotice = this.stale ? t("draft_revision_conflict_hint") : "";
    return [
      programNotice,
      this.document?.recovery_yaml == null
        ? ""
        : t("stored_program_invalid_hint"),
      this.document?.source === "file" ? t("managed_file_export_hint") : "",
      this.document?.source === "file" &&
      this.document.configuration_source?.status === "error"
        ? t("managed_file_error")
        : "",
    ]
      .filter(Boolean)
      .join(" \xB7 ");
  }
  adopt(doc) {
    this.preview = void 0;
    this.previewProgram = void 0;
    this.document = doc;
    this.saved = doc.program;
    this.revision = doc.revision;
    this.yamlRevision ||= doc.revision;
    this.stale = false;
  }
  resetDraft() {
    this.draft = copy(this.saved);
    this.runConditionForm = null;
    this.runConditionOriginal = null;
    this.runConditionErrors = {};
    this.dirty = false;
    this.version++;
    this.validatedVersion = -1;
    this.issues = [];
  }
  discardEdits(render = true) {
    this.resetDraft();
    this.yaml = this.yamlSaved;
    this.error = "";
    if (render) {
      this.renderView();
    }
  }
  discardYaml() {
    this.yaml = this.yamlSaved;
    this.error = "";
    this.issues = [];
    this.flush();
  }
  change(path, value, rerender = false) {
    if (path.length === 0) {
      this.draft = value;
    } else {
      set(this.draft, path, value);
    }
    this.edited(rerender);
  }
  edited(rerender = false) {
    this.version++;
    this.dirty = true;
    this.validatedVersion = -1;
    if (rerender) {
      this.renderView();
    } else {
      this.flush();
    }
  }
  fail(error) {
    this.error = this.t(errorMessage(error));
    this.flush();
  }
  attempt(action2) {
    try {
      action2();
    } catch (error) {
      this.fail(error);
    }
  }
  async run(action2) {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    this.flush();
    const epoch = this.epoch;
    try {
      return await action2(epoch);
    } catch (error) {
      if (epoch === this.epoch) {
        if (isRevisionConflict(error)) {
          this.stale = true;
        }
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this.busy = false;
        this.flush();
      }
    }
  }
  showIssues(result) {
    this.issues = result.issues || [];
    this.flush();
    if (result.valid === false && this.issues.length === 0) {
      this.fail(this.t("preview_infeasible_error"));
    }
  }
  visibleIssues() {
    const issues = /* @__PURE__ */ new Map();
    for (const issue of [...(this.document?.warnings || []), ...this.issues]) {
      const key2 = JSON.stringify([
        issue.severity,
        issue.code,
        issue.model_path || issue.path || "$",
        issue.message,
      ]);
      issues.set(key2, issue);
    }
    return [...issues.values()];
  }
  focusIssue(issue) {
    const editor = this.activeEditor;
    if (!editor) {
      return;
    }
    const path = issue.model_path || [],
      prefix = editor.candidatePath || [];
    if (prefix.length === 0 || prefix.some((key2, i) => path[i] !== key2)) {
      this.fail(this.t("step_edit_in_progress_hint"));
      return;
    }
    const field = this.randomEditor
      ? randomEditorField(path.slice(prefix.length), this.randomEditor.form)
      : editorField(path.slice(prefix.length), this.stepEditor.form);
    editor.errors[field] = issue.message;
    this.renderView();
    this.shadowRoot
      .querySelector(`[data-builder-field="${CSS.escape(field)}"]`)
      ?.focus();
  }
  validate() {
    const version = this.version,
      draft = copy(this.draft);
    return this.run(async (epoch) => {
      const result = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch || version !== this.version) {
        return;
      }
      this.showIssues(result);
      if (result.valid) {
        this.validatedVersion = version;
      }
    });
  }
  save(candidate) {
    if (this.document?.source === "file" || this.stale) {
      return;
    }
    const version = this.version,
      draft = copy(candidate || this.draft),
      expected = this.revision,
      editor = this.activeEditor,
      submittedForm = editor ? copy(editor.form) : null;
    return this.run(async (epoch) => {
      const validation = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch) {
        return;
      }
      if (version !== this.version) {
        this.fail(this.t("save_newer_edits_hint"));
        return;
      }
      this.showIssues(validation);
      if (!validation.valid) {
        if (editor && this.issues.length > 0) {
          this.focusIssue(
            this.issues.find((i) => i.severity !== "warning") || this.issues[0],
          );
        }
        return;
      }
      this.validatedVersion = version;
      const result = await this.ws("save", {
        program: draft,
        expected_revision: expected,
      });
      if (epoch !== this.epoch) {
        return;
      }
      if (!result.valid) {
        return this.showIssues(result);
      }
      this.adopt({ ...this.document, ...result, needs_apply: false });
      if (editor && this.activeEditor === editor) {
        this.draft = copy(result.program);
        this.dirty = false;
        if (this.stepEditor) {
          this.selectedStep = editor.id;
        }
        editor.existing = true;
        if (this.randomEditor) {
          this.randomEditor.original = submittedForm;
        } else {
          this.stepEditor.original = submittedForm;
        }
        if (version !== this.version) {
          this.fail(this.t("saved_newer_edits_hint"));
          return;
        }
        this.stepEditor = null;
        this.randomEditor = null;
      }
      if (version === this.version) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.renderView();
        if (editor) {
          this.shadowRoot
            .getElementById(
              `${this.tab === "random" ? "random" : "step"}-card-${editor.id}`,
            )
            ?.focus({ preventScroll: true });
        }
        return true;
      }
      this.dirty = true;
    });
  }
  async reloadSaved(discard = false) {
    if (
      this.busy ||
      ((this.dirty ||
        this.yamlDirty ||
        this.activeEditor ||
        this.hasRunConditionChanges) &&
        !discard)
    ) {
      return;
    }
    const version = this.version;
    const epoch = this.epoch;
    let reloaded = false;
    await this.run(async (epoch2) => {
      const doc = await this.ws("program");
      if (epoch2 !== this.epoch || version !== this.version) {
        return;
      }
      this.adopt(doc);
      this.resetDraft();
      this.stepEditor = null;
      this.randomEditor = null;
      reloaded = true;
    });
    if (!(reloaded && epoch === this.epoch)) {
      return;
    }
    if (!this.yamlDirty) {
      await this.exportYaml();
    }
    if (epoch === this.epoch) {
      this.renderView();
    }
  }
  movePreviewDay(days2) {
    return this.previewController.movePreviewDay(days2);
  }
  selectPreviewDate(date) {
    return this.previewController.selectPreviewDate(date);
  }
  recoverLivePreview() {
    return this.previewController.recoverLivePreview();
  }
  startLivePreview() {
    return this.previewController.startLivePreview();
  }
  nextLiveEvent() {
    return this.previewController.nextLiveEvent();
  }
  stopLivePreview() {
    return this.previewController.stopLivePreview();
  }
  resumeScheduling() {
    return this.previewController.resumeScheduling();
  }
  refreshPreviewSchedule() {
    return this.previewController.refreshPreviewSchedule();
  }
  saveYaml() {
    if (this.document?.source === "file" || this.stale || !this.yamlDirty) {
      return;
    }
    const yaml = this.yaml,
      version = this.version,
      expected = this.yamlRevision;
    return this.run(async (epoch) => {
      const result = await this.ws("save", {
        program: yaml,
        expected_revision: expected,
      });
      if (epoch !== this.epoch) {
        return;
      }
      if (!result.valid) {
        return this.showIssues(result);
      }
      this.adopt({ ...this.document, ...result, needs_apply: false });
      this.yamlSaved = yaml;
      this.yamlRevision = result.revision;
      this.issues = [];
      if (version === this.version) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.version++;
        this.validatedVersion = this.version;
        this.openRunCondition();
      }
      this.flush();
    });
  }
  exportYaml() {
    if (this.yamlDirty || this.busy) {
      return;
    }
    if (this.document?.recovery_yaml != null) {
      this.yaml = this.yamlSaved = this.document.recovery_yaml;
      this.yamlRevision = this.document.revision;
      this.flush();
      return;
    }
    const yaml = this.yaml,
      revision = this.revision,
      version = this.version;
    return this.run(async (epoch) => {
      const result = await this.ws("export", { program: copy(this.draft) });
      if (epoch !== this.epoch) {
        return;
      }
      this.showIssues(result);
      if (
        !result.valid ||
        this.yaml !== yaml ||
        this.revision !== revision ||
        this.version !== version
      ) {
        return;
      }
      this.yaml = result.yaml;
      this.yamlSaved = result.yaml;
      this.yamlRevision = revision;
    });
  }
};
function isRevisionConflict(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "revision_conflict"
  );
}
function editorField(tail, form) {
  if (
    form.kind === "custom" &&
    ["actions", "action", "entities", "data"].includes(String(tail[0]))
  ) {
    return "customYaml";
  }
  const has = (key2) => tail.includes(key2),
    head2 = tail[0];
  if (["name", "days", "entities", "data"].includes(String(head2))) {
    return String(head2);
  }
  if (head2 === "action") {
    return form.kind === "service" ? "service" : "kind";
  }
  if (head2 === "timing") {
    for (const [field, key2] of [
      ["latest_at", "latestAt"],
      ["only_before", "onlyBefore"],
    ]) {
      if (has(field)) {
        let boundaryField = "anchor";
        if (has("absolute_time")) {
          boundaryField = "start";
        } else if (has("start_offset")) {
          boundaryField = "startOffset";
        }
        return `${key2}.${boundaryField}`;
      }
    }
    if (has("absolute_time")) {
      return has("end") ? "end" : "start";
    }
    if (has("start_offset")) {
      return "startOffset";
    }
    return has("end_offset") ? "endOffset" : "anchor";
  }
  return "name";
}
function randomEditorField(tail, form) {
  const head2 = tail[0];
  if (head2 === "start" || head2 === "end") {
    if (tail[1] === "duration") {
      return `${head2}.${tail[2] === "max" ? "maxDuration" : "minDuration"}`;
    }
    if (tail.length === 1) {
      let field = "anchor";
      if (form[head2].mode === "absolute") {
        field = "start";
      } else if (form[head2].mode === "duration") {
        field = "minDuration";
      }
      return `${head2}.${field}`;
    }
    return `${head2}.${editorField(["timing", ...tail.slice(1)], form.on)}`;
  }
  if (head2 === "on" || head2 === "off") {
    return `${head2}.${editorField(tail.slice(1), form[head2])}`;
  }
  if (head2 === "count") {
    return tail[1] === "max" ? "maxCount" : "minCount";
  }
  return (
    {
      min_duration: "minDuration",
      max_duration: "maxDuration",
      days: "days",
    }[String(head2)] || "name"
  );
}
if (!customElements.get("occupied-panel")) {
  customElements.define("occupied-panel", OccupiedPanel);
}
export { OccupiedPanel };
