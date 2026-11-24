import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { project } from "../engine/project"
import { EVERY_PARITY_CASE } from "./every-parity-case"

/**
 * The recorded hash of each case that has an `upTo` or `downTo` of `{ amount, growth }`, taken on `main` before
 * the Projection stated `routing`. Only the new field moved them: see the test below.
 */
const BEFORE_THE_FIELD: Readonly<Record<string, string>> = {
	"routing-real-floor": "1f4987f13bee31e8f7b452bd3ff0ce0ab0033d537d5e00e572ab6eb4317a4f45",
	"routing-real-target": "d7f6c9cecbb35a219b5c9caac83da20802a577bb07348c5683a976a18777cb8b",
}

function hash(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

const recorded: readonly { readonly name: string; readonly sha256: string }[] = JSON.parse(
	readFileSync(new URL("../../parity/cases.json", import.meta.url), "utf8"),
)

describe("stating routing moves no hash but a Scenario with a target in today's money", () => {
	for (const testCase of EVERY_PARITY_CASE) {
		const { name, fixture, projectOptions } = testCase
		if (name === "routing-statement") continue
		it(`${name}: the hash is the one on main once the new field is left out`, () => {
			const result = project(fixture.baseline, fixture.scenario, fixture.timeline, projectOptions)
			if (!result.ok) throw new Error(name)
			const { routing, ...rest } = result.projection
			const before = BEFORE_THE_FIELD[name]
			expect(routing !== undefined).toBe(before !== undefined)
			expect(hash({ ok: true, projection: rest })).toBe(
				before ?? recorded.find((item) => item.name === name)!.sha256,
			)
		})
	}
})
