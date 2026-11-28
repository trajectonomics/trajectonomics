import { describe, expect, test } from "bun:test"
import { INGEST_PATH } from "../core/urls"
import { canonicalUrl } from "./page-url"
import {
	API_PATH,
	assetPath,
	BASE_PATH,
	COLLECTORS_PATH,
	DATA_PATH,
	DOCS_URL,
	ME_PATH,
	METHOD_PATH,
	SIGN_IN_PATH,
	SIGN_OUT_PATH,
	SITE_HOME_URL,
} from "./site"

describe("canonicalUrl", () => {
	test("builds the apex URL of the data root", () => {
		expect(canonicalUrl(DATA_PATH)).toBe("https://trajectonomics.com/data/")
	})

	test("builds the apex URL of the method page", () => {
		expect(canonicalUrl(METHOD_PATH)).toBe("https://trajectonomics.com/data/method/")
	})

	test("adds the trailing slash", () => {
		expect(canonicalUrl("/data/method")).toBe("https://trajectonomics.com/data/method/")
	})

	test("rejects a relative path", () => {
		expect(() => canonicalUrl("method/")).toThrow()
	})
})

describe("the site's links", () => {
	test("stay under the data base, or point at the host's own paths", () => {
		expect(DATA_PATH).toBe("/data/")
		expect(METHOD_PATH).toBe("/data/method/")
		expect(API_PATH).toBe(`${BASE_PATH}/api`)
		expect(INGEST_PATH).toBe(`${BASE_PATH}/ingest`)
		expect(ME_PATH).toBe(`${BASE_PATH}/me/`)
		expect(SIGN_IN_PATH).toBe(`${BASE_PATH}/auth/sign-in`)
		expect(SIGN_OUT_PATH).toBe(`${BASE_PATH}/auth/sign-out`)
		expect(COLLECTORS_PATH).toBe(`${BASE_PATH}/api/me/collectors`)
		expect(assetPath("/favicon/favicon.svg")).toBe("/data/favicon/favicon.svg")
		expect(SITE_HOME_URL).toBe("/")
		expect(DOCS_URL).toBe("/docs/")
	})
})
