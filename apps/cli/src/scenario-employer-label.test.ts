import { describe, expect, it } from "bun:test"
import { TH_LEVY_MEMBER_ONLY_LABELS } from "@trajectonomics/core/tax/th"
import { projection } from "./projection/testing"
import { INCOME_FLAGS, taxedHome } from "./projection-income-support"
import { ownProblems } from "./scenario/own-problems"
import { applyScenario, scenario } from "./scenario-test-support"
import { errorOf } from "./test-support"

/*
 * An employer's share carries none of the Thai Levy's contribution labels (cli ADR-0067): each is the
 * member's own payment, ThaiESG included, so the refusal reads the tax package's member-only list and
 * is no prefix match on `allowance.retirement.`. The engine stays permissive.
 */

const SENTENCE = "each of them is the member's own payment"

/** The taxed plan's stored document with the employer Flow's label set to `label`. */
async function labelled(home: string, label: string): Promise<Record<string, unknown>> {
	const shown = JSON.parse((await scenario(home, ["show", "plan"])).out) as {
		scenario: { document: { flows: Record<string, unknown>[] } }
	}
	const document = shown.scenario.document
	return {
		...document,
		flows: document.flows.map((flow) => (flow["id"] === "match" ? { ...flow, label } : flow)),
	}
}

describe("an employer Contribution that carries a member's own label", () => {
	it("names every label the tax package lists, ThaiESG too, so the member-only list is not a prefix", () => {
		expect(TH_LEVY_MEMBER_ONLY_LABELS).toContain("allowance.thai_esg")
		expect(TH_LEVY_MEMBER_ONLY_LABELS.every((label) => label.startsWith("allowance."))).toBe(true)
	})

	it("finds every one of them on an employer Contribution, and on no member's own", () => {
		for (const label of TH_LEVY_MEMBER_ONLY_LABELS) {
			const flow = { kind: "contribution", label }
			expect(ownProblems({ flows: [{ ...flow, funding: "employer" }] }), label).toEqual([
				{ code: "EMPLOYER_MEMBER_LABEL", segments: ["flows", 0, "label"] },
			])
			expect(ownProblems({ flows: [{ ...flow, funding: "target" }, flow] }), label).toEqual([])
		}
	})

	it("refuses a retirement label and ThaiESG in a document, at the label, in a sentence", async () => {
		const home = await taxedHome()
		for (const label of ["allowance.retirement.pvd", "allowance.thai_esg"]) {
			const res = await applyScenario(home, "plan", await labelled(home, label))
			expect(res.code, label).toBe(2)
			const error = errorOf(res)
			expect(error.message, label).toContain(SENTENCE)
			expect(error.path, label).toBe("document.flows.2.label")
			expect(error.hint, label).toContain('Remove "label"')
		}
	})

	it("refuses scenario tax --label on an employer Flow, in the same sentence", async () => {
		const home = await taxedHome()
		const res = await scenario(home, [
			"tax",
			"plan",
			"--tax",
			"th-2026",
			"--label",
			"salary=income.section40_1",
			"--label",
			"match=allowance.retirement.pvd",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain(SENTENCE)
	})

	it("refuses a --set that turns a member's labelled Contribution into the employer's, at the flag", async () => {
		const home = await taxedHome()
		const own = await labelled(home, "allowance.retirement.pvd")
		const flows = (own["flows"] as Record<string, unknown>[]).map((flow) =>
			flow["id"] === "match"
				? {
						...flow,
						id: "own",
						funding: "target",
						derive: undefined,
						amount: 1,
						growth: { bps: 0 },
					}
				: flow,
		)
		const cashflow = { ...(own["cashflow"] as object), contribute: ["fund", "provident"] }
		const stored = await applyScenario(home, "plan", { ...own, flows, cashflow })
		expect(stored.err).toBe("")
		const res = await projection(home, [
			"run",
			...INCOME_FLAGS,
			"--set",
			'flows.own.funding="employer"',
		])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error.path).toBe("--set")
		expect(error.message).toContain(SENTENCE)
	})

	it("keeps an unlabelled employer share in a taxed plan, as the other tests store it", async () => {
		const home = await taxedHome()
		const shown = await scenario(home, ["show", "plan"])
		expect(shown.code).toBe(0)
		expect(shown.out).toContain('"funding":"employer"')
	})
})
