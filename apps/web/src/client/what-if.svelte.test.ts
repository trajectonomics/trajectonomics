import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import WhatIfBar from "../components/what-if/WhatIfBar.svelte"
import { employerDraftOf } from "../lib/view/plan-items/employer-draft"
import { planDocument } from "../lib/view/plan-items/fixtures.test-support"
import { flowDraftOf } from "../lib/view/plan-items/flows"
import { saveFlow } from "./flow-save.js"
import { selectPlan } from "./select-plan.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"
import { fakeServer, HASH, held, settle, useSessionHooks } from "./what-if.test-support"

useSessionHooks()

describe("a session is bound to its plan", () => {
	test("a switch is off only on the plan it was made on", () => {
		whatIfSession.setOff("base", HASH, "flows.salary", true)
		expect(whatIfSession.isOffIn("base", "flows.salary")).toBe(true)
		expect(whatIfSession.isOffIn("retire-early", "flows.salary")).toBe(false)
	})

	test("a switch on another plan is refused and asks first, and the first plan's changes stay", () => {
		whatIfSession.setOff("base", HASH, "flows.salary", true)
		const made = whatIfSession.setOff("retire-early", HASH, "flows.salary", true)
		expect(made).toBe(false)
		expect(whatIfSession.asking).toBe("retire-early")
		expect(whatIfSession.whatIf?.plan).toBe("base")
		expect(whatIfSession.whatIf?.removals).toEqual(["flows.salary"])
	})

	test("a tried value on another plan is refused the same way", () => {
		whatIfSession.setOff("base", HASH, "flows.salary", true)
		whatIfSession.tryFlow("retire-early", HASH, {
			stored: { id: "gym", amount: "1" },
			edited: { id: "gym", amount: "2" },
		})
		expect(whatIfSession.asking).toBe("retire-early")
		expect(whatIfSession.whatIf?.sets).toEqual([])
	})

	test("selectPlan asks instead of switching while the session holds changes, and passes when it holds none", async () => {
		await selectPlan("retire-early")
		expect(whatIfSession.asking).toBeNull()
		whatIfSession.setOff("base", HASH, "flows.salary", true)
		await selectPlan("retire-early")
		expect(whatIfSession.asking).toBe("retire-early")
		expect(whatIfSession.revertAndSwitch()).toBe("retire-early")
		expect(whatIfSession.whatIf).toBeNull()
	})

	test("no page sets the plan in the address except through selectPlan", async () => {
		const files = new Bun.Glob("src/**/*.{svelte,ts}").scan({ cwd: `${import.meta.dir}/../..` })
		const offenders: string[] = []
		for await (const file of files) {
			if (file.endsWith("select-plan.svelte.ts") || file.includes(".test.")) continue
			const text = await Bun.file(`${import.meta.dir}/../../${file}`).text()
			if (/setQueryParam\(\s*"scenario"/.test(text)) offenders.push(file)
		}
		expect(offenders).toEqual([])
	})
})

describe("a session with no change is no session", () => {
	test("switching the last item back on ends the session and clears its answer and error", () => {
		whatIfSession.setOff("base", HASH, "flows.salary", true)
		whatIfSession.error = "stale"
		whatIfSession.setOff("base", HASH, "flows.salary", false)
		expect(whatIfSession.whatIf).toBeNull()
		expect(whatIfSession.active).toBe(false)
		expect(whatIfSession.error).toBeNull()
		expect(whatIfSession.answer).toBeNull()
	})

	test("a tried value that changes nothing starts no session", () => {
		whatIfSession.tryFlow("base", HASH, {
			stored: { id: "gym", amount: "1" },
			edited: { id: "gym", amount: "1" },
		})
		expect(whatIfSession.whatIf).toBeNull()
	})

	test("removing the last change ends the session", () => {
		whatIfSession.setOff("base", HASH, "flows.salary", true)
		const [change] = whatIfSession.changes
		if (change === undefined) throw new Error("no change")
		whatIfSession.removeChange(change)
		expect(whatIfSession.whatIf).toBeNull()
	})

	test("the bar shows only while a change is held, and its keep buttons wait for the reads", () => {
		const bar = () => render(WhatIfBar, { props: {} }).body
		expect(bar()).not.toContain("What-if session")
		whatIfSession.setOff("base", HASH, "flows.salary", true)
		expect(bar()).toContain("What-if session")
		expect(bar()).toContain("Reading the what-if")
		expect(bar()).toMatch(/disabled[^>]*>\s*Apply to this plan/)
		whatIfSession.setOff("base", HASH, "flows.salary", false)
		expect(bar()).not.toContain("What-if session")
	})

	test("clearing a field is reported, and is not a Set", async () => {
		const doc = planDocument()
		const salary = doc.flows.find((flow) => flow.id === "salary")
		if (salary === undefined) throw new Error("the fixture has a salary")
		const saved = await saveFlow({
			name: "base",
			contentHash: HASH,
			doc,
			kind: "income",
			existing: salary,
			draft: { ...flowDraftOf(salary), amount: "95000.00", end: "" },
			employer: employerDraftOf(null),
			tryValue: true,
		})
		expect(saved.cleared).toEqual(["end"])
		expect(whatIfSession.whatIf?.sets).toEqual([{ path: "flows.salary.amount", value: "95000.00" }])
	})
})

describe("the reads of a session", () => {
	test("a change made during a read waits for it, then the latest state is read once", async () => {
		fakeServer()
		whatIfSession.setOff("base", HASH, "flows.a", true)
		await settle()
		expect(held).toHaveLength(1)
		whatIfSession.setOff("base", HASH, "flows.b", true)
		await settle()
		whatIfSession.setOff("base", HASH, "flows.c", true)
		await settle()
		// The server runs one at a time: no second request is sent while the first is open.
		expect(held).toHaveLength(1)
		expect(whatIfSession.reading).toBe(true)
		held[0]?.settle()
		await settle(50)
		expect(held).toHaveLength(2)
		expect(held[1]?.body.removals).toEqual(["flows.a", "flows.b", "flows.c"])
		held[1]?.settle()
		await settle(50)
		expect(whatIfSession.reading).toBe(false)
		expect(whatIfSession.error).toBe("stub")
	})

	test("the reply to an older state is dropped, so it never shows", async () => {
		fakeServer()
		whatIfSession.setOff("base", HASH, "flows.a", true)
		await settle()
		whatIfSession.setOff("base", HASH, "flows.b", true)
		held[0]?.settle()
		await settle(50)
		expect(whatIfSession.error).toBeNull()
	})

	test("Save and Apply do nothing while a read is pending", async () => {
		fakeServer()
		whatIfSession.setOff("base", HASH, "flows.a", true)
		expect(await whatIfSession.applyToPlan()).toBe(false)
		expect(await whatIfSession.keepAsPlan("copy")).toBe(false)
	})

	test("a read answered 409 is not asked again once a newer state waits", async () => {
		fakeServer()
		whatIfSession.setOff("base", HASH, "flows.a", true)
		await settle()
		whatIfSession.setOff("base", HASH, "flows.b", true)
		held[0]?.settle(409)
		// The newer state reads at once after its debounce, not after the wait of a retry nobody needs.
		await settle(300)
		expect(held).toHaveLength(2)
		expect(held[1]?.body.removals).toEqual(["flows.a", "flows.b"])
	})

	test("a read answered 409 is asked again, not shown as a lost answer", async () => {
		fakeServer()
		whatIfSession.setOff("base", HASH, "flows.a", true)
		await settle()
		held[0]?.settle(409)
		await settle(600)
		expect(held).toHaveLength(2)
	})

	test("ending the session drops the read in flight", async () => {
		fakeServer()
		whatIfSession.setOff("base", HASH, "flows.a", true)
		await settle()
		whatIfSession.end()
		held[0]?.settle()
		await settle(50)
		expect(whatIfSession.error).toBeNull()
		expect(whatIfSession.answer).toBeNull()
	})
})
