import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import type { Fi, Read } from "../../lib/contract"
import { fiFixture, REACHABLE, UNREACHABLE } from "../../lib/view/fi/fixtures.test-support"
import FiSections from "./FiSections.svelte"

const ARGV = ["fi", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

describe("FiSections", () => {
	test("shows one section per Scenario, each with its own answer", () => {
		const read: Read<Fi> = { argv: ARGV, ok: true, data: fiFixture(REACHABLE) }
		const { body } = render(FiSections, {
			props: {
				fi: {
					base: read,
					"retire-early": { ...read, data: fiFixture(UNREACHABLE.noCandidateMonth) },
				},
			},
		})
		expect(body).toContain(">base<")
		expect(body).toContain(">retire-early<")
		expect(body).toContain("Mar 2041")
		expect(body).toContain("Not reachable before 31 Dec 2060")
	})

	test("gives each section heading its own id, so the sections do not share one", () => {
		const read: Read<Fi> = { argv: ARGV, ok: true, data: fiFixture(REACHABLE) }
		const { body } = render(FiSections, {
			props: { fi: { base: read, other: read } },
		})
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
		const { body } = render(FiSections, {
			props: { fi: { base: failed, other: { argv: ARGV, ok: true, data: fiFixture(REACHABLE) } } },
		})
		expect(body).toContain("FI date of base could not be read")
		expect(body).toContain("The As-of is not a date.")
		expect(body).toContain("Mar 2041")
	})

	test("says there is no plan to read when none has an FI Read", () => {
		expect(render(FiSections, { props: { fi: {} } }).body).toContain("No plan to read")
	})
})
