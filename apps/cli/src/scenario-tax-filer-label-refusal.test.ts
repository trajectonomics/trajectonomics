import { describe, expect, it } from "bun:test"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	SAVINGS,
	TWO_SALARIES,
	taxCouple,
} from "./scenario-tax-filers-support"
import { applyScenario, errorOf, resultOf, scenario } from "./scenario-test-support"

const LABELS = [
	"--label",
	"salary=income.section40_1",
	"--label",
	"partner-salary=income.section40_1",
]

async function stored(home: string): Promise<{ hash: string; document: Record<string, unknown> }> {
	const shown = resultOf(await scenario(home, ["show", "base"])).scenario as {
		contentHash: string
		document: Record<string, unknown>
	}
	return { hash: shown.contentHash, document: shown.document }
}

function bonus(label: string): Record<string, unknown> {
	return {
		id: "bonus",
		kind: "income",
		earned: true,
		amount: 50_000_000,
		frequency: "annual",
		start: "2026-01-01",
		end: "2026-12-31",
		growth: { bps: 0 },
		label,
	}
}

async function joint(): Promise<string> {
	const home = await couple(TWO_SALARIES, coupleHousehold())
	expect((await taxCouple(home, "married_joint", LABELS)).code).toBe(0)
	return home
}

describe("a write beside a Levy over Filers (cli ADR-0075)", () => {
	it("refuses an apply that adds a bare-labelled bonus and stores nothing", async () => {
		const home = await joint()
		const before = await stored(home)
		const flows = before.document["flows"] as Record<string, unknown>[]
		const res = await applyScenario(home, "base", {
			...before.document,
			flows: [...flows, bonus("income.section40_1")],
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			exitCode: 2,
			path: "document",
			details: { items: ["flows.bonus"] },
		})
		expect(errorOf(res).hint).toContain("scenario tax")
		expect(errorOf(res).hint).toContain("--from-stored")
		expect((await stored(home)).hash).toBe(before.hash)
	})

	it("refuses an apply with a suffix this Return does not read", async () => {
		const home = await joint()
		const before = await stored(home)
		const flows = before.document["flows"] as Record<string, unknown>[]
		const res = await applyScenario(home, "base", {
			...before.document,
			flows: [...flows, bonus("income.section40_1@nobody")],
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document",
			details: { items: ["flows.bonus"] },
		})
		expect(errorOf(res).hint).toContain("scenario tax")
		expect(errorOf(res).hint).toContain("--from-stored")
	})

	it("refuses an allowance label under @shared, which no Levy reads", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		expect((await taxCouple(home, "married_joint")).code).toBe(0)
		const before = await stored(home)
		const flows = before.document["flows"] as Record<string, unknown>[]
		const res = await applyScenario(home, "base", {
			...before.document,
			flows: flows.map((it) =>
				it["id"] === "pvd" ? { ...it, label: "allowance.retirement.rmf@shared" } : it,
			),
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document",
			details: { items: ["flows.pvd"] },
		})
	})

	it("refuses a fork --set that introduces a bare label", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		expect((await taxCouple(home, "married_joint")).code).toBe(0)
		const res = await scenario(home, [
			"fork",
			"base",
			"copy",
			"--set",
			'flows.salary.label="income.section40_1"',
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document",
			details: { items: ["flows.salary"] },
		})
		expect(errorOf(res).hint).toContain("scenario tax")
		expect(errorOf(res).hint).toContain("--from-stored")
	})

	it("refuses an Account's bare interest label, and takes its suffixed one", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		expect((await taxCouple(home, "married_joint")).code).toBe(0)
		const before = await stored(home)
		const accounts = before.document["accounts"] as Record<string, unknown>[]
		const withLabel = (label: string) => ({
			...before.document,
			accounts: accounts.map((it) => (it["id"] === SAVINGS ? { ...it, returnLabel: label } : it)),
		})
		const bare = await applyScenario(home, "base", withLabel("income.section40_4.interest"))
		expect(bare.code).toBe(2)
		expect(errorOf(bare)).toMatchObject({
			code: "invalid_input",
			path: "document",
			details: { items: [`accounts.${SAVINGS}`] },
		})
		expect(errorOf(bare).hint).toContain("--from-stored")
		const suffixed = await applyScenario(
			home,
			"base",
			withLabel("income.section40_4.interest@shared"),
		)
		expect(suffixed.code).toBe(0)
	})

	it("still applies the shown document unchanged", async () => {
		const home = await joint()
		const before = await stored(home)
		const res = await applyScenario(home, "base", before.document)
		expect(res.code).toBe(0)
		expect((await stored(home)).hash).toBe(before.hash)
	})

	it("still applies bare labels beside a Levy without Filers", async () => {
		const home = await couple(TWO_SALARIES, null)
		expect((await taxCouple(home, "married_joint", LABELS)).code).toBe(0)
		const before = await stored(home)
		const flows = before.document["flows"] as Record<string, unknown>[]
		const res = await applyScenario(home, "base", {
			...before.document,
			flows: [...flows, bonus("income.section40_1")],
		})
		expect(res.code).toBe(0)
		expect(resultOf(res).scenario.document.flows).toContainEqual(
			expect.objectContaining({ id: "bonus", label: "income.section40_1" }),
		)
	})
})
