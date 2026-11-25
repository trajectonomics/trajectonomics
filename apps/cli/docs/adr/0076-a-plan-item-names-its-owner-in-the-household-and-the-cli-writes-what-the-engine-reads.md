# A plan item names its Owner in the household, and the CLI writes what the engine reads from it

Status: Proposed (trajectonomics/trajectonomics#343).

Separate filing needs to know whose income each Flow is, and whose account an interest or gain label belongs to (ADR-0075). Family sharing needs the same fact: whose money an account or a plan item is. No ownership ADR existed before this one. #343 named it as planned, and a search of the issues and every package's ADRs found nothing.

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
- **`person`** is a household person id with the role `holder` or `partner`, or the reserved value `shared` (both). A dependent owns nothing.
- Each path has at most one Owner. An item with no entry has no Owner.

**The CLI writes what the engine reads, the way Anchors write dates.** For a plan whose tax has Filers (ADR-0075), the Owner decides the Filer suffix of each Tally label:
- on an income or contribution Flow's `label`;
- on an Account's `returnLabel` and `gainLabel`, so the interest of a joint account is `@shared` and tallies half on each separate Return (tax ADR 0009).

An employer's share follows its salary's Owner, as it follows its dates (ADR-0048 as amended by #447).

The rules for when labels are written are ADR-0048's rules for Anchors:
- `scenario household` writes the labels.
- `scenario apply` and `fork --set` fill a missing suffix, keep an equal one, and refuse a different one at its path with the owner in `details`.
- An owner whose item the document no longer holds is dropped and listed in `droppedOwners`.

**The household keeps what the Owner means for people; the document keeps what the engine needs.** Nothing in `sim` learns about people. The suffix is a Tally label like any other, and `sim` ADR 0009 already treats a label as the unit of per-person scope.

**The ledger is not changed here.** Its accounts belong to the Personal entity. When family sharing needs whose ledger account is whose, its ADR should use the same word, Owner, and the same values (a person, or `shared`). That needs people at the ledger level, which this ADR does not create. A Baseline mapping from a ledger account to a plan Account can then carry the Owner across.

## Considered options

- **An `owner` field on Flows and Accounts in the Scenario document.** Rejected. It puts people in `sim`'s strict document, which ADR-0048 and ADR-0024 forbid.
- **The label suffix as the only record of the Owner.** Rejected. It exists only for taxed items in a two-Filer plan, so an untaxed account or a single-earner plan could state no Owner. Family sharing needs Owners on those too.
- **An Owner list in the tax profile.** Rejected. Ownership is not a tax fact, and family sharing would have to read the tax column.
- **Several owners with shares (60/40).** Rejected for now. The law knows a person's own income, and half each for what cannot be attributed (s.57 sexies para 2). A 60/40 split of s.40(8) income is an agreement a caller can state as two Flows.

## Consequences

- Household schema version 2 reads a version 1 household as one with no Owners, so no row is rewritten. Backup, export and restore carry `owners` as part of the household's canonical JSON. An older build refuses a version 2 household, as ADR-0038 refuses any layout it does not know.
- `scenario show` prints the Owners. The Dashboard's household editor gains an Owner picker per Flow and Account (web step, #343).
- A two-earner taxed plan cannot be written until its taxed Flows have Owners. The refusal lists them, with a hint naming the `owners` form.
