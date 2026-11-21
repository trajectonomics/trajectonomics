import { describe, expect, it } from "bun:test"
import { dictionaryFor, LANGUAGES } from "./languages"

describe("the strings the two conversations need", () => {
	it("retires the run labels, because both panels are one conversation now", () => {
		for (const { language, dictionary } of LANGUAGES) {
			expect({ language, runs: "actionRunLabels" in dictionary }).toEqual({ language, runs: false })
		}
	})

	it("takes the agent alone from the question to the confession, in English", () => {
		const english = dictionaryFor("en")
		expect(english.actionReask).toBe("Try again.")
		expect(english.actionExplain).toBe("How did you come up with that? Summarise it for me.")
		expect(english.actionSure).toBe("Are you sure?")
		expect(english.actionConfession).toBe(
			"No. I have none of your numbers, and my data stops in 2024.",
		)
		expect(english.actionGuessReason).toContain("7%")
		expect(english.actionGuessReason).toContain("4%")
		expect(english.actionWithoutNote).toContain("Made up")
		expect(english.actionWithNote).toContain("CLI")
	})

	it("takes the agent with traj from the guide question to the provenance line, in English", () => {
		const english = dictionaryFor("en")
		expect(english.actionGuideQuestion).toContain("stop working")
		expect(english.actionAttachName).toBe("budget-2026.csv")
		expect(english.actionNeedMore).toContain("not what you have saved")
		expect(english.actionData).toContain("25,000")
		expect(english.actionProvenance).toContain("traj fi")
		expect(english.actionProvenance).toContain("2026")
	})

	it("writes every new line in both Languages, and Thai is never the English line", () => {
		const keys = [
			"actionReask",
			"actionExplain",
			"actionGuessReason",
			"actionSure",
			"actionConfession",
			"actionGuideQuestion",
			"actionAttach",
			"actionAttachName",
			"actionNeedMore",
			"actionData",
			"actionProvenance",
			"replay",
			"appNewChat",
			"appRecents",
			"appTitleWithout",
			"appTitleWith",
			"appPlaceholder",
		] as const
		for (const { language, dictionary } of LANGUAGES) {
			for (const key of keys) {
				expect({ language, key, written: dictionary[key].trim().length > 0 }).toEqual({
					language,
					key,
					written: true,
				})
			}
		}
		expect(dictionaryFor("th").actionConfession).not.toBe(dictionaryFor("en").actionConfession)
	})

	it("names the one control the sections add, in every Language", () => {
		expect(dictionaryFor("en").replay).toBe("Replay")
		expect(dictionaryFor("th").replay).not.toBe("Replay")
	})
})
