import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { LOADING } from "../../lib/view/state"
import { DEMO, demoLens, statedCompare } from "../../lib/view/what-if/fixtures.test-support"
import MilestonesWhatIf from "./MilestonesWhatIf.svelte"

/** The Demo with the plan's name for its car Milestone, or none when the plan states no label. */
function snapshot(displayLabel?: string) {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	type Milestone = { id: string; displayLabel?: string }
	const milestones = read.data.scenario.document.milestones as Milestone[] | undefined
	const car = milestones?.find((one) => one.id === "car-paid-off")
	if (car === undefined) throw new Error("the Demo has no car Milestone")
	if (displayLabel === undefined) delete car.displayLabel
	else car.displayLabel = displayLabel
	return next
}

/** The markup with Svelte's render comments dropped, so a label reads as one string. */
const plain = (html: string) => html.replace(/<!--[\s\S]*?-->/g, "")

const body = () =>
	plain(render(MilestonesWhatIf, { props: { lens: demoLens(statedCompare()) } }).body)

beforeEach(() => replaceSnapshot(snapshot("Car paid off")))
afterAll(() => snapshotLoader.replace(LOADING))

describe("the What-if panel on the Milestones page names each Milestone", () => {
	test("a labelled Milestone shows the plan's name as plain text", () => {
		expect(body()).toContain("Car paid off")
		expect(body()).not.toContain(">car-paid-off</code>")
	})

	test("an unlabelled Milestone shows its id in code, so the page invents no name", () => {
		replaceSnapshot(snapshot())
		expect(body()).toContain(">car-paid-off</code>")
	})
})
