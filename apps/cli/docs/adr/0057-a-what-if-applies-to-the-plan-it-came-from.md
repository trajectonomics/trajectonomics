# A what-if is applied to the stored plan it came from, through the Overrides `projection run` applies

A what-if is a set of Overrides and Removals a projection applies transiently (cli ADR-0056). `scenario
fork` saves one as a new plan, and `scenario apply <name> --set/--without` saves one to the plan it came
from. The second needs no document: a page that wants to save its what-if as its own plan would rebuild
the Override grammar of ADR-0024 in the browser, and the two would drift. So the command reads the
stored document, applies the Overrides with the function `projection run` calls, and stores the result.
The stored hash after the write is therefore the `effectiveContentHash` `projection run` echoes for the
same flags, which the tests pin for a Set, a removal, and a decimal Set.

## Decisions

- **The form is chosen by its flags, never inferred from a document.** `--set` or `--without` with no
  `--file` is the what-if form. Beside `--file` or `--template` either is refused, at `--file` or at `--set` and `--without`,
  with a hint that names the what-if form. The hint is a `DocumentSpec` `exclusiveHints` entry, so the
  document form's own refusals keep their hint.
- **The Overrides are applied as `projection run` applies them.** The function, the decimal conversion,
  the refusals and their paths are the ones ADR-0024, ADR-0047 and cli ADR-0056 give; nothing is copied.
- **The write names the hash it read.** The stored plan is read first, and its `contentHash` is passed as
  the expected hash of the store's write, so a plan that moves between the read and the write is refused
  with `scenario_changed` and nothing is overwritten (ADR-0055). The store's transaction is the one that
  checks it, as it checks any other expected hash.
- **`--if-hash` is checked before any Override is read.** A stale hash is reported as stale, not as the
  Override it would have failed. A plan that is not stored is `scenario_changed` with a `null` stored hash
  when a hash was named, and `not_found` at `name` (exit 4) when none was, as ADR-0055 gives for a write.
- **Household anchors follow the store's write.** A Set that moves an anchored date is refused at its
  document path with the anchor, and a removed anchored item is listed in `droppedAnchors`, the same
  results `scenario fork` gives (ADR-0048).
- **An unchanged plan is the already-true write.** The result is `unchanged`, the command exits 0, and the
  stored row is not touched (ADR-0021). A dry run rolls the write back (ADR-0019).
- **The result is the apply's result plus the echo.** It carries `overrides` and `removals` beside the
  fields every apply prints. The document form's result does not gain them, so its output is unchanged.

## Considered options

A page that rebuilds the document and sends it through `--file` was rejected: it would reimplement the
Override grammar in the browser, and an Override that projects could then be refused at apply, or the
reverse. A separate `scenario what-if` command was rejected because a write to a plan is `scenario
apply`'s to make, and a second name for it would give one write two spellings. Passing a transform into
the store's save, as `scenario fork` does, was rejected: the expected hash gives the same guarantee for
one plan without widening the store's write API.

## Consequences

A caller that races another writer now sees `scenario_changed` in a case it could only have guessed at
before: the plan moved between the read and the write. Its hint names the stored hash and says to read the
plan again, as it does for `--if-hash`. The `--if-hash` gap ADR-0055 records for household writes does not
apply here, because the document is the thing being checked.
