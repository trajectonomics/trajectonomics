/** The method in the words a help page prints: what runs, and what the result does not say. */
export const ALLOWANCES_METHOD: string =
	"Runs the Scenario, then for each whole tax year the Projection holds (the current year included, a part of a year and a year that ended before the As-of left out) raises each contribution label, in the order given, by whole steps while a step still lowers the Levy's tax, never past a cap and within the budget. It reports the tax now and with every suggestion, and per label what is planned, how much more fits, what it saves and why it stopped. It writes nothing: each suggestion is a contribution Flow the caller applies. The figures are one plan's own tax rules, not tax advice, and each fund's holding rules are not checked."

/** The examples `help-examples.test.ts` runs in order on the base plan with the Thai Levy (cli ADR-0043). */
export const ALLOWANCES_EXAMPLES: readonly { command: string; description: string }[] = [
	{
		command:
			"traj projection allowances --scenario base --as-of 2026-01-01 --horizon 2027-12-31 --labels allowance.retirement.rmf,allowance.thai_esg --step 10000 --json",
		description:
			"How much more RMF then ThaiESG would still lower each tax year's tax, in steps of 10,000, as JSON.",
	},
	{
		command:
			"traj projection allowances --scenario base --as-of 2026-01-01 --horizon 2027-12-31 --labels allowance.retirement.rmf --step 10000 --budget 50000 --min-saving 10",
		description:
			"The same for RMF alone, at most 50,000 more a year and only while a step saves 10% of itself, in the human form.",
	},
]
