import { describe, expect, it } from "bun:test"
import { emitThLevy } from "../levy/emit"
import { thFilerLabel } from "../levy/filers"
import { ThLevyIncomeLabel } from "../levy/labels"
import { ThLevyMeasureId } from "../levy/measure-ids"
import type { ThLevyProfile } from "../levy/profile-types"
import { toSatang } from "../units"
import { levyValues, simTallies } from "./levy-sim"

const SALARY = ThLevyIncomeLabel.Section40_1
const JOINT: ThLevyProfile = { filingStatus: "married_joint", filers: ["a", "b"] }

function figures(profile: ThLevyProfile, baht: ReadonlyArray<readonly [string, number]>) {
	const income = new Map(baht.map(([label, amount]) => [label, toSatang(amount)] as const))
	const values = levyValues(emitThLevy(profile), simTallies(income))
	const read = (id: ThLevyMeasureId): number => (values.get(id) ?? Number.NaN) / 100
	return {
		assessable: read(ThLevyMeasureId.AssessableTotal),
		expenses: read(ThLevyMeasureId.ExpensesTotal),
		allowances: read(ThLevyMeasureId.AllowancesTotal),
		taxable: read(ThLevyMeasureId.NetTaxableIncome),
		tax: read(ThLevyMeasureId.NetTaxPayable),
	}
}

const a = (amount: number) => [thFilerLabel(SALARY, "a"), amount] as const
const b = (amount: number) => [thFilerLabel(SALARY, "b"), amount] as const
const shared = (amount: number) => [thFilerLabel(SALARY, "shared"), amount] as const

describe("a joint Levy of two Filers, hand-computed (RD page 6057 at 2026 rates)", () => {
	// Salaries 200,000 and 100,000, married_joint, default allowances.
	//   assessable       200,000 + 100,000                       = 300,000
	//   s.42 bis expense a: min(50% x 200,000, 100,000) = 100,000
	//                    b: min(50% x 100,000, 100,000) =  50,000   -> 150,000
	//                    (one shared ceiling would give min(150,000, 100,000) = 100,000)
	//   allowances       personal 60,000 + spouse 60,000         = 120,000
	//   net taxable      300,000 - 150,000 - 120,000             =  30,000
	//   tax              30,000 is inside the 0% band (0 - 150,000) = 0
	it("gives expenses of 100,000 + 50,000 = 150,000", () => {
		expect(figures(JOINT, [a(200_000), b(100_000)])).toEqual({
			assessable: 300_000,
			expenses: 150_000,
			allowances: 120_000,
			taxable: 30_000,
			tax: 0,
		})
	})

	// Salaries 1,000,000 and 500,000, married_joint, default allowances: each spouse is at the ceiling.
	//   assessable       1,500,000
	//   s.42 bis expense a: min(500,000, 100,000) = 100,000; b: min(250,000, 100,000) = 100,000 -> 200,000
	//   allowances       120,000
	//   net taxable      1,500,000 - 200,000 - 120,000 = 1,180,000
	//   one bracket walk (s.48(1)) over the sum:
	//     150,000 - 300,000  150,000 x  5% =   7,500
	//     300,000 - 500,000  200,000 x 10% =  20,000
	//     500,000 - 750,000  250,000 x 15% =  37,500
	//     750,000 - 1,000,000 250,000 x 20% =  50,000
	//   1,000,000 - 1,180,000  180,000 x 25% =  45,000
	//   tax              7,500 + 20,000 + 37,500 + 50,000 + 45,000 = 160,000
	//   (the bare joint Levy took one 100,000 ceiling: taxable 1,280,000, tax 185,000)
	it("walks the brackets once over the sum", () => {
		expect(figures(JOINT, [a(1_000_000), b(500_000)])).toEqual({
			assessable: 1_500_000,
			expenses: 200_000,
			allowances: 120_000,
			taxable: 1_180_000,
			tax: 160_000,
		})
		const bare = figures({ filingStatus: "married_joint" }, [[SALARY, 1_500_000]])
		expect(bare.expenses).toBe(100_000)
		expect(bare.tax).toBe(185_000)
	})

	// Salary 300,000 and a s.40(2) fee of 100,000 on the other Filer: the s.42 bis expense covers both
	// classes, each Filer's own: a 100,000 (50% = 150,000), b 50,000 -> 150,000.
	it("counts s.40(2) in each Filer's own ceiling", () => {
		const fee = [thFilerLabel(ThLevyIncomeLabel.Section40_2, "b"), 100_000] as const
		expect(figures(JOINT, [a(300_000), fee]).expenses).toBe(150_000)
	})

	it("does not read the other labels of a Levy with Filers", () => {
		const levy = emitThLevy(JOINT)
		const labels = levy.measures.flatMap((measure) =>
			measure.op === "tally" ? [measure.label] : [],
		)
		expect(labels.length).toBeGreaterThan(0)
		expect(labels.every((label) => /@(a|b|shared)$/.test(label))).toBe(true)
		expect(figures(JOINT, [[SALARY, 500_000]]).assessable).toBe(0)
	})
})

describe("shared s.40(1)-(2) income splits its expense half to each Filer", () => {
	// Shared salary 400,000 and nothing else: 200,000 joins each Filer, whose expense is min(100,000, 100,000).
	//   expenses 100,000 + 100,000 = 200,000 (one ceiling on the whole 400,000 would give 100,000)
	it("gives each Filer their own ceiling on their half", () => {
		const result = figures(JOINT, [shared(400_000)])
		expect(result.assessable).toBe(400_000)
		expect(result.expenses).toBe(200_000)
	})

	// a 150,000 own + 50,000 half of shared 100,000 = 200,000 -> min(100,000, 100,000) = 100,000;
	// b 0 own + 50,000 = 50,000 -> 25,000. Expenses 125,000 (one ceiling on 250,000 gives 100,000).
	it("adds the half to the Filer's own income before the ceiling", () => {
		const result = figures(JOINT, [a(150_000), shared(100_000)])
		expect(result.assessable).toBe(250_000)
		expect(result.expenses).toBe(125_000)
	})

	// An odd satang goes to the second Filer, so the halves add up to the whole.
	it("loses no satang between the halves", () => {
		const odd = [thFilerLabel(SALARY, "shared"), 0.01] as const
		const result = figures(JOINT, [odd])
		expect(result.assessable).toBe(0.01)
		expect(result.expenses).toBe(0)
	})
})
