---
status: accepted
---

# A guided first plan is one Edit that saves a plan and its household

[#688](https://github.com/trajectonomics/trajectonomics/issues/688) asks for a guided first plan at `/plans/new/`: a person answers who is in their household, what money comes in and goes out taken from the ledger, and the age they would stop working, and gets one new plan. [ADR 0008](0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md) says every change is one Edit, and a household is a separate document (cli ADR-0048), so the save needed a decision: one document or a chain of Edits, and who builds it.

## Decision

> A guided first plan asks for the household, the money from the ledger's run-rates, and a stop-work age, then saves through one Edit, `start-guided-plan`. The server reads the CLI's decimal template built from history at the Snapshot's As-of, and applies the person's answers in a pure function: rows kept or dropped, amounts as typed, earned or not, and a `stop-work` Milestone that every kept earned Stream ends at. It writes the plan (which must be `created`) and then its household, whose age anchor dates the Milestone. This is the one Edit that runs two writes, because a household is a separate document (cli ADR-0048). Each write runs dry first, and a refused household removes the plan just created, so a plan without its household is never left behind silently. The page computes no figure and no date. Its totals are the CLI's, its answers live only in memory, and the Demo shows the steps with saving off.

- **The answer is a closed schema.** `src/lib/edit/guided-edit.ts` states `start-guided-plan`: the plan name, the Snapshot's As-of, the money answers, one to twenty people as the household form holds them, and the holder's stop-work age. The money answers are either one row per Flow the `baseline rates` read carried (`id`, `keep`, an optional `amount` and an optional `earned`) or the two typed totals of the short path. A row's amount is digits with at most two decimal places, because the page takes the commas off and never converts a figure. Strict: an unknown field is refused.
- **The template is the CLI's, not the page's.** The server reads `scenario apply --template --as-of <As-of> --from-history --decimal --json` (or the same without `--from-history` on the totals path), so the Accounts, the routing and the decimal form stay the CLI's. `guidedTemplateRead` pins the two argv.
- **The document is built in a pure function.** `src/lib/edit/guided-document.ts` applies the answers in order: every template income or expense Flow must have a row and every row a Flow (`guided_ledger_changed` otherwise), a row left unkept takes its Flow out, a typed amount replaces the stated one unchanged, an income Flow takes its row's `earned` (default true), the totals path sets `salary` and `spending`, no income or spending Flow left is `guided_no_flow`, and the `stop-work` Milestone is appended with the As-of as a placeholder date. Every kept earned income Flow gets `endAt: "stop-work"`. It returns the document or the refusal, and the page's dates and figures never enter it.
- **The household is one anchor.** `src/lib/edit/guided-edit.ts`'s `guidedHousehold` writes the people as typed and one anchor at `milestones.stop-work.criteria.age.on`, pinned to the holder's age. The CLI dates the Milestone when it writes the household; the page never works that date out.
- **The run is two writes, each dry first.** `scripts/serve-guided.ts`, called from `runEdit`, reads the template, builds the document, runs `scenario apply <name> --file - --decimal` dry and real (the status must be `created`; a taken name is `scenario_name_taken`, and a real write that replaced a plan made while it ran answers `replaced`), then `scenario household <name> --file -` dry and real with no `--if-hash`, because this Edit made the plan a moment earlier. A refusal of either household step runs `scenario rm <name> --json` and answers the household's error unchanged; a removal that fails too answers `guided_plan_half_saved`, which says the plan was saved without its household. `followPlan` adds the name, as an `apply-plan` does.
- **Three codes are the server's own.** `guided_ledger_changed` and `guided_no_flow` (exit 2) and `guided_plan_half_saved` (exit 1) join `SERVER_CODES`, so the page shows them as the server's sentences and not the CLI's text. Every argv is pinned in `src/lib/edit/edit-guided.test.ts`, the builder in `guided-document.test.ts`, and the run against the workspace `traj` in `scripts/guided-plan.test.ts`.

## Considered Options

- **A chain of Edits from the page: apply, then set the household, then set the Milestone.** Rejected: a refusal between the two writes leaves a plan the person did not finish, and the page would have to name and clean up a half-made plan itself. One Edit keeps one lock and one clean-up.
- **The browser edits the template document and sends it as an `apply-plan`.** Rejected: the document's Accounts and routing are the CLI's, and the page holds only decimal strings; a document the browser assembled would be a second place the plan's shape is decided. The server builds it from the CLI's own template.
- **A new household field for the stop-work age.** Rejected: a Milestone is where the plan says when work stops, the Milestones page already shows and edits it, and every kept earned Flow can end at it.
- **Removing a plan whose household was refused in a second Edit sent by the page.** Rejected: the person would be asked to act on the server's half-made plan, and a reload in between leaves it stored.

## Consequences

- The Edit's answers live only in the tab (`src/client/guided-plan.svelte.ts`, in the next change). A reload starts the questions over, and Cancel writes nothing.
- The plan and its household are two writes, so the CLI's writer lock is taken twice and the `.traj` ledger sees a moment with the plan and no household. The removal closes it, and `guided_plan_half_saved` names the one case it cannot.
- A plan of the same name made by a terminal between the dry and the real apply is already overwritten by the real apply, and `traj` has no restore. So a refused household still runs `scenario rm`, rather than leave this Edit's document without its household.
- A ledger that changes between the Snapshot's read and the save answers `guided_ledger_changed`, and the page offers the existing Reload (`POST /reread`).
- The hosted Demo has no edit client (ADR 0028), so it shows the steps with saving off; nothing of this path reaches it.
- The view models, components and route are later work: this change makes the Edit runnable and tested against the real `traj`, and adds no page.
