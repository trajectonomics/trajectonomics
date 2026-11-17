import { describe, expect, it } from "bun:test"
import {
	capturePayload,
	commandCopiedProperties,
	MEASURED_HOSTNAME,
	PAGEVIEW_EVENT,
	POSTHOG_KEY,
	pageviewProperties,
	SURFACE,
	shouldSend,
} from "./posthog"

describe("shouldSend", () => {
	it("measures a visitor on the production host who set no opt-out signal", () => {
		expect(
			shouldSend({ hostname: MEASURED_HOSTNAME, doNotTrack: null, globalPrivacyControl: null }),
		).toBe(true)
	})

	it("measures nobody on a preview, a `workers.dev` host or `localhost`", () => {
		for (const hostname of ["localhost", "site.workers.dev", "docs.workers.dev", ""]) {
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

	it("measures a visitor whose browser reports DNT off", () => {
		expect(
			shouldSend({ hostname: MEASURED_HOSTNAME, doNotTrack: "0", globalPrivacyControl: false }),
		).toBe(true)
	})
})

describe("pageviewProperties", () => {
	const properties = pageviewProperties({
		href: "https://trajectonomics.com/en/",
		referrer: "https://news.ycombinator.com/",
		language: "en",
		title: "Trajectonomics",
	})

	it("names the page by its URL, host and path, which the Web Analytics product reads", () => {
		expect(properties["$current_url"]).toBe("https://trajectonomics.com/en/")
		expect(properties["$host"]).toBe("trajectonomics.com")
		expect(properties["$pathname"]).toBe("/en/")
	})

	it("carries how the visitor arrived, the page's title and its Language", () => {
		expect(properties["$referrer"]).toBe("https://news.ycombinator.com/")
		expect(properties["$title"]).toBe("Trajectonomics")
		expect(properties["language"]).toBe("en")
	})

	it("says which Surface sent it", () => {
		expect(properties["surface"]).toBe(SURFACE)
	})
})

describe("commandCopiedProperties", () => {
	it("names the command by a stable name, never by the command text a release changes", () => {
		expect(commandCopiedProperties({ command: "install", language: "th" })).toEqual({
			command: "install",
			language: "th",
			surface: SURFACE,
		})
	})
})

describe("capturePayload", () => {
	const payload = capturePayload(PAGEVIEW_EVENT, "session-1", { language: "en" })

	it("posts the project key, the event and the properties the endpoint reads", () => {
		expect(payload.event).toBe("$pageview")
		expect(payload.api_key).toBe(POSTHOG_KEY)
		expect(payload.api_key.startsWith("phc_")).toBe(true)
	})

	it("carries the distinct id among the properties, and keeps no person", () => {
		expect(payload.properties["distinct_id"]).toBe("session-1")
		expect(payload.properties["$process_person_profile"]).toBe(false)
	})

	it("keeps the properties the caller passed", () => {
		expect(payload.properties["language"]).toBe("en")
	})
})
