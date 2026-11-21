import { describe, expect, test } from "bun:test"
import { bindingSentence, type UnreachableBinding } from "./binding"

const EVERY_BINDING: readonly UnreachableBinding[] = [
	"noCandidateMonth",
	"shortfallBeforeStop",
	"undrawableMoney",
	"insufficientMoney",
	"minimumBuffer",
]

describe("bindingSentence", () => {
	test("gives every binding a plain sentence of its own", () => {
		const sentences = EVERY_BINDING.map(bindingSentence)
		expect(sentences.every((sentence) => sentence.length > 0)).toBe(true)
		expect(new Set(sentences).size).toBe(EVERY_BINDING.length)
	})

	test("never uses the engine's identifier as the sentence", () => {
		for (const binding of EVERY_BINDING) {
			expect(bindingSentence(binding)).not.toContain(binding)
		}
	})
})
