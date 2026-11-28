import { describe, expect, test } from "bun:test"
import { originOf, tokenAllowedFor } from "../src/send/token-url"

describe("tokenAllowedFor", () => {
	test("allows only https on the data Worker's origins", () => {
		expect(tokenAllowedFor("https://trajectonomics.com/data/ingest", {})).toBe(true)
		expect(tokenAllowedFor("https://data.trajectonomics.com/ingest", {})).toBe(true)
	})

	test("refuses another host, plain http, and a value that is not a URL", () => {
		expect(tokenAllowedFor("https://synthetic.test/data/ingest", {})).toBe(false)
		expect(tokenAllowedFor("http://trajectonomics.com/data/ingest", {})).toBe(false)
		expect(tokenAllowedFor("http://127.0.0.1:8787/data/ingest", {})).toBe(false)
		expect(tokenAllowedFor("not a url", {})).toBe(false)
	})

	test("opts in with TRAJ_DATA_ALLOW_TOKEN_URL=1", () => {
		expect(
			tokenAllowedFor("http://127.0.0.1:8787/data/ingest", {
				TRAJ_DATA_ALLOW_TOKEN_URL: "1",
			}),
		).toBe(true)
	})
})

describe("originOf", () => {
	test("names the origin, or the raw value when it does not parse", () => {
		expect(originOf("http://127.0.0.1:8787/data/ingest")).toBe("http://127.0.0.1:8787")
		expect(originOf("not a url")).toBe("not a url")
	})
})
