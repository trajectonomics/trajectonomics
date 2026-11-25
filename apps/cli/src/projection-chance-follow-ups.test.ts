import { describe, expect, it } from "bun:test"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { ILLUSTRATIVE_RETURN_MODEL, ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { errorOf, projection, projectionHome } from "./projection/testing"
import { outcomesRun, pathAt, pathBody } from "./projection-chance-outcomes-support"
import { chanceBody, chanceFlags, modelFile } from "./projection-chance-support"
import { canonicalJson, contentHash } from "./store/canonical"
import { capture } from "./test-support"
import { ledgerHome } from "./tx-test-support"

/*
 * The follow-ups to `traj projection chance` (issue #210): the hint by failed input, a sentence for every
 * Return-model code, the schema's bounds, the model hash in the echo and the human form's headline.
 */

const { bank, investment } = FIXTURE_ACCOUNTS
const HALF = 2147483648

/** The model with one thing changed, written to a file under `home`. */
function changed(home: string, change: Record<string, unknown>): string {
	return modelFile(home, { ...ILLUSTRATIVE_RETURN_MODEL, ...change })
}

/** The refusal of `projection chance` over a model, parsed. */
async function refused(home: string, model: string) {
	const res = await projection(home, ["chance", ...chanceFlags(model)])
	expect(res.code).toBe(2)
	return errorOf(res)
}

describe("projection chance: the hint follows the input that failed", () => {
	it("tells a bad --paths what --paths takes, not the Return model's shape", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["chance", ...chanceFlags(modelFile(home), { paths: 0 })])
		const error = errorOf(res)
		expect(error.path).toBe("--paths")
		expect(error.hint).toBe("Give --paths a whole number from 1 to 10,000.")
	})

	it("tells a bad --seed what --seed takes, with an example", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"chance",
			...chanceFlags(modelFile(home), { seed: "0123456789ABCDEF" }),
		])
		const error = errorOf(res)
		expect(error.path).toBe("--seed")
		expect(error.hint).toBe("Give --seed sixteen lower-case hex digits, such as 0123456789abcdef.")
	})

	it("tells a bad Return model where its shape is published", async () => {
		const home = await projectionHome()
		const error = await refused(home, changed(home, { accounts: ["nobody", bank] }))
		expect(error.hint).toBe(
			"details lists every problem; the Return model's shape is in traj schema projection chance.",
		)
	})
})

describe("projection chance: every Return-model code has a sentence", () => {
	it("words weights that do not add up to 2^32", async () => {
		const home = await projectionHome()
		const buckets = [{ returnsBps: [8, 120], weight: HALF }]
		const error = await refused(home, changed(home, { buckets }))
		expect(error).toMatchObject({ path: "document.buckets" })
		expect(error.message).toBe(
			"The bucket weights of the Return model must add up to 4294967296 (2^32), the whole of the probability.",
		)
		expect(error.details).toEqual([{ code: "RETURN_WEIGHT_TOTAL", path: "document.buckets" }])
	})

	it("words a returnsBps that is not one return per Account", async () => {
		const home = await projectionHome()
		const buckets = [{ returnsBps: [8], weight: 4294967296 }]
		const error = await refused(home, changed(home, { buckets }))
		expect(error).toMatchObject({ path: "document.buckets.0.returnsBps" })
		expect(error.message).toBe(
			"Each bucket of the Return model needs one return per Account, in the order of accounts: this bucket's returnsBps is not as long as accounts.",
		)
	})

	it("words an Account named twice", async () => {
		const home = await projectionHome()
		const buckets = [{ returnsBps: [8, 8], weight: 4294967296 }]
		const error = await refused(home, changed(home, { accounts: [bank, bank], buckets }))
		expect(error.message).toBe("The Return model names the same Account more than once.")
		expect(error.details).toEqual([{ code: "DUPLICATE_ID", path: "document.accounts.1" }])
	})

	it("words a return outside -9999 to 10000 basis points", async () => {
		const home = await projectionHome()
		const buckets = [{ returnsBps: [8, 10001], weight: 4294967296 }]
		const error = await refused(home, changed(home, { buckets }))
		expect(error.path).toBe("document.buckets.0.returnsBps.1")
		expect(error.message).toBe(
			"A return in the Return model must be from -9999 to 10000 basis points: 100 is 1% over the month.",
		)
	})

	it("words a weight above 2^32", async () => {
		const home = await projectionHome()
		const buckets = [{ returnsBps: [8, 120], weight: 4294967297 }]
		const error = await refused(home, changed(home, { buckets }))
		expect(error.path).toBe("document.buckets.0.weight")
		expect(error.message).toBe(
			"A bucket weight in the Return model must be a whole number from 0 to 4294967296 (2^32).",
		)
	})

	it("words more than 1,024 buckets", async () => {
		const home = await projectionHome()
		const empty = { returnsBps: [8, 120], weight: 0 }
		const buckets = [
			{ returnsBps: [8, 120], weight: 4294967296 },
			...Array.from({ length: 1024 }, () => empty),
		]
		const error = await refused(home, changed(home, { buckets }))
		expect(error.message).toBe("The Return model has more than 1,024 buckets.")
		expect(error.path).toBe("document.buckets")
	})

	it("words an Account the Scenario does not declare", async () => {
		const home = await projectionHome()
		const error = await refused(home, changed(home, { accounts: [investment, "nobody"] }))
		expect(error.message).toBe("The Return model names an Account the Scenario does not declare.")
	})
})

describe("traj schema projection chance and path state the bounds", () => {
	for (const leaf of ["chance", "path"]) {
		it(`projection ${leaf}: --paths is 1 to 10,000 and --seed is sixteen lower-case hex digits`, async () => {
			const res = await capture(["schema", "projection", leaf, "--json"], {
				TRAJ_HOME: ledgerHome(),
			})
			expect(res.code).toBe(0)
			const { input } = JSON.parse(res.out) as {
				input: { properties: Record<string, Record<string, unknown>> }
			}
			expect(input.properties["paths"]).toMatchObject({
				type: "integer",
				minimum: 1,
				maximum: 10000,
			})
			expect(input.properties["seed"]).toMatchObject({ type: "string", pattern: "^[0-9a-f]{16}$" })
		})
	}
})

describe("the echo carries a hash of the Return model", () => {
	const hashOf = (model: unknown) => contentHash(canonicalJson(model))

	it("is the content hash of the model document, and the same for the same model", async () => {
		const home = await projectionHome()
		const first = chanceBody(await projection(home, ["chance", ...chanceFlags(modelFile(home))]))
		const second = chanceBody(
			await projection(home, ["chance", ...chanceFlags(modelFile(home, undefined, "again.json"))]),
		)
		expect(first.definition.modelHash).toBe(hashOf(ILLUSTRATIVE_RETURN_MODEL))
		expect(second.definition.modelHash).toBe(first.definition.modelHash)
		expect(first.definition).toEqual({
			modelId: ILLUSTRATIVE_RETURN_MODEL.id,
			seed: ILLUSTRATIVE_SEED,
			paths: 200,
			modelHash: hashOf(ILLUSTRATIVE_RETURN_MODEL),
		})
	})

	it("tells two files with the same id apart", async () => {
		const home = await projectionHome()
		const other = {
			...ILLUSTRATIVE_RETURN_MODEL,
			buckets: ILLUSTRATIVE_RETURN_MODEL.buckets.slice(),
		}
		other.buckets[0] = { returnsBps: [8, 121], weight: HALF / 2 }
		const a = chanceBody(await projection(home, ["chance", ...chanceFlags(modelFile(home))]))
		const b = chanceBody(
			await projection(home, ["chance", ...chanceFlags(modelFile(home, other, "other.json"))]),
		)
		expect(b.definition.modelId).toBe(a.definition.modelId)
		expect(b.definition.modelHash).not.toBe(a.definition.modelHash)
	})

	it("is the same on the path of the run, so a path and its chance still agree", async () => {
		const { home, flags } = await outcomesRun(20)
		const chance = chanceBody(await projection(home, ["chance", ...flags]))
		const path = pathBody(await pathAt(home, flags, 3))
		expect(path.definition).toEqual(chance.definition)
	})
})

describe("projection chance in the human form", () => {
	it("prints the success share first, once, and the Bands after it", async () => {
		const home = await projectionHome()
		const res = await capture(["projection", "chance", ...chanceFlags(modelFile(home))], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(0)
		const lines = res.out.split("\n")
		const share = lines.findIndex((line) => line.startsWith("The plan holds to "))
		const table = lines.findIndex((line) => line.startsWith("bands "))
		expect(share).toBeGreaterThanOrEqual(0)
		expect(share).toBeLessThan(table)
		expect(res.out.split("a success share of")).toHaveLength(2)
		expect(res.out).toContain(
			`Return model "${ILLUSTRATIVE_RETURN_MODEL.id}" with seed ${ILLUSTRATIVE_SEED}`,
		)
		expect(res.out).not.toContain("return model")
	})

	it("keeps the success share in the JSON notes", async () => {
		const home = await projectionHome()
		const body = chanceBody(await projection(home, ["chance", ...chanceFlags(modelFile(home))]))
		expect(body.notes.filter((note) => note.startsWith("The plan holds to "))).toHaveLength(1)
	})
})
