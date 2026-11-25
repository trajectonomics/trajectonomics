import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { formatDate } from "../../lib/format"
import { type PlanCard, planCard } from "../../lib/view/plans/card"
import { ledgerWith } from "../../lib/view/plans/fixtures.test-support"
import { parseRange } from "../../lib/view/plans/range"
import { planRows } from "../../lib/view/plans/rows"
import { LOADING } from "../../lib/view/state"
import PlanCardView from "./PlanCard.svelte"

const SNAPSHOT = ledgerWith({ base: {}, "retire-early": {} })
const BASE: PlanCard = planCard(SNAPSHOT, planRows(SNAPSHOT)[0]!, parseRange("all"))

beforeEach(() => {
	setTestUrl("http://127.0.0.1/plans/")
	replaceSnapshot(SNAPSHOT)
})
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

function cardBody(card: PlanCard): string {
	return render(PlanCardView, { props: { card, editable: false } }).body
}

describe("PlanCard's Milestones", () => {
	test("names each reached Milestone in full under its chart, with the CLI's date", () => {
		const body = cardBody(BASE)
		expect(BASE.milestones.map((milestone) => milestone.id)).toEqual([
			"car-paid-off",
			"net-worth-ten-million",
		])
		// The chart can only draw a shortened rule on a phone, and a phone has no hover, so the list names it.
		const list = body.slice(body.indexOf('aria-label="Milestones reached"'))
		expect(body.indexOf('aria-label="Milestones reached"')).toBeGreaterThan(body.indexOf("</svg>"))
		for (const milestone of BASE.milestones) {
			expect(list).toContain(`data-item="${milestone.id}"`)
			expect(list).toContain(
				`<time datetime="${milestone.date}">${formatDate(milestone.date)}</time>`,
			)
		}
	})

	test("draws no list when the plan reaches no Milestone in the chart's range", () => {
		const body = cardBody({ ...BASE, markers: [], milestones: [] })
		expect(body).not.toContain('aria-label="Milestones reached"')
		expect(body).not.toContain("<time")
	})
})
