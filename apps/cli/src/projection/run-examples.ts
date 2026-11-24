import type { Leaf } from "../command"

/** The help examples of `traj projection run` (cli ADR-0043): each runs against the projection fixture. */
export const RUN_EXAMPLES: Leaf["examples"] = [
	{
		command: "traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --json",
		description: "The annual roll-up of one Scenario.",
	},
	{
		command:
			"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --set flows.salary.amount=9000000 --monthly",
		description: "Try a raise without forking, and read the monthly rows.",
	},
	{
		command:
			"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --breakdown --json",
		description:
			"The annual roll-up with each year's cash flow by source, tax, category and Account.",
	},
	{
		command:
			"traj projection run --scenario car-loan --as-of 2026-03-31 --horizon 2027-03-30 --liabilities --json",
		description:
			"The annual roll-up of a Scenario that borrows, with each loan's month by month and its paid-off date.",
	},
	{
		command:
			"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --accounts --json",
		description:
			"The annual roll-up with each Account's value, nominal and real, on the row at each year's end.",
	},
	{
		command:
			"traj projection run --scenario ruled --as-of 2026-03-31 --horizon 2029-03-30 --spending --json",
		description:
			"The annual roll-up of a Scenario with a spending rule, with the portfolio, amount (nominal and in today's money), withdrawal rate and action of each Rule year.",
	},
	{
		command:
			"traj projection run --scenario estated --as-of 2026-03-31 --horizon 2029-03-30 --estate --json",
		description:
			"The annual roll-up of a Scenario with an estate block, with what the plan would leave each year: the gross estate, the debts, each cost and gift, and what heirs receive.",
	},
	{
		command:
			"traj projection run --scenario funded --as-of 2026-03-31 --horizon 2027-03-30 --breakdown --json",
		description:
			"The annual roll-up of a Scenario whose employer pays into an Account and whose Account pays out and charges a fee: the roll-up's payouts, employerContributions and fees, the payout and employer lines of the cash flow, and a fees table. The employer's money is outside money in; a payout is inside it.",
	},
	{
		command:
			"traj projection run --scenario funded --as-of 2026-03-31 --horizon 2027-03-30 --set accounts.0194a000-0004-7000-8000-000000000004.fee.bps=50 --json",
		description:
			"What if the Account's fee were 0.5% a year instead of 1.5%: one override, and nothing saved.",
	},
	{
		command:
			"traj projection run --scenario routed --as-of 2026-03-31 --horizon 2027-03-30 --breakdown --json",
		description:
			"The annual roll-up of a Scenario with a share step, a Reserve floor, a target that keeps its value and two transfers: the routing echo (each step and entry by position), each year's transfers (moved and unmoved, outside the cash flow), and the entry each drawn line came from.",
	},
	{
		command:
			"traj projection run --scenario routed --as-of 2026-03-31 --horizon 2027-03-30 --set cashflow.withdraw.0.downTo=1000000 --breakdown --json",
		description:
			"What if the first withdrawal entry kept 10,000.00 in the Account before the rest are drawn: one override by the entry's position, and nothing saved.",
	},
	{
		command:
			"traj projection run --scenario routed --as-of 2026-03-31 --horizon 2027-03-30 --liabilities --json",
		description:
			"The loan's months in a Scenario whose transfers pay it down: each month's `transferred`, apart from the debt payments it states as `paid`.",
	},
	{
		command:
			"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --without flows.invest --json",
		description: "The annual roll-up with one Stream taken out, and nothing saved.",
	},
	{
		command: `traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --add 'flows={"id":"extra","kind":"expense","amount":"1000.00","frequency":"monthly","start":"2026-04-01","growth":{"bps":0}}' --decimal --json`,
		description: "The annual roll-up with one new Flow added, and nothing saved.",
	},
]
