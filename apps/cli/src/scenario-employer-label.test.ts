import { describe, expect, it } from "bun:test"
import { TH_LEVY_MEMBER_ONLY_LABELS } from "@trajectonomics/core/tax/th"
import { edited } from "./baseline/testing"
import { fi, projection } from "./projection/testing"
import { INCOME_FLAGS, taxedHome } from "./projection-income-support"
import { ownProblems } from "./scenario/own-problems"
import { applyScenario, scenario } from "./scenario-test-support"
import { capture, errorOf } from "./test-support"

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

/** Stores `document` as `plan` straight into the database, past every write check. */
function stored(home: string, document: Record<string, unknown>): void {
	edited(home, `UPDATE scenario SET document = '${JSON.stringify(document)}' WHERE name = 'plan'`)
}

/** The flags of a run over the plan's own return model, which `chance` and `path` require. */
const CHANCE = ["--return-model", "plan", "--paths", "20", "--seed", "1"]

/** The reads that project a stored plan, each as its own argument list. */
const READS: readonly [string, readonly string[]][] = [
	["projection run", ["projection", "run", ...INCOME_FLAGS]],
	["projection run --estate", ["projection", "run", ...INCOME_FLAGS, "--estate"]],
	[
		"projection compare",
		["projection", "compare", "plan", "plan", "--as-of", "2026-01-01", "--horizon", "2027-01-01"],
	],
	["projection chance", ["projection", "chance", ...INCOME_FLAGS, ...CHANCE]],
	["projection path", ["projection", "path", ...INCOME_FLAGS, ...CHANCE, "--index", "0"]],
	[
		"projection allowances",
		[
			"projection",
			"allowances",
			...INCOME_FLAGS,
			"--labels",
			"allowance.retirement.rmf",
			"--step",
			"10000",
		],
	],
	["fi", ["fi", ...INCOME_FLAGS]],
]

describe("a stored plan whose employer Contribution carries a member's own label", () => {
	it("is refused by every read, in the words scenario apply uses, and still runs when the label is gone", async () => {
		const home = await taxedHome()
		const bad = await labelled(home, "allowance.retirement.pvd")
		const applied = errorOf(await applyScenario(home, "other", bad))
		stored(home, bad)
		for (const [name, argv] of READS) {
			const res = await capture([...argv, "--json"], { TRAJ_HOME: home })
			expect(res.code, name).toBe(2)
			expect(errorOf(res), name).toEqual(applied)
		}
		const unlabelled = await labelled(home, "")
		const { label: _label, ...clean } = (unlabelled["flows"] as Record<string, unknown>[])[2] ?? {}
		stored(home, {
			...unlabelled,
			flows: (unlabelled["flows"] as unknown[]).map((flow, i) => (i === 2 ? clean : flow)),
		})
		expect((await projection(home, ["run", ...INCOME_FLAGS])).code).toBe(0)
		expect((await fi(home, INCOME_FLAGS)).code).toBe(0)
	})
})

describe("an employer Contribution that carries a member's own label", () => {
	it("names every label the tax package lists, ThaiESG too, so the member-only list is not a prefix", () => {
		expect(TH_LEVY_MEMBER_ONLY_LABELS).toContain("allowance.thai_esg")
		expect(TH_LEVY_MEMBER_ONLY_LABELS.every((label) => label.startsWith("allowance."))).toBe(true)
	})

	it("finds every one of them on an employer Contribution, and on no member's own", () => {
		for (const label of TH_LEVY_MEMBER_ONLY_LABELS) {
			const flow = { kind: "contribution", label }
			expect(ownProblems({ flows: [{ ...flow, funding: "employer" }] }), label).toEqual([
				{ code: "EMPLOYER_MEMBER_LABEL", segments: ["flows", 0, "label"], label },
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
			// The sentence names the label it found, and the code stays in `code`, out of the hint.
			expect(error.message, label).toContain(`carries the label ${label},`)
			expect(error.hint, label).not.toContain("EMPLOYER_MEMBER_LABEL")
			expect(error.code, label).toBe("invalid_input")
			expect(error.details, label).toEqual([
				{ path: "document.flows.2.label", message: error.message, code: "EMPLOYER_MEMBER_LABEL" },
			])
		}
	})

	it("states a plain scenario fork of a stored plan in the words scenario apply uses", async () => {
		const home = await taxedHome()
		const bad = await labelled(home, "allowance.thai_esg")
		const applied = errorOf(await applyScenario(home, "other", bad))
		stored(home, bad)
		const forked = await scenario(home, ["fork", "plan", "copy"])
		expect(forked.code).toBe(2)
		expect(errorOf(forked)).toEqual(applied)
	})

	it("holds a Levy other than the Thai one to the same rule, because the labels are Thai-named", async () => {
		const flow = { kind: "contribution", funding: "employer", label: "allowance.retirement.pvd" }
		const document = { levies: [{ id: "other", kind: "other" }], flows: [flow] }
		expect(ownProblems(document).map((problem) => problem.segments)).toEqual([
			["flows", 0, "label"],
		])
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
