import { addMonths, formatDate } from "../../src/lib/snapshot/dates"

/** The monthly pattern of the fictional ledger: each line is one transaction every month. */
const MONTHLY = [
	{ day: 25, from: "Salary", to: "Bank", amount: "85000.00", memo: "salary", key: "salary" },
	{ day: 1, from: "Bank", to: "Rent", amount: "14000.00", memo: "rent", key: "rent" },
	{ day: 5, from: "Bank", to: "Living", amount: "28000.00", memo: "living", key: "living" },
	{ day: 10, from: "Bank", to: "Car Loan", amount: "9000.00", memo: "car loan", key: "car" },
	{ day: 26, from: "Bank", to: "Fund", amount: "15000.00", memo: "fund", key: "fund" },
] as const

/** The first month of the monthly pattern, and how many months it runs. */
export const DEMO_FIRST_MONTH = { year: 2024, month: 11 }
export const DEMO_MONTHS = 24

/** The CSV header `traj tx import` reads. */
export const CSV_HEADER = "date,from,to,amount,memo,external_ref,project"

/** The monthly transactions as CSV rows, oldest first, each with a stable external reference. */
export function demoCsv(): string {
	const rows: string[] = [CSV_HEADER]
	for (let offset = 0; offset < DEMO_MONTHS; offset++) {
		const [year, month] = addMonths(DEMO_FIRST_MONTH.year, DEMO_FIRST_MONTH.month, offset)
		for (const line of MONTHLY) {
			const date = formatDate(year, month, line.day)
			const ref = `demo-${line.key}-${date.slice(0, 7)}`
			rows.push(`${date},${line.from},${line.to},${line.amount},${line.memo},${ref},`)
		}
	}
	return `${rows.join("\n")}\n`
}
