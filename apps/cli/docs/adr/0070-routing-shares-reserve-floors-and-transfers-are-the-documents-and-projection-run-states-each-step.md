# Routing shares, Reserve floors, targets that keep their value and transfers are the document's, and `projection run` states each step

Status: accepted. Ships in 0.8.0.

The engine routes what is left by a share of it (sim ADR 0030), keeps a Reserve floor while drawing, keeps a target in today's money
and moves money between the plan's own Accounts (sim ADR 0031). Until this ADR the CLI refused each of those keys with
`ROUTING_NOT_SHIPPED` ("ships in a later release"), because the published shape did not describe them and the decimal form finds
its money fields from that shape: a `downTo` of 3000 would have been read as 30.00 THB. They reach a person only through `traj`:
`scenario apply` must accept them, `traj schema` must describe them so an agent can write them, `--set` must reach them so a
page can try "what if I kept 500,000 in savings before touching the funds", and `projection run` must state what each step and
transfer did, so the Dashboard shows it without arithmetic (web ADR 0002). The CLI adds no rate, share, floor or target of its own.

## Decision

- **The refusal is gone.** `ROUTING_NOT_SHIPPED`, its module and its tests are deleted, and `transfer` is back in the published Flow
  kind list (read from the engine's `allowedValues`, ADR-0052). The CLI states no refusal of these keys of its own: every refusal
  is the engine's `check()` (`SURPLUS_SHARE_LAST`, `WITHDRAW_FLOOR_ORDER` and the three `TRANSFER_*` codes are worded in the table).
- **The shape.** A surplus step takes `share` (1 to 10000 basis points) and an `upTo` that is a whole number or `{ amount, growth }`;
  a `withdraw` entry is an Account's id or `{ account, downTo }`, with `downTo` in the same two forms. A transfer is a Flow of
  `kind: "transfer"` with `source`, `target` and an optional `realise`. Each two-form field is an `anyOf` of the plain form and the
  object, so `traj schema` states both (ADR-0054). A target's unit is its own sentence (`ROUTED_UNITS`): it is the Account's balance, not
  an amount per occurrence or per year. `growth` is the Flow's own two forms (`growth-shape.ts`).
- **The decimal form reads the form it was given.** `mapDecimalFields` follows an `anyOf` by the value: an object by the branch with
  `properties`, anything else by the plain branch. So `downTo` and `upTo` are major units and `{ amount, growth }`'s `amount` too, and the
  round trip is byte for byte (`scenario-routing.test.ts` hashes it). `share` is a percent string in the decimal form, as the rates of ADR-0063, ADR-0064 and ADR-0067 are: a share of a value the caller
  types is written as a percent, `"30.00"` for 30%, and the integer of basis points is the stored form. A `--set` that moves it is
  `cashflow.surplus.1.share=2500`, or `cashflow.surplus.1.share="25.00"` under `--decimal`. It is changed before 0.8.0 because a change after it would break every caller.
  A rate of change (a `growth`'s `bps`) stays an integer. A surplus step's share is a share of the money still unrouted (`ROUTING_SHARE_UNITS`).
- **`--set` addresses a routing step and entry by position.** The two routing lists have no `id`, so the one place the Override grammar
  names a list item by position is `cashflow.surplus` and `cashflow.withdraw` (`POSITIONAL_LISTS`, `src/scenario/positional.ts`):
  `cashflow.surplus.0.share`, `cashflow.surplus.1.upTo`, `cashflow.withdraw.0.downTo`, and a path under an object target
  (`cashflow.withdraw.0.downTo.amount`). A position counts from 0; one the list does not hold is refused with the positions it has, and
  a name is refused the same way. A transfer's amount is a Flow's own: `flows.<id>.amount`, and `--add flows=<transfer>` begins one.
  The engine's problems at such a path are attributed to the Override by the same position (`overrideSegments`), so a
  `SURPLUS_SHARE_LAST` blames the `--set` that made it.
- **Two more keys may be begun** (as ADR-0068 did for volatility): a surplus step's `share` and `upTo`, which a plan with no share or cap
  leaves out, and a `downTo` on a `withdraw` entry that is a bare id, which turns the entry into `{ account, downTo }`. Both only as the end
  of the path, and every other absent key is still `No key or id`. The estate block's rule (ADR-0065) is unchanged.
- **No template change.** The template keeps its current routing (ADR-0033, ADR-0044). The worked example document is unchanged too, so no
  golden that holds it moved; a routing and a transfer are two documents in the schema's prose (`example-routing.ts`), as the initial-rate
  rule is, and a test proves the pin accepts them.

## What `projection run` states

Each is present only when the Scenario or the flag asks for it, so a run without the new forms is byte for byte what it was and every golden is unchanged.

- **The annual row** gains `transfers`: what the roll-up moved between the plan's own Accounts, the engine's field, present only when
  the Scenario declares a transfer Flow. It is outside `income`, `expense`, `contributions` and `interest`.
- **The cash flow (ADR-0058)** keeps its groups. A `drawn` line gains `entry`, its position in `cashflow.withdraw`, present only when the
  list declares a floor, as the engine states it, so an Account listed twice reports once per entry. A transfer is outside the cash flow, so
  it is no group and no total counts it.
- **A `transfers` table** with `--breakdown`: `{ index, from, to, flow, source, target, amount, unmoved }`, the engine's lines, present only when
  one moved or could not move something. `unmoved` is what the Flow planned and did not move: no Shortfall and in no net.
- **The Liability statement** gains `transferred` on each month of a loan a transfer pays down, apart from `paid`:
  `opening + drawn + interest − paid − transferred = closing`. A loan no transfer targets has no such key.
- **A `routing` echo**: each surplus step and withdraw entry by position (`entry`) with its Account, its `share` as a percent string (`null` when the step has none) and its
  `upTo` or `downTo` as `{ amount, growth }` (`growth` is null for a nominal figure), as the document states them. It is present only when
  the document uses a share, a floor or a target that keeps its value. In the human form it is a table before the cash-flow blocks, and each
  year's block adds `moved between accounts (not cash)` with a line per transfer and what it did not move.
- **The echo does not state the amount a grown target is worth on a date.** The issue asked for the target resolved at the first roll-up
  and at the horizon. The engine states no such figure: `routedAt` is internal to `sim`, and the Projection and its breakdown carry only
  what was drawn and filled. Computing it here would be the CLI re-implementing the engine's whole-year growth and half-up rounding
  (cli AGENTS rule 3, ADR-0058), so the echo carries the document's `{ amount, growth }` and no resolved figure. A resolved figure needs a
  `sim` change first (a field on the Projection, or an exported resolver), and then an additive field on the echo. #458 is that follow-up:
  it adds `resolved: { first, horizon }` to each grown target once `sim` states them.
- **The web contract** decodes each field, with no page change: `transfers` on the annual row, `entry` on a cash-flow line, the
  `transfers` table, `transferred` on a loan month, `routing` on the run, and the `transfer` Flow kind with `realise` and a typed
  `cashflow` on the document. A CLI-written golden (`run-routing.output`) is decoded by the contract's test.

## Considered options

- **A group `transfer` in the cash-flow long table.** Rejected: a row carries one `account`, so a transfer's two Accounts and its
  `unmoved` would not fit, and a new key on every row would change the bytes of every `--breakdown` output. A table of its own does not.
- **`share` as an integer of basis points in the decimal form too.** Rejected: every other share a person types is a percent string in that
  form (ADR-0063, ADR-0064, ADR-0067), so an integer here would be the one exception, and a change after 0.8.0 would break callers.
- **Addressing every id-less list by position.** Rejected: a spending rule's `steps` would become addressable with no need. The two
  routing lists are the explicit list `POSITIONAL_LISTS`, and a list joins it in the pull request that needs it.
- **Computing the resolved target in the CLI.** Rejected, see above.

## Consequences

- A Dashboard page can label a step "30% of what is left, up to ฿100,000 in today's money" and a draw "drawn to the floor" from the echo and `entry`.
- `traj schema` changes for every reader of `cashflow`: the `upTo` and `withdraw` items are `anyOf`, so a reader that assumed a plain integer or string reads the first branch.
