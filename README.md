# FocusForge

FocusForge is a browser-based study companion for planning tasks, focusing in
short sessions, and seeing your progress add up. Its creative-pop theme pairs
indigo with coral and includes a light/dark toggle.

## Run it

Open `index.html` in a browser. No installation, account, build step, or
third-party font download is required. The pages use system fonts for quick
loading and offline-friendly rendering.

## Pages

- **Overview** (`index.html`): study summary, task preview, focus timer, timer
  settings, and weekly chart.
- **My tasks** (`tasks.html`): add, complete, and remove study tasks, with
  subject tags for web technologies and popular programming languages.
- **Focus room** (`focus.html`): run a 25-minute focus session or a 5-minute
  break, customize both durations, and optionally enable browser notifications
  for timer completion. Timer settings are also available from the overview.
- **My progress** (`progress.html`): review today's focus time, task completion,
  streak, and focus minutes for the last seven days.

## Your data

Tasks, display name, theme, and study progress are saved in this browser using
local storage and shared across all four pages. Focus minutes are recorded when
a full focus session ends; breaks do not count as focus time. Your data stays
on this device. Clearing this browser's site data also clears saved FocusForge
progress. Browser notifications require your permission and are available only
in browsers that support them; the page must remain open while the timer runs.

## Built with

FocusForge uses plain HTML, CSS, and JavaScript so each feature is easy to
inspect and extend. Possible next steps include task priorities and filters,
editable timer durations, weekly goals, and data export/import.
# FocusForge Study Hub
