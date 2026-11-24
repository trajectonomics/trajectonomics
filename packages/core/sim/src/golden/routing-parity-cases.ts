import type { ParityCase } from "./parity-cases"
import {
	floorStopsDraw,
	floorThenFunds,
	lockedFloor,
	realFloor,
	realTarget,
	shareCapped,
	shareThenRest,
	topUpThenShare,
} from "./routing-cases"

const withBreakdown = { cashflowBreakdown: true } as const

/** Routing: share steps, withdrawal floors and targets in today's money, each with the breakdown (ADR 0030). */
export const ROUTING_PARITY_CASES: readonly ParityCase[] = [
	{ name: "routing-share-then-rest", fixture: shareThenRest, projectOptions: withBreakdown },
	{ name: "routing-share-capped", fixture: shareCapped, projectOptions: withBreakdown },
	{ name: "routing-top-up-then-share", fixture: topUpThenShare, projectOptions: withBreakdown },
	{ name: "routing-floor-then-funds", fixture: floorThenFunds, projectOptions: withBreakdown },
	{ name: "routing-floor-stops-draw", fixture: floorStopsDraw, projectOptions: withBreakdown },
	{ name: "routing-locked-floor", fixture: lockedFloor, projectOptions: withBreakdown },
	{ name: "routing-real-floor", fixture: realFloor, projectOptions: withBreakdown },
	{ name: "routing-real-target", fixture: realTarget, projectOptions: withBreakdown },
]
