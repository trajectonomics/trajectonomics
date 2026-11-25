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
- **An Account's label is written after the Levy.** The document refuses a label with no Levy (`LEVY_REQUIRED`), so an Account's `returnLabel` is stated after `scenario tax`, as a bare label, and `scenario tax --from-stored` writes its suffix. `scenario household`, `apply` and `fork --set` do not write or check suffixes in this step, so after changing the Owners, run `scenario tax --from-stored`; filling and refusing a suffix from them (ADR-0076) is a later step. `--none` is refused, as today, while an Account's label still needs the Levy.
- **The result.** `scenario tax` lists `filers` when it wrote any, and states nothing new otherwise, so a plan without Filers prints the bytes it printed.
- **Carry-in classes.** The Thai Levy of two Filers tallies 29 classes per Filer (22 income, 7 allowance) and only the 22 income classes under `@shared`, 80 in all, and one Filer gives 29 + 22 = 51. #508 first said 29 under `@shared`; an allowance is a person's own, and `thLevyTalliesFor` lists no shared allowance class. The classes come from the Levy's own measures, so `--carry-in` and its refusals need no CLI change beyond the description.

Both new refusals are `invalid_input`, exit code 2:

| Path | When | Details |
|---|---|---|
| `--filing-status` | a Filer's person id is not 1 to 32 lowercase letters, digits or hyphens | `field` (`people.<n>.id`) and `person`; the hint names `scenario household` |
| `document` | a taxed Flow or Account has no Owner, in a plan with a partner and Owners | `items` (`flows.<id>`, `accounts.<id>`); the hint names the `owners` form |

An id tax-core would refuse is found by asking `thFilerLabel`, so the pattern lives in one place. A person without income is never a Filer, so an unfit id of theirs is not refused.

**Hand check, pinned in `projection run`'s tests.** Salaries of 1,000,000 and 500,000 baht, two Owners, joint:
assessable 1,500,000; expenses 100,000 + 100,000 = 200,000 (s.42 bis); allowances 60,000 + 60,000 = 120,000; taxable 1,180,000; tax 0 + 7,500 + 20,000 + 37,500 + 50,000 + 45,000 = 160,000. The Levy over one label capped the couple at 100,000 of expenses: taxable 1,280,000, tax 185,000.
