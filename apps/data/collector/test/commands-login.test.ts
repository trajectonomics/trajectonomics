import { describe, expect, test } from "bun:test"
import type { LoginOutcome } from "../src/auth/login"
import { type LoginCommandDeps, parseLoginArgs, runLoginCommand } from "../src/commands/login"

function makeDeps(outcome: LoginOutcome | Error = { ok: true, accountId: null }) {
	const printed: string[] = []
	const exits: number[] = []
	const issuers: string[] = []
	const deps: LoginCommandDeps = {
		env: {},
		login: async (issuer) => {
			issuers.push(issuer)
			if (outcome instanceof Error) throw outcome
			return outcome
		},
		log: (line) => printed.push(line),
		exit: (code) => exits.push(code),
	}
	return { deps, printed, exits, issuers }
}

describe("parseLoginArgs", () => {
	test("defaults to the auth Worker and accepts an https override", () => {
		expect(parseLoginArgs([], {})).toEqual({ issuer: "https://auth.trajectonomics.com" })
		expect(parseLoginArgs(["--issuer", "https://auth.synthetic.test/"], {})).toEqual({
			issuer: "https://auth.synthetic.test",
		})
	})

	test("allows http only on loopback", () => {
		expect(parseLoginArgs(["--issuer", "http://localhost:8787"], {})).toEqual({
			issuer: "http://localhost:8787",
		})
		expect(() => parseLoginArgs(["--issuer", "http://auth.synthetic.test"], {})).toThrow(
			"issuer must use https",
		)
	})

	test("refuses an insecure TRAJ_AUTH_URL", () => {
		expect(() => parseLoginArgs([], { TRAJ_AUTH_URL: "http://auth.synthetic.test" })).toThrow(
			"issuer must use https",
		)
	})
})

describe("runLoginCommand", () => {
	test("prints a save failure once and exits 1", async () => {
		const run = makeDeps(new Error("synthetic disk full"))

		await runLoginCommand([], run.deps)

		expect(run.printed).toEqual(["login: could not save credentials: synthetic disk full"])
		expect(run.exits).toEqual([1])
	})

	test("prints a declined sign-in and exits 1", async () => {
		const run = makeDeps({ ok: false, message: "the sign-in was declined" })

		await runLoginCommand([], run.deps)

		expect(run.printed).toEqual(["login: the sign-in was declined"])
		expect(run.exits).toEqual([1])
	})

	test("leaves the exit code alone after a successful sign-in", async () => {
		const run = makeDeps({ ok: true, accountId: "user-synthetic-1" })

		await runLoginCommand([], run.deps)

		expect(run.printed).toEqual([])
		expect(run.exits).toEqual([])
		expect(run.issuers).toEqual(["https://auth.trajectonomics.com"])
	})

	test("refuses an insecure issuer before signing in", async () => {
		const run = makeDeps()
		run.deps.env = { TRAJ_AUTH_URL: "http://auth.synthetic.test" }

		await runLoginCommand([], run.deps)

		expect(run.printed[0]).toContain("login: issuer must use https")
		expect(run.issuers).toEqual([])
		expect(run.exits).toEqual([1])
	})
})
