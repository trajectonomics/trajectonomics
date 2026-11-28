# A `--set` may begin the estate block, and a rate out of range reads as a sentence

Status: accepted.

The Estate page (#366, #397) could offer Try only on a plan that already had an `estate` block. `--add` takes
`accounts`, `flows` and `milestones` (ADR-0062), and `--set estate=<json>` was refused as `No key or id "estate"`,
because a `--set` replaces what is there (ADR-0024). So a person could not try a first cost or gift before saving
one. Separately, a share over 100% was refused as `document.estate.costs.2.bps: RATE_OUT_OF_RANGE`, a code a
person has to look up (#398).

## Decision

- **A `--set` may begin one absent top-level block, whole.** `--set estate=<json>` writes the value as the
  document's `estate` when the document has none. The names that qualify are an explicit list,
  `BEGINNABLE_BLOCKS` in `src/scenario/set-begin.ts`: today `estate` alone. `set-begin.test.ts` fails when a name
  on it is not an optional object block the published schema declares, or has a household anchor, so the list
  cannot drift from `traj schema`. `calendar` is also an optional object block and is left off until a page needs
  it; a new block joins the list in the pull request that needs it.
- **One item key may also be begun** (ADR-0068): an asset Account's `volatility`, which a `--set` adds where the
  Account has none; ADR-0083 adds a Flow's `label` to the same list. A liability's, and any other absent key, is
  refused as below.
- **Nothing else changes.** A `--set` of a part of an absent block (`--set estate.costs=[...]`) is refused at the
  flag, with a hint to begin the block whole. Any other absent key is still `No key or id "…"`. A `--set` of a
  present `estate` replaces it whole, as it always did.
- **The guarantee of ADR-0062 holds.** The block is created by the one function a projection and a write share
  (ADR-0057), before the document goes to the engine's `check()`, so a projected plan is the saved plan and
  `scenario apply <name> --set estate=<json>` stores the `effectiveContentHash` a read echoes. A test pins both,
  with `--decimal`.
- **No household anchor can be involved.** An anchor names the date of an item in an id-addressed list
  (ADR-0048), and the estate block states no date, so no anchor path starts at `estate`; the test above checks it
  against the published shape. Beginning the block therefore adds nothing the Store re-applies on a save.
- **`--decimal` applies unchanged.** The value's money and shares are converted by walking the published schema
  from the `estate` path (ADR-0056, ADR-0064), whether or not the document holds the block.
- **`RATE_OUT_OF_RANGE` is worded by the field.** One code covers every rate and share, each with its own range,
  so `src/projection/refusal-rate.ts` picks the sentence and hint by the path the engine blames: an estate cost or
  gift share (0% to 100%), an Account rate, a growth `bps`, inflation, a spending rule's rate and a guardrail's band,
  and a Levy prepayment. A path with no entry of its own gets a general sentence. `Said.hint` may now be a
  function of the problem, as `message` is. The sentence reaches `scenario apply --file`, the Store, a `--set`,
  `--add` and a stored plan run without an override; `details[].code` keeps the code.
- **A `--set` refusal states the sentence too.** The document-after-overrides refusal used the code alone for every
  code; it now states the table's sentence and hint for a code the table words (this reaches the loan, rule and
  estate sentences as well), with the override hint after it.

## Considered options

- **`--add estate.costs` and `estate.gifts`.** Rejected: an estate line shares one id space across costs and gifts
  (the core refuses a repeat), the flag would need a nested list name and the creation of a block anyway, and an
  `--add` of an id removed in the same call has its own rule (ADR-0062). The `--set` is one rule in one place.
- **Any optional top-level block qualifies.** Rejected: it would open `calendar` without a need, and the list is
  the one place that says what a `--set` may create.

## Consequences

- The Dashboard can offer Try on a plan with no estate block, building `--set estate=<json>`; the Estate page's
  note that Try needs a saved line can go (a web follow-up).
- A reader that matched the code in the `message` of a document refusal must read `details[].code`.
