# Dashboard

A read-only web app, in this repository, that shows what `traj` already computed. It runs from a checkout on `127.0.0.1` and reads one Snapshot file.

## Language

**Dashboard**:
The static web app in `apps/web`: Svelte 5 pages and components that render one Snapshot and compute no figure of their own.
_Avoid_: backend, API, sync, server

**Snapshot**:
One JSON document, version 1, that holds every Read the Dashboard needs, each with the argv that produced it. It is the closed contract between `traj` and the Dashboard.
_Avoid_: backend, API, sync, server, payload, cache

**Read**:
One `traj … --json` call, kept verbatim in a Snapshot: its argv and either its parsed data or its error envelope.
_Avoid_: fetch, request, query, call

**Demo snapshot**:
The committed Snapshot in `public/demo/snapshot.json`, built from a fictional ledger, so the Dashboard can be seen with no ledger of anyone's own.
_Avoid_: sample data, mock, fixture, seed data

**Pack**:
The built pages of `dist/` in one file, `pack/dashboard.bin`: every file's bytes in base64 by its path, in one JSON document. The compiled `traj` embeds it so `traj dashboard` can serve the Dashboard without a checkout.
_Avoid_: bundle, archive, assets

**Plan**:
The list of argv a Snapshot needs, computed from the parameters alone. Stage one reads the Scenarios, the accounts and the first transaction date; stage two reads everything else.
_Avoid_: pipeline, workflow, job, script

**Edit**:
A write the page asks the server to run: one of a closed list (`src/lib/edit/edit.ts`) of `traj` scenario commands, copy a plan, apply a Scenario document or delete a plan. The server runs it dry, then for real, then re-reads the Snapshot, and answers with the new Snapshot or the CLI's error envelope.
_Avoid_: save, mutation, update, PATCH, request, write

**Household**:
The people a Scenario's dates are pinned to: one account holder, at most one partner, and any dependents, each with a birth month and a life expectancy. Its anchors write a date into a Scenario item, so the Dashboard shows the age it is pinned to. The page computes no age.
_Avoid_: family, members, users, profile

**Anchor**:
One date of a Scenario item pinned to a person's age, life end or joining. The label reads "at me, age 60", and the date is the one the household wrote.
_Avoid_: link, rule, trigger

**Milestone**:
A named target in a Scenario that fires on a date, on another Milestone, or when a figure such as net worth passes a level (sim ADR 0012). The Dashboard shows the date `traj projection run` reports for each one, or that it is not reached; it never works one out.
_Avoid_: Goal, event, target date

**What-if session**:
The changes one tab holds against one plan, switched items off (Removals) and values set (Sets), which `traj` applies transiently to read a figure and never writes until the person keeps or applies it. It is held in the tab only.
_Avoid_: scratch plan, draft, scenario copy, simulation

**Loan**:
A liability Account in a plan, with the level Contribution that repays it and, when the money arrives on a date, the withdrawal that borrows it. The page edits the three parts together; `traj` computes the payments and the statement.
_Avoid_: debt schedule, amortization, mortgage (as a kind)
