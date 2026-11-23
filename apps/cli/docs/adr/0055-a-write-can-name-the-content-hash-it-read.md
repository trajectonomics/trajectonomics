# A Scenario write can name the content hash it read, and is refused when the plan has moved on

A Scenario write replaces the whole stored document (ADR-0024), and the document it sends is whatever its caller read earlier. Two writers that read the same plan therefore lose one of their changes without a word: the second write restores everything the first one removed. The repro in #233: a person saves a card after `traj scenario tax base --none` has removed a Levy in a terminal, and the Levy comes back.

So `traj scenario apply` and `traj scenario household` take an optional expected content hash, `--if-hash <contentHash>`. The hash is the `contentHash` that `scenario show` and `scenario list` print, which is the `jcs1:sha256:` digest of the stored canonical document (ADR-0024). When the flag is given and the stored Scenario's `contentHash` is not that value, the write is refused and nothing is written. When no Scenario of the name is stored, the write is refused too, because the caller read a plan that is no longer there.

## What the refusal is

- **A code of its own, `scenario_changed`, at exit 5.** It is a conflict with the world, the class ADR-0021 gives a conflicting name, and a caller needs to choose what to do next: re-read the plan and write its change to what it finds. Retrying the same request unchanged cannot succeed, so the code is permanent (ADR-0037), not `retryable`.
- **In the envelope (ADR-0013).** `path` is `--if-hash`, the caller's spelling. `details` carries `expectedHash` and `storedHash`, the latter `null` when no Scenario of the name is stored. The hint names the stored hash and says to run `traj scenario show <name>` to read the plan again.
- **Inside the write.** The store checks the hash in the same IMMEDIATE transaction that writes the row (`store/scenarios.ts`, `store/scenario-household.ts`), so no other writer can move the plan between the check and the write. The check runs before the household's anchors are resolved, so a stale plan is reported as stale and not as a household conflict.
- **Under `--dry-run` too.** A dry run runs the same check and refuses the same way (ADR-0019), so a caller learns of the conflict before it writes for real.

## Why `--if-hash`

The flag reads as a condition on the write, "write if the stored hash is this one", the same reading as HTTP `If-Match`. The alternatives were `--expect-hash`, which reads as a claim the command checks rather than a condition it obeys, and a `--version` number, which the Scenario does not keep as a stable identity: `version` counts the row's writes, so two writers can agree on a number and still differ on content only through a household change the document does not show. The hash is the value the Snapshot already carries (`documents.<name>.scenario.contentHash`), so the page needs no new field.

## Why the refusal is not a silent no-op

A write whose hash differs could report `unchanged` and exit 0, as an already-true write does (ADR-0021). That would hide the conflict: the caller's change is not in the plan, and it would believe it is. A refusal that exits 5 keeps the caller's intent visible and makes it choose.

## What the hash covers

The hash is the document's (ADR-0024). A household write can change the stored household without changing the document: when no anchored date moves, `scenario household --none`, or a household with no anchors, leaves `contentHash` as it was. A `--if-hash` household write over such a change is accepted. That is a known gap. Closing it needs a hash that covers the household too, which is a new value on `scenario show`, and so it is a separate decision with the owner. The Dashboard sends the document hash it read, as #233 specifies, and its household controls carry the same gap until then.

## Considered options

- **Compare the whole stored row, version included.** Rejected: `version` and `updatedAt` change on every write, so an unchanged plan would refuse after any write, including its own dry run.
- **Make the flag optional for the Dashboard only.** Rejected: the Dashboard is one of several callers, and the cost of the check is one string comparison inside a transaction the write already holds.
- **Refuse a missing plan as `not_found` (exit 4).** Rejected for `apply`: the caller named a plan it read, and a plan that is gone is a conflict with that read, the same class as a plan that changed. For `household` a missing plan keeps its `not_found`, which ADR-0021 gives a lookup miss, because no hash was named.

## Consequences

- `scenario apply` and `scenario household` each gain `--if-hash`, and `traj schema` publishes it. The notes on both leaves name 0.8.0, and each leaf lists `scenario_changed` in its `errorCodes`.
- The store raises `scenario_changed` itself, so `store/store-triggers.ts` has a trigger for it, and `contract.test.ts` checks the code against a real store path.
- A write without the flag is unchanged: the last writer wins, as before. The flag is opt-in for each caller, and the Dashboard always sends it (web ADR 0008).
- Retrying a refused write after a re-read is the caller's choice. The CLI never merges two documents.
