/**
 * Where the money goes, and what moves between Accounts (cli ADR-0070), as the documents `traj schema scenario
 * apply` prints in its prose and a test proves the pinned core accepts beside the worked example. Every figure is a
 * stated example value, never a default: `traj` ships no share, floor or target, and a person writing their own
 * states theirs.
 */

/**
 * A routing that keeps an emergency fund at 200,000.00 THB in today's money, puts half of what is then left
 * into `index` up to a cap of 500,000.00 THB, and keeps the rest in `cash`; when money is short it draws
 * `index` first, then `cash` only down to 100,000.00 THB in today's money, then the last of it.
 */
export const ROUTING_CASHFLOW = {
	surplus: [
		{ account: "emergency", upTo: { amount: 20_000_000, growth: "inflation" } },
		{ account: "index", share: 5_000, upTo: 50_000_000 },
		{ account: "cash" },
	],
	contribute: [],
	withdraw: [
		"index",
		{ account: "cash", downTo: { amount: 10_000_000, growth: "inflation" } },
		"cash",
	],
} as const

/**
 * A transfer: a provident fund rolled whole into a locked RMF on a date. "All of it" is a `derive` graph that
 * reads the source, so it moves what the fund holds that day.
 */
export const TRANSFER_FLOW = {
	id: "roll-pvd",
	kind: "transfer",
	source: "pvd",
	target: "rmf",
	frequency: "once",
	start: "2030-06-30",
	derive: {
		measures: [{ id: "all", op: "account", account: "pvd" }],
		result: "all",
	},
} as const
