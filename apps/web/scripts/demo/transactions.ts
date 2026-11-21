import { addMonths, formatDate } from "../../src/lib/snapshot/dates"
import { FIXED, LIVING, type Line, MARKET, ONE_OFFS } from "./lines"

/** The first month of the monthly pattern, and how many months it runs. */
export const DEMO_FIRST_MONTH = { year: 2024, month: 11 }
export const DEMO_MONTHS = 24

/** The CSV header `traj tx import` reads. */
export const CSV_HEADER = "date,from,to,amount,memo,external_ref,project"

/** The salary of a year: a raise takes effect in January 2026. */
function salaryOf(year: number): string {
	return year < 2026 ? "85000.00" : "90000.00"
}

/** The fund's market move of a month as a line: a gain arrives from Fund Return, a loss goes back to it. */
function marketLine(month: number): Line & { day: number } {
	const move = MARKET[month - 1] ?? "0.00"
	const loss = move.startsWith("-")
	const amount = loss ? move.slice(1) : move
	const [from, to] = loss ? ["Fund", "Fund Return"] : ["Fund Return", "Fund"]
	return {
		day: 28,
		from: from ?? "Fund",
		to: to ?? "Fund",
		amount,
		memo: "market move",
		key: "market",
	}
}

/** Every line of one month: the fixed ones, the salary of its year, its living costs and its market move. */
function linesOf(year: number, month: number): readonly (Line & { day: number })[] {
	const salary = {
		day: 25,
		from: "Salary",
		to: "Bank",
		amount: salaryOf(year),
		memo: "salary",
		key: "salary",
	}
	const living = LIVING[month - 1] ?? "28000.00"
	return [
		...FIXED,
		{ day: 5, from: "Bank", to: "Living", amount: living, memo: "living", key: "living" },
		salary,
		marketLine(month),
	]
}

function row(date: string, line: Line): string {
	return `${date},${line.from},${line.to},${line.amount},${line.memo},demo-${line.key}-${date},`
}

/** The transactions as CSV rows, each with a stable external reference. */
export function demoCsv(): string {
	const rows: string[] = [CSV_HEADER]
	for (let offset = 0; offset < DEMO_MONTHS; offset++) {
		const [year, month] = addMonths(DEMO_FIRST_MONTH.year, DEMO_FIRST_MONTH.month, offset)
		for (const line of linesOf(year, month)) rows.push(row(formatDate(year, month, line.day), line))
	}
	for (const line of ONE_OFFS) rows.push(row(line.date, line))
	return `${rows.join("\n")}\n`
}
