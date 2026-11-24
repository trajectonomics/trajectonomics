import { describe, expect, it } from "bun:test"
import simPackage from "../package.json"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { projection } from "./projection/testing"
import { ROUTING_FLAGS, routingHome } from "./projection-routing-plan"
import { runBody } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * `projection run --breakdown --liabilities` on the routing plan (cli ADR-0070), pinned byte for byte. The
 * Dashboard's contract decodes the JSON golden (`apps/web/src/lib/contract/projection-run.test.ts`), so a field the
 * CLI adds or renames here fails there before it reaches a page.
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)
const FLAGS = [...ROUTING_FLAGS, "--breakdown", "--liabilities"]

describe("projection run on the routing plan: the bytes are pinned", () => {
	it("pins the JSON, with the Scenario's minted id replaced", async () => {
		const home = await routingHome()
		const res = await projection(home, ["run", ...FLAGS])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const id = runBody(res).scenario.id
		const text = `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
		expect((JSON.parse(text) as { engine: { version: string } }).engine.version).toBe(
			simPackage.version,
		)
		await recordGoldenTextIn(GOLDENS, "run-routing.output", text)
		expect(await goldenTextIn(GOLDENS, "run-routing.output")).toBe(text)
	})

	it("pins the human form, the routing table and the transfers in each year's block", async () => {
		const home = await routingHome()
		const res = await capture(["projection", "run", ...FLAGS], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		await recordGoldenTextIn(GOLDENS, "run-routing-human.output", res.out)
		expect(await goldenTextIn(GOLDENS, "run-routing-human.output")).toBe(res.out)
	})
})
