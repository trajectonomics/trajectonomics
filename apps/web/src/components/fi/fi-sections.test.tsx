import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { Fi, Read } from "../../lib/contract"
import { fiFixture, REACHABLE, UNREACHABLE } from "../../lib/view/fi/fixtures.test-support"
import { FiSections } from "./FiSections"

const ARGV = ["fi", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

describe("FiSections", () => {
	test("shows one section per Scenario, each with its own answer", () => {
		const read: Read<Fi> = { argv: ARGV, ok: true, data: fiFixture(REACHABLE) }
		const html = renderToStaticMarkup(
			<FiSections
				fi={{
					base: read,
					"retire-early": { ...read, data: fiFixture(UNREACHABLE.noCandidateMonth) },
				}}
			/>,
		)
		expect(html).toContain(">base<")
		expect(html).toContain(">retire-early<")
		expect(html).toContain("Mar 2041")
		expect(html).toContain("Not reachable before 31 Dec 2060")
	})

	test("shows the CLI's error for a failed Read and keeps the other Scenarios", () => {
		const failed: Read<Fi> = {
			argv: ARGV,
			ok: false,
			error: { code: "INVALID_DATE", exitCode: 3, message: "The As-of is not a date." },
		}
		const html = renderToStaticMarkup(
			<FiSections
				fi={{ base: failed, other: { argv: ARGV, ok: true, data: fiFixture(REACHABLE) } }}
			/>,
		)
		expect(html).toContain("FI date of base could not be read")
		expect(html).toContain("The As-of is not a date.")
		expect(html).toContain("Mar 2041")
	})

	test("says there is no Scenario to read when none has an FI Read", () => {
		expect(renderToStaticMarkup(<FiSections fi={{}} />)).toContain("No Scenario to read")
	})
})
