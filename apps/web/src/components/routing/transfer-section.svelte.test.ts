import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { LOADING } from "../../lib/view/state"
import { routedSnapshot } from "./routing.test-support"
import TransferSection from "./TransferSection.svelte"

/** The routing page with its transfer landing when the Milestone `retire` fires, named or unnamed. */
function page(displayLabel?: string, editable = false): string {
	const { snapshot, ctx } = routedSnapshot()
	const read = snapshot.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	const document = read.data.scenario.document
	document.milestones =
		displayLabel === undefined ? [{ id: "retire" }] : [{ id: "retire", displayLabel }]
	const roll = document.flows.find((flow) => flow.id === "roll")
	if (roll === undefined) throw new Error("the fixture has no transfer")
	roll.startAt = "retire"
	replaceSnapshot(snapshot)
	return render(TransferSection, { props: { ctx: { ...ctx, editable } } }).body
}

beforeEach(() => replaceSnapshot(routedSnapshot().snapshot))
afterAll(() => snapshotLoader.replace(LOADING))

/** The markup with Svelte's render comments dropped, so a sentence reads as one string. */
const plain = (html: string) => html.replace(/<!--[\s\S]*?-->/g, "")

describe("a transfer names the Milestone it lands on", () => {
	test("a labelled Milestone shows the plan's name as plain text", () => {
		const html = plain(page("Retirement"))
		expect(html).toContain(
			'from when <span class="wrap-anywhere" data-item="retire" data-kind="milestone">Retirement</span> fires',
		)
	})

	test("an unlabelled Milestone shows its id in code, so the page invents no name", () => {
		expect(plain(page())).toContain(
			'from when <code class="font-mono text-[0.9em] wrap-anywhere" data-item="retire" data-kind="milestone" data-unnamed="">retire</code> fires',
		)
	})

	test("an editable row's buttons name the Milestone by its label, not its id", () => {
		const body = plain(page("Retirement", true))
		const edit = body.match(/>Edit <span class="sr-only">([^<]*)<\/span>/)
		expect(edit?.[1]).toContain("when Retirement fires")
	})
})
