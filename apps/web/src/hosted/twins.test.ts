import { describe, expect, test } from "bun:test"
import { disabledTitle } from "../components/hosted/message"
import { chanceHref, futureHref } from "./chance-links"
import { postEdit, postPreview } from "./edit-post"
import { editSession } from "./edit-session.svelte"
import { withBase, withSearch } from "./links"
import { postReread } from "./reread"
import { navPath, pageTitle } from "./routes"
import { editsShown } from "./shown"
import { DEMO_SNAPSHOT_PATH, isDemo, snapshotUrl } from "./snapshot-url"
import { readWhatIf } from "./what-if-remote"

describe("the hosted twins", () => {
	test("read the Demo snapshot under the base path and no other, whatever the query says", () => {
		expect(DEMO_SNAPSHOT_PATH).toBe("/demo/demo/snapshot.json")
		for (const search of ["", "?demo=1", "?demo=0", "?snapshot=/snapshot.json", "?scenario=base"]) {
			expect(snapshotUrl(search)).toBe(DEMO_SNAPSHOT_PATH)
			expect(isDemo(search)).toBe(true)
		}
	})

	test("put every link under the base path once", () => {
		expect(withBase("/tax/")).toBe("/demo/tax/")
		expect(withBase("/demo/tax/")).toBe("/demo/tax/")
		expect(withSearch("/", "")).toBe("/demo/")
		expect(withSearch("/tax/", "?scenario=base")).toBe("/demo/tax/?scenario=base")
		expect(chanceHref("", "base")).toBe("/demo/chance/?scenario=base")
		expect(futureHref("", "base", 3)).toBe("/demo/chance/path/?scenario=base&index=3")
	})

	test("keep a link's own scenario over the page's, with the page's other parameters", () => {
		expect(withSearch("/tax/?scenario=separate", "?scenario=base&demo=1")).toBe(
			"/demo/tax/?scenario=separate&demo=1",
		)
	})

	test("find a page by its path with or without the base path", () => {
		expect(navPath("/demo/net-worth/")).toBe("/net-worth/")
		expect(navPath("/demo/chance/path/")).toBe("/chance/")
		expect(pageTitle("/demo/net-worth/")).toBe("Net worth")
		expect(pageTitle("/net-worth/")).toBe("Net worth")
		expect(pageTitle("/demo/plans/")).toBe("Plans")
	})

	test("draw the Edit controls, and refuse every Edit with no request", async () => {
		expect(editsShown(null, "")).toBe(true)
		expect(editSession.token).toBeNull()
		expect(await editSession.run({ kind: "delete-plan", name: "base" })).toBe(false)
		expect(await editSession.preview({ kind: "delete-plan", name: "base" })).toBeNull()
		expect(await editSession.reread()).toBe(false)
		expect(await editSession.addPlan("x")).toBe(false)
		await expect(postEdit("t", { kind: "delete-plan", name: "base" })).rejects.toThrow()
		expect((await postPreview("t", { kind: "delete-plan", name: "base" })).ok).toBe(false)
		expect((await postReread("t", {})).ok).toBe(false)
		expect(typeof (await readWhatIf({} as never, null, () => true))).toBe("string")
	})

	test("say on a switched-off control what it would do and where to do it", () => {
		expect(disabledTitle("Add account")).toBe(
			"Add account: switched off in this demo. Install traj and run traj dashboard to do this to your own plan.",
		)
	})
})
