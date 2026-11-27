import { type PlanPrice, plan } from "./types"

const PRICING = "https://commandcode.ai/pricing"

/** Command Code's GOAT tier, the name the plan table's tier history uses. */
export const commandCode: readonly PlanPrice[] = [
	plan("GOAT", 10, PRICING, "$10/month+ processing fee"),
]
