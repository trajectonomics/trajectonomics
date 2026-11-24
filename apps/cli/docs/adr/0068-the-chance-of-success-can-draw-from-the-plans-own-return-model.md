# The chance of success can draw from the plan's own return model, and `projection model` prints it

Status: accepted. Ships in the release after 0.8.0.

`projection chance` takes a Return model the caller writes (ADR-0030, sim ADR 0011). Nobody outside the project
hand-writes a joint bucket table, so the chance of success was out of reach of a person and of an agent. Sim ADR 0029
builds that table from what the plan already states: each asset Account's `rate`, and a new `volatility`, the
standard deviation of its yearly return. The CLI adds no figure and no rule: it names the source, passes the
Scenario to `planReturnModel`, and says what went in.

## Decision

- **`--return-model plan` is a third source, beside a file path and `-`.** `plan` is a reserved word: a file called
  `plan` is written `./plan`. The model is built from the Scenario *after* the Overrides (`--set`, `--without`,
  `--add`), so `--set accounts.funds.volatility=2000` is a what-if (ADR-0056) that changes the Bands. Carry-in does
  not touch Accounts, so it does not touch the model.
- **`--buckets` sizes the model.** The default is 256: smooth enough for percentiles at 1,000 paths, and small enough
  to print (sim ADR 0029: the paths understate the volatility by 0.3 per cent). It is a power of two from 16 to 1024. The
  engine decides, and a bucket count it refuses is `invalid_input` at `--buckets`, in words that name the seven
  allowed values (`INVALID_BUCKETS`). `--buckets` beside a file or `-` is refused in a sentence: a file has no bucket
  count, and silently ignoring a flag would let a caller believe it took effect.
- **The result echoes what the model was built from**, so a reader never has to guess: `returnModel: { source: "plan",
  buckets, accounts: [{ id, rate, volatility }] }`, present only with `plan` (a run without it keeps its bytes), beside
  `definition.modelId` (`plan-256`). The accounts are those that swing, in the Scenario's order; every other
  Account keeps its rate (sim ADR 0029). The notes say the same in a sentence, and say how many buckets the engine
  clamped to the Return model's range, when it clamped any.
- **A plan with no volatile Account is refused**, because every Market path would be the same path and the
  "chance" would be 0 or 100 per cent presented as a probability. It is `invalid_input` at `--return-model`, and its
  hint names the field (`volatility`, in basis points) and the way to write it (`scenario apply`, whose `--template`
  prints a document to start from), or a file to pass instead. The engine builds an empty model and leaves the decision
  to the caller (sim ADR 0029), so this refusal is the CLI's.
- **`volatility` is a document field.** `scenario apply`, `--set` and `traj schema` take `accounts[id].volatility`,
  an integer of basis points from 0 to 10000 on an asset (the engine refuses a liability's and an out-of-range one).
  Its description says that only the chance of success reads it and that the figure is the caller's own: `traj`
  ships none. In `--decimal` it stays an integer of basis points, as `rate` does; only a payout's and a fee's shares
  are percent strings (ADR-0067), because they are an Account's costs and `volatility` is a sibling of the return it
  swings around.
- **A `--set` may add an absent `volatility` to an asset Account** (amends ADR-0065), so the refusal's hint is a
  command that works: no plan has a `volatility` until one is stated, and a `--set` could not create the key.
  `--set accounts.<id>.volatility=1500` writes it when the parent is an `accounts[]` item of `kind: "asset"`; a
  liability, and every other absent key, is still `No key or id "…"`. The value goes to the engine's `check()` like
  any other, so 10001 is `RATE_OUT_OF_RANGE`. The rule lives with ADR-0065's begin entries, in `set-begin.ts`.
- **`traj projection model --scenario <name> [--buckets N]` prints the model**, in the sim format and nothing else, so
  `--json > model.json` is a file `--return-model` reads and gives the same chance as `plan`. It takes the Overrides
  of the other projection leaves, reads no Ledger and takes no date: the model depends on the Scenario alone. A plan
  with no volatile Account is refused as above.
- **`traj dashboard` defaults to `plan`.** `--paths` and `--seed` without `--return-model` mean `--return-model plan`; a
  file, when given, wins, because a caller who named a history meant it. With only one of the three, the Dashboard's
  own rule stands: they go together. A Scenario without a volatility shows the refusal on its page, as any failed
  read does.

## Considered options

- **A default `volatility` or a built-in market history.** Rejected, as every rate is (ADR-0063, ADR-0067): which risk a
  plan is tested against is a decision about the meaning of money, and `traj` ships none.
- **Building the model from the stored Scenario, before the Overrides.** Rejected: a what-if on a volatility would not
  move the Bands, which is its point.
- **Percent strings for `volatility` in `--decimal`.** Rejected for now: it would be the only return-like figure that
  differs from `rate` beside it.
- **Treating no volatility as a model of no Accounts.** Rejected: the engine would run, and report a certainty that
  no market produced.

## Consequences

- When a customer skill gains a chance recipe (CLI ≥ the release after 0.8.0), it uses `plan`; no customer skill has one
  today. A person need not write a Return model.
- A file still works unchanged, and every output without the new flags is byte for byte what it was.
