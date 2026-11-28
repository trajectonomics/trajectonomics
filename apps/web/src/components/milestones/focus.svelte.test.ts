import { afterAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { withMilestones } from "../../lib/view/milestones/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import MilestoneFocus from "./MilestoneFocus.svelte"

const READ = DEMO.reads.projections["base"]
const CHANCE = DEMO.reads.chance["base"]
if (READ === undefined || !READ.ok) throw new Error("the Demo has a projection for base")
if (CHANCE === undefined || !CHANCE.ok) throw new Error("the Demo has a chance read for base")

// The page names its milestones from the Snapshot it shows.
replaceSnapshot(DEMO)
afterAll(() => snapshotLoader.replace(LOADING))

describe("MilestoneFocus", () => {
	test("labels the next milestone with its month and the age a Read states", () => {
		const { body } = render(MilestoneFocus, {
			props: { run: READ.data, asOf: "2026-10-31", chance: CHANCE.data },
		})
		expect(body).toContain("What's next? Car paid off in Jan 2031. At 40.")
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("data-focus-age")
		expect(body).toContain("Jan 2031")
		expect(body).toContain("Car paid off")
		expect(body).toContain("2026")
		expect(body).toContain("2053")
		expect(body).not.toContain("data-primary-action")
	})

	test("draws no age when the chance read's median date is not the milestone's own", () => {
		const chance = structuredClone(CHANCE.data)
		const median = chance.milestones?.find((one) => one.id === "car-paid-off")?.dates?.p50
		if (median === null || median === undefined) throw new Error("the Demo states a median")
		median.date = "2030-12-31"
		const { body } = render(MilestoneFocus, {
			props: { run: READ.data, asOf: "2026-10-31", chance },
		})
		expect(body).not.toContain("data-focus-age")
		expect(body).not.toContain("At ")
	})

	test("anchors a pin at the timeline's start inward, so a phone never clips its label", () => {
		const run = withMilestones([{ id: "car-paid-off", reached: true, date: "2026-10-31" }])
		const { body } = render(MilestoneFocus, {
			props: { run, asOf: "2026-10-31", chance: null },
		})
		expect(body).toContain('data-pin-label="left"')
		expect(body).toContain("text-left")
	})

	test("writes the first unreached milestone when none is ahead, and says by when", () => {
		const { body } = render(MilestoneFocus, {
			props: { run: READ.data, asOf: "2053-12-31", chance: CHANCE.data },
		})
		expect(body).toContain("What's next? Sabbatical not by Dec 2053.")
		expect(body).toContain("Sabbatical")
		expect(body).toContain("not by Dec 2053")
	})

	test("shows no focus point for a projection without milestones", () => {
		const run = {
			...READ.data,
			tables: READ.data.tables.filter((table) => table.name !== "milestones"),
		}
		const { body } = render(MilestoneFocus, {
			props: { run, asOf: "2026-10-31", chance: CHANCE.data },
		})
		expect(body).not.toContain("data-focus-section")
	})
})
