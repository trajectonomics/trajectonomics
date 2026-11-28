---
status: accepted
---

# Home and the Plan page show what a plan assumes, and Keep states a value through a Set

[#690](https://github.com/trajectonomics/trajectonomics/issues/690): a plan holds values nobody stated, and the answer on Home rests on them. `scenario show` lists them ([cli ADR 0083](../../../cli/docs/adr/0083-scenario-show-states-what-a-plan-assumes-that-nobody-stated.md), [cli ADR 0084](../../../cli/docs/adr/0084-a-plan-remembers-which-values-traj-wrote-and-a-set-states-one.md)): what the template wrote that no edit has stated since, an income with no tax label, a deduction class the plan leaves out, and a tax figure not yet confirmed. The Dashboard has to show that list without taking the answer's place, and to let a person say that a value is theirs.

## Decision

> Home shows one quiet card directly under the answer: the number of items and at most three sentences, one per group, as a single link to the full list on the Plan page. It has no fill, nothing at display size and no button, so the answer stays the one focus point, and it is not drawn when the plan assumes nothing. The Plan page lists every item after the plan's own view, in groups, each with a sentence and the page that changes it. Keep, on a value the template wrote, is a Set of that value at its path through the `apply-overrides` Edit.

### Placement

The card sits below the focus point and above "Your summary". The full list is on the Plan page (`/projection/#assumed`), because Home answers one question and the list is the plan's own detail.

### Groups and sentences

Home groups, and does not list: a plan can leave out a dozen allowance classes, and they would fill the card. The groups, in order, are inflation, what Accounts grow at, what debts charge, amounts, incomes with no tax label, allowances left out, and tax figures not confirmed. Each group has one sentence, which names the item when it holds one and counts them when it holds more. Rates that differ are not given one figure. No sentence carries money, so Hide amounts leaves the card as it is; only the amount lines on the Plan page are masked. Items are named as every page names them ([ADR 0029](0029-plan-items-are-named-by-what-a-read-states-and-never-made-up.md)), an allowance class is never shown by its key, and a tax figure shows the CLI's note. The page computes nothing ([ADR 0002](0002-the-cli-is-the-only-source-of-figures.md)): it counts the items and prints the CLI's values.

The list is the saved plan's, also while a what-if is open, because it says what the file holds.

### Keep is a Set

Stating a value at the same path is what removes it from the list (cli ADR 0084), and `apply-overrides` already writes a Set with the hash the page read. So Keep adds no Edit kind. The document does not change, so its content hash does not change, and a Keep never makes a what-if or another form's hash stale. The hosted Demo has no write path and shows no Keep ([ADR 0028](0028-the-hosted-demo-is-a-second-build-target-with-no-edit-client.md)).

### A new plan is the template write

A plan started from the ledger's accounts is `scenario apply <name> --template --as-of <asOf>`, one `traj` write, so the plan records which values `traj` wrote. It replaces the earlier read of the template followed by an apply of its output, which amends [ADR 0008](0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md). The write only creates: a taken name is refused as `scenario_name_taken` with nothing written. The guided first plan ([ADR 0031](0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)) is unchanged: it reads the template, because it changes it before it saves.

## Considered Options

- **A list on Home.** Complete, but it competes with the answer and grows with the tax rules.
- **A new Edit kind for Keep.** It would need its own argv, form and refusal for what a Set already does.
- **Dismiss an item in the browser.** The plan would still call the value assumed, and another device would show it again.
