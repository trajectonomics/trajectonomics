import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { type ScenarioAccount, scenarioAccount } from "../../lib/contract/scenario-account"
import { type ItemNames, itemNames } from "../../lib/view/item-names"
import { type AccountCard, accountCards } from "../../lib/view/plan-items/accounts"
import AccountCards from "./AccountCards.svelte"

/** An asset whose payout starts when the Milestone `retire` fires. */
function fund(): ScenarioAccount {
	return scenarioAccount.parse({
		id: "fund",
		kind: "asset",
		rate: 600,
		payout: { bps: "3.50", frequency: "quarterly", rounding: "floor", startAt: "retire" },
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

function card(displayLabel?: string): AccountCard {
	const [shown] = accountCards([fund()], undefined, undefined, names(displayLabel))
	if (shown === undefined) throw new Error("the fixture has no card")
	return shown
}

function body(cards: readonly AccountCard[]): string {
	return render(AccountCards, {
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

describe("an Account card names the Milestone its payout starts at", () => {
	test("an unlabelled Milestone shows its id in code, so the page invents no name", () => {
		const html = plain(body([card()]))
		expect(html).toContain(
			'from <code class="font-mono text-[0.9em]" data-item="retire" data-kind="milestone" data-unnamed="">retire</code>',
		)
	})

	test("a labelled Milestone shows the plan's name as plain text", () => {
		const html = plain(body([card("Retirement")]))
		expect(html).toContain('from <span data-item="retire" data-kind="milestone">Retirement</span>')
		expect(html).not.toContain(">retire</code>")
	})
})
