/** The last problem codes, in a second list so that no file passes 100 lines. */
export const TAIL = [
	"RULE_NOT_EXPENSE",
	"RULE_PORTFOLIO_LIABILITY",
	"RULE_PORTFOLIO_ILLIQUID",
	"RULE_FREQUENCY",
	"RULE_FLOOR_ABOVE_CEILING",
	"ESTATE_ACCOUNT_LIABILITY",
	"EMPLOYER_INTO_LIABILITY",
	"EMPLOYER_INTO_ILLIQUID",
	"PAYOUT_ILLIQUID",
	"INVALID_BUCKETS",
	"SURPLUS_SHARE_LAST",
	"WITHDRAW_FLOOR_ORDER",
	/** Found at run time, not by `check()`: a value left the safe integer range. */
	"VALUE_OVERFLOW",
] as const
