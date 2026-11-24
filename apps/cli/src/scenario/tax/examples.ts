import type { Example } from "../../command"

/** The examples `scenario tax` prints; each runs in the tests, in order (ADR-0043). */
export const taxExamples: Example[] = [
	{
		command: "traj scenario tax base --tax th-2026 --label salary=income.section40_1",
		description: "Charge Thailand's 2026 income tax on the salary this Scenario declares.",
	},
	{
		command:
			"traj scenario tax base --tax th-2026 --filing-status married_joint --children 1 --label salary=income.section40_1",
		description: "The same Levy under a married-joint profile with one child.",
	},
	{
		command:
			"traj scenario tax base --tax th-2026 --filing-status married_no_income_spouse --life-insurance 20000 --mortgage-interest 30000 --social-security 9000 --donation1x 5000 --label salary=income.section40_1",
		description: "The same Levy with the deductions a Thai employee usually has.",
	},
	{
		command: "traj scenario tax base --merge --children 2",
		description: "Change the children counted and keep every other item of the stored tax profile.",
	},
	{
		command: "traj scenario tax base --from-stored",
		description:
			"Write the Levy again from the stored tax profile, for example after a tax-year update.",
	},
	{
		command: "traj scenario tax base --none",
		description: "Take the tax Levy and its stored profile out, so the figures are pre-tax again.",
	},
]
