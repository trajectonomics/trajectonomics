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
		command: "traj projection run --scenario taxed --as-of 2026-01-01 --horizon 2027-12-31 --json",
		description:
			"The annual roll-up of a Scenario with the Thai Levy: each tax year's taxYears entry states its walk from assessable income to taxable income, every bracket with the income and tax inside it, the marginalRateBps, the toNextBracket income left before the next bracket starts, and the effectiveRateBps on assessable income.",
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
