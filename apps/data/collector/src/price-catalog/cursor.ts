import { type PlanPrice, plan } from "./types"

const PRICING = "https://cursor.com/pricing"

/** Cursor's four subscription tiers, each with the monthly price its page states. */
export const cursor: readonly PlanPrice[] = [
	plan("Plus", 8, PRICING, "$8/month"),
	plan("Premium", 30, PRICING, "$30/month"),
	plan("Super", 100, PRICING, "$100/month"),
	plan("Ultra", 200, PRICING, "$200/month"),
]
