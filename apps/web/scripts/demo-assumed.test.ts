// The Demo's taxed plan assumes something, so the hosted Demo shows Home's card and the Plan page's list (web ADR 0032).
import { describe, expect, test } from "bun:test"
import { snapshot } from "../src/lib/contract"
import { assumedCard } from "../src/lib/view/assumed/card"
import { planAssumed } from "../src/lib/view/assumed/snapshot"
import { demoSnapshotJson } from "./demo-snapshot"

describe("what the Demo's base plan assumes", () => {
	test("is a non-empty list that Home's card counts", async () => {
		const view = planAssumed(snapshot.parse(await demoSnapshotJson()), "base", "?demo=1")
		if (view === null) throw new Error("the Demo's base plan assumes nothing")
		expect(view.items.length).toBeGreaterThan(0)
		expect(view.groups.map((group) => group.key)).toContain("allowances")
		expect(assumedCard(view.items, view.groups, "?demo=1")?.href).toBe(
			"/projection/?demo=1#assumed",
		)
	})

	test("holds no value traj wrote from the template, so the Demo has nothing to keep", async () => {
		const view = planAssumed(snapshot.parse(await demoSnapshotJson()), "base", "")
		expect(view?.groups.flatMap((group) => group.lines.flatMap((line) => line.keep ?? []))).toEqual(
			[],
		)
	})
})
