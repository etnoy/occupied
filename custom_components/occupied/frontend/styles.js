export const styles = `
p,li { overflow-wrap:anywhere; }
:host { display:block; min-height:100%; background:var(--primary-background-color,#f4f5f8); color:var(--primary-text-color,#202c37); font:15px/1.5 system-ui,sans-serif; }
* { box-sizing:border-box; } main { max-width:1200px; margin:auto; padding:24px; } h1 { margin:0; font-size:28px; } h2 { font-size:21px; margin:0 0 12px; } h3 { font-size:17px; } p { margin:8px 0; } small,.hint { color:var(--secondary-text-color,#596773); } code { overflow-wrap:anywhere; }
header { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; } nav,.row,.resource-nav,.toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; } nav { margin:18px 0; } nav button[aria-current="page"] { background:var(--primary-color,#167b94); color:white; }
section { background:var(--card-background-color,#fff); border:1px solid var(--divider-color,#d5dce3); border-radius:12px; padding:20px; margin:16px 0; min-width:0; } section section { border-radius:8px; } article { border-top:1px solid var(--divider-color,#d5dce3); padding:12px 0; } details { padding:12px 0; } summary { cursor:pointer; font-weight:600; }
button,input,select,textarea { font:inherit; color:inherit; } button { background:var(--card-background-color,#fff); border:1px solid var(--divider-color,#bdc9d2); padding:8px 14px; border-radius:8px; cursor:pointer; min-height:42px; } button.primary { background:var(--primary-color,#167b94); color:white; } button:disabled { opacity:.5; cursor:default; } button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible,a:focus-visible,[tabindex]:focus-visible { outline:3px solid var(--primary-color,#167b94); outline-offset:2px; }
.field { display:flex; flex-direction:column; gap:5px; margin:12px 0; max-width:700px; } label { font-weight:500; } input:not([type=checkbox]),select,textarea { border:1px solid var(--divider-color,#bdc9d2); border-radius:6px; background:var(--card-background-color,#fff); padding:9px; min-width:0; max-width:100%; } .field input,.field select,.field textarea { width:100%; } textarea { resize:vertical; } .field textarea { font:14px/1.5 ui-monospace,monospace; } input[type=checkbox] { width:20px; height:20px; vertical-align:middle; } fieldset { border:1px solid var(--divider-color,#d5dce3); border-radius:8px; margin:12px 0; min-width:0; } legend { padding:0 6px; font-weight:600; } .check { display:inline-flex; gap:5px; margin:8px; align-items:center; } .checks { display:flex; gap:12px; flex-wrap:wrap; }
.banner { padding:12px 16px; border-radius:8px; background:var(--secondary-background-color,#e3eef2); margin:12px 0; overflow-wrap:anywhere; } .error,[aria-invalid=true] { color:var(--error-color,#b3261e); } [aria-invalid=true] { border-color:var(--error-color,#b3261e); } [hidden] { display:none!important; } dl { display:grid; grid-template-columns:minmax(140px,1fr) 3fr; gap:8px 20px; } dt { color:var(--secondary-text-color,#596773); } dd { margin:0; overflow-wrap:anywhere; } .badge { padding:6px 12px; background:var(--secondary-background-color,#e3eef2); border-radius:20px; }
.toolbar { position:sticky; top:0; padding:12px 0; background:var(--primary-background-color,#f4f5f8); z-index:2; } pre { white-space:pre-wrap; overflow-wrap:anywhere; font:13px/1.5 ui-monospace,monospace; } .table-wrap { overflow:auto; } table { width:100%; border-collapse:collapse; font-size:13px; } th,td { padding:9px; text-align:left; border-bottom:1px solid var(--divider-color,#d5dce3); max-width:300px; overflow-wrap:anywhere; } th { white-space:nowrap; } progress { width:min(350px,100%); accent-color:var(--primary-color,#167b94); }
.timeline { margin:18px 0; padding-top:42px; overflow:hidden; position:relative; } .ruler { position:absolute; top:0; left:160px; right:12px; height:40px; font-size:10px; } .ruler span { position:absolute; width:100px; transform:translateX(-50%); } .ruler span:first-child { transform:none; } .ruler span:last-child { transform:translateX(-100%); } .lane { display:flex; min-height:36px; align-items:center; } .lane-label { width:150px; flex-shrink:0; overflow-wrap:anywhere; padding-right:8px; font-size:12px; } .track { position:relative; width:100%; min-width:0; height:32px; margin:0 12px 0 10px; background:var(--secondary-background-color,#f1f4f6); border-radius:4px; } .bar { position:absolute; top:7px; height:18px; min-width:3px; border-radius:3px; background:#4f8a96; } .bar.activity { background:#7762a6; } .bar.active { top:12px; height:8px; background:#168555; } .bar.ramp { background:linear-gradient(90deg,#f2d69b,#b88a2e); } .marker { position:absolute; top:3px; transform:translateX(-50%); color:var(--primary-color,#167b94); }
@media (max-width:600px) { main { padding:14px; } section { padding:14px; } nav { gap:5px; } nav button { padding:7px 10px; } dl { grid-template-columns:1fr; gap:3px; } dd { margin-bottom:8px; } .lane-label { width:90px; font-size:11px; } .ruler { left:100px; } .ruler span { width:60px; } .row input { width:100%; } }

/* Routine builder */
main { max-width:1120px; padding:32px; }
header { margin-bottom:24px; } header h1 { font-size:24px; letter-spacing:-.7px; } header p { margin:2px 0; font-size:13px; }
nav { border-bottom:1px solid var(--divider-color,#d5dce3); gap:24px; margin:16px 0 32px; }
nav button,nav button[aria-current="page"] { border:0; border-radius:0; border-bottom:3px solid transparent; background:transparent; padding:10px 0; color:var(--secondary-text-color,#596773); }
nav button[aria-current="page"] { border-bottom-color:var(--primary-color,#167b94); color:var(--primary-color,#167b94); font-weight:650; }
.text-button { border-color:transparent; background:transparent; color:var(--primary-color,#167b94); padding-left:4px; padding-right:4px; }
.page-heading { display:flex; align-items:center; justify-content:space-between; gap:24px; margin:24px 0; }
.page-heading h2 { font-size:30px; letter-spacing:-.8px; margin:0; }
.eyebrow { font-size:11px; font-weight:700; letter-spacing:1.5px; color:var(--secondary-text-color,#596773); }
.page-heading .hint { max-width:500px; }
.routine-empty { text-align:center; padding:60px 32px; border-style:dashed; }
.routine-empty h2 { font-size:25px; letter-spacing:-.5px; }
.routine-empty p { max-width:490px; margin:12px auto 24px; }
.empty-steps { font-size:13px; color:var(--secondary-text-color,#596773); }
.routine-layout:has(.routine-detail) { display:grid; grid-template-columns:minmax(0,1fr) 290px; align-items:start; gap:20px; }
.routine-list { display:flex; flex-direction:column; gap:10px; margin:0 0 20px; min-width:0; }
.routine-row { display:flex; align-items:center; gap:14px; text-align:left; width:calc(100% - var(--depth)*14px); margin-left:calc(var(--depth)*14px); padding:20px; border:1px solid var(--divider-color,#d5dce3); border-radius:12px; }
.routine-row:hover { border-color:var(--primary-color,#167b94); }
.routine-row.selected { border-color:var(--primary-color,#167b94); box-shadow:inset 3px 0 var(--primary-color,#167b94); }
.routine-symbol { color:var(--primary-color,#167b94); font-size:22px; width:26px; flex-shrink:0; }
.routine-row-content { display:flex; flex:1; min-width:0; flex-direction:column; gap:4px; }
.routine-row strong { font-size:16px; font-weight:650; overflow-wrap:anywhere; }
.routine-row-content .hint { font-size:13px; overflow-wrap:anywhere; }
.routine-row-time { display:flex; flex-direction:column; gap:4px; text-align:right; max-width:46%; font-size:13px; overflow-wrap:anywhere; }
.routine-detail { margin:0; padding:22px; }
.routine-detail h2 { font-size:20px; overflow-wrap:anywhere; }
.routine-detail-actions { display:flex; flex-direction:column; gap:8px; margin-top:24px; }
.routine-detail details button { margin:8px 8px 0 0; }
.entity-summary { padding-left:18px; font-size:14px; }
.danger { color:var(--error-color,#b3261e); }
.routine-editor { max-width:680px; margin:0 auto 32px; padding:32px; }
.routine-editor h3 { font-size:23px; font-weight:600; letter-spacing:-.5px; margin:28px 0 8px; }
.builder-steps { display:flex; list-style:none; padding:0 0 20px; margin:20px 0; border-bottom:1px solid var(--divider-color,#d5dce3); gap:24px; color:var(--secondary-text-color,#596773); font-size:13px; }
.builder-steps [aria-current="step"] { color:var(--primary-color,#167b94); font-weight:750; }
.builder-steps .complete { color:var(--primary-text-color,#202c37); }
.entity-search { width:100%; margin:16px 0 0; }
.selection-count { font-size:12px; color:var(--secondary-text-color,#596773); }
.entity-native-selector { display:block; width:100%; }
.entity-picker { max-height:330px; overflow:auto; border:1px solid var(--divider-color,#d5dce3); border-radius:8px; }
.entity-option { display:flex; align-items:center; gap:14px; padding:14px; cursor:pointer; border-bottom:1px solid var(--divider-color,#d5dce3); }
.entity-option:last-child { border-bottom:0; }
.entity-option:has(:checked) { background:var(--secondary-background-color,#e3eef2); }
.entity-option input { flex-shrink:0; accent-color:var(--primary-color,#167b94); }
.entity-option span { display:flex; min-width:0; flex-direction:column; }
.entity-option strong { font-weight:550; overflow-wrap:anywhere; }
.entity-option small { font-size:12px; overflow-wrap:anywhere; }
.builder-footer { display:flex; gap:10px; align-items:center; border-top:1px solid var(--divider-color,#d5dce3); padding-top:22px; margin-top:28px; }
.builder-footer button:first-child { margin-right:auto; }
.timing-offset { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.routine-editor details { padding:8px 0; }
.routine-editor .field { margin:18px 0; }
.routine-editor .error { font-size:13px; }
.routine-editor .step-name-editor .field { max-width:none; margin:20px 0 28px; }
.step-name-editor label { font-weight:600; }
.step-name-editor input { font-family:inherit; font-size:22px; font-weight:600; line-height:1.4; padding:14px; }

.routine-editor.editing { max-width:none; }
.editing .editor-sections { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.1fr); gap:28px; }
.editing .editor-sections > div { min-width:0; }
.editing h3 { margin:16px 0 8px; font-size:20px; }
.editing .entity-picker { max-height:280px; }
.editing .field { margin:14px 0; }
@media (max-width:900px) { .editing .editor-sections { grid-template-columns:1fr; gap:20px; } .editing .editor-sections > div + div { border-top:1px solid var(--divider-color,#d5dce3); padding-top:12px; } }
#issues:empty { display:none; } #issues button { margin:0 6px 8px 0; text-align:left; }
@media (max-width:800px) { .routine-layout:has(.routine-detail) { grid-template-columns:1fr; } .routine-detail { margin-bottom:24px; } }
@media (max-width:600px) {
  main { padding:18px 14px; } header { gap:10px; margin-bottom:8px; } header .row { gap:4px; } #runtime { font-size:12px; }
  nav { margin-bottom:24px; } .page-heading { align-items:flex-start; flex-direction:column; gap:12px; } .page-heading h2 { font-size:27px; }
  .routine-row { padding:14px; gap:10px; flex-wrap:wrap; } .routine-row-content { flex-basis:calc(100% - 40px); } .routine-row-time { padding-left:36px; text-align:left; max-width:100%; }
  .routine-editor { padding:20px 16px; } .builder-steps { gap:18px; } .builder-footer { gap:6px; } .builder-footer button { padding:8px 12px; }
  .routine-empty { padding:36px 20px; } .empty-steps { line-height:2; } .timing-offset { gap:10px; }
}
`;
