import type { Leaf } from "../command"

/**
 * The two `projection run` examples of the Reporting year and month breakdown (cli ADR-0043, ADR-0086),
 * split from `run-examples.ts` so neither file passes its length limit. Both run on the base plan.
 */
export const RUN_REPORTING_EXAMPLES: Leaf["examples"] = [
	{
		command:
			"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --breakdown-years --breakdown-months first --json",
		description: "The cash flow per calendar year, and the months of the first one.",
	},
	{
		command:
			"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --breakdown-months 2026 --year-start 4 --json",
		description: "The months of the Reporting year that begins on 1 April 2026.",
	},
]
