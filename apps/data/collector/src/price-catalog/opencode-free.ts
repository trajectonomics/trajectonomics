import type { PlanPrice } from "./types"

/** A free plan has no subscription price and no page to cite for one. */
export const opencodeFree: readonly PlanPrice[] = [{ tier: "Free", usdMonth: 0, source: null }]
