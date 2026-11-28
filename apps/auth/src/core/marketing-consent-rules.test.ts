import { describe, expect, it } from "bun:test"
import {
	CONSENT_LANGUAGES,
	CONSENT_WORDING_VERSION,
	consentView,
	isConsentLanguage,
	parseConsentAnswer,
} from "./marketing-consent-rules"

describe("parsing a consent answer", () => {
	it("accepts a boolean with either source and language", () => {
		expect(parseConsentAnswer({ optedIn: false, source: "first-sign-in", language: "en" })).toEqual(
			{
				answer: { optedIn: false, source: "first-sign-in", language: "en" },
			},
		)
		expect(parseConsentAnswer({ optedIn: true, source: "account", language: "th" })).toEqual({
			answer: { optedIn: true, source: "account", language: "th" },
		})
	})

	it("rejects an optedIn that is not a boolean", () => {
		expect(parseConsentAnswer({ optedIn: "no", source: "account", language: "en" })).toEqual({
			error: "invalid_opted_in",
		})
		expect(parseConsentAnswer(null)).toEqual({ error: "invalid_opted_in" })
	})

	it("rejects a source the record does not know, under its own code", () => {
		expect(parseConsentAnswer({ optedIn: true, source: "newsletter", language: "en" })).toEqual({
			error: "invalid_source",
		})
		expect(parseConsentAnswer({ optedIn: true, language: "en" })).toEqual({
			error: "invalid_source",
		})
	})

	it("rejects a language the pages do not speak, under its own code", () => {
		expect(parseConsentAnswer({ optedIn: true, source: "account", language: "fr" })).toEqual({
			error: "invalid_language",
		})
		expect(parseConsentAnswer({ optedIn: true, source: "account" })).toEqual({
			error: "invalid_language",
		})
	})

	it("names only the two languages that exist", () => {
		expect(CONSENT_LANGUAGES).toEqual(["en", "th"])
		expect(isConsentLanguage("th")).toBe(true)
		expect(isConsentLanguage("TH")).toBe(false)
	})
})

describe("the view a page renders", () => {
	it("carries the wording version, source, language and ISO dates", () => {
		expect(
			consentView({
				id: "one",
				optedIn: true,
				source: "account",
				language: "th",
				wordingVersion: CONSENT_WORDING_VERSION,
				givenAt: new Date("2026-11-27T10:00:00.000Z"),
				withdrawnAt: null,
			}),
		).toEqual({
			optedIn: true,
			wordingVersion: CONSENT_WORDING_VERSION,
			source: "account",
			language: "th",
			givenAt: "2026-11-27T10:00:00.000Z",
			withdrawnAt: null,
		})
	})

	it("reads a row written before the language column as English", () => {
		expect(
			consentView({ id: "one", optedIn: true, source: "account", wordingVersion: "2026-11-27" })
				?.language,
		).toBe("en")
	})

	it("is nothing when the row cannot be read", () => {
		expect(consentView(null)).toBeNull()
		expect(consentView({ id: "one", optedIn: "yes", source: "account" })).toBeNull()
		expect(consentView({ id: "one", optedIn: true, source: "other" })).toBeNull()
	})
})
