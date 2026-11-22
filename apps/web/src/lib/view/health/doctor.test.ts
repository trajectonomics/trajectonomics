import { describe, expect, test } from "bun:test"

import type { Doctor } from "../../contract"
import { doctorView, formatCount } from "./doctor"

const doctor: Doctor = {
	ok: false,
	cliVersion: "1.2.3",
	directory: { path: "~/.traj", exists: true, writable: false },
	database: { path: "~/.traj/traj.db", exists: true, bytes: 1234567, schemaVersion: null, head: 2 },
	rows: { entity: 1, account: 9, tx: 152, posting: 304, scenario: 0 },
	checks: [
		{ name: "directory", status: "pass", detail: "exists" },
		{ name: "writable", status: "fail", detail: "not writable" },
		{ name: "trialBalance", status: "skipped", detail: "no ledger" },
	],
}

describe("doctorView", () => {
	test("reports the doctor's ok flag and the CLI version as they came", () => {
		const view = doctorView(doctor)
		expect(view.ok).toBe(false)
		expect(view.cliVersion).toBe("1.2.3")
	})

	test("gives each check its label, with the CLI's status and detail", () => {
		const view = doctorView(doctor)
		expect(view.checks.map((check) => [check.label, check.status, check.detail])).toEqual([
			["Data directory", "pass", "exists"],
			["Directory writable", "fail", "not writable"],
			["Trial balance", "skipped", "no ledger"],
		])
	})

	test("says the schema has no version yet when the database has none", () => {
		expect(doctorView(doctor).database.schema).toBe("No schema yet; the latest is 2")
	})

	test("states the database size in bytes with its digits grouped", () => {
		expect(doctorView(doctor).database.size).toBe("1,234,567 bytes")
	})

	test("counts each kind of row the CLI counted", () => {
		const counts = doctorView(doctor).rows.map((row) => [row.label, row.count])
		expect(counts).toContainEqual(["Transactions", "152"])
		expect(counts).toContainEqual(["Scenarios", "0"])
	})

	test("has no trial balance when the doctor did not check one", () => {
		expect(doctorView(doctor).trialBalance).toBeNull()
	})

	test("passes the CLI's trial balance through when the doctor checked one", () => {
		const checked: Doctor = {
			...doctor,
			trialBalance: {
				asOf: "2026-10-31",
				totals: [{ currency: "THB", debit: "10.00", credit: "10.00" }],
				balanced: true,
			},
		}
		expect(doctorView(checked).trialBalance?.balanced).toBe(true)
	})
})

describe("formatCount", () => {
	test("groups the digits in threes and leaves a small count alone", () => {
		expect(formatCount(0)).toBe("0")
		expect(formatCount(999)).toBe("999")
		expect(formatCount(1000)).toBe("1,000")
		expect(formatCount(12345678)).toBe("12,345,678")
	})
})
