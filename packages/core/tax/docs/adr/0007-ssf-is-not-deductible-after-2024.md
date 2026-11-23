# SSF Is Not Deductible for Income Received After 31 December 2024

Checked 2026-11-23 against primary sources (trajectonomics/trajectonomics#370). The Thai Levy and calculator for the 2026 tax year allow nothing on the SSF label; the label stays so older plans still check.

## The rule

The Super Savings Fund (SSF, กองทุนรวมเพื่อการออม) deduction is an exemption in clause 2(102) of Ministerial Regulation No. 126 (B.E. 2509), added by Ministerial Regulation No. 357 (B.E. 2563). The clause carries its own end date:

> ทั้งนี้ สำหรับเงินได้พึงประเมินที่ได้รับตั้งแต่วันที่ 1 มกราคม พ.ศ. 2563 ถึงวันที่ 31 ธันวาคม พ.ศ. 2567

"This applies to assessable income received from 1 January 2020 to 31 December 2024." The Revenue Department's own Q&A says the same: "เฉพาะการซื้อหน่วยลงทุนตั้งแต่วันที่ 1 มกราคม 2563 ถึงวันที่ 31 ธันวาคม 2567" (only units bought from 1 January 2020 to 31 December 2024).

| Tax year | SSF purchase deductible | Rate and ceiling | Counts in the 500,000 baht combined retirement cap |
| --- | --- | --- | --- |
| 2020 to 2024 | Yes | 30 per cent of assessable income, at most 200,000 baht | Yes: with PVD, GPF, teacher fund, RMF, pension life insurance and the National Savings Fund |
| 2025 and later | No | none | No: it takes no deduction, so it uses none of the cap |

Transition and clawback, which the Levy does not model because they concern units already bought:

- Units bought in 2020 to 2024 keep the deduction already taken only if held at least ten years from the purchase date (death or disability excepted). A sale earlier loses the exemption and the deduction taken must be added back to income (clause 2(102) and 2(103); Ministerial Regulation No. 363 (B.E. 2563) para. 3-4 for the special SSF).
- Gain on units held ten years is exempt on redemption (clause 2(103)).
- No regulation reads or amends clause 2(102) to extend the end date. The Revenue Department's list of Ministerial Regulations runs to No. 405 (B.E. 2569); Nos. 390 to 405 were read and none touches SSF. No. 395 (B.E. 2567) and No. 398 (B.E. 2568) concern ThaiESG and ThaiESGX, the funds that continue.

## Decision

`TH_2026_PARAMETERS.allowances.retirementCluster.ssf` is `{ maxRate: 0, ceiling: 0 }`. The calculator and the Levy both clamp an SSF contribution to zero allowed, so the one parameter fixes both. The label `allowance.retirement.ssf` and the `ssf` allowance input stay accepted. The two SSF rows leave the unconfirmed-figures list and are `match` in `references/th/SOURCES.md`; the `claim.ssf` fact is removed with them, since a claim no longer relies on an unconfirmed figure.

This package emits only the 2026 year, so tests assert 2026 (`src/th/tests/ssf-after-2024.test.ts`). A package that emits an earlier year (2024 or before) must give that year its own 30 per cent and 200,000 baht figures, which this record sources.

One path already reaches an earlier year: the CLI also charges the tax year before the As-of with this 2026 Levy while that year's settlement date is still ahead (`carryInStarts` in `apps/cli/src/projection/periods.ts`). An As-of from 1 January to 31 March 2025 therefore taxes 2024 with SSF allowing nothing, which overstates 2024 tax for a person who bought SSF that year. Reusing the one emitted Levy for the year before was already an approximation; SSF is where it now shows.

## Sources

| Source | Read |
| --- | --- |
| Revenue Department, "กฎกระทรวงฉบับที่ 126" (consolidated text, clause 2(102) and 2(103)): https://www.rd.go.th/2502.html | 2026-11-23 |
| Ministerial Regulation No. 357 (B.E. 2563), Royal Gazette vol. 137 part 19 ก, 10 March 2563, pp. 4-5: https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/mr357.pdf | 2026-11-23 |
| Revenue Department, "Clear Cut ประเด็นเด็ดเกร็ดลดหย่อน", SSF Q&A: https://www.rd.go.th/62777.html | 2026-11-23 |
| Revenue Department, list of Ministerial Regulations (Nos. 390 to 405): https://www.rd.go.th/6160.html | 2026-11-23 |
