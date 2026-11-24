import type { Example } from "../command"

/** The examples of `projection chance`, each run in the tests (cli ADR-0043). */
export const CHANCE_EXAMPLES: Example[] = [
	{
		command:
			"traj projection chance --scenario volatile --as-of 2026-03-31 --horizon 2027-03-30 --return-model plan --paths 200 --seed 0123456789abcdef --json",
		description:
			"The chance from the plan's own return model: each asset Account's rate and volatility, with the inputs echoed as returnModel.",
	},
	{
		command:
			"traj projection chance --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --return-model model.json --paths 200 --seed 0123456789abcdef --json",
		description: "The success share and the net-worth Bands of one Scenario, as JSON.",
	},
	{
		command:
			"traj projection chance --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --return-model model.json --paths 200 --seed 0123456789abcdef",
		description: "The same chance in the human form: the success share and a few Bands.",
	},
	{
		command:
			"traj projection chance --scenario ruled --as-of 2026-03-31 --horizon 2029-03-30 --return-model model.json --paths 200 --seed 0123456789abcdef --json",
		description:
			"A Scenario with a spending rule: the Bands also say what the rule pays across Market paths, and the lowest year it pays in any path.",
	},
]
