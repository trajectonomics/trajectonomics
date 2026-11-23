/*
 * The objects the published shape states as closed, as paths into the document `structure.test.ts`
 * carries, so each is probed closed by the core. A list index names the item that document holds:
 * flow 8 is the level loan, flow 11 the `currentRate` rule and flow 12 the `guardrails` one.
 */

/** Every object the schema states as closed, as a path into `FULL`, so each is probed closed. */
export const OBJECT_PATHS: (string | number)[][] = [
	[],
	["economy"],
	["accounts", 0],
	["flows", 0],
	["flows", 0, "prepayments", 0],
	["flows", 0, "cappedPrepayment"],
	["flows", 6, "derive"],
	["flows", 8, "level"],
	["flows", 11, "rule"],
	["flows", 11, "rule", "steps", 0],
	["flows", 11, "rule", "floor"],
	["flows", 11, "rule", "ceiling"],
	["flows", 12, "rule", "upper"],
	["flows", 12, "rule", "lower"],
	["milestones", 0],
	["milestones", 0, "criteria", 0],
	["cashflow"],
	["cashflow", "surplus", 0],
	["levies", 0],
	["levies", 0, "period"],
	["levies", 0, "settlement"],
	["calendar"],
]
