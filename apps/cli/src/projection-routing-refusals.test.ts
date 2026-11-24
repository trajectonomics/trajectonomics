import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { ROUTING_FLAGS, routingHome } from "./projection-routing-plan"
import { errorOf } from "./scenario-test-support"

/*
 * The words a refusal on the routing carries (cli ADR-0070): a share out of range states its own range, a typo
 * near a key a `--set` may begin is corrected, and `--without` says a routing step has no id to name.
 */

const run = (home: string, extra: readonly string[]) =>
	projection(home, ["run", ...ROUTING_FLAGS, "--breakdown", ...extra])

describe("the refusals on the routing", () => {
	const refused = async (set: string) => {
		const res = await run(await routingHome(), ["--set", set])
		expect(res.code).toBe(2)
		return errorOf(res)
	}

	it("gives a share out of range its own range and unit, 0 included", async () => {
		const zero = await refused("cashflow.surplus.1.share=0")
		expect(zero.message).toContain("RATE_OUT_OF_RANGE")
		expect(zero.message).toContain("A surplus step's share must be from 0.01% to 100%")
		expect(zero.message).toContain("1 to 10000 basis points")
		expect(zero.hint).toContain("A step that takes everything it can has no share.")
		expect(zero.hint).toContain('"30.00"')
	})

	it("offers the keys a --set may begin among the known ones", async () => {
		const error = await refused("cashflow.surplus.0.foo=1")
		expect(error.hint).toContain('"share"')
		expect(error.hint).toContain('"upTo"')
		const typo = await refused("cashflow.surplus.0.shar=1")
		expect(typo.hint).toContain("cashflow.surplus.0.share")
	})

	it("states that --without cannot name a routing step or entry, which has no id", async () => {
		for (const list of ["surplus", "withdraw"]) {
			for (const segment of ["0", "emergency"]) {
				const res = await run(await routingHome(), ["--without", `cashflow.${list}.${segment}`])
				expect(res.code).toBe(2)
				expect(errorOf(res).hint).toBe(
					`--without takes out an item by its id, and a routing step or entry has none: --set cashflow.${list}=<json> with the list you want.`,
				)
			}
		}
	})
})
