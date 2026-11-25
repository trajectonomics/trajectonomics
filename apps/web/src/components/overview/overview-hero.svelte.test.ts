import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { HeroView } from "../../lib/view/overview/hero"
import { noteAnchor } from "../../lib/view/projection/notes"
import NoteList from "../projection/NoteList.svelte"
import OverviewHero from "./OverviewHero.svelte"

const ANCHOR = noteAnchor("base", 0)

const HERO: HeroView = {
	sentence:
		"You could stop working in Mar 2041, at You 54. Your plan as written holds to 2043-12-31 in 174 of 200 simulated markets, which is not a guarantee.",
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
	test("shows the sentence, the count and a link to the note", () => {
		const { body } = render(OverviewHero, { props: { hero: HERO } })
		expect(body).toContain(HERO.sentence)
		expect(body).toContain("1 thing to check")
		expect(body).toContain(`href="/fi/#${ANCHOR}"`)
	})

	test("keeps the note's money out of Home, so hiding amounts reveals nothing new", () => {
		const { body } = render(OverviewHero, { props: { hero: HERO } })
		expect(body).not.toContain("29603.80")
		expect(body).not.toMatch(/\d+\.\d{2}/)
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
