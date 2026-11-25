import type { ThLevyProfile } from "../levy/profile-types"
import { ThFinalWithholdingElection } from "../types"

/**
 * Profiles whose Levy, emitted without `filers`, is pinned byte for byte.
 *
 * Purpose: The Filer changes of tax ADR 0009 must not move a Levy that names no Filer.
 * Units: Profile amounts are THB major units.
 * @statute Jurisdiction-neutral test data; no statutory citation.
 */
export const GOLDEN_PROFILES: Readonly<Record<string, ThLevyProfile | undefined>> = {
	omitted: undefined,
	empty: {},
	single: { filingStatus: "single", allowances: { personal: 60_000, children: { totalCount: 1 } } },
	joint: {
		filingStatus: "married_joint",
		allowances: { personal: 60_000, spouse: 60_000, parents: 2, socialSecurity: 9000 },
		expenses: {
			section40_3: { election: "actual", actualExpense: 12_000 },
			section40_5: { building: { election: "actual", actualExpense: 30_000 } },
			section40_8: { entertainer: { election: "standard" } },
		},
		section40_4: {
			interest: ThFinalWithholdingElection.Final,
			dividends: ThFinalWithholdingElection.Include,
			dividendCorpTaxRate: 0.2,
		},
		levy: { id: "th-golden", period: { month: 4, day: 1 }, settlement: { month: 6, day: 30 } },
	},
	separate: { filingStatus: "married_separate", allowances: { donation1x: 5000 } },
}
