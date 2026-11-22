import type {
	ThAssessableIncomeInput,
	ThLevyProfile,
	ThTaxInput,
} from "@trajectonomics/core/tax/th"
import type { Persona } from "./persona"

/** Annual section 40 income the tax core reads, from the persona's labelled income Flows. */
export function incomeOf(persona: Persona): ThAssessableIncomeInput {
	const income: { section40_1?: number; section40_8?: { general: number } } = {}
	for (const flow of persona.flows) {
		if (flow.kind !== "income") continue
		const annual = flow.monthlyBaht * 12
		if (flow.label === "income.section40_1") income.section40_1 = annual
		if (flow.label === "income.section40_8.general") income.section40_8 = { general: annual }
	}
	return income
}

/** The children and fixed allowances, shared by the annual tax and the Levy. */
function allowancesOf(persona: Persona): NonNullable<ThLevyProfile["allowances"]> {
	return {
		children: persona.tax.children.map((child) => ({ birthYear: child.birthYear })),
		...persona.tax.allowances,
	}
}

/** The Thai tax profile the Levy is emitted from. */
export function profileOf(persona: Persona): ThLevyProfile {
	return { filingStatus: persona.tax.filingStatus, allowances: allowancesOf(persona) }
}

/** The annual computation's input for the 2026 tax year. */
export function taxInputOf(persona: Persona): ThTaxInput {
	return {
		taxYear: 2026,
		filingStatus: persona.tax.filingStatus,
		income: incomeOf(persona),
		allowances: allowancesOf(persona),
	}
}
