import type { ProjectionAllowances } from "../../contract"
import { GOLDEN_ALLOWANCES } from "./fixtures.test-support"

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
export function separate(): ProjectionAllowances {
	const me = forFiler(GOLDEN_ALLOWANCES, "me")
	const partner = forFiler(GOLDEN_ALLOWANCES, "partner")
	return {
		...me,
		labels: [...me.labels, ...partner.labels],
		taxYears: [...me.taxYears, ...partner.taxYears],
		allowances: [...me.allowances, ...partner.allowances],
	}
}
