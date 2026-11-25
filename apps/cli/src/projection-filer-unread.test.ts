import { describe, expect, it } from "bun:test"
import { errorOf, projection } from "./projection/testing"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"

const LABELS = [
	"--label",
	"salary=income.section40_1",
	"--label",
	"partner-salary=income.section40_1",
]
const RUN = ["run", "--scenario", "base", "--as-of", "2026-01-01", "--horizon", "2027-12-31"]

describe("projection run beside unread tax labels (cli ADR-0075)", () => {
	it("refuses a stored suffixed label no Levy reads", async () => {
		const home = await couple(TWO_SALARIES, null)
		expect((await taxCouple(home, "married_joint", LABELS)).code).toBe(0)
		const shown = resultOf(await scenario(home, ["show", "base"])).scenario as {
			document: Record<string, unknown>
		}
		const flows = shown.document["flows"] as Record<string, unknown>[]
		const suffixed = flows.map((flow) =>
			flow["id"] === "salary" ? { ...flow, label: "income.section40_1@me" } : flow,
		)
		// The write accepts it: the Levy has no Filers, so only `projection run` knows the label is unread.
		expect((await applyScenario(home, "base", { ...shown.document, flows: suffixed })).code).toBe(0)
		const res = await projection(home, RUN)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			exitCode: 2,
			path: "document",
			details: { items: ["flows.salary"] },
		})
		expect(errorOf(res).hint).toContain("scenario tax")
		expect(errorOf(res).hint).toContain("--from-stored")
	})

	it("still runs a clean joint Return", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		expect((await taxCouple(home, "married_joint", LABELS)).code).toBe(0)
		const res = await projection(home, RUN)
		expect(res.code).toBe(0)
	})
})
