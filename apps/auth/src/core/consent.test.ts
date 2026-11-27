import { describe, expect, it } from "bun:test"
import {
	CONSENT_WORDING_VERSION,
	consentView,
	currentConsent,
	isConsentSource,
	parseConsentAnswer,
	withdrawalTarget,
} from "./consent"

const given = { id: "one", optedIn: true, source: "account", withdrawnAt: null }

describe("parsing a consent answer", () => {
	it("accepts a boolean with either source", () => {
		expect(parseConsentAnswer({ optedIn: false, source: "first-sign-in" })).toEqual({
			answer: { optedIn: false, source: "first-sign-in" },
		})
		expect(parseConsentAnswer({ optedIn: true, source: "account" })).toEqual({
			answer: { optedIn: true, source: "account" },
		})
	})

	it("rejects an optedIn that is not a boolean", () => {
		expect(parseConsentAnswer({ optedIn: "no", source: "account" })).toEqual({
			error: "invalid_opted_in",
		})
		expect(parseConsentAnswer(null)).toEqual({ error: "invalid_opted_in" })
	})

	it("rejects a source the record does not know, under its own code", () => {
		expect(parseConsentAnswer({ optedIn: true, source: "newsletter" })).toEqual({
			error: "invalid_source",
		})
		expect(parseConsentAnswer({ optedIn: true })).toEqual({ error: "invalid_source" })
	})

	it("names only the two sources that exist", () => {
		expect(isConsentSource("first-sign-in")).toBe(true)
		expect(isConsentSource("account")).toBe(true)
		expect(isConsentSource("Account")).toBe(false)
	})
})

describe("the current consent", () => {
	it("is the last row of a history given oldest first", () => {
		const latest = currentConsent([
			{ id: "one", optedIn: false, source: "first-sign-in" },
			{ id: "two", optedIn: true, source: "account" },
		])
		expect(latest?.id).toBe("two")
	})

	it("is nothing when the person has never answered", () => {
		expect(currentConsent([])).toBeNull()
	})
})

describe("closing a consent", () => {
	it("closes the true row a withdrawal turns off", () => {
		expect(withdrawalTarget(given, false)).toBe("one")
	})

	it("does not close a row for an opt-in", () => {
		expect(withdrawalTarget(given, true)).toBeNull()
	})

	it("does not close a false row or an already withdrawn row", () => {
		expect(withdrawalTarget({ ...given, optedIn: false }, false)).toBeNull()
		expect(
			withdrawalTarget({ ...given, withdrawnAt: "2026-11-28T00:00:00.000Z" }, false),
		).toBeNull()
	})
})

describe("the view a page renders", () => {
	it("carries the wording version, source and ISO dates", () => {
		expect(
			consentView({
				id: "one",
				optedIn: true,
				source: "account",
				wordingVersion: CONSENT_WORDING_VERSION,
				givenAt: new Date("2026-11-27T10:00:00.000Z"),
				withdrawnAt: null,
			}),
		).toEqual({
			optedIn: true,
			wordingVersion: CONSENT_WORDING_VERSION,
			source: "account",
			givenAt: "2026-11-27T10:00:00.000Z",
			withdrawnAt: null,
		})
	})

	it("is nothing when the row cannot be read", () => {
		expect(consentView(null)).toBeNull()
		expect(consentView({ id: "one", optedIn: "yes", source: "account" })).toBeNull()
		expect(consentView({ id: "one", optedIn: true, source: "other" })).toBeNull()
	})
})
