import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { baselineRead } from "../../lib/view/plan-items/fixtures.test-support"
import { loanPlanDocument } from "../../lib/view/plan-items/loan-fixtures.test-support"
import PlanItemsList from "./PlanItemsList.svelte"

const HASH = "jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

describe("the loans on the Assets and debts page", () => {
	test("the Assets and debts page shows a plan's loans read-only, with no Edit control", () => {
		const body = render(PlanItemsList, {
			props: {
				kind: "assets",
				name: "base",
				doc: loanPlanDocument(),
				household: null,
				baseline: baselineRead(),
				editable: true,
				contentHash: HASH,
			},
		}).body
		expect(body).toContain("Read-only for now")
		expect(body).toContain("Level loan")
		expect(body).toContain("60 equal payments")
		expect(body).toContain("Borrows from")
		expect(body).not.toContain('aria-label="Edit car-draw"')
		expect(body).not.toContain('aria-label="Edit car-loan"')
	})
})
