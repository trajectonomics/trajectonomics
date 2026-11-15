import { describe, expect, it } from "bun:test"
import { otherLanguages } from "../language/languages"
import { checkSwitcher } from "./switcher"
import { codes, entryAt, home, switcher } from "./testing/homes"

describe("the switcher in the header", () => {
	it("passes a link to every other Language on each home", () => {
		expect(codes(checkSwitcher)).toEqual([])
	})

	it("fails a home with no link to the other Language", () => {
		const page = home(entryAt(0).language, undefined, "")
		expect(codes(checkSwitcher, page)).toEqual(["SWITCHER_MISSING", "SWITCHER_CURRENT_MISSING"])
	})

	it("fails a link that does not say which Language it leads to", () => {
		const language = entryAt(0).language
		const other = otherLanguages(language)[0]
		if (other === undefined) throw new Error("the Site speaks one Language only")
		const link = switcher(language).replace(` lang="${other.language}"`, "")
		expect(codes(checkSwitcher, home(language, undefined, link))).toEqual(["SWITCHER_MISSING"])
	})

	it("fails a switcher that is a button, because it must work with JavaScript off", () => {
		const page = home(entryAt(0).language, undefined, "<button>x</button>")
		expect(codes(checkSwitcher, page)).toEqual(["SWITCHER_MISSING", "SWITCHER_CURRENT_MISSING"])
	})

	it("fails a current link that does not name the reading Language", () => {
		const page = home(entryAt(0).language)
		const content = page.content.replace(/ aria-label="[^"]*"/, "")
		expect(codes(checkSwitcher, { path: page.path, content })).toEqual([
			"SWITCHER_CURRENT_LABEL_WRONG",
		])
	})

	it("fails a home that does not mark the reading Language as current", () => {
		const page = home(entryAt(0).language)
		const content = page.content.replace(' aria-current="page"', "")
		expect(codes(checkSwitcher, { path: page.path, content })).toEqual(["SWITCHER_CURRENT_MISSING"])
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

	it("fails a current link that shows the short label instead of the Language's own name", () => {
		const entry = entryAt(1)
		const link = switcher(entry.language).replace(
			new RegExp(`>${entry.dictionary.languageName}<`),
			`>${entry.dictionary.languageSwitchLabel}<`,
		)
		expect(codes(checkSwitcher, home(entry.language, undefined, link))).toEqual([
			"SWITCHER_CURRENT_LABEL_WRONG",
		])
	})
})
