import { describe, expect, test } from "bun:test"
import type { AllowanceRow, ProjectionAllowances } from "../../contract"
import { GOLDEN_ALLOWANCES } from "./fixtures.test-support"
import { filerOfRow, isFilerRead, returnsView } from "./returns"
import { allowancesView } from "./years"

/** One Filer's Returns from the golden, its Levy and each label suffixed as a separate filing writes them. */
function forFiler(data: ProjectionAllowances, filer: string): ProjectionAllowances {
	const suffixed = (label: string) => `${label}@${filer}`
	return {
		...data,
		labels: data.labels.map(suffixed),
		taxYears: data.taxYears.map((year) => ({ ...year, levy: `${year.levy}@${filer}`, filer })),
		allowances: data.allowances.map((row) => ({
			...row,
			levy: `${row.levy}@${filer}`,
			label: suffixed(row.label),
			filer,
		})),
	}
}

/** The golden as a separate filing's read: two Returns, each with its own Levy and labels. */
function separate(): ProjectionAllowances {
	const me = forFiler(GOLDEN_ALLOWANCES, "me")
	const partner = forFiler(GOLDEN_ALLOWANCES, "partner")
	return {
		...me,
		labels: [...me.labels, ...partner.labels],
		taxYears: [...me.taxYears, ...partner.taxYears],
		allowances: [...me.allowances, ...partner.allowances],
	}
}

/** The golden as a joint Return over two Filers: one Levy, and each spouse's labels on its rows. */
function joint(): ProjectionAllowances {
	const data = structuredClone(GOLDEN_ALLOWANCES)
	const filers = ["me", "partner"]
	return {
		...data,
		labels: filers.flatMap((filer) => data.labels.map((label) => `${label}@${filer}`)),
		allowances: filers.flatMap((filer) =>
			data.allowances.map((row) => ({ ...row, label: `${row.label}@${filer}` })),
		),
	}
}

describe("the Returns a read states", () => {
	test("a plan without Filers keeps its one body, exactly as before", () => {
		const view = allowancesView(GOLDEN_ALLOWANCES)
		expect(isFilerRead(GOLDEN_ALLOWANCES)).toBe(false)
		expect(view.returns).toEqual([])
		expect(view.current?.levy).toBe("th-2026-pit")
	})

	test("a separate filing groups one Return per Filer, each with its own years and its current one first", () => {
		const data = separate()
		const view = allowancesView(data)
		expect(isFilerRead(data)).toBe(true)
		expect(view.returns.map((one) => one.filer)).toEqual(["me", "partner"])
		expect(view.returns.map((one) => one.current?.levy ?? null)).toEqual([
			"th-2026-pit@me",
			"th-2026-pit@partner",
		])
		expect(view.returns[0]?.later.map((year) => year.levy)).toEqual(["th-2026-pit@me"])
		expect(view.returns[1]?.later.map((year) => year.levy)).toEqual(["th-2026-pit@partner"])
		expect(view.current?.levy).toBe("th-2026-pit@me")
	})

	test("a joint Return over two Filers is one section, and its lines still name each spouse", () => {
		const view = allowancesView(joint())
		expect(view.returns).toHaveLength(1)
		expect(view.returns[0]?.filer).toBeNull()
		expect(view.returns[0]?.current?.lines.map((line) => line.filer)).toEqual([
			"me",
			"me",
			"partner",
			"partner",
		])
	})

	test("a suffixed label is named by the allowance, not by the Filer's suffix", () => {
		const view = allowancesView(separate())
		expect(view.returns[0]?.current?.lines.map((line) => line.name)).toEqual(["RMF", "ThaiESG"])
	})

	test("the Filer comes from the CLI's field, else from the label's suffix, and shared is no Filer", () => {
		const row = GOLDEN_ALLOWANCES.allowances[0]
		if (row === undefined) throw new Error("the golden has a row")
		const said = (label: string, filer?: string): AllowanceRow => ({ ...row, label, filer })
		expect(filerOfRow(said("allowance.retirement.rmf@me"))).toBe("me")
		expect(filerOfRow(said("allowance.retirement.rmf@me", "partner"))).toBe("partner")
		expect(filerOfRow(said("allowance.retirement.rmf@shared"))).toBeNull()
		expect(filerOfRow(said("allowance.retirement.rmf"))).toBeNull()
	})

	test("the returns of no year build no section", () => {
		expect(returnsView([], "2026-01-01")).toEqual([])
	})
})
