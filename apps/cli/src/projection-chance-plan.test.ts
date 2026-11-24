import { describe, expect, it } from "bun:test"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import type { ReturnModel } from "@trajectonomics/core/sim"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { PLAN_VOLATILITY, VOLATILE_PLAN } from "./projection/plan-model-testing"
import { baseFlags, errorOf, projection, projectionHome } from "./projection/testing"
import { chanceBody, chanceFlags } from "./projection-chance-support"
import { applyScenario } from "./scenario-test-support"

/*
 * `projection chance --return-model plan` and `projection model` (cli ADR-0068): the model built from
 * the plan's own Accounts gives the same chance as the file `projection model` printed, a plan that
 * cannot swing is refused, and a what-if on a volatility moves the Bands.
 */

const INVESTMENT = FIXTURE_ACCOUNTS.investment
const GOLDENS = new URL("./projection/fixtures/", import.meta.url)

/** The fixture home with the volatile plan stored beside the base one. */
async function volatileHome(): Promise<string> {
	const home = await projectionHome()
	const applied = await applyScenario(home, "volatile", VOLATILE_PLAN)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}

const planFlags = (extra: string[] = [], scenario = "volatile"): string[] => [
	...baseFlags(scenario),
	"--return-model",
	"plan",
	"--paths",
	"200",
	"--seed",
	ILLUSTRATIVE_SEED,
	...extra,
]

describe("projection chance --return-model plan", () => {
	it("gives the same chance as the file projection model printed", async () => {
		const home = await volatileHome()
		const printed = await projection(home, ["model", "--scenario", "volatile", "--buckets", "64"])
		expect(printed.code).toBe(0)
		const file = join(home, "plan-model.json")
		writeFileSync(file, printed.out)
		const fromPlan = chanceBody(
			await projection(home, ["chance", ...planFlags(["--buckets", "64"])]),
		)
		const fromFile = chanceBody(
			await projection(home, [
				"chance",
				...chanceFlags(file, { paths: 200 }),
				"--scenario",
				"volatile",
			]),
		)
		const { returnModel, notes: _a, ...plan } = fromPlan
		const { notes: _b, ...saved } = fromFile
		expect(returnModel).toBeDefined()
		expect(plan).toEqual(saved)
		expect(plan.definition.modelId).toBe("plan-64")
	})

	it("matches the committed golden, byte for byte, which the Dashboard's contract also decodes", async () => {
		const home = await volatileHome()
		const res = await projection(home, ["chance", ...planFlags(["--buckets", "16"])])
		expect(res.code).toBe(0)
		const id = chanceBody(res).scenario.id
		const text = `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
		await recordGoldenTextIn(GOLDENS, "chance-plan.output", text)
		expect(await goldenTextIn(GOLDENS, "chance-plan.output")).toBe(text)
	})

	it("echoes the inputs the model was built from, at 256 buckets unless told otherwise", async () => {
		const home = await volatileHome()
		const body = chanceBody(await projection(home, ["chance", ...planFlags()]))
		expect(body.returnModel).toEqual({
			source: "plan",
			buckets: 256,
			accounts: [{ id: INVESTMENT, rate: 500, volatility: PLAN_VOLATILITY }],
		})
		expect(body.definition.modelId).toBe("plan-256")
		expect(body.notes.join(" ")).toContain("the plan's own")
		const small = chanceBody(await projection(home, ["chance", ...planFlags(["--buckets", "16"])]))
		expect(small.returnModel?.buckets).toBe(16)
	})

	it("reads the plan after a --set: a volatility what-if changes the Bands", async () => {
		const home = await volatileHome()
		const path = `accounts.${INVESTMENT}.volatility`
		const base = chanceBody(await projection(home, ["chance", ...planFlags()]))
		const wild = chanceBody(
			await projection(home, ["chance", ...planFlags(["--set", `${path}=4000`])]),
		)
		expect(wild.returnModel?.accounts[0]?.volatility).toBe(4000)
		expect(wild.bands).not.toEqual(base.bands)
		const last = (body: typeof base) => body.bands.at(-1)?.netWorth ?? []
		const spread = (body: typeof base) =>
			Number(last(body).at(-1)?.value ?? 0) - Number(last(body)[0]?.value ?? 0)
		expect(spread(wild)).toBeGreaterThan(spread(base))
	})

	it("lets a --set give an asset Account its first volatility, as the refusal's hint says", async () => {
		const home = await projectionHome()
		const set = ["--set", `accounts.${INVESTMENT}.volatility=1500`]
		const swung = chanceBody(await projection(home, ["chance", ...planFlags(set, "base")]))
		expect(swung.returnModel?.accounts).toEqual([
			{ id: INVESTMENT, rate: 500, volatility: PLAN_VOLATILITY },
		])
		const wild = chanceBody(
			await projection(home, [
				"chance",
				...planFlags(["--set", `accounts.${INVESTMENT}.volatility=4000`], "base"),
			]),
		)
		expect(wild.bands).not.toEqual(swung.bands)
		expect(swung.returnModel?.accounts[0]?.volatility).toBe(PLAN_VOLATILITY)
		const model = await projection(home, ["model", "--scenario", "base", ...set])
		expect(model.code).toBe(0)
	})

	it("refuses a --set of a volatility on a liability, as it does any other absent key", async () => {
		const home = await projectionHome()
		const loan = VOLATILE_PLAN.accounts.find((a) => a.kind === "liability")?.id ?? ""
		const res = await projection(home, [
			"chance",
			...planFlags(["--set", `accounts.${loan}.volatility=1500`], "base"),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain(`No key or id "volatility"`)
		const key = await projection(home, [
			"chance",
			...planFlags(["--set", `accounts.${INVESTMENT}.nope=1`], "base"),
		])
		expect(errorOf(key).message).toContain(`No key or id "nope"`)
	})

	it("refuses a plan with no volatility, naming the field and scenario apply --template", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["chance", ...planFlags([], "base")])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({ code: "invalid_input", path: "--return-model" })
		expect(error.message).toContain("no Account of the Scenario has a volatility")
		expect(error.hint).toContain("volatility")
		expect(error.hint).toContain("scenario apply --template")
	})

	it("refuses a bucket count the engine does not take, in words that list the sizes", async () => {
		const home = await volatileHome()
		for (const buckets of ["0", "100", "2048", "8"]) {
			const res = await projection(home, ["chance", ...planFlags(["--buckets", buckets])])
			expect(res.code, buckets).toBe(2)
			const error = errorOf(res)
			expect(error).toMatchObject({ code: "invalid_input", path: "--buckets" })
			expect(error.message).toContain("16, 32, 64, 128, 256, 512 or 1024")
		}
	})

	it("refuses --buckets beside a Return model file", async () => {
		const home = await volatileHome()
		const file = join(home, "model.json")
		const model: ReturnModel = {
			id: "m",
			accounts: [INVESTMENT],
			buckets: [{ returnsBps: [10], weight: 2 ** 32 }],
		}
		writeFileSync(file, JSON.stringify(model))
		const res = await projection(home, ["chance", ...chanceFlags(file), "--buckets", "64"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--buckets" })
	})
})

describe("projection model", () => {
	it("prints the model in the sim format, as the engine builds it", async () => {
		const home = await volatileHome()
		const res = await projection(home, ["model", "--scenario", "volatile", "--buckets", "16"])
		expect(res.code).toBe(0)
		const model = JSON.parse(res.out) as ReturnModel
		expect(Object.keys(model)).toEqual(["id", "accounts", "buckets"])
		expect(model.id).toBe("plan-16")
		expect(model.accounts).toEqual([INVESTMENT])
		expect(model.buckets).toHaveLength(16)
		expect(model.buckets.reduce((sum, bucket) => sum + bucket.weight, 0)).toBe(2 ** 32)
	})

	it("builds 256 buckets by default, and takes a what-if", async () => {
		const home = await volatileHome()
		const plain = JSON.parse((await projection(home, ["model", "--scenario", "volatile"])).out)
		expect(plain.buckets).toHaveLength(256)
		const set = `accounts.${INVESTMENT}.volatility=3000`
		const wild = JSON.parse(
			(await projection(home, ["model", "--scenario", "volatile", "--set", set])).out,
		)
		expect(wild).not.toEqual(plain)
	})

	it("refuses a plan with no volatility, a bad bucket count and an unknown Scenario", async () => {
		const home = await volatileHome()
		const none = await projection(home, ["model", "--scenario", "base"])
		expect(errorOf(none)).toMatchObject({ code: "invalid_input", path: "--scenario" })
		expect(errorOf(none).hint).toContain("scenario apply --template")
		expect(errorOf(none).hint).not.toContain("projection chance")
		const bad = await projection(home, ["model", "--scenario", "volatile", "--buckets", "100"])
		expect(errorOf(bad)).toMatchObject({ code: "invalid_input", path: "--buckets" })
		const missing = await projection(home, ["model", "--scenario", "nope"])
		expect(errorOf(missing).code).toBe("not_found")
	})
})
