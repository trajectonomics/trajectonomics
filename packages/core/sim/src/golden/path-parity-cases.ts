import { freelancer } from "../fixtures/freelancer"
import { freelancerChance } from "./chance-cases"
import { milestoneFreelancer } from "./milestone-cases"
import type { ParityCase } from "./parity-cases"

/** The per-path outcomes and fire dates of each Market path of the freelancer's chance (ADR 0011). */
export const PATH_PARITY_CASES: readonly ParityCase[] = [
	{
		name: "freelancer-chance-outcomes",
		fixture: freelancer,
		chance: { ...freelancerChance, outcomes: true },
	},
	{
		name: "milestone-freelancer-chance-dates",
		fixture: milestoneFreelancer,
		chance: { ...freelancerChance, milestoneDates: true, outcomes: true },
	},
]
