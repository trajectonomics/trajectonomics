import { beforeAll, describe, expect, it } from "bun:test"
import { type Expected, expectedAnswers, TOLERANCE, taxBahtOf } from "./oracle"
import { loadPersonas, type Persona } from "./persona"
import { scenarioOf } from "./scenario"

const personas = loadPersonas(`${import.meta.dir}/personas`)
const byId = (id: string): Persona => {
	const found = personas.find((persona) => persona.id === id)
	if (found === undefined) throw new Error(`no persona ${id}`)
	return found
}

// The engine runs a few seconds per persona, so each persona's answers are computed once.
const answers = new Map<string, Expected>()
beforeAll(() => {
	for (const persona of personas) answers.set(persona.id, expectedAnswers(persona))
}, 120_000)

const answerOf = (id: string): Expected => {
	const found = answers.get(id)
	if (found === undefined) throw new Error(`no answers for ${id}`)
	return found
}

describe("oracle tax for 2026, checked by hand against the Thai brackets", () => {
	it("single salaried employee at 720,000 baht: 32,450 baht", () => {
		// 720,000 - 100,000 (50% of salary, capped) - 60,000 personal - 9,000 social security
		// - 12,000 life - 6,000 health = 533,000. Bands: 150,000-300,000 at 5% = 7,500;
		// 300,000-500,000 at 10% = 20,000; 500,000-533,000 at 15% = 4,950. Total 32,450.
		expect(taxBahtOf(byId("nok-salaried-employee"))).toBe(32_450)
	})

	it("married couple, one income of 900,000 baht and two children: 22,600 baht", () => {
		// 900,000 - 100,000 (50% of salary, capped) - 60,000 personal - 60,000 spouse
		// - 90,000 children (one at 30,000 and the second born 2018 or later at 60,000 total)
		// - 9,000 social security - 30,000 life - 100,000 mortgage interest = 451,000.
		// 150,000 at 5% = 7,500; 151,000 at 10% = 15,100. Total 22,600.
		expect(taxBahtOf(byId("pim-krit-couple-mortgage"))).toBe(22_600)
	})

	it("freelancer under 40(8) at 1,320,000 baht: 20,800 baht", () => {
		// The core's section 40(8) standard deduction is 60%: 792,000. Taxable 528,000 - 60,000
		// personal - 20,000 life - 15,000 health = 433,000. 150,000 at 5% = 7,500; 133,000 at
		// 10% = 13,300. Total 20,800.
		expect(taxBahtOf(byId("ploy-freelancer-40-8"))).toBe(20_800)
	})
})

describe("oracle FI under the survival definition", () => {
	it("reaches FI for every persona inside the horizon", () => {
		for (const persona of personas) {
			const fi = answerOf(persona.id).fiMonth
			expect(fi).not.toBeNull()
			expect(fi).toMatch(/^\d{4}-\d{2}$/)
			expect((fi ?? "") <= persona.horizon.slice(0, 7)).toBe(true)
		}
	})

	it("a lower spending what-if never delays FI", () => {
		for (const persona of personas) {
			const { fiMonth, whatIfFiMonth } = answerOf(persona.id)
			expect(whatIfFiMonth).not.toBeNull()
			expect((whatIfFiMonth ?? "") <= (fiMonth ?? "")).toBe(true)
		}
	})

	it("is deterministic: the same persona gives the same answers", () => {
		const first = answerOf("nok-salaried-employee")
		expect(expectedAnswers(byId("nok-salaried-employee"))).toEqual(first)
	}, 60_000)
})

describe("oracle reads the facts each conversation states", () => {
	it("grows salary, living costs and business costs with inflation, and keeps monthly fund and loan payments fixed", () => {
		const nok = scenarioOf(byId("nok-salaried-employee")).flows
		expect(nok).toContainEqual(expect.objectContaining({ id: "salary", growth: "inflation" }))
		expect(nok).toContainEqual(expect.objectContaining({ id: "living", growth: "inflation" }))
		expect(nok).toContainEqual(expect.objectContaining({ id: "invest", growth: { bps: 0 } }))
		const pim = scenarioOf(byId("pim-krit-couple-mortgage")).flows
		expect(pim).toContainEqual(
			expect.objectContaining({ id: "mortgage-payment", growth: { bps: 0 } }),
		)
		const ploy = scenarioOf(byId("ploy-freelancer-40-8")).flows
		expect(ploy).toContainEqual(expect.objectContaining({ id: "business", growth: "inflation" }))
	})

	it("states that insurance and social security sit inside living costs, where the oracle has no separate flow", () => {
		for (const persona of personas) {
			const allowances = Object.keys(persona.tax.allowances)
			if (allowances.some((key) => key !== "mortgageInterest")) {
				expect(persona.conversation).toContain("already inside")
			}
			expect(persona.flows.map((flow) => flow.id).join(" ")).not.toMatch(/insurance|social/)
		}
	})

	it("states that nothing from 2025 carries into the plan, matching the empty Levy carry-in", () => {
		for (const persona of personas) {
			expect(persona.conversation).toContain("Nothing from 2025 carries into")
		}
	})

	it("gives the FI months the stated facts produce, base and what-if", () => {
		expect(answerOf("nok-salaried-employee")).toEqual({
			fiMonth: "2043-08",
			tax2026Baht: 32_450,
			whatIfFiMonth: "2040-05",
		})
		expect(answerOf("pim-krit-couple-mortgage")).toEqual({
			fiMonth: "2046-12",
			tax2026Baht: 22_600,
			whatIfFiMonth: "2043-12",
		})
		expect(answerOf("ploy-freelancer-40-8")).toEqual({
			fiMonth: "2043-10",
			tax2026Baht: 20_800,
			whatIfFiMonth: "2042-12",
		})
	})
})

describe("tolerances", () => {
	it("states the figures an answer may differ by", () => {
		expect(TOLERANCE).toEqual({ fiMonths: 1, taxBaht: 1 })
	})
})
