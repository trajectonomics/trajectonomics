/**
 * The Carry-in the demo states: what the 2026 Levy period had already tallied before the As-of, 31
 * October 2026. The ledger paid ten salaries of 85,000.00 THB from January to October. Every other class
 * is zero, which `rest` states in one line.
 */
export function demoCarryIn(names: readonly string[]): unknown[] {
	return names.map((scenario) => ({
		scenario,
		levy: "th-2026-pit",
		periodStart: "2026-01-01",
		tallies: [{ label: "income.section40_1", basis: "gross", amount: "850000.00" }],
		prepaid: "0.00",
		rest: "0.00",
	}))
}

/**
 * The Carry-in of `separate`: one record per Return, each tallying that person's own salary label for the ten months
 * before the As-of. Every other class is zero, which `rest` states.
 */
export function demoSeparateCarryIn(): unknown[] {
	return [
		{ levy: "th-2026-pit@me", amount: "850000.00" },
		{ levy: "th-2026-pit@partner", amount: "420000.00" },
	].map(({ levy, amount }) => ({
		scenario: "separate",
		levy,
		periodStart: "2026-01-01",
		tallies: [
			{ label: `income.section40_1@${levy.slice("th-2026-pit@".length)}`, basis: "gross", amount },
		],
		prepaid: "0.00",
		rest: "0.00",
	}))
}
