# 0010. A query that totals states its rows apart, so a caller can state them when the total overflows

Status: accepted (issue #539)

## Context

`trialBalance` and `profitAndLoss` return rows and a total per currency. Each row is a safe integer, and the total is their sum, which can leave the safe range (`AMOUNT_OVERFLOW`
at `trialBalance.totals[…]` or `profitAndLoss.totals[…]`) though no row does. The query then throws and the rows it had already read are lost, so a caller
that states every row and says only the total is unavailable (CLI ADR-0079) had no way to read them: `balances` has no period or Dimension filter, and `movements`
has neither Dimensions nor the trial balance's columns.

## Decisions

- **Two additive exports, `trialBalanceRows` and `profitAndLossRows`.** Each is the row half of its query, with the same arguments, the same rows in the same order and the
  same refusal for a row out of range (`trialBalance.rows[<id>]`, `profitAndLoss.rows[<id>]`). `trialBalance` and `profitAndLoss` call them, so the rows cannot drift.
- **No new `LedgerErrorCode`** and no change to what either query returns or throws, so the pull request is `fix:`/`feat:`, not `feat!:` (ADR-0005).
- **The unavailable state is not added to the totals.** `Total` and `TrialBalanceTotal` stay numbers; whether a caller can state a result without a total is the caller's rule.

## Considered options

- **Return the rows on the thrown error.** Rejected: an error carrying a result is a second return channel, and the error's `field` is its whole contract.
- **Make `totals` nullable on the result.** Rejected: it changes a published type for every caller, and the CLI is the only one that wants it.
- **Rebuild the rows in the CLI.** Rejected: the Dimension filter and the period rules are this package's (CLI AGENTS rule 3).
