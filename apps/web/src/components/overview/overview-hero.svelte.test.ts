import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { HeroView } from "../../lib/view/overview/hero"
import { noteAnchor } from "../../lib/view/projection/notes"
import NoteList from "../projection/NoteList.svelte"
import OverviewHero from "./OverviewHero.svelte"

const ANCHOR = noteAnchor("base", 0)

const SUCCESS_NOTE =
	"The plan holds to 2043-12-31 on 174 of 200 seeded Market paths: a success share of 87.00%."

const HERO: HeroView = {
	sentence: "You could stop working in Mar 2041, when you are 54.",
	planNote: { label: "Your plan as written:", text: SUCCESS_NOTE },
	warnings: [
		{
			text: "29603.80 of Contributions could not be funded, so they were not made.",
			anchor: ANCHOR,
			label: "Note 1",
		},
	],
	warningsLabel: "1 thing to check",
}

describe("OverviewHero", () => {
	test("shows the sentence, the plan note, the count and a link to the note", () => {
		const { body } = render(OverviewHero, { props: { hero: HERO } })
		expect(body).toContain(HERO.sentence)
		expect(body).toContain("Your plan as written:")
		expect(body).toContain(SUCCESS_NOTE)
		expect(body).toContain("1 thing to check")
		expect(body).toContain(`href="/fi/#${ANCHOR}"`)
	})

	test("keeps the note's money out of Home, so hiding amounts reveals nothing new", () => {
		const { body } = render(OverviewHero, { props: { hero: HERO } })
		expect(body).not.toContain("29603.80")
		expect(body).not.toContain("Contributions could not be funded")
	})

	test("shows no plan note when the chance states none", () => {
		const { body } = render(OverviewHero, { props: { hero: { ...HERO, planNote: null } } })
		expect(body).not.toContain("Your plan as written:")
	})

	test("shows no count when the CLI states no note to check", () => {
		const { body } = render(OverviewHero, {
			props: { hero: { ...HERO, warnings: [], warningsLabel: null } },
		})
		expect(body).not.toContain("thing to check")
	})
})

describe("NoteList", () => {
	test("gives a note the id the hero's warning links to", () => {
		const { body } = render(NoteList, {
			props: { notes: [HERO.warnings[0]?.text ?? ""], scenario: "base" },
		})
		expect(body).toContain(`id="${ANCHOR}"`)
		expect(body).toContain("29603.80 of Contributions could not be funded")
	})
})
