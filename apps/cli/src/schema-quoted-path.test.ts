import { describe, expect, it } from "bun:test"
import { capture } from "./test-support"
import { ledgerHome } from "./tx-test-support"

describe("a command path given as one quoted argument", () => {
	it("is read as its words by traj schema, the same as separate words", async () => {
		const home = ledgerHome()
		const quoted = await capture(["schema", "tx add", "--json"], { TRAJ_HOME: home })
		const split = await capture(["schema", "tx", "add", "--json"], { TRAJ_HOME: home })
		expect(quoted.code).toBe(0)
		expect(quoted.out).toBe(split.out)
		expect(JSON.parse(quoted.out)).toMatchObject({ name: "tx add" })
	})

	it("is read as its words by traj help", async () => {
		const res = await capture(["help", "tx add"])
		expect(res.code).toBe(0)
		expect(res.out).toStartWith("Usage: traj tx add")
	})

	it("still refuses a quoted path that names no command", async () => {
		const res = await capture(["schema", "tx nope", "--json"], { TRAJ_HOME: ledgerHome() })
		expect(res.code).toBe(2)
		expect(JSON.parse(res.err).error).toMatchObject({
			code: "unknown_command",
			message: "Unknown command: tx nope",
		})
	})
})
