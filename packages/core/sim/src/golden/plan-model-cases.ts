import { freelancer } from "../fixtures/freelancer"
import type { ParityCase } from "./parity-cases"

/** The freelancer's brokerage swinging 15 per cent a year, over a model the plan builds itself. */
const swinging: ParityCase["fixture"] = {
	...freelancer,
	scenario: {
		...freelancer.scenario,
		accounts: freelancer.scenario.accounts.map((account) =>
			account.id === "brokerage" ? { ...account, volatility: 1500 } : account,
		),
	},
}

/** Cases whose Return model `planReturnModel` builds, so the parity run hashes the builder too (ADR 0029). */
export const PLAN_MODEL_PARITY_CASES: readonly ParityCase[] = [
	{
		name: "freelancer-plan-chance",
		fixture: swinging,
		plan: { buckets: 64, seed: "0123456789abcdef", paths: 6 },
	},
]
