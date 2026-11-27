import { type PlanPrice, plan } from "./types"

const DOCS = "https://opencode.ai/docs/go/"

/** OpenCode Go's two paid tiers; the monthly prices are stated on its Go page. */
export const opencodeGo: readonly PlanPrice[] = [
	plan("Go", 10, DOCS, "$10/month"),
	plan("Go Plus", 40, DOCS, "$40/month"),
]
