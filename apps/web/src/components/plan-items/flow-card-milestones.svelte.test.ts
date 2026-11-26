import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { type ScenarioFlow, scenarioFlow } from "../../lib/contract/scenario-show"
import { type ItemNames, itemNames } from "../../lib/view/item-names"
import { type FlowCard, flowCards } from "../../lib/view/plan-items/flows"
import FlowCards from "./FlowCards.svelte"

/** A monthly expense that starts and ends at the Milestone `retire`. */
function expense(): ScenarioFlow {
	return scenarioFlow.parse({
		id: "retirement-spending",
		kind: "expense",
		frequency: "monthly",
		start: "2026-10-31",
		amount: "900.00",
		startAt: "retire",
		endAt: "retire",
	})
}

function names(displayLabel?: string): ItemNames {
	return itemNames(new Map(), null, {
		currency: "THB",
		accounts: [],
		flows: [],
		milestones: displayLabel === undefined ? [] : [{ id: "retire", displayLabel }],
	})
}

function card(displayLabel?: string): FlowCard {
	const flow = expense()
	const [shown] = flowCards([flow], "expense", null, [flow], names(displayLabel))
	if (shown === undefined) throw new Error("the fixture has no card")
	return shown
}

function body(cards: readonly FlowCard[]): string {
	return render(FlowCards, {
		props: {
			cards,
			currency: "THB",
			editable: false,
			onEdit: () => {},
			plan: "base",
			contentHash: "h",
			onTry: () => {},
		},
	}).body
}

/** The markup with Svelte's render comments dropped, so a sentence reads as one string. */
const plain = (html: string) => html.replace(/<!--[\s\S]*?-->/g, "")

describe("a Flow card names the Milestone that sets its date", () => {
	test("an unlabelled Milestone shows its id in code, so the page invents no name", () => {
		const html = plain(body([card()]))
		expect(html).toContain('When <code class="font-mono text-[0.9em]"')
		expect(html).toContain(">retire</code> fires")
	})

	test("a labelled Milestone shows the plan's name as plain text", () => {
		const html = plain(body([card("Retirement")]))
		expect(html).toContain("When <span")
		expect(html).toContain(">Retirement</span> fires")
		expect(html).not.toContain(">retire</code> fires")
	})
})
