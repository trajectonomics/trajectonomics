# `scenario show` states what a plan assumes that nobody stated

Status: accepted (trajectonomics/trajectonomics#689).

A plan carries values nobody typed, and each one moves the answer: the template writes rate 0 on
every Account and inflation 0 (ADR-0044), tax allowances may be unstated (ADR-0073), tax-core marks
some statutory figures as `reported` or `unsourced` (ADR-0042), and an income Flow may carry no tax
label. Today they are spread over several reads, and a person who trusts a figure they should not
trust stops using the tool the first time it is wrong.

## Decision

`scenario show` gains `assumed`, a required list, always printed and `[]` when the plan assumes
nothing, the same rule as ADR-0071's always-printed fields. The human form prints a
`This plan assumes (values nobody stated):` block after its body, one line per item and a `hint:`
line under each fixable one, and prints no block when the list is empty. `traj schema scenario show`
publishes the list and its closed kinds from the same zod definition (ADR-0010).

The **Assumed values** of a plan are exactly these four kinds, in this order:

| # | `kind` | What it is | Where it comes from |
|---|---|---|---|
| 1 | `template-default` | A value `traj` wrote into the document that no edit has touched since. | The new `scenario.unstated` column (ADR-0084). |
| 2 | `unlabelled-income` | An `income` Flow with no string `label`, in a plan that holds any Levy (`isTaxed`). | The document. |
| 3 | `unstated-allowance` | Each class in `taxAllowances.notStated`. | ADR-0073's own function. |
| 4 | `tax-figure` | Each figure `taxAssumptionsOf(document)` names for the stored Levy. | Tax-core. |

This change publishes and produces the three derived kinds, 2 to 4. `template-default` arrives with
its stored column in ADR-0084, and `run-rate` waits for #687, which adds a `history` source to the
same mechanism.

Within a kind the order is fixed too: `unlabelled-income` in document order, `unstated-allowance` in
`TAX_ALLOWANCE_CLASSES` order (which `notStated` already holds), and `tax-figure` in the order
`taxAssumptionsOf` returns. Sorting by impact would need a rule this repository does not have; this
order puts what a person can fix in one step first and the statutory figures last. There is no limit
on the length: the Dashboard groups the list (#690).

The JSON is a discriminated union on `kind`, each variant a `z.strictObject`:

```ts
{ kind: "unlabelled-income",  path: string, value: null,  hint: string }
{ kind: "unstated-allowance", path: string, value: null,  hint: string }
{ kind: "tax-figure",         path: string, value: number | number[],
  status: "reported" | "unsourced", note: string, hint: null }
```

`path` is a document path in the Override grammar: `flows.<id>.label` or
`taxAllowances.<class>`; a `tax-figure` path is tax-core's own parameter path. `value` is null when
nothing is there to state. A `tax-figure` carries tax-core's value, status and note unchanged, and
its `hint` is null because a figure is cleared by sourcing it, not by a command. A fixable item's
`hint` is the one command that states it, and it quotes a plan name the way ADR-0048's hints do:

- `unlabelled-income`: `Run "traj scenario apply <name> --set 'flows.<id>.label="income.section40_1"'" for a salary, or name another label from "traj schema scenario apply".`
- `unstated-allowance` for `retirementContributions` and `thaiEsg`: `Add a contribution Flow with its label: run "traj scenario apply <name> --add flows=<json>"; "traj schema scenario apply" shows the shape.`
- `unstated-allowance` for any other class: `Run "traj scenario tax <name> --merge" with this allowance's flag to state it; "traj schema scenario tax" lists the flags.`

The human block prints `- <path> (income with no tax label)`, `- <path> (tax allowance not stated)`
and `- <path> = <value> (<status> tax figure): <note>`, with the hint on the line under a fixable
one; an array value prints as `[a, b]`, the way the assumptions block prints one.

The unlabelled-income hint's command has to work as printed. A Flow may leave `label` out, and a Set
could not add an absent key, so this amends ADR-0065's begin list as ADR-0068 did for `volatility`:
`--set flows.<id>.label=<json>` begins the key on an income or contribution Flow. The tax write still
decides which labels it reads, and `--set` writes only what the document schema accepts.

## What is left out, and why

- **An untaxed plan.** "No tax is applied" is already a projection warning note that Home counts as a
  thing to check, and `--none` cannot be told apart from a plan that was never taxed, so an item for
  it could never be cleared.
- **Household-anchored dates.** They follow from an age the person stated, so they are stated.
- **A life expectancy left at a form default.** It waits for a `form` source in the same column.
- **A run-rate.** It waits for #687, which adds kind `run-rate` and source `history` to the same
  mechanism.

## Considered options

Computing "unstated" on the Dashboard was rejected: that would be a second copy of ADR-0073's rule
and of tax-core's status, the drift ADR-0073 itself rejected. A single `notes` sentence was rejected:
a note is prose a person must read, and an agent would have to parse it. Sorting by the amount each
item can move was rejected because it needs a rule the repository does not have. Listing the
untaxed plan and life expectancy was rejected as above: neither could be cleared by the command it
would name.

## Consequences

`scenario show`'s output grows a required field, so its JSON goldens are re-baselined once and the
Dashboard's contract accepts the field (absent in an older Snapshot). The derived kinds read the
document tolerantly, so a row from before the stored column, or a document with an older
`schemaVersion`, still lists them; a plan with no stored tax profile lists no allowance item. The
web card and the Plan page's list are #690, and the notes of `scenario show` name 0.8.0.
