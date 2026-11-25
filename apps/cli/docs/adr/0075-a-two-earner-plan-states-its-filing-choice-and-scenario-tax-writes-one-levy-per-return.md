# A two-earner plan states its filing choice, and `scenario tax` writes one Levy per Return

Status: Proposed (trajectonomics/trajectonomics#343).

The owner decided on 2026-11-23 that a plan with two earners chooses its filing: joint, or separate. Thai law lets a couple choose either method, freshly each tax year (s.57 sexies, [tax research](../../../../packages/core/tax/docs/research/separate-filing.md)). Today `scenario tax` writes one Levy, `th-2026-pit`, for one `--filing-status`, and one stored profile (ADR-0066).

## Decision

**The filing choice is the `--filing-status` the plan states. The CLI never picks it.** A household with a partner (ADR-0048) may state `married_joint` or `married_separate`. A household without a partner may not state either. `married_no_income_spouse` keeps its meaning (one earner, one Return).

**What is written:**

| Status | Levies | Filers (tax ADR 0009) |
|---|---|---|
| `single`, `married_no_income_spouse` | one, `th-2026-pit` | none (bare labels, as today) |
| `married_joint` with a partner | one, `th-2026-pit` | `[holder, partner]` |
| `married_separate` | two, `th-2026-pit@<holder>` and `th-2026-pit@<partner>` | one each |
| `married_separate_40_1_joint_rest` | refused with a partner, until the tax core supports it (tax ADR 0009) | none |

The Filer ids are the household's person ids. A plan that switches between joint and separate has its old Levies replaced, as any re-apply replaces the Levy today.

**Each income or contribution Flow is labelled for its Owner.** The CLI writes the Filer label (`income.section40_1@partner`) from the Flow's tax label and its Owner (ADR-0076). A caller still states the bare label (`--label salary=income.section40_1`), and the CLI adds the suffix. A Flow whose Owner is `shared` gets `@shared`. A taxed Flow with no Owner in a two-earner plan is refused by name, the way an unlabelled income Flow is refused today. A plan with no Filers keeps bare labels, so no stored single-earner document changes.

**The stored profile holds one claim set per Return.** `scenario.tax` (ADR-0066) gains an optional `returns` object keyed by person id. Each entry holds the allowances that Return claims, under the same keys as today's flat profile: `children`, `childrenAtHigherRate`, `parents`, `disabledCare`, `lifeInsurance` and the rest. The flat keys stay the joint or single Return's claims, so every stored profile reads as before. Allowance flags take an optional person: `--parents partner=2`, `--mortgage-interest me=40000`. A bare value names the holder. `--merge` merges per Return.
- **Defaults follow the research.** Under `married_separate`, each Return claims every child of the household unless the caller states otherwise, because RD says each parent with income claims the child in full (tax ADR 0010).
- **Before writing two Levies,** the CLI calls `thSeparateClaimProblems` and refuses each problem by its code at the flag that states it. It also refuses a disabled dependant claimed on both Returns, using the household's dependents.

**Every reader that knows `th-2026-pit` learns the set.** `TAX_LEVY_ID` becomes `taxLevyIds(document)`: the ids the CLI writes, found by prefix. The places that name it today are listed in #343's step 3: `projection/levies.ts`, `projection/carryin.ts`, `projection/carryin-needed.ts`, `scenario/apply-notes.ts`, and `scenario/tax/{holds,remove,index,assumptions,write,profile}.ts`.
- `projection run` states `taxYears[]` per Levy and adds `levy` and `filer` to each entry. A plan with one Levy keeps its output byte for byte.
- `projection allowances` (ADR-0061) answers per Return.
- `--carry-in` takes one record per Levy, as it already does.
- ADR-0066's rule that keeps the profile while the written Levy is canonically equal applies to the whole set: the profile is kept only if every CLI-written Levy is equal.

**What the other choice would cost is shown, not chosen.** `projection run` is not changed by this. A later step may add a note to a two-earner tax year saying what the other method would owe, computed by running a fork of the plan with the other status. It stays a statement, never a write. A per-year choice (s.57 sexies para 4) is also a later step: it needs a Levy whose period starts in a later year, which sim already supports with `period`.

## Considered options

- **The CLI picks the cheaper method each year.** Rejected. The owner decided the plan chooses. The choice carries joint liability for unpaid tax (s.57 sexies para 3), which is not a tax figure. Picking per year would also need every Projection run twice per year, and the second run's cash flows depend on the first.
- **A new flag `--filing joint|separate`.** Rejected. `--filing-status` already takes tax-core's own enum (ADR-0032), and a second flag for the same fact could disagree with it.
- **One Levy for a separate couple, with both Returns inside it.** Rejected. A Levy has one `due` and one Settlement, so a Carry-in, a Prepayment credit and a `taxYears[]` row could not say whose they are.

## Consequences

- The store schema does not move. `returns` is an optional key inside an existing JSON column.
- `traj schema` publishes the person-qualified allowance flags, and `scenario show` prints `returns`.
- The Dashboard's tax pages read per-Return figures (web step, #343).
