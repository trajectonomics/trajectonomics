import { TH_CLASSES } from "./projection/carry-in-support"
import type { ProjectionRunView } from "./projection/run-view"
import { TWO_SALARIES } from "./scenario-tax-filers-plan"
import { couple, coupleHousehold, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, pay } from "./scenario-tax-separate-support"

/* The plans, records and helpers of the mid-2026 shared-loan Carry-in tests (cli ADR-0075). */

/** The `--mortgage-interest` flags of the given values. */
export const interest = (...values: string[]): string[] =>
	values.flatMap((it) => ["--mortgage-interest", it])

/** The two salaries, each through the given year-end; the partner's may start before 2026. */
export function salaries(
	holderEnd: string,
	partnerEnd: string,
	partnerStart = "2026-01-01",
): Record<string, unknown> {
	return {
		...TWO_SALARIES,
		flows: [
			pay("salary", 100_000_000, { end: holderEnd }),
			pay("partner-salary", 50_000_000, { start: partnerStart, end: partnerEnd }),
		],
	}
}

/** The couple's plan filed separately, with a 60,000 loan borrowed together, and its data directory. */
export async function separate(plan: Record<string, unknown>): Promise<string> {
	const home = await couple(plan, coupleHousehold())
	const res = await taxCouple(home, "married_separate", LABELS, interest("shared=60000"))
	if (res.code !== 0) throw new Error(res.err)
	return home
}

/** One record for one Return, stating only that Filer's salary and the rest at zero. */
export function record(levy: string, salary: string): Record<string, unknown> {
	const filer = levy.slice("th-2026-pit@".length)
	return {
		scenario: "base",
		levy,
		periodStart: "2026-01-01",
		tallies: [{ label: `income.section40_1@${filer}`, basis: "gross", amount: salary }],
		prepaid: "0.00",
		rest: "0.00",
	}
}

/** The 29 classes of one Filer's own record: the 22 income labels and 7 allowances, suffixed. */
function ownClasses(
	filer: string,
	salary: string,
): { label: string; basis: string; amount: string }[] {
	return TH_CLASSES.map(({ label, basis }) => ({
		label: `${label}@${filer}`,
		basis,
		amount: label === "income.section40_1" ? salary : "0.00",
	}))
}

/** The 22 income classes of both Filers, with section 40(1) at the stated amount. */
function sharedClasses(amount: string): { label: string; basis: string; amount: string }[] {
	return TH_CLASSES.filter((it) => it.label.startsWith("income.")).map(({ label, basis }) => ({
		label: `${label}@shared`,
		basis,
		amount: label === "income.section40_1" ? amount : "0.00",
	}))
}

/** One full record: the Filer's own 29 classes and, when the period had it, the shared 22. */
export function fullRecord(levy: string, salary: string, shared?: string): Record<string, unknown> {
	const filer = levy.slice("th-2026-pit@".length)
	return {
		scenario: "base",
		levy,
		periodStart: "2026-01-01",
		tallies: [...ownClasses(filer, salary), ...(shared === undefined ? [] : sharedClasses(shared))],
		prepaid: "0.00",
	}
}

/** The flags of a run inside the 2026 tax year, through 2027. */
export const RUN: readonly string[] = [
	"run",
	"--scenario",
	"base",
	"--as-of",
	"2026-06-01",
	"--horizon",
	"2027-12-31",
]

/** The 2026 due of each Return, by Filer. */
export function dues2026(res: ProjectionRunView): Record<string, string> {
	const rows = res.taxYears.filter((it) => it.from === "2026-01-01")
	return Object.fromEntries(rows.map((it) => [it.filer ?? "", it.due]))
}
