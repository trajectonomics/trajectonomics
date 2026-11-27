/**
 * The fields each plan-item form shows, as a refusal's path may name them. `shownProblems` matches a refusal against one of
 * these only under the whole path of the item the form edits, so a list here is also the closed set of fields a refusal can
 * land on.
 */

/** The fields of the Flow form: the Flow's own, and what its employer adds to a salary. */
export const FLOW_FIELDS = [
	"name",
	"displayLabel",
	"amount",
	"frequency",
	"start",
	"end",
	"growth",
	"rate",
	"earned",
	"category",
	"employerAccount",
	"employerShare",
	"employerRounding",
] as const

/** The fields of an Account form: its own, and a payout's and a fee's. */
export const ACCOUNT_FIELDS = [
	"name",
	"kind",
	"rate",
	"compounding",
	"lockedUntil",
	"payoutRate",
	"payoutFrequency",
	"payoutRounding",
	"payoutStart",
	"payoutKind",
	"feeRate",
	"feeRounding",
] as const
