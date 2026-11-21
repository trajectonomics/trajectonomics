import { describe, expect, it } from "bun:test"
import { LANGUAGES } from "../language/languages"
import { type ReleaseSnapshot, releaseFacts } from "./release"
import { RELEASE_MONTHS, RELEASE_SNAPSHOT, releaseFor } from "./release-snapshot"
import { codeOf } from "./testing/error-code"

/** A synthetic month table, so a test proves the Language's own words reach the page. */
const SYNTHETIC = Array.from({ length: 12 }, (_unused, index) => `M${index + 1}`)

/** A January release whose version a string compare would misorder, on a single-digit day. */
const JANUARY: ReleaseSnapshot = {
	version: "0.10.0",
	releasedOn: "2027-01-05",
	asOf: "2027-01-06",
}

describe("the release strings a Language prints", () => {
	it("names the version in its tag form, with both parts and no stability word", () => {
		const facts = releaseFacts(JANUARY, SYNTHETIC)
		expect(facts.heroVersion).toBe("v0.10.0")
		expect(facts.releaseLine).toBe("v0.10.0 — traj CLI + traj-onboarding")
	})

	it("writes the day and the year in every Language, and the month in that Language's words", () => {
		expect(releaseFacts(JANUARY, SYNTHETIC).releaseDate).toBe("5 M1 2027")
		expect(releaseFacts(JANUARY, RELEASE_MONTHS["en"] ?? []).releaseDate).toBe("5 Jan 2027")
		expect(releaseFacts(JANUARY, RELEASE_MONTHS["th"] ?? []).releaseDate).toBe("5 ม.ค. 2027")
	})

	it("carries the snapshot's own ISO date as the machine-readable one", () => {
		expect(releaseFacts(JANUARY, SYNTHETIC).datetime).toBe("2027-01-05")
	})

	it("rejects a release date that is not an ISO calendar date", () => {
		const broken = { ...JANUARY, releasedOn: "2027-13-05" }
		expect(codeOf(() => releaseFacts(broken, SYNTHETIC))).toBe("RELEASE_DATE_INVALID")
	})

	it("rejects a Language whose date words are not twelve months", () => {
		expect(codeOf(() => releaseFacts(JANUARY, SYNTHETIC.slice(0, 11)))).toBe(
			"RELEASE_MONTHS_INCOMPLETE",
		)
	})

	it("rejects a day the month does not have, so no impossible date can reach a page", () => {
		for (const releasedOn of [
			"2026-02-30",
			"2026-02-29",
			"2100-02-29",
			"2026-04-31",
			"2026-11-99",
		]) {
			expect(codeOf(() => releaseFacts({ ...JANUARY, releasedOn }, SYNTHETIC))).toBe(
				"RELEASE_DATE_INVALID",
			)
		}
	})

	it("accepts the leap day a year that has one carries", () => {
		const leap = { ...JANUARY, releasedOn: "2024-02-29" }
		expect(releaseFacts(leap, SYNTHETIC).releaseDate).toBe("29 M2 2024")
	})

	it("rejects a Language it has no date words for, so a new Language cannot fall through", () => {
		expect(codeOf(() => releaseFor("xx"))).toBe("RELEASE_LANGUAGE_UNKNOWN")
	})
})

describe("the committed Release snapshot", () => {
	it("records a bare semver, its release date and the date it was read", () => {
		expect(RELEASE_SNAPSHOT.version).toMatch(/^\d+\.\d+\.\d+$/)
		expect(RELEASE_SNAPSHOT.releasedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		expect(RELEASE_SNAPSHOT.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})

	it("renders in every Language the Site speaks, so a new Language cannot fall through", () => {
		for (const { language } of LANGUAGES) {
			expect({ language, date: releaseFor(language).releaseDate }).not.toEqual({
				language,
				date: "",
			})
		}
	})

	it("gives each Language its own month words, so neither borrows the other's", () => {
		for (const entry of LANGUAGES) {
			expect({ language: entry.language, months: RELEASE_MONTHS[entry.language]?.length }).toEqual({
				language: entry.language,
				months: 12,
			})
		}
	})

	it("names one version for the pill and the footer, so two numbers on a page cannot disagree", () => {
		for (const entry of LANGUAGES) {
			const dictionary = entry.dictionary
			expect(dictionary.heroVersion).toBe(`v${RELEASE_SNAPSHOT.version}`)
			expect(dictionary.releaseLine.startsWith(`${dictionary.heroVersion} — `)).toBe(true)
		}
	})
})
