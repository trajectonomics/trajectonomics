import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { checkFacts } from "./facts"
import { factsStrip } from "./testing/facts"
import { heroCodes, heroHome } from "./testing/hero"

describe("the three facts in the footer", () => {
	it("passes a home that states every fact in its footer", () => {
		expect(heroCodes(checkFacts)).toEqual([])
	})

	it("passes the Thai home, whose facts are Thai", () => {
		expect(heroCodes(checkFacts, heroHome("th"))).toEqual([])
	})

	it("fails a home that carries no facts strip at all", () => {
		expect(heroCodes(checkFacts, heroHome("en", { facts: "" }))).toEqual(["PAGE_FACTS_MISSING"])
	})

	it("names every fact the missing strip would have stated", () => {
		const dictionary = dictionaryFor("en")
		const failure = checkFacts([heroHome("en", { facts: "" })])[0]
		for (const fact of [...dictionary.factLabels, ...dictionary.factTexts]) {
			expect(failure?.message).toContain(fact)
		}
	})

	it("fails a strip that leaves one fact's text out", () => {
		const dictionary = dictionaryFor("en")
		const partial = factsStrip({ ...dictionary, factTexts: dictionary.factTexts.slice(0, 2) })
		expect(heroCodes(checkFacts, heroHome("en", { facts: partial }))).toEqual(["FACT_NOT_STATED"])
	})

	it("fails a strip that states one fact's text under another label", () => {
		const dictionary = dictionaryFor("en")
		const label = dictionary.factLabels[2] ?? ""
		const renamed = factsStrip(dictionary).replace(label, "Money things")
		const failures = checkFacts([heroHome("en", { facts: renamed })])
		expect(failures.map((failure) => failure.code)).toEqual(["FACT_NOT_STATED"])
		expect(failures[0]?.message).toContain(label)
	})

	it("fails a home that keeps the facts in the hero instead of the footer", () => {
		const dictionary = dictionaryFor("en")
		const page = heroHome("en", { facts: "" })
		const content = page.content.replace("</main>", `${factsStrip(dictionary)}</main>`)
		expect(checkFacts([{ path: page.path, content }])).toEqual([
			expect.objectContaining({ code: "PAGE_FACTS_NOT_IN_FOOTER" }),
		])
	})
})
