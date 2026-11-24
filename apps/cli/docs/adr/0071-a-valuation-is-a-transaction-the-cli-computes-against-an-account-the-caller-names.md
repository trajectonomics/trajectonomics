# A valuation is a Transaction the CLI computes against an account the caller names

Status: accepted.

A fund, a stock account or a home changes value without a transaction. Recording what it is worth today meant working out the
difference by hand and writing a two-posting `tx add` against an income or equity account. That arithmetic is exactly what the Dashboard
may not do (web ADR 0002) and what an agent gets wrong, so `traj account value` takes the value and writes the difference.

## Decision

- **A valuation is a Transaction, computed here from the Balance.** `traj account value <account> --value --date --against` reads
  the Balance at `--date` (inclusive), and the ledger's pure `valuationEntry` (a **Valuation entry**, ledger GLOSSARY) builds the
  Simple Entry that moves the account to the stated value. Nothing new is stored: it is an ordinary Transaction with the memo
  `Valued at <value>`, so every report, `tx void` and `tx amend` already read it. The value is stated on the account's Normal Balance
  side: an asset's Debit balance, what a liability still owes (so `traj balance` shows a liability's `-800.00` for `--value 800.00`).
  `before`, `value` and `difference` are in those terms, so `before + difference = value` for both.
- **`--date` and `--against` are required.** `--date` because no ledger command reads a clock (ADR-0018, ADR-0029). `--against`
  because a valuation needs a second account, and creating one implicitly would break ADR-0025's rule that account creation stays out
  of a write and would pick a name for the person: the Dashboard can remember the person's choice, the command line cannot. It must
  be an `income` or `equity` Leaf Account, unarchived, in the valued account's currency; anything else is `valuation_against_invalid`
  (exit 3) with a hint naming `traj account add`. The account to value must be an unarchived asset or liability Leaf Account;
  an income, expense or equity account has no value to state (`valuation_account_invalid`, exit 3).
- **A value that equals the Balance writes nothing and exits 0** with `status: "unchanged"`, `difference: "0.00"` and a null
  `transaction` (ADR-0021). `--dry-run` executes and rolls back (ADR-0019), so a minted id is null.
- **The batch is a JSON document**, `--file <path|-> ` with `{ against, values: [{ account, date, value }] }` (ADR-0020), and
  `--template` prints one (ADR-0033). It is JSON because ADR-0025 keeps one CSV template for transactions and a second would be a new
  wire contract; the Dashboard's import wizard turns a spreadsheet into this document. The entries apply in **date order, then
  account id order** (listed order breaks only a tie, and one account may not state two values for one date), each against the Balance
  the earlier ones leave, so a history stated out of order lands the same. They run in one `IMMEDIATE` transaction that reads the
  Ledger after taking the write lock, so the Balances the rows were computed from are the ones they are written against. Any refusal
  rolls the batch back and lists every refused entry in `details.values` (`index`, the typed `account` and `date`, and its `reason`),
  as `tx import` lists `rows`; the envelope's code is the refused entry with the highest Exit class, ties by the earliest (ADR-0025).
  A refused `against` is one refusal at `document.against`, not one per entry.
- **A later valuation moves, and the result says so.** A valuation states the value on its own date, and a later Balance moves with
  an earlier write. When the account already holds a valuation dated after `--date`, the entry's `notes` names the earliest (its
  date, stated value and transaction), the amount this write moves it by, what the Balance on that date becomes, and that value
  again on that date restates it, with a count of the others. A valuation is found by its memo prefix `Valued at `; one a `tx void`
  withdrew, or one that is itself a Reversal, is not named. Valuations later in the same batch are not named: they are applied after.

## Considered options

A default `--against` was rejected (above). A second CSV template for the batch was rejected (above). Resetting later valuations
automatically was rejected: it would write transactions the caller did not state, so the note says what to run instead. Giving the
single form a result of its own `value` field and the batch `values` was kept: the single form is the leaf an agent calls most, and
its shape is the row of the batch beside `dryRun` and `against`.

## Consequences

`traj account value` is the only command that reads a Balance and writes from it in one write, so the store gains `writePlanned`,
which reads the Ledger inside the write and appends what a planner derives; nothing else uses it yet. The two new codes enter the
registry and the contract test. The flag form's fields are optional in the input schema because `--file` and `--template` take none of
them, so `traj schema` lists none as required for the flag form and the command states a missing one itself (`invalid_input`, at the
field). The document form's usage line still prints `[account]`, which that form refuses. The Dashboard decodes the result with
`apps/web/src/lib/contract/account-value.ts`, against goldens the CLI writes.
