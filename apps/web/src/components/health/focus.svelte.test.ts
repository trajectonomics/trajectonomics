import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { Doctor, Read } from "../../lib/contract"
import { DEMO, DEMO_DOCTOR } from "../../lib/view/what-if/fixtures.test-support"
import HealthFocus from "./HealthFocus.svelte"

const DOCTOR: Read<Doctor> = {
	argv: ["doctor", "--as-of", "2026-10-31", "--json"],
	ok: true,
	data: DEMO_DOCTOR,
}

/** The Demo's doctor with its ledger check failed. */
function failedDoctor(): Read<Doctor> {
	const data = structuredClone(DEMO_DOCTOR)
	const check = data.checks[4]
	if (check === undefined) throw new Error("the Demo has the ledger check")
	data.checks[4] = { ...check, status: "fail", detail: "3 transactions are unbalanced." }
	return { argv: ["doctor", "--as-of", "2026-10-31", "--json"], ok: true, data }
}

describe("HealthFocus", () => {
	test("says all good with every check passing, and draws one segment for each", () => {
		const { body } = render(HealthFocus, { props: { doctor: DOCTOR, snapshot: DEMO } })
		expect(body).toContain("Is everything in order? All good.")
		expect(body).toContain("data-focus-answer")
		expect(body).toContain(">All good<")
		expect(body.match(/stroke-dasharray/g)).toHaveLength(6)
		expect(body).not.toContain("data-primary-action")
	})

	test("says how many to check and links to the first failing row", () => {
		const { body } = render(HealthFocus, { props: { doctor: failedDoctor(), snapshot: DEMO } })
		expect(body).toContain(
			"Is everything in order? 1 to check. Ledger: 3 transactions are unbalanced.",
		)
		expect(body).toContain(">1 to check<")
		expect(body.match(/data-primary-action/g)).toHaveLength(1)
		expect(body).toContain('href="#check-ledger"')
		expect(body).toContain(">See the first one<")
	})

	test("keeps the page's own error state, with no focus point, when the doctor could not be read", () => {
		const read: Read<Doctor> = {
			argv: ["doctor", "--json"],
			ok: false,
			error: { code: "DB_MISSING", exitCode: 2, message: "The database is missing." },
		}
		const { body } = render(HealthFocus, { props: { doctor: read, snapshot: DEMO } })
		expect(body).not.toContain("data-focus-section")
		expect(body).not.toContain("Is everything in order?")
	})
})
