import { describe, expect, test } from "bun:test"
import { daysLeft, whoAmI } from "../src/commands/whoami"
import { ACCOUNT_ID, credentials } from "./support/auth"

const DAY = 86_400_000
const START = Date.parse("2026-11-01T00:00:00.000Z")

function printed(): { lines: string[]; out: (line: string) => void } {
	const lines: string[] = []
	return { lines, out: (line) => lines.push(line) }
}

describe("daysLeft", () => {
	test("counts whole days to the 90-day limit", () => {
		expect(daysLeft(credentials().grantStartedAt, START + 27 * DAY)).toBe(63)
	})

	test("rounds a partial day down", () => {
		expect(daysLeft(credentials().grantStartedAt, START + 27.5 * DAY)).toBe(62)
	})

	test("never goes below zero", () => {
		expect(daysLeft(credentials().grantStartedAt, START + 90 * DAY)).toBe(0)
		expect(daysLeft(credentials().grantStartedAt, START + 200 * DAY)).toBe(0)
	})
})

describe("whoAmI", () => {
	test("prints the account, issuer and days left", () => {
		const sink = printed()
		const exitCode = whoAmI(START + 27 * DAY, {
			read: () => credentials(),
			out: sink.out,
			log: () => {},
		})

		expect(exitCode).toBe(0)
		expect(sink.lines).toEqual([
			`Account id: ${ACCOUNT_ID}`,
			"Issuer: https://auth.synthetic.test",
			"Sign in again within 63 day(s)",
		])
	})

	test("exits 1 when not signed in", () => {
		const sink = printed()
		const exitCode = whoAmI(START, { read: () => null, out: sink.out, log: () => {} })

		expect(exitCode).toBe(1)
		expect(sink.lines).toEqual(["Not signed in."])
	})
})
