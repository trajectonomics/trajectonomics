# Separate and joint filing for a Thai married couple

Research for trajectonomics/trajectonomics#343. It answers who files what, and who claims which allowance, when both spouses have income. It cites primary sources only: the Revenue Code as the Revenue Department (RD) publishes it, RD Director-General notifications, an RD ruling, and RD's own FAQ pages. Every source was read on 2026-11-25.

Where the law is unclear, this file says so. It is not tax advice, and the engine's figures still need the cross-validation that `packages/core/tax/AGENTS.md` (Statutory Architecture Standard 10) requires.

## Sources

| Key | Source | URL |
|---|---|---|
| RC | Revenue Code, Chapter 3 (sections 38–64), the text in force, RD page updated 17-11-2026 | <https://www.rd.go.th/5937.html> |
| RC-index | Chapter 3 index, listing s.57 ter and s.57 quinque as repealed (ยกเลิก) | <https://www.rd.go.th/2597.html> |
| R-9627 | RD ruling 0702/9627 (11 November 2013), on a couple changing from joint to separate filing | <https://www.rd.go.th/49639.html> |
| N-136 | DG Notification on Income Tax No. 136 (parent allowance, s.47(1)(ญ)) | <https://www.rd.go.th/23368.html> |
| N-193 | DG Notification on Income Tax No. 193 (disabled dependant, s.47(1)(ฎ)) | <https://www.rd.go.th/44193.html> |
| N-242 | DG Notification on Income Tax No. 242 (repeals clause 4 of No. 182 from tax year 2012) | <https://www.rd.go.th/47997.html> |
| FAQ | RD FAQ "Clear Cut ประเด็นเด็ดเกร็ดลดหย่อน", updated 10-06-2021 | <https://www.rd.go.th/62777.html> |
| FAQ-old | RD FAQ "สาระพันปัญหา ค่าลดหย่อน" (older rates, pre-2017 rules) | <https://www.rd.go.th/47735.html> |

The RD's FAQ pages are guidance, not law. They are cited where the Code is silent, and the table below says which claims rest on them.

## The rule: s.57 sexies (มาตรา 57 ฉ)

Sections 57 ter and 57 quinque, under which a wife's income was the husband's and she could file only her s.40(1) income apart, were repealed by the Emergency Decree amending the Revenue Code (No. 18) B.E. 2555 for tax year 2012 onward (RC-index; R-9627). The rule in force is s.57 sexies, added by the same decree (RC, s.57 ฉ and its footnote). Its four paragraphs say:

1. Each spouse files a return (s.56) for the assessable income **they** received in the tax year.
2. Income that cannot clearly be attributed to one spouse counts as **half each**. For s.40(8) business income the spouses may instead split it as they agree, as long as the parts add up to the whole; if they do not agree, it is half each.
3. The spouses **may agree to file jointly**, treating one's income as the other's. Or one may **file separately only their s.40(1) income**, not counted as the other's. Either way both spouses are jointly liable for unpaid tax.
4. The method chosen under paragraphs 2 and 3 **for a tax year** is the method for that tax year, unless the Director-General approves a change.

So there are three ways for a couple who both have income to file. They match the three married statuses `ThFilingStatus` already has:

| `ThFilingStatus` | s.57 ฉ | What each return holds |
|---|---|---|
| `married_separate` | para 1 (the default) | Each spouse's return holds only their own income. |
| `married_joint` | para 3, first option | One return holds both spouses' income. |
| `married_separate_40_1_joint_rest` | para 3, second option | One spouse files their s.40(1) income alone; their other income joins the other spouse's return. |

R-9627 restates the same three options and shows a couple who filed jointly by mistake being approved to refile separately, each on "เงินได้พึงประเมินส่วนของตน" (their own assessable income).

## Q1. Who claims which allowance when spouses file separately

| Allowance | Separate filing | Joint filing | Source | How sure |
|---|---|---|---|---|
| Personal, s.47(1)(ก) | 60,000 each, on each return. | 120,000 together for (ก) and (ข): the taxpayer's 60,000 plus the spouse's 60,000. | RC s.47(1)(ก), s.47(2); FAQ "ผู้มีเงินได้" Q2 | Clear |
| Spouse, s.47(1)(ข) | None. Each spouse has income, so neither return claims the other as a spouse. | Part of the 120,000 above. | RC s.47(1)(ข), s.47(2); FAQ Q2 | Clear |
| Child, s.47(1)(ค) | **Each spouse claims the full allowance for each child**: 30,000, plus 30,000 more for a second or later legitimate child born in or after 2018. It is not halved. | Claimed once on the joint return. | RC s.47(1)(ค) as amended by Acts No. 44 (2017) and No. 46 (2018); FAQ "บุตร" Q4, Q7 ("หักบุตรได้ฝ่ายละ 30,000 บาท") | See note 1 |
| Parent, s.47(1)(ญ) | Each spouse claims **only their own** parents, 30,000 each. One parent is claimed by only one child in a year. | The joint return may claim both spouses' parents. | RC s.47(1)(ญ); N-136 clause 1(3), 1(5), 1(6); FAQ "บิดามารดา" Q1 item 4 | See note 2 |
| Parent health insurance | Each spouse for their own parents, up to 15,000, whatever the filing method. A policy several children pay is averaged among them. | The same. | FAQ "ประกันสุขภาพบิดามารดา" Q1 items 1, 7, 8 | FAQ only |
| Disabled dependant, s.47(1)(ฎ) | 60,000 per person, claimed by the taxpayer named as caregiver on the disability card. If several taxpayers are named, they agree in writing which one claims. Example: when only the wife is named for a disabled child, the wife claims under separate filing. | The joint return claims it. With the wife filing only her s.40(1) separately, she still claims it on her own return. | RC s.47(1)(ฎ); N-193 clause 1; FAQ "คนพิการ" Q4 | Clear for the caregiver rule; FAQ for the split statuses |
| Life insurance, s.47(1)(ง) | Each spouse claims their own premiums. | The Code also lets a taxpayer claim the spouse's premium within the same 10,000 base, when the marriage lasted the whole year. | RC s.47(1)(ง) para 2; FAQ "ประกันชีวิต" Q1 | See note 3 |
| Health insurance (own) | Each spouse claims their own. | Unclear how the joint return caps it; see note 3. | FAQ "ประกันสุขภาพผู้มีเงินได้" Q1 | FAQ only |
| Social security, s.47(1)(ฌ) | Each spouse claims their own contributions. | The spouse's contributions are deductible too when the marriage lasted the whole year. | RC s.47(1)(ฌ) para 2 | Clear |
| Provident fund, s.47(1)(ช) | Each spouse claims their own contributions. | The spouse's contributions are deductible too when the marriage lasted the whole year. | RC s.47(1)(ช) para 2 | Clear |
| RMF, SSF, ThaiESG, pension insurance | Each spouse claims their own purchases, against limits worked out on their own income. | Unclear; see note 4. | FAQ-old item 20 ("ภริยาสามารถซื้อได้ตามสัดส่วนของเงินได้ของตนเอง") | See note 4 |
| Mortgage interest, s.47(1)(ซ) | Co-borrowers average the interest by the number of borrowers, together no more than the interest paid and 100,000. If only one spouse has income, that spouse claims it all; a borrower with no income claims nothing. | Not stated for interest. For the first-home allowance RD says a joint return claims for the couple together (FAQ "บ้านหลังแรก" Q2), and we read interest the same way: one 100,000 ceiling. | RC s.47(1)(ซ); FAQ "ดอกเบี้ยเงินกู้ยืม" Q1 items 5–6, Q6 | FAQ for the split; joint case unclear |
| Pregnancy and birth (up to 60,000 a pregnancy) | When both spouses have income, the wife claims it. | Not stated. | FAQ "ฝากครรภ์" Q1 item 7 | FAQ only |
| Donations, s.47(7) | Each return computes its own 10% ceiling on what is left after its own allowances. | One ceiling on the joint return. | RC s.47(7) | Clear (it follows from one computation per return) |
| Standard expense, s.42 bis | **Each spouse has their own** 50%, capped at 100,000, for s.40(1)–(2) income, **even on a joint return**, when the marriage lasted the whole year. | The same. | RC s.42 bis para 2 (also s.42 ter para 2 for s.40(3)) | Clear |

**Note 1, the child allowance.** The statute names the claimant as "ผู้มีเงินได้" (the taxpayer), and s.47(1)(ค)(1) covers the taxpayer's own legitimate child or the spouse's. The 50/50 split for children was a rule of s.57 quinque, which is repealed (RC-index). RD's current FAQ says plainly that each parent with income claims 30,000. We read this as each return claiming in full, with no split to state. Two points stay open: the FAQ answers come from couples who both have income without naming the filing method, and no RD text read here covers the second-child amount under separate filing. Confirm both with RD (call centre 1161) or a recognised filing calculator before the engine relies on them.

**Note 2, parents.** N-136 still speaks of the repealed s.57 quinque. It says that when the wife files separately each spouse claims only their own parents, and when she does not, the return may claim both spouses' parents (clause 1(6)(ข)–(ค)). The FAQ restates the same split under the current wording ("หากภริยาแยกยื่นแบบเสียภาษี ให้ต่างฝ่ายต่างหักบิดา/มารดาของตน"). The notification has not been reissued against s.57 sexies, so the joint case rests on reading clause 1(6)(ข) across.

**Note 3, insurance on a joint return.** The Code lets a taxpayer claim the spouse's life premium "ตามเกณฑ์ในวรรคหนึ่ง" (within the same 10,000 base), while the FAQ limits that to a spouse with no income. The Code does not say whether two earners on a joint return each keep their own 100,000 life and health ceiling or share one. **Unclear.**

**Note 4, retirement and fund allowances on a joint return.** These are exemptions under Ministerial Regulation No. 126, capped at a percentage of income. The old FAQ says a wife buys RMF "in proportion to her own income" even on her husband's return. Whether a joint return applies each limit, and the 500,000 Retirement Cluster ceiling, once or per spouse is **not settled by any source read here.** The safest reading, and the one the design below can express, is per spouse.

## Q2. Which income may be filed separately and which must be combined

- **Separate filing (para 1)** is about each spouse's own income of every type, s.40(1)–(8). Nothing has to be combined.
- **Income that cannot be attributed** counts as half each (para 2). RD gives interest on a joint bank account as the example: it is split half to each spouse (FAQ "บิดามารดา" Q10). s.40(8) business income may be split as agreed.
- **Joint filing (para 3, first option)** combines all of both spouses' income on one return. Expenses under s.42 bis–ter stay per spouse (s.42 bis para 2).
- **`married_separate_40_1_joint_rest` (para 3, second option)** splits one spouse's income by type: their s.40(1) employment income goes on their own return, and their s.40(2)–(8) income joins the other spouse's return. The FAQ's disabled-child example names this case ("ภริยาเลือกนำเงินได้ 40(2) - (8) ไปยื่นรวมกับสามี ส่วนเงินได้ 40(1) ยื่นในนามตนเอง") and keeps the caregiver's 60,000 on the s.40(1) return. How the personal allowance, children and parents divide between the two returns in this status is **not stated** in any source read here.
- Separately: the income of a minor legitimate child counts as the father's income when the marriage lasted the whole year (RC s.40(4)(ข), the paragraph after it). This is outside #343.

## Q3. Can a couple switch each year, and who chooses

**Yes, year by year.** s.57 sexies para 4 fixes the chosen method "ในปีภาษีใด ... สำหรับปีภาษีนั้น": for the year it was chosen. Changing a year already filed needs the Director-General's approval (R-9627 is such an approval). Nothing ties one year's choice to the next.

**Recommendation: the plan states the choice, and `traj` shows what the other choice would cost.** The owner decided on 2026-11-23 that the plan chooses. The law agrees. The choice is the couple's, it carries a non-tax consequence (joint liability, para 3), and the cheaper option can change from year to year as incomes change. If the engine picked the cheaper option silently, the plan would hold a choice nobody made, and the result would depend on running both. The first build states one choice for the whole plan. A per-year choice can come later as its own step (cli ADR 0075).

## What this changes in the engine

- **Joint filing today is not fully right either.** #343 says joint filing works when both earners' income carries the standard labels. It does not apply s.42 bis para 2: with both salaries under one `income.section40_1` tally, the Levy caps the expense at 100,000 for the couple, where the law gives each spouse their own 100,000. A two-earner joint return over 200,000 of salary each is overstated by up to 100,000 of taxable income. So joint filing needs per-person labels too (tax ADR 0009).
- Separate filing needs one Levy per spouse over that spouse's labels, plus half of any shared income on each (tax ADR 0009).
- Allowances are stated per return as what that return claims, and the emitter divides nothing (tax ADR 0010).

## Design

- **tax**:
  - [ADR 0009](../adr/0009-a-levy-tallies-the-filers-of-one-return-through-filer-labels.md): Filer labels (`<label>@<filer>`) and `ThLevyProfile.filers`. A separate Return reads one Filer plus half of `@shared`. A joint Return reads two Filers, with expenses and fund caps computed per Filer.
  - [ADR 0010](../adr/0010-an-allowance-is-stated-as-what-one-return-claims-and-the-emitter-divides-nothing.md): each profile states what its own Return claims. A pure `thSeparateClaimProblems` checks the rules that span both Returns.
- **cli**:
  - [ADR 0075](../../../../../apps/cli/docs/adr/0075-a-two-earner-plan-states-its-filing-choice-and-scenario-tax-writes-one-levy-per-return.md): `--filing-status` is the filing choice. Joint writes one Levy over two Filers; separate writes one Levy per earner; the profile keeps one claim set per Return.
  - [ADR 0076](../../../../../apps/cli/docs/adr/0076-a-plan-item-names-its-owner-in-the-household-and-the-cli-writes-what-the-engine-reads.md): an Owner per Flow and Account, kept in the household beside the Anchors. The CLI writes the Filer suffix from it, and family sharing can reuse it.
- **web**: The Tax page puts a Return switch above its walk: "Joint", or one tab per spouse when the plan files separately. Each tab shows that Return's walk, brackets, rates and its own row in the every-year table, plus a combined line for the couple's total tax. The tax profile page shows the filing choice as two options with a sentence on what each means, and an allowance table with one column per spouse. Each cell holds the amount that Return claims, so a person can see at a glance that, say, the father's parents are on his Return, the disabled child is on the caregiver's, and both Returns claim the children. A cell refused by a cross-Return rule (a parent on both Returns) shows the CLI's message in place. The household editor gains an Owner picker (me, partner, both) on each Flow and Account. Every figure still comes from `traj` (web ADR 0002).

## Build steps

Each step ships and is useful on its own, in this order.

1. **tax: Filer labels and per-Filer joint expenses** (ADR 0009). Done when:
   - `emitThLevy` without `filers` emits a Levy byte-identical to today's (golden test);
   - a one-Filer Levy reads only `@<filer>` labels plus half of `@shared` under `married_separate`;
   - a two-Filer joint Levy gives each spouse their own s.42 bis ceiling, matching two calculator calls over a transcribed case with salaries of 300,000 and 400,000;
   - every invalid `filers` list is refused with its own field;
   - `bun run check` passes in `packages/core/tax`.
2. **tax: allowances per Return** (ADR 0010). Done when:
   - `married_joint` claims the spouse's parents;
   - `married_separate` refuses them;
   - `thSeparateClaimProblems` returns each code with one test per rule;
   - a transcribed separate-filing case, where each spouse claims the same two children in full, matches a recognised filing calculator;
   - the change log names the joint-parent fix.
3. **cli: Owners in the household** (ADR 0076). Done when:
   - `scenario household` accepts `owners` (household schema version 2);
   - a version 1 household reads unchanged;
   - backup, export and restore round-trip `owners`;
   - `scenario show` prints them;
   - a bad person or path is refused by name.
   No tax behaviour changes yet.
4. **cli: the filing choice** (ADR 0075). Done when:
   - `scenario tax --filing-status married_separate` on a two-earner household writes two Levies with Filer labels from the Owners, and `married_joint` writes one two-Filer Levy;
   - per-person allowance flags and `returns` round-trip through `--merge`;
   - `projection run` states `taxYears[]` with `levy` and `filer`, and a one-Levy plan's output is byte-identical;
   - carry-in, `projection allowances` and ADR-0066's profile rule work per Levy;
   - `bunx turbo run check --filter=@trajectonomics/cli --filter=@trajectonomics/web --concurrency=2` passes.
5. **web: Returns on the Tax and profile pages, Owners in the household editor** (paragraph above). Done when:
   - the demo Snapshot includes a separate-filing couple;
   - the Tax page switches between Returns;
   - the profile page shows who claims each allowance;
   - the phone-width browser check passes.
6. **Later, each its own issue:**
   - a note on what the other filing choice would owe;
   - a per-year filing choice (s.57 sexies para 4);
   - `married_separate_40_1_joint_rest` with two Filers, after an owner ruling on its allowances.
