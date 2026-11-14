import { describe, expect, it } from "bun:test"
import { checkSwitcher } from "./switcher"
import { codes, entryAt, home, switcher } from "./testing/homes"

describe("the switcher in the header", () => {
	it("passes a link to every other Language on each home", () => {
		expect(codes(checkSwitcher)).toEqual([])
	})

	it("fails a home with no link to the other Language", () => {
		const page = home(entryAt(0).language, undefined, "")
		expect(codes(checkSwitcher, page)).toEqual(["SWITCHER_MISSING"])
	})

	it("fails a link that does not say which Language it leads to", () => {
		const link = switcher(entryAt(0).language).replace(/ lang="[^"]*"/, "")
		expect(codes(checkSwitcher, home(entryAt(0).language, undefined, link))).toEqual([
			"SWITCHER_MISSING",
		])
	})

	it("fails a switcher that is a button, because it must work with JavaScript off", () => {
		const page = home(entryAt(0).language, undefined, "<button>x</button>")
		expect(codes(checkSwitcher, page)).toEqual(["SWITCHER_MISSING"])
	})

	it("fails a link labelled in the page's Language instead of the target's", () => {
		const target = entryAt(1)
		const link = switcher(entryAt(0).language).replace(
			new RegExp(`>${target.dictionary.languageName}<`),
			">english<",
		)
		expect(codes(checkSwitcher, home(entryAt(0).language, undefined, link))).toEqual([
			"SWITCHER_TEXT_WRONG",
		])
	})
})
