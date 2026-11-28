import type { QuotaPlan } from "../types"

/**
 * The plans the hourly sampler reads a usage meter for, in plan-table order. `sampleQuota` samples
 * exactly these, and the Worker's Usage meters panel treats exactly these as metered.
 */
export const QUOTA_PLANS: readonly QuotaPlan[] = [
	"claude",
	"opencode-go",
	"antigravity",
	"cursor",
	"meta",
]
