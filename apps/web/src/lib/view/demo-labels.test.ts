import { describe, expect, test } from "bun:test"
import { milestoneLabel } from "../contract"
import { DEMO } from "./what-if/fixtures.test-support"

/** The longest label a Flow or Milestone card holds in one line, shorter than the CLI's own 80. */
const CARD_LABEL_MAX = 24

interface DemoItem {
	readonly kind: "flow" | "milestone"
	readonly id: string
	readonly label: string | undefined
}

/** Every Flow and Milestone the Demo's plans state, with the label its own plan gives it. */
function demoItems(): DemoItem[] {
	return DEMO.params.scenarios.flatMap((name) => {
		const read = DEMO.reads.documents[name]
		if (read?.ok !== true) throw new Error(`the Demo reads no document for the plan ${name}`)
		const { document } = read.data.scenario
		const flows: DemoItem[] = document.flows.map((flow) => ({
			kind: "flow",
			id: flow.id,
			label: flow.displayLabel,
		}))
		const milestones: DemoItem[] = (document.milestones ?? []).map((one) => {
			const parsed = milestoneLabel.parse(one)
			return { kind: "milestone", id: parsed.id, label: parsed.displayLabel }
		})
		return [...flows, ...milestones]
	})
}

describe("the Demo's plans", () => {
	test("state a display label for every Flow and Milestone, short enough for a card", () => {
		const items = demoItems()
		expect(items.length).toBeGreaterThan(0)
		for (const item of items) {
			const where = `${item.kind} ${item.id}`
			const label = item.label ?? ""
			expect(label.trim(), where).not.toBe("")
			expect(label.length, where).toBeLessThan(CARD_LABEL_MAX)
		}
	})
})
