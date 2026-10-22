# Simple schedule experience

## Product rule

The calendar must teach itself even when every guide is skipped. Open Calendar,
see shifts or one clear setup action, choose how work repeats, choose the days,
choose Day 1's date, then see the result. The guide is optional under More and
never interrupts first open. No schema migration is needed.

## Mental-model audit

| Existing concept | Everyday presentation | Where its power remains |
| --- | --- | --- |
| Calendar entries and individual shifts | Tap a date, Add → Shift, or Change shift | Date details and Edit tools |
| Shift types / definitions | Ready-to-use Day, Night, Evening and Off | Optional time/custom-shift disclosure; More → Settings → Shift types |
| Rosters and calendar containers | Existing schedule identity retained automatically | Switcher and More → Manage rosters for people/jobs/sharing |
| Patterns / rotations / repeating patterns | Schedule; set up how you normally work | Schedule tab; sequence editor; dated future-only changes |
| Pattern templates / familiar rhythms | Optional examples in the sequence step | Existing preset picker retained |
| Weekly recurrence | Same shifts every week, Monday through Sunday | Each weekday can have its own reusable shift |
| Overtime, leave and notes | Add → Overtime / Leave / Note | Existing quick forms, advanced event editor and privacy |
| Appointments and recurring events | More options in Add | Existing EventEditor |
| Apple Calendar integration | More → Calendar sync | Existing connection and notes/privacy controls |
| Accounts, personal settings and appearance | Profile button and More | Existing authentication and settings |
| Bulk operations / paint / copy / saved sequences | Calendar Edit | Existing edit tools, undo, range actions and saved-pattern placement |
| Insights / pay / backups / history / sharing | More or contextual calendar menu | Existing tools retained |

## Setup

Three steps: work style, work days, start date. Irregular/manual work goes straight
to the calendar. Repeating setup starts with DDNN OO; examples and custom building
are optional. Weekly setup starts with Monday–Friday Day and weekends Off, with
editable weekdays and shift times. Start dates align the actual weekday rather
than treating every start date as Monday. Repetition defaults to continuous.

Definitions created or edited during setup remain in a draft until applying the
schedule through the existing atomic mutation path. Cancelling setup makes no
schedule write. Used custom definitions remain reusable in ordinary entry flows. Editing an existing
shift during setup creates a fresh definition so earlier duties keep their times.
Permissions, roster scoping, offline persistence and sync use existing paths.

## Everyday use

Calendar remains the initial page. Navigation is Calendar, Today, Schedule, More;
internal `Patterns` state and stored records retain their existing identity.
Calendar Add opens Shift, Overtime, Leave, Note; other events and repeating setup
are secondary. Existing date-preview shortcuts remain for experienced users.
Routine day edits explicitly apply to that day only; repeating changes have a
separate named action. Repeat this shift remains available in day options.

Schedule Edit first offers future-only changes, splitting the existing sequence
at today while retaining its position and finite end. Editing the original
schedule, including its historical dates, requires the explicit secondary option.
Stop repeating ends future generation, preserving historical pattern-backed
shifts and all individual edits and annotations. Already-finished schedules do
not acquire an extended end date. Ordinary roster deletion remains recoverable.

## Verification

Deterministic tests cover setup, weekday alignment, preserved historical shifts,
future sequence position, stopped/finished schedules and manual overrides.
Phone tests cover skipped guides, all three setup styles, date alignment, custom
reusable shifts, sequence duplication/removal, Add entry choices and safe stopping.
The existing suite covers adjacent screens, separate leave/overtime/notes,
calendar views, PWA/offline, auth and calendar sync. Never use real roster data for
these checks. Physical iPhone safe areas, keyboard and VoiceOver need device QA.

## Interaction references

The [Work Shift Calendar store listing](https://play.google.com/store/apps/details?id=com.lrhsoft.shiftercalendar)
emphasises selecting dates and acting on them directly; [MyShiftPlanner](https://myshiftplanner.com/)
leads with everyday outcomes such as tracking shifts, calculating pay and sharing
a calendar. These support calendar-first interaction and ordinary language,
without adopting either product’s appearance or assets.
