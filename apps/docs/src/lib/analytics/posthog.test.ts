import { describe, expect, it } from "bun:test"
import {
	CONSENT_COOKIE,
	capturePayload,
	MEASURED_HOSTNAME,
	PAGEVIEW_EVENT,
	POSTHOG_KEY,
	pageviewProperties,
	readerIdentity,
	SURFACE,
	shouldSend,
	VISITOR_COOKIE,
} from "./posthog"

const ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"
const FRESH = "fresh-id"
const createFresh = () => FRESH

describe("shouldSend", () => {
	it("measures a reader on the production host who set no opt-out signal", () => {
		expect(
			shouldSend({ hostname: MEASURED_HOSTNAME, doNotTrack: null, globalPrivacyControl: null }),
		).toBe(true)
	})

	it("measures nobody on the `workers.dev` host or on `localhost`", () => {
		for (const hostname of ["localhost", "docs.workers.dev", ""]) {
			expect(shouldSend({ hostname, doNotTrack: null, globalPrivacyControl: null })).toBe(false)
		}
	})

	it("measures nobody who asked not to be tracked", () => {
		expect(
			shouldSend({ hostname: MEASURED_HOSTNAME, doNotTrack: "1", globalPrivacyControl: null }),
		).toBe(false)
		expect(
			shouldSend({ hostname: MEASURED_HOSTNAME, doNotTrack: null, globalPrivacyControl: true }),
		).toBe(false)
	})
})

describe("pageviewProperties", () => {
	const properties = pageviewProperties({
		href: "https://trajectonomics.com/docs/cli/installation/",
		referrer: "https://trajectonomics.com/en/",
		language: "en",
		title: "CLI installation — Trajectonomics Docs",
	})

	it("names the page by its URL, host and path, which the Web Analytics product reads", () => {
		expect(properties["$current_url"]).toBe("https://trajectonomics.com/docs/cli/installation/")
		expect(properties["$host"]).toBe("trajectonomics.com")
		expect(properties["$pathname"]).toBe("/docs/cli/installation/")
	})

	it("carries how the reader arrived, the page's title and its Language", () => {
		expect(properties["$referrer"]).toBe("https://trajectonomics.com/en/")
		expect(properties["$title"]).toBe("CLI installation — Trajectonomics Docs")
		expect(properties["language"]).toBe("en")
	})

	it("says which Surface sent it", () => {
		expect(properties["surface"]).toBe(SURFACE)
	})
})

describe("capturePayload", () => {
	const payload = capturePayload(PAGEVIEW_EVENT, "reader-1", { language: "en" })

	it("posts the project key, the event and the properties the endpoint reads", () => {
		expect(payload.event).toBe("$pageview")
		expect(payload.api_key).toBe(POSTHOG_KEY)
		expect(payload.api_key.startsWith("phc_")).toBe(true)
	})

	it("carries the distinct id among the properties, and keeps no person", () => {
		expect(payload.properties["distinct_id"]).toBe("reader-1")
		expect(payload.properties["$process_person_profile"]).toBe(false)
	})

	it("keeps the properties the caller passed", () => {
		expect(payload.properties["language"]).toBe("en")
	})
})

describe("readerIdentity", () => {
	it("uses the Site's visitor id, and says granted, when the reader granted consent", () => {
		expect(
			readerIdentity(`${CONSENT_COOKIE}=granted; ${VISITOR_COOKIE}=${ID}`, createFresh),
		).toEqual({
			distinctId: ID,
			consent: "granted",
		})
	})

	it("reads the pair among other cookies, whatever their order", () => {
		expect(
			readerIdentity(`a=1; ${VISITOR_COOKIE}=${ID}; ${CONSENT_COOKIE}=granted`, createFresh),
		).toEqual({
			distinctId: ID,
			consent: "granted",
		})
	})

	it("sends a fresh id, and says cookieless, when the reader did not grant consent", () => {
		expect(readerIdentity(`${VISITOR_COOKIE}=${ID}`, createFresh)).toEqual({
			distinctId: FRESH,
			consent: "cookieless",
		})
		expect(
			readerIdentity(`${CONSENT_COOKIE}=denied; ${VISITOR_COOKIE}=${ID}`, createFresh),
		).toEqual({
			distinctId: FRESH,
			consent: "cookieless",
		})
	})

	it("sends a fresh id when the reader has no cookies at all", () => {
		expect(readerIdentity("", createFresh)).toEqual({ distinctId: FRESH, consent: "cookieless" })
	})

	it("refuses a visitor id that is not a strict lowercase UUID", () => {
		for (const bad of ['"><script>', ID.toUpperCase(), `${ID}x`, ""]) {
			expect(
				readerIdentity(`${CONSENT_COOKIE}=granted; ${VISITOR_COOKIE}=${bad}`, createFresh),
			).toEqual({
				distinctId: FRESH,
				consent: "cookieless",
			})
		}
	})
})
