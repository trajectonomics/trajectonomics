import { type PlanPrice, plan } from "./types"

const PRICING = "https://claude.com/pricing"

/** Anthropic's subscription prices, read from its pricing page. */
export const claude: readonly PlanPrice[] = [
	plan("Pro", 20, PRICING, "$20 if billed monthly."),
	plan("Max", 100, PRICING, '"$100" "Per month"'),
	plan("Ultra", 200, PRICING, '"$200" "Per month"'),
]
