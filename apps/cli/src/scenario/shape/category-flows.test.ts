import { describe, expect, it } from "bun:test"
import { scenarioExample } from "./index"
import { refusalsOf, replaceAt, VERSION } from "./testing"

/*
 * `category` is an expense Flow's alone, as the published shape says. Probed against the pinned
 * core from the CLI side, on the example the shape publishes: the core's own tests cover it, and
 * this pins that the CLI's validation path refuses it too.
 */

const EXAMPLE = scenarioExample(VERSION ?? 0)
const FLOWS = EXAMPLE["flows"] as Record<string, unknown>[]

/** The example with `category` added to its first Flow of this kind. */
function withCategory(kind: string): { document: unknown; index: number } {
	const index = FLOWS.findIndex((flow) => flow["kind"] === kind)
	return {
		document: replaceAt(EXAMPLE, ["flows", index], { ...FLOWS[index], category: "essentials" }),
		index,
	}
}

describe("category on a Flow", () => {
	it.each(["income", "contribution", "withdrawal"])("is refused on a %s Flow", (kind) => {
		const { document, index } = withCategory(kind)
		expect(index).toBeGreaterThanOrEqual(0)
		expect(refusalsOf(document)).toEqual([{ code: "UNKNOWN_KEY", path: `flows.${index}.category` }])
	})

	it("is accepted on an expense Flow", () => {
		const { document, index } = withCategory("expense")
		expect(index).toBeGreaterThanOrEqual(0)
		expect(refusalsOf(document)).toEqual([])
	})
})
