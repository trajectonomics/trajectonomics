import { type ProjectionAllowances, projectionAllowances } from "../../contract"

/**
 * The CLI's own `projection allowances` golden: a taxed plan with RMF and ThaiESG, two whole tax years, the As-of
 * on the first day of 2026. It is the CLI's bytes, so the page's tests read what `traj` states.
 */
const GOLDEN = await Bun.file(
	new URL("../../../../../cli/src/projection/fixtures/allowances.output", import.meta.url),
).text()

/** The golden as the contract parses it. */
export const GOLDEN_ALLOWANCES: ProjectionAllowances = projectionAllowances.parse(
	JSON.parse(GOLDEN),
)

/** The golden with the As-of moved into the first year, as a mid-year read would state it. */
export function inYear(asOf: string): ProjectionAllowances {
	return { ...structuredClone(GOLDEN_ALLOWANCES), asOf }
}

/** The golden with one row's suggestion left without an Account, as the CLI states it with a hint. */
export function withoutTarget(): ProjectionAllowances {
	const data = structuredClone(GOLDEN_ALLOWANCES)
	const row = data.allowances[0]
	if (row?.flow === undefined) throw new Error("the golden has a first suggestion")
	delete row.flow.target
	row.hint =
		"No contribution of this plan carries allowance.retirement.rmf. Pick the asset Account."
	return data
}

/** The golden with an SSF row, which the page never states as a missed saving. */
export function withSsf(): ProjectionAllowances {
	const data = structuredClone(GOLDEN_ALLOWANCES)
	const [rmf] = data.allowances
	if (rmf === undefined) throw new Error("the golden has a row")
	data.allowances.push({ ...rmf, label: "allowance.retirement.ssf", extra: "99999.00" })
	return data
}
