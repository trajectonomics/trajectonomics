import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import AssumptionsForm from "./AssumptionsForm.svelte"

const read = DEMO.reads.documents["base"]
if (read === undefined || !read.ok) throw new Error("the Demo has a document")
const show = read.data.scenario

/** The form over a plan whose economy states an inflation swing, in basis points. */
function formWithSwing(bps: number): string {
	return render(AssumptionsForm, {
		props: {
			name: "base",
			show: {
				...show,
				document: {
					...show.document,
					economy: { ...show.document.economy, inflation: 300, inflationVolatility: bps },
				},
			},
			editable: true,
		},
	}).body
}

describe("the Inflation swing line", () => {
	test("says how far inflation swings when the plan states a swing above 0", () => {
		expect(formWithSwing(150)).toContain("Inflation swing: ±1.50% a year")
	})

	test("says nothing when the plan states no swing", () => {
		expect(formWithSwing(0)).not.toContain("Inflation swing")
		const body = render(AssumptionsForm, { props: { name: "base", show, editable: true } }).body
		expect(body).not.toContain("Inflation swing")
	})
})
