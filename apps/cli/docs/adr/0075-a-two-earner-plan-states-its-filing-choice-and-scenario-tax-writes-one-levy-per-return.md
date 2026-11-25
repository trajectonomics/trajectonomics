# A two-earner plan states its filing choice, and `scenario tax` writes one Levy per Return

Status: Proposed (trajectonomics/trajectonomics#343).

The owner decided on 2026-11-23 that a plan with two earners chooses its filing: joint, or separate. Thai law lets a couple choose either method, freshly each tax year (s.57 sexies, [tax research](../../../../packages/core/tax/docs/research/separate-filing.md)). Today `scenario tax` writes one Levy, `th-2026-pit`, for one `--filing-status`, with one stored profile (ADR-0066).

## Lead decisions (2026-11-25)

- **(a) Nothing changes without a partner and Owners.** A plan whose household has no partner, or has no `owners` entries (ADR-0076), writes exactly what it writes today for every filing status: bare labels, one Levy `th-2026-pit`, and the stored profile as it is. Only a plan with both gets Filers.
- **(b) Children default to 0 on a separate Return.** Under `married_separate` with Filers, each Return's `children` defaults to 0, as the flat profile's does. `scenario show` reports the allowance as unstated, as ADR-0073 does for any allowance the plan does not state.

## Decision

**The filing choice is the `--filing-status` the plan states. The CLI never picks it.** `married_no_income_spouse` keeps its meaning: one earner, one Return.

**What is written** for a household with a partner and at least one Owner:

| Status | Levies | Filers (tax ADR 0009) |
|---|---|---|
| `single`, `married_no_income_spouse` | one, `th-2026-pit` | none (bare labels, as today) |
| `married_joint` | one, `th-2026-pit` | the holder and the partner, each only if they have income |
| `married_separate` | one per Filer with income, `th-2026-pit@<person>` | one each |
| `married_separate_40_1_joint_rest` | one, `th-2026-pit`, as today | none (bare labels), until tax ADR 0009's later step |

- **A Filer has income** when at least one labelled Flow or Account is owned by that person, or by `shared`. A Levy is written only for a Filer with income. Otherwise sim refuses the Levy as `UNSUPPLIED_TALLY_LABEL`: a partner with no income would get a Levy whose every tally is empty.
- **Switching** between joint and separate replaces the old Levies, as any re-apply replaces the Levy today.

**Each income or contribution Flow is labelled for its Owner.**
- The CLI writes the Filer label (`income.section40_1@partner`) from the Flow's tax label and its Owner. A caller still states the bare label (`--label salary=income.section40_1`), and the CLI adds the suffix.
- A Flow owned by `shared` gets `@shared`.
- An Account's `returnLabel` and `gainLabel` get the suffix the same way.

**Prepayments follow their Flow.** Today a salary Flow's Prepayments credit `th-2026-pit`.
- Under `married_separate`, the CLI re-points each Prepayment to the Levy of the Flow's Owner when it writes.
- A `shared` Flow's Prepayment is split into two entries at half the basis points each, one per Levy. Any odd basis point goes to the holder's Levy, so the total is unchanged.
- Under `married_joint` the Prepayments keep naming `th-2026-pit`.

**The stored profile holds one claim set per Return.**
- `scenario.tax` (ADR-0066) gains an optional `returns` object keyed by person id. It is written only for `married_separate` with Filers.
- Each entry holds the allowances that Return claims, under the same keys as today's flat profile: `children`, `childrenAtHigherRate`, `parents`, `disabledCare`, `lifeInsurance` and the rest. Each key defaults to 0, children included (decision b).
- The flat keys stay the joint or single Return's claims, so every stored profile reads as before.
- Allowance flags take an optional person: `--parents partner=2`, `--mortgage-interest me=40000`. A bare value names the holder, and `--merge` merges per Return.
- **The cross-Return check.** Before writing two Levies, the CLI calls `thSeparateClaimProblems` (tax ADR 0010) and refuses each problem at the flag that states it. That function checks only what counts can show. The CLI does **not** check that one parent or one disabled dependant appears on one Return only: the household's dependents carry no disabled flag, caregiver or "whose parent", so the caller states those claims correctly. A stored per-slot form is a later step.

**New refusals.** Each is `invalid_input`, exit code 2, at the path named:
- `--filing-status`: `married_joint` or `married_separate` for a household with Owners and a person id unfit as a Filer id (`[a-z0-9-]{1,32}`). The hint names `scenario household` to rename the person.
- `document`: a taxed Flow with no Owner, in a plan with a partner and Owners. The refusal lists the Flows, the way an unlabelled income Flow is refused today.
- each allowance flag: a person-qualified value (`--parents partner=2`) whose person is not the holder or the partner, or that is used without `married_separate` and Filers.
- the allowance flag, for each `thSeparateClaimProblems` code (`OWN_PARENTS_OVER_TWO`, `MORTGAGE_OVER_CEILING`).

**Every reader that knows `th-2026-pit` learns the set.** `TAX_LEVY_ID` becomes `taxLevyIds(document)`: the ids the CLI writes, found by prefix. These files name it today:
- `scenario/tax/levy.ts` (where it is declared);
- `projection/levies.ts`, `projection/carryin.ts` and `projection/carryin-needed.ts`;
- `scenario/apply-notes.ts`;
- `scenario/tax/{holds,remove,index,assumptions,write,profile}.ts`.

What each reader does with the set:
- `projection run` adds `levy` and `filer` to each `taxYears[]` entry **only for a plan with Filers**. A plan without them, which includes every plan today, keeps its output byte for byte.
- `projection allowances` (ADR-0061) answers per Return.
- `--carry-in` takes one record per Levy, as it already does. A Filer Levy's classes are its Filer labels: 29 per Filer plus the 22 income classes under `@shared`, where a Levy today has 29 (corrected in #508 below).
- ADR-0066's rule that keeps the profile while the written Levy is canonically equal applies to the whole set. The profile is kept only if every CLI-written Levy is equal.

**What the other choice would cost may be shown, never chosen.** A later step may add a note to a two-earner tax year saying what the other method would owe, computed by running a fork with the other status. A per-year choice (s.57 sexies para 4) is also a later step.

## Build order

1. **4a, joint:** one Levy, two Filers. It fixes each spouse's own expense ceiling (tax ADR 0009) and has no Prepayment or `returns` work.
2. **4b, separate:** several Levies, Prepayment re-pointing, `returns`, per-person flags and the per-Levy readers.

## Considered options

- **The CLI picks the cheaper method each year.** Rejected. The owner decided that the plan chooses. The choice carries joint liability for unpaid tax (s.57 sexies para 3), which is not a tax figure. Picking per year would also need every Projection run twice per year, and the second run's cash flows depend on the first.
- **A new flag `--filing joint|separate`.** Rejected. `--filing-status` already takes tax-core's own enum (ADR-0032), and a second flag could disagree with it.
- **One Levy for a separate couple, with both Returns inside it.** Rejected. A Levy has one `due` and one Settlement, so a Carry-in, a Prepayment credit and a `taxYears[]` row could not say whose they are.
- **Refusing `married_separate_40_1_joint_rest` for a household with a partner.** Rejected. It works today with bare labels, and decision (a) keeps it working.

## Consequences

- The store schema does not move. `returns` is an optional key inside an existing JSON column.
- `traj schema` publishes the person-qualified allowance flags, and `scenario show` prints `returns`.
- The Dashboard's tax pages read per-Return figures (web step, #343).

## Amended (#508): step 4a, the joint Return

The first build writes one Levy `th-2026-pit` over the Filers of a `married_joint` Return and nothing else of this ADR. The Levy's id, `TAX_LEVY_ID`, stays one id, so `taxLevyIds` and every reader of the set, `projection run`'s `filer` field, `returns`, per-person flags and Prepayment re-pointing wait for step 4b.

- **When Filers are written.** `--filing-status married_joint`, a household with a `partner`, and at least one Owner whose Flow or Account the document still holds. Any other plan, including every plan today, writes bare labels, one Levy and the stored profile as before; `married_separate` is among them until 4b. The Filers are the holder and the partner, in that order, each only if a taxed item is theirs or `shared`; a `shared` item gives both. A plan with no taxed item at all has no Filers and fails as it does today.
- **What is taxed.** A Flow of kind income or contribution whose label is one tax-core reads, and an asset Account's `returnLabel`, `gainLabel` and `payout.label`. The CLI adds the suffix to the bare label (`income.section40_1@me`) from the Owner of `flows.<id>` or `accounts.<id>`, and takes a suffix off again before it reads a label back, so a write is idempotent, and a write under another status, or `--none`, leaves the bare labels. An employer's share carries no label, so it needs no Owner.
- **An Account's label is written after the Levy.** The document refuses a label with no Levy (`LEVY_REQUIRED`), so an Account's `returnLabel` is stated after `scenario tax` and `scenario tax --from-stored` writes its suffix. On a Levy over Filers, `apply` and `fork --set` refuse a bare label or one with a suffix that is neither a Filer of `th-2026-pit` nor `shared`, and `projection run` refuses a tax label no Levy reads, instead of taxing it at zero; the hint names `traj scenario tax <name> --from-stored`, which writes the suffix from the household's Owners. `scenario household` itself still writes no suffix, so after changing the Owners, run `scenario tax --from-stored`. `--none` is refused, as today, while an Account's label still needs the Levy.
- **The Dashboard reads suffixed labels as taxed, and per-Filer allowance reads wait for step 5.** The Tax profile page takes a suffixed known label as labelled, so `TaxProfileActions` no longer hides every edit on a joint Return. Allowance reads that name each Filer's own ceiling arrive with step 5 of #343; a joint Return's allowances page shows that sentence instead of a read whose bare labels `traj` now refuses.
- **Known 4a limit: the partner's `joins` date is ignored.** A household partner with `joins` in the future is still a Filer for the whole plan (`couple()` in `scenario/tax/filer-scope.ts` finds the holder and the partner without reading a joining date).
- **The result.** `scenario tax` lists `filers` when it wrote any, and states nothing new otherwise, so a plan without Filers prints the bytes it printed.
- **Carry-in classes.** The Thai Levy of two Filers tallies 29 classes per Filer (22 income, 7 allowance) and only the 22 income classes under `@shared`, 80 in all, and one Filer gives 29 + 22 = 51. #508 first said 29 under `@shared`; an allowance is a person's own, and `thLevyTalliesFor` lists no shared allowance class. The classes come from the Levy's own measures, so `--carry-in` and its refusals need no CLI change beyond the description.

Every new refusal in this amendment is `invalid_input`, exit code 2:

| Path | When | Details |
|---|---|---|
| `--filing-status` | a Filer's person id is not 1 to 32 lowercase letters, digits or hyphens | `field` (`people.<n>.id`) and `person`; the hint names `scenario household` |
| `document` | a taxed Flow or Account has no Owner, in a plan with a partner and Owners | `items` (`flows.<id>`, `accounts.<id>`); the hint names the `owners` form |
| `document` | `apply` or `fork --set` states a bare label on a Levy over Filers, or one whose suffix is neither a Filer of `th-2026-pit` nor `shared` | `items` (`flows.<id>`, `accounts.<id>`); the hint names `traj scenario tax <name> --from-stored` |
| `document` | `projection run` states a tax label no Levy in the plan reads, when the plan holds a Levy | `items` (`flows.<id>`, `accounts.<id>`); the hint names `traj scenario tax <name> --from-stored` |

An id tax-core would refuse is found by asking `thFilerLabel`, so the pattern lives in one place. A person without income is never a Filer, so an unfit id of theirs is not refused.

**Hand check, pinned in `projection run`'s tests.** Salaries of 1,000,000 and 500,000 baht, two Owners, joint:
assessable 1,500,000; expenses 100,000 + 100,000 = 200,000 (s.42 bis); allowances 60,000 + 60,000 = 120,000; taxable 1,180,000; tax 0 + 7,500 + 20,000 + 37,500 + 50,000 + 45,000 = 160,000. The Levy over one label capped the couple at 100,000 of expenses: taxable 1,280,000, tax 185,000.

## Amended (2026-11-25): step 4b, the separate Return

`married_separate` now writes one Levy per Filer that has income, and the stored profile gains
`returns`. The rest of the ADR is unchanged.

- **Levy ids.** A separate Return writes `th-2026-pit@<person>`, one per Filer. `isTaxLevyId` owns the
  pattern (the bare id, or the id and an `@` suffix), and `taxLevyIds` lists a document's set. A
  joint or bare Return still writes the bare `th-2026-pit`.
- **Which Filers.** A Filer has income when a taxed Flow or Account is theirs or `shared`, as for the
  joint Return. A plan with no taxed item, no partner or no Owners keeps the bare labels and the one
  Levy, so its output is byte-identical.
- **Labels and Prepayments.** Each taxed item's label takes its Owner's suffix, `shared` included. A
  write first takes every Prepayment of a tax Levy back to the bare id, then, for a separate Return,
  points each at the Levy of its Owner. Only an entry naming `th-2026-pit` or `th-2026-pit@…` moves: a
  Prepayment of another Levy, plain or capped, is never touched. An asset Account's `payout` moves its
  Prepayments as a Flow does, by the Account's Owner.
  - A `shared` item's plain share is split half to each Levy and the odd basis point goes to the
    holder's, so the total is unchanged. Joining sums the halves into one entry where the first stood,
    so a switch to joint or to `--none` restores the basis points, and a plan without Filers keeps the
    order of its entries and its bytes.
  - A `shared` Flow's **capped** Prepayment stays whole on the holder's Levy. A Flow states one
    `cappedPrepayment`, so it cannot be split, and halving it would lose basis points for good.
    Refusing it was the other choice: rejected, because the household's total credit is the same and
    the caller would have no way to file separately without dropping the withholding.
- **The stored `returns`.** `scenario.tax` gains an optional `returns`, an object keyed by person id.
  A separate Return with Filers writes one entry per Filer: `children`, `childrenAtHigherRate` and the
  deductions it states, under the flat profile's keys; every key defaults to 0, children included, and
  a zero deduction is left out, as the flat profile does. The flat keys are the holder's claims, so
  `scenario show` and every earlier reader read the same fields. The holder's Return is always taken
  from them, on `--merge` and on `--from-stored`, so a profile written before the plan had Owners
  gives it the holder's claims. The holder's entry in `returns` records what their Return claimed and
  is never read back: it can be older than the flat keys, and reading it would understate the tax.
- **Whose claims the flat keys are.** "The holder" is a role the household can give the other person,
  so the profile gains an optional `claimsHolder`, the id of the person whose claims the flat keys are.
  Without it, a swap would give the new holder the old one's claims while the old one's entry kept
  them: one claim on two Returns.
  - It is recorded by the first write of a plan with Filers, as the household's holder, and every later
    write keeps it. A plan that never had Filers records nobody and keeps its bytes. A write of the
    whole profile (`--tax`) states it anew.
  - When a `married_separate` write finds that the household's holder is not the recorded person, the
    flat keys go to the recorded person's entry in `returns`, the new holder takes their own entry, or
    nothing, and `claimsHolder` becomes the new holder. Flags then apply to the result, so a bare value
    names the new holder.
  - A write under any other status moves nothing. Its one Return's claims are the flat keys whoever the
    holder is, and moving them would change that Return's tax. They stay recorded as before, and a
    later separate filing moves them. A value a caller changes meanwhile goes with them.
    Once a separate write has moved them, a later joint or single Return reads the new holder's
    claims, which can differ from the same Return written before the swap.
  - A write with no household, which names no holder, moves nothing and keeps the record, so a swap
    made while the household is gone is still seen.
  - With no `claimsHolder`, as in a profile written before it was recorded, the flat keys are the
    current holder's.
  - The record names a person by id. A holder given a new id reads as another person: the flat claims
    stay under the old id, and the new one's Return starts from nothing until the caller states them.
- **`returns` across a status or household change.** `--merge` and `--from-stored` keep every item
  they are not told to change (ADR-0066). So a write keeps each Filer's entry, and every other entry
  that claims something, whatever the filing status and also while the household names no partner or
  the plan has no household. The one exception is the person the flat keys are the claims of
  (`claimsHolder`, else the holder): with no Return of their own, they need no entry. No Levy reads a
  kept entry; a later separate filing takes it back. A write of the whole profile (`--tax`) states it
  whole, so it keeps no earlier entry.
- **Per-person flags.** Each profile flag takes `[<person>=]<value>` and may be repeated, so
  `--parents partner=2 --parents me=1` states both Returns. A bare value names the holder. `--merge`
  merges into the stored `returns`, and `--from-stored` keeps them. Each of these is refused at the
  flag, as `invalid_input`:
  - a person-qualified value without `married_separate` and Filers;
  - on `married_separate` with a partner, a person who is neither the holder nor the partner;
  - a value for a person who is not a Filer, because no Levy is written to carry it. That includes a
    bare value on a separate filing whose holder has no income. Claims the profile already holds for
    such a person stay stored and no Return carries them;
  - a bare value beside the holder's own id on one flag, which states the holder twice;
  - a count that is not a safe integer or is too large for tax-core to compute a Return with, or an
    amount that is not a safe number of satang, with the message "The value is outside its allowed
    range.". Counts that are too large only together are refused so at the last count flag stated.
- **The cross-Return check.** Every separate Return with Filers, of one Filer or two, goes through
  `thSeparateClaimProblems` (tax ADR-0010) before its Levies are written, `--merge` and `--from-stored`
  included. `OWN_PARENTS_OVER_TWO` is refused at `--parents`, with `details` naming the `problem` and
  the `persons`.
- **The shared home-loan ceiling is an assumption, not a refusal.** This replaces the
  `MORTGAGE_OVER_CEILING` refusal above. The 100,000 baht that two Returns share is for one loan
  borrowed together, and each person's own other home loans still count toward their own 100,000. A
  liability has no kind and a claim names no loan, so the plan cannot say which loan the interest is
  on. Refusing would force a caller to mis-state an Owner or to claim less than the law allows. So the
  CLI does not tell the function that a mortgage is shared, and each Return has its own ceiling. When
  there are two Filers, both state mortgage interest and the household names `shared` as the Owner of a
  liability Account, the write's `assumptions` say on `allowances.mortgageInterestCeiling` that each
  Return's interest is taken to be on separate loans.
  - Follow-up: an explicit `--mortgage-interest shared=<amount>`, split half to each Return, would let
    the caller state a loan borrowed together, and the shared ceiling could then be checked.
- **The readers of the set.** `--carry-in` takes one record per Levy and treats any `th-2026-pit@…`
  id as the CLI's own, so a past period needs no record of the caller's. `projection allowances` scans
  every Levy and names the Levy and the Filer label each row read. ADR-0066's rule keeps the stored
  profile only while the written set of Levies is canonically equal to the stored set. `projection run`
  adds `filer` to each `taxYears[]` entry, from the Levy id, only when the plan has Filers; the `levy`
  field was already there, and a plan without Filers keeps its bytes.
- **The write check reads the Levy's own labels.** `filerLabelRefusal` accepts a label only when one of
  the document's tax Levies tallies it exactly (trajectonomics/trajectonomics#561). A bare label still
  fails, and so does `allowance.retirement.rmf@shared`, which no Levy reads: the check and the
  projection now agree instead of the second refusing what the first stored. The Dashboard's
  `isFilerPlan` reads the same rule from `document.levies`, so a plan whose labels are all bare but
  whose Levy tallies suffixes is still a Filer plan.
