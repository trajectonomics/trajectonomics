import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { householdOf, personNames } from "../../lib/view/item-names"
import { DEMO, DEMO_COMPARE, demoLens } from "../../lib/view/what-if/fixtures.test-support"
import TaxWhatIf from "./TaxWhatIf.svelte"

/** The Demo's `separate` plan as a compare: both sides state the plan's own tax years, one per Filer per period. */
function separateCompare() {
	const read = DEMO.reads.projections["separate"]
	if (read?.ok !== true) throw new Error("the Demo reads its separate plan")
	const compare = structuredClone(DEMO_COMPARE)
	compare.sides.a.taxYears = structuredClone(read.data.taxYears)
	compare.sides.b.taxYears = structuredClone(read.data.taxYears)
	return compare
}

/** The text of every `<h3>` a body holds, without its markup. */
function headings(body: string): string[] {
	return [...body.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map((match) =>
		(match[1] ?? "")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim(),
	)
}

describe("the What-if tax panel", () => {
	test("names the Filer in each heading of a separate filing, so no two headings read alike", () => {
		const body = render(TaxWhatIf, {
			props: {
				lens: demoLens(separateCompare(), "separate"),
				people: personNames(householdOf(DEMO, "separate")),
			},
		}).body
		const said = headings(body)
		expect(said.length).toBeGreaterThan(1)
		expect(new Set(said).size).toBe(said.length)
		expect(said.join(" ")).toContain("You")
		expect(said.join(" ")).toContain("Your partner")
	})
})
