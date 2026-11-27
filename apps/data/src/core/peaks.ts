/**
 * The peaks contract: each plan's busiest 5 clock hours, 7 UTC days and 30 UTC days, and the same
 * figures split by the tier each row ran on. The window math lives in `peaks-window.ts`, the plan
 * peaks in `peaks-plan.ts` and the tier split in `peaks-tier.ts`; this module is their public
 * surface.
 */

export {
	FIVE_HOURS,
	type PeakRow,
	type PlanPeaks,
	peaksByPlan,
	SEVEN_DAYS,
	THIRTY_DAYS,
} from "./peaks-plan"
export {
	type PlanTierPeaks,
	peaksByPlanAndTier,
	type TierPeaks,
} from "./peaks-tier"
export type { Peak } from "./peaks-window"
