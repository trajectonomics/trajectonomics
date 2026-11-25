import { describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import type { Snapshot } from "../../lib/contract"
import type { SnapshotState } from "../../lib/view/state"
import PageFrame from "./PageFrame.svelte"

const shell = { title: "Net worth", intro: "What is here.", pathname: "/net-worth/" }
const body = createRawSnippet(() => ({ render: () => "<p>body</p>" }))

function frame(state: SnapshotState) {
	return render(PageFrame, { props: { ...shell, state, children: body } })
}

describe("PageFrame", () => {
	test("shows the loading state while the Snapshot is read", () => {
		const html = frame({ status: "loading" }).body
		expect(html).toContain("Loading the Snapshot.")
		expect(html).not.toContain("body")
	})

	test("leads with the demo, then explains both dates before the command", () => {
		const html = frame({ status: "missing", url: "/snapshot.json" }).body
		expect(html).toContain("Nothing to show yet")
		expect(html).toContain('href="/net-worth/?demo=1"')
		const demo = html.indexOf("Try the demo")
		const line = html.indexOf("To see your own plan, run this in a terminal:")
		const asOf = html.indexOf("the date your figures are as of, usually today.")
		const horizon = html.indexOf("the last day to plan to, for example the year you turn 90.")
		const command = html.indexOf("traj dashboard --as-of YYYY-MM-DD --horizon YYYY-MM-DD")
		expect(demo).toBeGreaterThan(-1)
		expect(demo).toBeLessThan(line)
		expect(line).toBeLessThan(asOf)
		expect(asOf).toBeLessThan(horizon)
		expect(horizon).toBeLessThan(command)
	})

	test("never names Snapshot, As-of or horizon without a plain explanation", () => {
		const html = frame({ status: "missing", url: "/snapshot.json" }).body
		expect(html).not.toContain("Snapshot")
		expect(html).not.toContain("As-of")
		expect(html).toContain("--as-of")
		expect(html).toContain("the date your figures are as of")
		expect(html).toContain("--horizon")
		expect(html).toContain("the last day to plan to")
	})

	test("says why a file is not a Snapshot, and lists the first problems", () => {
		const html = frame({
			status: "invalid",
			url: "/snapshot.json",
			reason: "is Snapshot version 2; this Dashboard reads version 1",
			details: ["params.asOf: Required"],
		}).body
		expect(html).toContain("The Snapshot at /snapshot.json is Snapshot version 2")
		expect(html).toContain('role="alert"')
		expect(html).toContain("params.asOf: Required")
	})

	test("renders the body with the ready Snapshot, and the heading", () => {
		const ready = { status: "ready", url: "/snapshot.json", snapshot: {} as Snapshot } as const
		const html = frame(ready).body
		expect(html).toContain("<p>body</p>")
		expect(html).toContain("<h1")
		expect(html).toContain("Net worth")
	})
})
