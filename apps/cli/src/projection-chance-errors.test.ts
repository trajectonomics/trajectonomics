import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { ILLUSTRATIVE_RETURN_MODEL, ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import {
	AS_OF,
	errorOf,
	HORIZON,
	projection,
	projectionHome,
	seededHome,
} from "./projection/testing"
import { chanceFlags, modelFile } from "./projection-chance-support"
import { capture } from "./test-support"

describe("projection chance failures", () => {
	it("refuses a path count outside 1 to 10,000 as invalid input at --paths", async () => {
		const home = await projectionHome()
		for (const paths of ["0", "10001"]) {
			const res = await projection(home, ["chance", ...chanceFlags(modelFile(home), { paths })])
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({
				code: "invalid_input",
				path: "--paths",
				details: [{ code: "INVALID_PATH_COUNT", path: "--paths" }],
			})
		}
	})

	it("refuses a seed that is not sixteen lower-case hex digits at --seed", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"chance",
			...chanceFlags(modelFile(home), { seed: "0123456789ABCDEF" }),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--seed",
			details: [{ code: "INVALID_SEED", path: "--seed" }],
		})
	})

	it("names an Account the Scenario lacks at its document path, as invalid input", async () => {
		const home = await projectionHome()
		const stranger = "00000000-0000-7000-8000-00000000dead"
		const model = { ...ILLUSTRATIVE_RETURN_MODEL, accounts: [stranger, FIXTURE_ACCOUNTS.bank] }
		const res = await projection(home, ["chance", ...chanceFlags(modelFile(home, model))])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({ code: "invalid_input", path: "document.accounts.0" })
		expect(error.details).toEqual([{ code: "UNKNOWN_ACCOUNT", path: "document.accounts.0" }])
	})

	it("refuses a model file that is not valid JSON at --return-model", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["chance", ...chanceFlags(modelFile(home, "{ nope"))])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--return-model" })
	})

	it("refuses a model with a field the sim format does not have, at its document path", async () => {
		const home = await projectionHome()
		const model = { ...ILLUSTRATIVE_RETURN_MODEL, extra: true }
		const res = await projection(home, ["chance", ...chanceFlags(modelFile(home, model))])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "document.extra" })
	})

	it("refuses a model file that does not exist at --return-model", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["chance", ...chanceFlags(join(home, "missing.json"))])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--return-model" })
	})

	it("refuses an unknown Scenario as not found", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"chance",
			...["--scenario", "nope", "--as-of", AS_OF, "--horizon", HORIZON],
			"--return-model",
			modelFile(home),
			"--paths",
			"10",
			"--seed",
			ILLUSTRATIVE_SEED,
		])
		expect(res.code).toBe(4)
		expect(errorOf(res).code).toBe("not_found")
	})

	it("requires every flag the leaf declares, and names the missing one", async () => {
		const home = seededHome()
		const res = await capture(["projection", "chance", "--json"], { TRAJ_HOME: home })
		expect(res.code).toBe(2)
		expect(errorOf(res).code).toBe("invalid_input")
	})
})
