# A plan item names its Owner in the household, and the CLI writes what the engine reads from it

Status: Proposed (trajectonomics/trajectonomics#343).

Separate filing needs to know whose income each Flow is, and whose account an interest or gain label belongs to (ADR-0075). Family sharing needs the same fact: whose money an account or a plan item is. #343 named an ownership ADR as planned, but a search of the issues and every package's ADRs found none, so this is the first.

ADR-0048 keeps people out of `sim`. The Scenario document stays `sim-core`'s, and the household lives beside it and writes dates into it as Anchors.

## Decision

**An Owner is stated in the household as an assignment, not in the document.** The household moves to `schemaVersion: 2` with a new list, `owners`:

```json
{ "owners": [
  { "path": "flows.salary", "person": "me" },
  { "path": "flows.partner-salary", "person": "partner" },
  { "path": "accounts.joint-savings", "person": "shared" }
] }
```

- **`path`** names an id-addressed item of the document: a Flow (`flows.<id>`), an Account (`accounts.<id>`), or a Contribution, which is a Flow. Liabilities may have Owners too, for family sharing, though no tax reads them.
- **`person`** is either a household person id whose role is `holder` or `partner`, or the reserved value `shared` (both). A dependent owns nothing.
- Each path has at most one Owner. An item with no entry has no Owner.
- **`shared` is reserved.** From schema version 2, the household refuses a person whose id is `shared`. This is `invalid_input`, exit code 2, at `people.<n>.id`. Other person ids keep the schema's rule, a non-empty string. An id that cannot be a Filer id (`[a-z0-9-]{1,32}`) is refused only when tax needs it (ADR-0075), so no household that reads today is refused.

**The CLI writes what the engine reads, the way Anchors write dates.** For a plan whose tax has Filers (ADR-0075), the Owner decides the Filer suffix of each Tally label:
- on an income or contribution Flow's `label`;
- on an Account's `returnLabel` and `gainLabel`. For example, the interest of a joint account is `@shared` and tallies half on each separate Return (tax ADR 0009).

An employer's share follows its salary's Owner, as it follows its dates (ADR-0048 as amended by #447).

**When labels are written** follows ADR-0048's rules for Anchors:
- `scenario household` writes the labels.
- `scenario apply` and `fork --set` fill a missing suffix and keep an equal one. They refuse a different one at its path, with the Owner in `details`.
- An Owner whose item the document no longer holds is dropped and listed in `droppedOwners`.

**The household keeps what the Owner means for people; the document keeps what the engine needs.** Nothing in `sim` learns about people. The suffix is a Tally label like any other, and sim ADR 0009 already treats a label as the unit of per-person scope.

**What an Owner does not say.** It does not mark a dependent as disabled, name a caregiver, or say whose parent a dependent is. The tax profile states those claims as counts (ADR-0075).

**The ledger is not changed here.** Its accounts belong to the Personal entity. When family sharing needs to know whose ledger account is whose, its ADR should use the same word, Owner, with the same values (a person, or `shared`). That needs people at the ledger level, which this ADR does not create. A Baseline mapping from a ledger account to a plan Account can then carry the Owner across.

## Considered options

- **An `owner` field on Flows and Accounts in the Scenario document.** Rejected. It puts people in `sim`'s strict document, which ADR-0048 and ADR-0024 forbid.
- **The label suffix as the only record of the Owner.** Rejected. The suffix exists only for taxed items in a plan with Filers, so an untaxed account or a single-earner plan could not state an Owner. Family sharing needs those Owners too.
- **An Owner list in the tax profile.** Rejected. Ownership is not a tax fact, and family sharing would have to read the tax column.
- **Several owners with shares (60/40).** Rejected for now. The law knows each person's own income, plus half each for income that cannot be attributed (s.57 sexies para 2). A 60/40 split of s.40(8) income is an agreement, which a caller can state as two Flows.

## Consequences

- The household schema check (`scenario/household/document.ts`, which today accepts only `schemaVersion: 1`) accepts versions 1 and 2. A version 1 household reads as one with no Owners, so no row is rewritten. A build without this change refuses a version 2 household at that same check.
- Backup, export and restore carry `owners` as part of the household's canonical JSON.
- `scenario show` prints the Owners, and the Dashboard's household editor gains an Owner picker per Flow and Account (web step, #343).
- Adding the first Owner to a two-earner taxed plan makes ADR-0075 require an Owner on every taxed Flow. The refusal lists the Flows that lack one, with a hint naming the `owners` form.

## Amended (#507): the household reads and stores Owners

Step 3 of separate filing builds the household's side only, and changes no tax behaviour. Its choices:

- **`owners` is stated in version 2 and refused in version 1.** A version 2 household states `owners`, an empty list when no item has an Owner, as it states `anchors`. A version 1 household with an `owners` key is refused at `owners` with a hint to set `schemaVersion` to 2. A version 1 household without one is stored as the same bytes it was, so a household that reads today never changes.
- **Refusals name their field.** A person whose id is `shared`, in a version 2 household, is refused at `people.<n>.id`; a version 1 household with such a person keeps reading. An Owner whose `person` is not in `people`, or is a dependent, is refused at `owners.<n>.person`. An Owner whose `path` is not `flows.<id>` or `accounts.<id>`, or repeats an earlier path, is refused at `owners.<n>.path`. `scenario household` also refuses a path whose Flow or Account the Scenario does not hold, at `document.owners.<n>.path`, the way it refuses an anchor.
- **A person id is not checked against the Filer pattern here.** That refusal belongs to the tax write (ADR-0075).
- **`apply` and `fork` carry `owners` as stored.** Dropping an Owner whose item left the document, and listing it in `droppedOwners`, comes with the label writes of the filing step, which are what make a stale Owner matter.

