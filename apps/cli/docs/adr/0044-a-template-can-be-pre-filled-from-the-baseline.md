# A template can be pre-filled from the Baseline at one As-of

ADR-0033 gives `scenario apply --template` a static document, so a person sees the field names before the first refusal. It does not say which Accounts a Scenario must declare. A Projection refuses a Baseline Balance on an Account the Scenario does not declare (`UNDECLARED_BALANCE_ACCOUNT`), so an agent that wants to model a raise or a stop date first copies every Ledger Account's id from `traj baseline show --json` into a hand-written file. `scenario apply --template --as-of <date>` removes that copying: it prints the same kind of document, with the Ledger's own Accounts already declared at that date.

The flag is additive. `--template` alone prints the static document, which opens no data directory, exactly as ADR-0033 leaves it. With `--as-of` the command reads the Ledger once, through the Baseline mapping, and prints a document that declares every asset and liability leaf Account, in id order, at rate `0`, with the currency `THB` and inflation `0`. The document carries no Balance: `scenario` documents are `sim-core`'s and reject unknown keys (ADR-0024), and a Balance belongs to the Baseline, which `baseline show` already states. Nothing is written to the store, and a repeated call at the same As-of is byte-identical.

The Scenario needs at least one Stream and a surplus route, so the template carries two zero Streams starting on the As-of: an earned income named `salary` and an expense named `spending`. The Baseline states no run-rate (ADR-0026), so there is nothing to derive them from, and a guessed run-rate would be an assumption the caller never made. A zero Stream changes no figure. The surplus routes to the first asset Account that is not archived, and the contribution and withdrawal orders list every asset in id order; a liability cannot be a withdrawal source or a surplus target (`LIABILITY_MISUSE`). A Ledger with no asset Account cannot route a surplus, so the template is refused rather than printed.

Because every declared Account has rate `0`, and every Stream is zero, a Projection of the applied template holds the Baseline's figures in every month. That is the round-trip contract the tests state: the template applied unchanged, then projected with `--monthly`, has the Baseline's net worth in every row.

The refusals are `invalid_input` at exit 2, each with a hint naming the next command, because a template that could not be applied would be worse than none (ADR-0033):

- No Transaction in the Ledger: the hint names `traj tx add`.
- An As-of before the first Transaction: the hint names the first Transaction's date, so the next command is a template that applies.
- No asset Account: the hint names `traj account add`.
- `--as-of` without `--template`, and `--file` beside `--as-of` or `--template`: the hint names the form that takes the flag. The document form's exclusivity check carries the hint through its spec, so every refusal of that form stays a field check.

A missing data directory is `ledger_missing` at exit 4, with `traj init` as its hint, as every read gives it. A bad date is `INVALID_DATE`, checked before the store opens (ADR-0029).

`projection run`, `projection compare` and `fi` refuse an undeclared Account with `projection_refused` at exit 3, as before. Its hint now names this command when a problem is `UNDECLARED_BALANCE_ACCOUNT`, so the refusal points at the template that declares every Account. Every other refusal keeps the ADR-0030 sentence.

The flag takes no name. `--template` takes no name already (ADR-0033): the document has no name field, and the name is the positional `apply` writes the document under.

## Considered options

Deriving the Streams from the Ledger's income and expense accounts was rejected for the reason above: the Baseline states no run-rate, and a run-rate taken from history would be a guess presented as an assumption. Declaring only the Accounts with a non-zero Balance was rejected because the Baseline drops zeros for the Baseline's own reasons (ADR-0026), and an agent that wants a raise on an empty account would then need a second edit. Putting Balances in the Scenario was rejected because `sim-core` rejects the key. Printing the template for a Ledger the Baseline refuses was rejected: the template would look valid while the projection it feeds could not run, so the Baseline's refusal is the answer.

## Consequences

The document's accounts are a function of the Ledger at the As-of, so two applies at different dates can differ, and the applied Scenario's `contentHash` says which. A zero-rate, zero-Stream template is a starting point, not a forecast; `traj schema scenario apply` continues to describe what the document may hold. A later Ledger change that adds an Account leaves the applied Scenario without that Account, and `projection_refused` then names the template as the way to declare it again.
