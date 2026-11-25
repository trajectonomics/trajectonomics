import { describe, expect, it } from "bun:test"
import { ILLUSTRATIVE_RETURN_MODEL, ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import {
	baseFlags,
	errorOf,
	PROJECTION_SCENARIO,
	projection,
	projectionHome,
} from "./projection/testing"
import { modelFile } from "./projection-chance-support"
import { applyScenario } from "./scenario-test-support"

/*
 * The follow-up to `traj projection chance` (issue #210) that needs its own Scenario: a Return model
 * naming more than the 64 Accounts the engine takes needs a plan declaring that many to be refused
 * for the count rather than for an Account it does not know.
 */

/** The 59 Accounts that take the fixture plan's six to the 65 a refused model needs. */
const EXTRA = Array.from({ length: 59 }, (_, index) => ({
	id: `extra-${index}`,
	kind: "asset" as const,
	rate: 100,
}))

const WIDE = { ...PROJECTION_SCENARIO, accounts: [...PROJECTION_SCENARIO.accounts, ...EXTRA] }

describe("projection chance: a Return model with too many Accounts", () => {
	it("says the Return model names more than 64 Accounts", async () => {
		const home = await projectionHome()
		const applied = await applyScenario(home, "wide", WIDE)
		expect(applied.code).toBe(0)
		const accounts = WIDE.accounts.map((account) => account.id)
		const buckets = [{ returnsBps: accounts.map(() => 8), weight: 4294967296 }]
		const model = modelFile(home, { ...ILLUSTRATIVE_RETURN_MODEL, accounts, buckets })
		const res = await projection(home, [
			"chance",
			...baseFlags("wide"),
			"--return-model",
			model,
			"--paths",
			"20",
			"--seed",
			ILLUSTRATIVE_SEED,
		])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error.path).toBe("document.accounts")
		expect(error.message).toBe("The Return model names more than 64 Accounts.")
	})
})
