// A household person's display label is 1 to 80 code points in sim's rule, published by `traj schema
// scenario household` with the bounds and refused in the rule's own words (sim ADR 0032, cli ADR 0080).
import { describe, expect, it } from "bun:test"
import { DISPLAY_LABEL_RULE } from "@trajectonomics/core/sim"
import { person } from "./scenario/household/person-schema"
import { capture } from "./test-support"
import { ledgerHome } from "./tx-test-support"

/** One published variant of the person schema, which is a discriminated union of the three roles. */
type Variant = { properties: Record<string, unknown> }

describe("the person's display label in traj schema scenario household", () => {
	it("publishes it as a 1 to 80 code point string", async () => {
		const res = await capture(["schema", "scenario", "household", "--json"], {
			TRAJ_HOME: ledgerHome(),
		})
		expect(res.code).toBe(0)
		const { document } = JSON.parse(res.out) as {
			document: { schema: { properties: { people: { items: { oneOf: Variant[] } } } } }
		}
		const variants = document.schema.properties.people.items.oneOf
		expect(variants).toHaveLength(3)
		for (const variant of variants) {
			expect(variant.properties["displayLabel"]).toMatchObject({
				type: "string",
				minLength: 1,
				maxLength: 80,
			})
		}
	})

	it("refuses an invisible character in sim's own words, 'bidirectional' included", () => {
		const parsed = person.safeParse({
			id: "me",
			displayLabel: "Somchai\u202e",
			role: "holder",
			born: "1990-06",
			lifeExpectancy: 90,
		})
		expect(parsed.success).toBe(false)
		expect(parsed.error?.issues[0]?.message).toBe(DISPLAY_LABEL_RULE)
		expect(DISPLAY_LABEL_RULE).toContain("bidirectional")
	})
})
