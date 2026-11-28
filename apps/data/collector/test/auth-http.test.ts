import { describe, expect, test } from "bun:test"
import { type AuthFetch, oauthErrorCode, postForm, responseBody } from "../src/auth/http"

describe("postForm", () => {
	test("sends a form body with no redirects and one timeout signal", async () => {
		const calls: { url: string; init: Parameters<AuthFetch>[1] }[] = []
		const fetch: AuthFetch = async (url, init) => {
			calls.push({ url, init })
			return { ok: true, status: 200, json: async () => ({}) }
		}

		await postForm(fetch, "https://auth.synthetic.test/token", { a: "b c" })

		const call = calls[0]!
		expect(call.url).toBe("https://auth.synthetic.test/token")
		expect(call.init.method).toBe("POST")
		expect(call.init.headers).toEqual({
			"Content-Type": "application/x-www-form-urlencoded",
		})
		expect(call.init.body).toBe("a=b+c")
		expect(call.init.redirect).toBe("error")
		expect(call.init.signal).toBeInstanceOf(AbortSignal)
		expect(call.init.signal.aborted).toBe(false)
	})
})

describe("responseBody", () => {
	test("returns null when the body is not JSON", async () => {
		const response = {
			ok: true,
			status: 200,
			json: async () => {
				throw new Error("synthetic body")
			},
		}
		expect(await responseBody(response)).toBeNull()
	})
})

describe("oauthErrorCode", () => {
	test("reads a non-empty error code", () => {
		expect(oauthErrorCode({ error: "invalid_grant" })).toBe("invalid_grant")
		expect(oauthErrorCode({ error: "" })).toBeNull()
		expect(oauthErrorCode(null)).toBeNull()
		expect(oauthErrorCode([])).toBeNull()
	})
})
