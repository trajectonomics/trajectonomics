import type { Example } from "../command"

/** The examples of `projection path`, each run in the tests (cli ADR-0043). */
export const PATH_EXAMPLES: Example[] = [
	{
		command:
			"traj projection path --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --return-model model.json --paths 200 --seed 0123456789abcdef --index 7 --json",
		description:
			"Market path 7 of a 200-path run, year by year: the same flags as projection chance, and the path's result as projection chance --outcomes lists it.",
	},
	{
		command:
			"traj projection path --scenario volatile --as-of 2026-03-31 --horizon 2027-03-30 --return-model plan --paths 200 --seed 0123456789abcdef --index 0 --breakdown",
		description:
			"The first path of a run drawn from the plan's own Return model, in the human form with each year's cash flow and the returns the path drew.",
	},
]
