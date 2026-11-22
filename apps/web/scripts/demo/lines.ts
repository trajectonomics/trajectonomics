/** One CSV row of the fictional ledger before its date is known: who pays whom, how much, and why. */
export type Line = { from: string; to: string; amount: string; memo: string; key: string }

/** The lines that repeat unchanged every month, with the day they fall on. */
export const FIXED: readonly (Line & { day: number })[] = [
	{ day: 1, from: "Bank", to: "Rent", amount: "14000.00", memo: "rent", key: "rent" },
	{ day: 10, from: "Bank", to: "Car Loan", amount: "9000.00", memo: "car loan", key: "car" },
	{ day: 26, from: "Bank", to: "Fund", amount: "15000.00", memo: "fund", key: "fund" },
]

/** Living costs by calendar month, January first: they move with the seasons. */
export const LIVING = [
	...["31500.00", "26800.00", "27900.00", "33200.00", "28400.00", "27100.00"],
	...["29600.00", "30300.00", "26900.00", "28800.00", "27500.00", "34100.00"],
]

/** The fund's market move by calendar month, January first. A negative month is a loss. */
export const MARKET = [
	...["8200.00", "-5400.00", "11300.00", "-9800.00", "6100.00", "12400.00"],
	...["-3700.00", "9500.00", "-12600.00", "7300.00", "10800.00", "4200.00"],
]

/** The lines that happen once: two year-end bonuses and three large purchases. */
export const ONE_OFFS: readonly (Line & { date: string })[] = [
	{
		date: "2024-12-27",
		from: "Salary",
		to: "Bank",
		amount: "85000.00",
		memo: "year-end bonus",
		key: "bonus",
	},
	{
		date: "2025-04-12",
		from: "Bank",
		to: "Travel",
		amount: "42000.00",
		memo: "Songkran trip",
		key: "trip",
	},
	{
		date: "2025-12-26",
		from: "Salary",
		to: "Bank",
		amount: "90000.00",
		memo: "year-end bonus",
		key: "bonus",
	},
	{
		date: "2026-02-08",
		from: "Bank",
		to: "Travel",
		amount: "36500.00",
		memo: "Chiang Mai trip",
		key: "trip",
	},
	{
		date: "2026-08-15",
		from: "Bank",
		to: "Living",
		amount: "58000.00",
		memo: "new laptop",
		key: "laptop",
	},
]
