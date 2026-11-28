import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import type { Fi, Read, Snapshot } from "../../lib/contract"
import { fiFixture, REACHABLE, UNREACHABLE } from "../../lib/view/fi/fixtures.test-support"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import FiSections from "./FiSections.svelte"

const ARGV = ["fi", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

/** The Demo Snapshot with the given FI reads, so a section shows a hand-made answer. */
function snapshotWith(fi: Readonly<Record<string, Read<Fi>>>): Snapshot {
	return { ...DEMO, reads: { ...DEMO.reads, fi } }
}

function renderSections(fi: Readonly<Record<string, Read<Fi>>>): string {
	return render(FiSections, { props: { snapshot: snapshotWith(fi) } }).body
}

describe("FiSections", () => {
	test("shows one section per Scenario, each with its own answer", () => {
		const read: Read<Fi> = { argv: ARGV, ok: true, data: fiFixture(REACHABLE) }
		const body = renderSections({
			base: read,
			"retire-early": { ...read, data: fiFixture(UNREACHABLE.noCandidateMonth) },
		})
		expect(body).toContain(">base<")
		expect(body).toContain(">retire-early<")
		expect(body).toContain("Mar 2041")
		expect(body).toContain("Not reachable before 31 Dec 2060")
	})

	test("opens the first plan on the focus chart, and shows no other plan's answer twice", () => {
		const read: Read<Fi> = { argv: ARGV, ok: true, data: fiFixture(REACHABLE) }
		const body = renderSections({
			base: read,
			"retire-early": { ...read, data: fiFixture(UNREACHABLE.noCandidateMonth) },
		})
		expect(body.match(/data-focus-visual/g)).toHaveLength(1)
		expect(body.match(/data-focus-answer/g)).toHaveLength(1)
		const second = body.slice(body.indexOf(">retire-early</h2>"))
		expect(second).not.toContain("data-focus-answer")
	})

	test("gives each section heading its own id, so the sections do not share one", () => {
		const read: Read<Fi> = { argv: ARGV, ok: true, data: fiFixture(REACHABLE) }
		const body = renderSections({ base: read, other: read })
		const ids = [...body.matchAll(/<h2 id="([^"]+)" class="text-xl/g)].map((match) => match[1])
		expect(ids).toHaveLength(2)
		expect(new Set(ids).size).toBe(2)
	})

	test("shows the CLI's error for a failed Read and keeps the other Scenarios", () => {
		const failed: Read<Fi> = {
			argv: ARGV,
			ok: false,
			error: { code: "INVALID_DATE", exitCode: 3, message: "The As-of is not a date." },
		}
		const body = renderSections({
			base: failed,
			other: { argv: ARGV, ok: true, data: fiFixture(REACHABLE) },
		})
		expect(body).toContain("FI date of base could not be read")
		expect(body).toContain("The As-of is not a date.")
		expect(body).toContain("Mar 2041")
	})

	test("says there is no plan to read when none has an FI Read", () => {
		expect(renderSections({})).toContain("No plan to read")
	})
})
