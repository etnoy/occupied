# Occupied

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/occupied.svg" alt="Logo, a smiling occupied toilet sign" height="200">

Burglars look for living spaces that look like nobody's home: make sure yours looks occupied!

Occupied is an occupancy simulator for Home Assistant that lets you create schedules for lights, covers, and other entities. But remember the scene in *Home Alone* where Harry knows exactly when the house lights will come on?

![Harry and Marv predicting the automated timers](https://raw.githubusercontent.com/etnoy/occupied/main/media/homealone.webp)

Your timers shouldn't be that predictable. Therefore, Occupied has built in support for randomness to make your home look lived in and avoid the water bandits. Occupied also has an easy-to-use GUI, which makes it much easier to set up than traditional automations.

Occupied is the spiritual successor of [Occusim](https://github.com/acockburn/occusim) which is no longer maintained.

# Use cases

* Make your home look occupied while you are away by turning lights on and off at varied times, activating scenes, or opening and closing covers.
* Schedule everyday lighting around sunrise, sunset, or bedtime, with randomized windows instead of the same exact times each day.
* Run a schedule only when your alarm is armed. You can also save power by having Occupied turn off extra lights or switches, such as those in a windowless bathroom.

# Requirements

Occupied is tested on and supports Home Assistant version 2026.5 or later. Earlier versions might work but are untested.

# Installation

## Install with HACS (recommended)

1. Open [HACS](https://hacs.xyz/), select the three-dot menu, and choose **Custom repositories**.
2. Add `https://github.com/etnoy/occupied` with the category **Integration**.
3. Find Occupied in HACS and download it, then restart Home Assistant.
4. Go to **Settings → Devices & services → Add integration → Occupied**. Name your controller, then open the Occupied panel to start editing. Controller names must be unique. You can import an existing YAML program in the panel's **Settings**. For externally managed YAML, follow [Use a managed YAML file](#use-a-managed-yaml-file); no UI setup is needed.
5. Select **Configure** on the integration to open the Occupied panel.

## Manual installation

1. Download **occupied.zip** from the [release you want to install](https://github.com/etnoy/occupied/releases).
2. Create `custom_components/occupied` inside your Home Assistant configuration directory (the directory containing `configuration.yaml`). Extract the ZIP's contents directly into that folder. For example, `manifest.json` must end up at `custom_components/occupied/manifest.json`, with `frontend/dist` alongside it. The ZIP does not include the enclosing `occupied` folder.
3. Restart Home Assistant, then add **Occupied** under **Settings → Devices & services → Add integration**. Select **Configure** to open its panel.

To update a manual installation, replace the files in `custom_components/occupied` with the new ZIP's contents and restart Home Assistant. Your controller settings and programs remain in Home Assistant storage; managed YAML files remain at the paths you chose.

# Usage

Occupied is based around Steps ("turn this light on at that time") or Random Events ("turn a light on and off twice during the day")

## Create a Step

Open Occupied through the integration's **Configure** control (the cog wheel), then choose **Create your first step** in the **Steps** tab.

1. Choose **Absolute time** to run the action at a specific time ("run at 8 AM"), or have it be a random time within a window ("run between 7:30 AM and 8:30 AM")
2. Choose **Relative to** to run the action relative to another event, say "run at sunrise" or "run this step after that step". You add a time offset, like "run 30 minutes before dawn" and optionally make it choose a random time, say "run at a random time between 20 and 40 minutes after sunset"
3. Next, choose an action to run. A simple example is to turn a light on
4. Click on **Save step**.

You can now create more steps and have those steps either be absolute in time, or relative to the previous step

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/screenshots/create-step.png" alt="Step editor with a randomized dinner time and two kitchen lights" width="1070">

*Dinner lights come on at a different time each evening, within a 30-minute window.*

Use the **⋯** menu next to a light to add brightness, color, color temperature, or transition. Each light has independent properties. Remove a property with its **×** to leave that value unchanged when turning the light on or off. For mixed on/off states in one action or ordered action lists, use **Custom YAML**. See [Custom YAML actions](docs/schema.md#custom-yaml-action-editor).

## Create a Random Event

Random Events manage a light for both on and off, so you can have a kitchen light that turns on and off for a few times during the day.

1. In the Random tab, choose **Create your first random event** and set its start and end window, for example 18:00–23:00. The window can also start relative to a step or solar event, and end after a fixed or random duration.
2. Set the number of occurrences. Add a maximum to choose a random count within a range, and you can set the minimum to zero so that the event does not happen every day.
3. Set the minimum and maximum duration of each occurrence, such as 5–15 minutes.
4. Choose the entities to turn on and off during each window.
5. Save the random event.

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/screenshots/random-event.png" alt="Random event editor with two to four kitchen visits between 20:00 and 22:30, each lasting 5–15 minutes" width="1070">

*Short kitchen visits add activity between the main steps. Each visit turns the same light on, then off again.*

## Preview the timeline

Open **Preview** to see how the entities would be turned on and off. This will be a render of the random events within the ranges you chose before, so navigate back and forth during the days to see how those will be randomized.

Explicit on/off actions appear as state bars for lights, switches, remotes, and other devices, including `homeassistant.turn_on` and `homeassistant.turn_off`. Cover actions show planned position and tilt. Scenes, scripts, and other commands whose effects cannot be represented as a state interval appear as diamonds at their scheduled times, including calls without an entity target. Hover a diamond to see its services, targets, and data.

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/screenshots/timeline.png" alt="Daily timeline showing scheduled lighting and random activity across household lights and switches" width="1072">

*Yellow shows when each device is on. Morning routines, random visits, and evening lighting form a different pattern each day.*

## Add a run condition

You probably only want to pretend someone is home when nobody actually is. A run condition lets you do that, say "only run when the alarm is armed" or "only run when my away mode helper is on".

In **Settings → Run condition**, enable **Run only when an entity matches**, pick your entity, and choose the states that should let Occupied run. For an alarm, that could be `armed_away`, or both `armed_away` and `armed_night`.

When the condition stops matching, i.e. when you get home and disarm the alarm, Occupied stops running actions and leaves the lights as they are.

## Enable the integration

When ready, turn on the controller's **Enable** switch in Home Assistant. You will see the **Status** sensor change to **Active** if Occupied has started managing, and **Next event** will update with when the next action will be taken. If the status says **Waiting**, the **Status reason** sensor will tell you why; likely you have a run condition it is waiting on.


# Advanced usages

## Multiple controllers

You can have more than one Occupied controller, each with its own schedule and run condition. For example, one controller can pretend someone is home while you're away, with random lights and a run condition like "only run when the alarm is armed". Another can run all the time and manage your everyday lights, turning window lights on at sunset and off at sunrise. Of course, you can add randomness to those actions as well.

To add another controller, go to **Settings → Devices & services → Add integration → Occupied** again and give it a different name. You can switch between controllers in the Occupied panel, and each has its own **Enable** switch.

## Enforce state when a run condition starts

With run conditions, you can also enforce state. This means that as soon as you leave home, it switches to the expected state without having to wait for the next action.

Under **Settings → Run condition**, enable a run condition, then enable **Enforce expected state on start**.

There is a default setting in **Delay before enforcing state** of `30s`, giving you time to get out of the house before device changes begin.

There is also a button, **Enforce expected state**, that you can press if you accidentally turned on and off some lights and want Occupied to fix that for you.

Use **Extra entities to turn off** for lights and switches that Occupied does not manage but you want turned off when away. This is great for that bathroom light you don't want to forget to turn off when you are away, but you don't want it in a Step or Random Event because the bathroom has no windows.

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/screenshots/run-condition.png" alt="Away mode run condition with state enforcement, a 30-second delay, and extra devices to turn off" width="1072">

*When Away mode turns on, enforce the expected state after 30 seconds and switch off extra devices such as the bathroom light and coffee machine.*

## Limit when a step can run

Use the timing controls to combine clock times and solar events:

* **No later than** caps a step's time. For example, turn lights on 90 minutes before sunset, but no later than 18:00. This is useful if you don't want sun-controlled lights to turn on when you are sleeping.
* **Only run before** skips a step unless its time is strictly before the selected boundary. For example, turn lights on at 05:30 only if that is before sunrise plus 90 minutes.

## Try a live preview

In **Preview**, select **Start live preview**. This allows you to preview the schedule on real devices, and you click **Next event** to walk through the simulation step by step.

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/screenshots/live-preview.png" alt="Live preview ready for the next event, showing a dispatched action and the next bathroom light change" width="1072">

*Walk through the schedule one event at a time and see which action will run next.*

## Factorio-style lights

In Factorio, a group of lights don't turn on at once when the sun sets, but they have a tiny delay each, creating a beautiful staggered look. You can do this in Occupied by enabling **Staggered action** under **Advanced settings**.

The **Time window** defaults to `2m`, so with four entities over two minutes, actions occur at 30-second intervals.

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/screenshots/staggered-lights.png" alt="Advanced step settings with staggered actions enabled over a two-minute window" width="480">

*Spread the welcome-home lights across two minutes, with a different device order each day.*

See the [staggered-action example](examples/stagger.yaml).

# YAML configuration

While we've put a lot of effort into the GUI, it is still very powerful to do plain old yaml.

## Import and export

Open **Settings** in the controller to edit the YAML directly or load a file, then choose **Save changes** to validate and apply it. If you are an agent wanting to edit Occupied settings, this is the way to do it!

See the [YAML reference](docs/schema.md) and [example programs](examples/house.yaml) for more options.

## Use a managed YAML file

To keep configuration in a file instead of GUI storage, put a complete Occupied program at `/config/occupied/house.yaml` on the Home Assistant filesystem, then add this to Home Assistant's `configuration.yaml` and restart:

```yaml
occupied:
  config_file: occupied/house.yaml
```

Each controller has its own permission and schedule so you can have multiple instances controlled by yaml.

With file-based config, you cannot edit programs with the GUI.

## CLI

There is a standalone `occupied` CLI that validates, exports, previews, and renames typed step IDs.

```sh
occupied validate examples/house.yaml --date 2026-10-13 --days 7 --timezone Europe/Stockholm --latitude 59.3 --longitude 18.1
occupied preview examples/house.yaml --date 2026-10-13 --seed preview --timezone Europe/Stockholm --latitude 59.3 --longitude 18.1
occupied export examples/house.yaml
occupied rename-id examples/house.yaml step wake_up morning
```

Exit status is `0` for success, `1` for usage, missing or invalid preview context,
file I/O or transport failures, and `2` for an invalid program or infeasible plan.
For `reload`, an unsuccessful managed-file validation also returns `2`.

# Development

Pull request titles must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

Use [mise](https://mise.jdx.dev/) with Python's built-in virtual environment and pip; uv is optional:

```sh
mise trust
mise install
mise exec -- python -m ensurepip --upgrade
mise exec -- python -m pip install --upgrade pip
mise exec -- python -m pip install -e . --group dev
pnpm install --frozen-lockfile --ignore-scripts
mise test
pnpm run build
mise lint
mise format
```

The frontend uses Svelte 5 and TypeScript, with `OccupiedPanel` as HA’s custom element and backend controller.
