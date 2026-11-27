import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { estateDates, estateView } from "../../lib/view/estate"
import { NO_ITEM_NAMES } from "../../lib/view/item-names"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import EstateFocus from "./EstateFocus.svelte"

const READ = DEMO.reads.projections["base"]
const DOC = DEMO.reads.documents["base"]
if (READ === undefined || !READ.ok) throw new Error("the Demo has a projection for base")
if (DOC === undefined || !DOC.ok) throw new Error("the Demo has a document for base")

/** The date the page opens on, and the estate it reads there, as the page derives them. */
const DATES = estateDates(
	READ.data,
	DOC.data.scenario.document,
	DOC.data.scenario.household,
	"",
	NO_ITEM_NAMES,
)
const FIGURES =
	DATES === null ? null : (estateView(READ.data, DATES.chosen.date, "both")?.figures ?? null)

describe("EstateFocus", () => {
	test("labels the section with what heirs receive and the year, and draws the deductions to it", () => {
		const { body } = render(EstateFocus, {
			props: { read: READ, figures: FIGURES, plan: "base" },
		})
		expect(body).toContain("What would your heirs receive? 15.6M THB in 2053.")
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("15.6M")
		expect(body).toContain(">2053<")
		expect(body).not.toContain("data-primary-action")
	})

	test("masks the net amount with Hide amounts on", () => {
		preferences.hidden = true
		let body = ""
		try {
			body = render(EstateFocus, { props: { read: READ, figures: FIGURES, plan: "base" } }).body
		} finally {
			preferences.hidden = false
		}
		expect(body).toContain("What would your heirs receive? The amount is hidden. In 2053.")
		expect(body).toContain("•••••")
		expect(body).not.toContain("15.6M")
	})
})
