import { freelancer } from "../fixtures/freelancer"
import { freelancerChance } from "./chance-cases"
import type { ParityCase } from "./parity-cases"

/** The outcomes of each Market path of the freelancer's chance hash identically under every engine (ADR 0011). */
export const PATH_PARITY_CASES: readonly ParityCase[] = [
	{
		name: "freelancer-chance-outcomes",
		fixture: freelancer,
		chance: { ...freelancerChance, outcomes: true },
	},
]
