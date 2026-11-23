import { describe, expect, it } from "bun:test"
import { ANCHORABLE } from "./household/paths"
import { PUBLISHED } from "./money-fields"
import { BEGINNABLE_BLOCKS } from "./set-begin"

type Node = { type?: string; properties: Record<string, Node>; required: string[] }

describe("the blocks a --set may begin (cli ADR-0065)", () => {
	const schema = PUBLISHED as unknown as Node

	it("names only optional object blocks the published schema declares", () => {
		for (const block of BEGINNABLE_BLOCKS) {
			expect(schema.properties[block]?.type, block).toBe("object")
			expect(schema.required, block).not.toContain(block)
		}
	})

	it("holds no block with a household anchor, so a begun block cannot disagree with the saved plan", () => {
		for (const block of BEGINNABLE_BLOCKS) {
			expect(ANCHORABLE.filter((pattern) => pattern[0] === block)).toEqual([])
		}
	})
})
