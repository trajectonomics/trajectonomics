import { describe, expect, it } from "bun:test"
import { loadPersonas } from "./persona"
import { promptFor } from "./prompt"

const [persona] = loadPersonas(`${import.meta.dir}/personas`)
if (persona === undefined) throw new Error("no personas")

describe("promptFor", () => {
	it("carries the persona's conversation and its stated what-if, verbatim", () => {
		const prompt = promptFor(persona)
		expect(prompt).toContain(persona.conversation)
		expect(prompt).toContain(persona.whatIf.description)
	})

	it("forbids writing any file outside the agent's working directory", () => {
		expect(promptFor(persona)).toContain("Do not write any file outside your working directory")
	})

	it("forbids reading files, so the agent answers from traj alone", () => {
		expect(promptFor(persona)).toContain("Do not read, search or open any file")
	})
})
