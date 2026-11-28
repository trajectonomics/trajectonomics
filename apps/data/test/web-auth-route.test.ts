import { describe, expect, test } from "bun:test"
import { routeRequest } from "../src/core/route"
import {
	CALLBACK_PATH,
	COLLECTORS_PATH,
	ME_PATH,
	SIGN_IN_PATH,
	SIGN_OUT_PATH,
} from "../src/core/urls"
import { handleRequest } from "../src/http/router"
import { NOW_MS } from "./support/fixtures"
import { harness } from "./support/http"

const APEX = "trajectonomics.com"
const OLD = "data.trajectonomics.com"

function at(hostname: string, pathname: string, options: { method?: string } = {}) {
	return routeRequest({
		hostname,
		pathname,
		search: "",
		method: options.method ?? "GET",
	})
}

describe("the sign-in routes on the apex", () => {
	test("route every new path and method", () => {
		expect(at(APEX, SIGN_IN_PATH)).toEqual({ kind: "sign_in" })
		expect(at(APEX, CALLBACK_PATH)).toEqual({ kind: "auth_callback" })
		expect(at(APEX, SIGN_OUT_PATH, { method: "POST" })).toEqual({ kind: "sign_out" })
		expect(at(APEX, COLLECTORS_PATH)).toEqual({ kind: "me_collectors" })
		expect(at("localhost", SIGN_IN_PATH)).toEqual({ kind: "sign_in" })
	})

	test("answers a wrong method with the right Allow", () => {
		expect(at(APEX, SIGN_IN_PATH, { method: "POST" })).toEqual({
			kind: "method_not_allowed",
			allow: "GET",
		})
		expect(at(APEX, CALLBACK_PATH, { method: "POST" })).toEqual({
			kind: "method_not_allowed",
			allow: "GET",
		})
		expect(at(APEX, SIGN_OUT_PATH)).toEqual({
			kind: "method_not_allowed",
			allow: "POST",
		})
		expect(at(APEX, COLLECTORS_PATH, { method: "POST" })).toEqual({
			kind: "method_not_allowed",
			allow: "GET",
		})
	})

	test("leaves the me page to the assets binding", () => {
		expect(at(APEX, ME_PATH)).toEqual({ kind: "not_found" })
	})
})

describe("the old host", () => {
	test("redirects the auth paths and refuses the me read", () => {
		expect(at(OLD, SIGN_IN_PATH)).toEqual({
			kind: "redirect",
			location: `https://trajectonomics.com${SIGN_IN_PATH}`,
		})
		expect(at(OLD, CALLBACK_PATH)).toEqual({
			kind: "redirect",
			location: `https://trajectonomics.com${CALLBACK_PATH}`,
		})
		expect(at(OLD, COLLECTORS_PATH)).toEqual({ kind: "not_found" })
		expect(at(OLD, "/api/me/collectors")).toEqual({ kind: "not_found" })
	})
})

describe("the routes over HTTP", () => {
	test("answer every new apex path rather than a 404", async () => {
		const context = harness()
		const options = { nowMs: NOW_MS }
		const signIn = await handleRequest(
			new Request(`https://${APEX}${SIGN_IN_PATH}`),
			context.env,
			options,
		)
		expect(signIn.status).toBe(302)
		const callback = await handleRequest(
			new Request(`https://${APEX}${CALLBACK_PATH}`),
			context.env,
			options,
		)
		expect(callback.status).toBe(303)
		const signOut = await handleRequest(
			new Request(`https://${APEX}${SIGN_OUT_PATH}`, { method: "POST" }),
			context.env,
			options,
		)
		expect(signOut.status).toBe(403)
		const me = await handleRequest(
			new Request(`https://${APEX}${COLLECTORS_PATH}`),
			context.env,
			options,
		)
		expect(me.status).toBe(401)
	})

	test("answer each wrong method with 405 and its Allow", async () => {
		const context = harness()
		const options = { nowMs: NOW_MS }
		const cases = [
			[SIGN_IN_PATH, "POST", "GET"],
			[CALLBACK_PATH, "POST", "GET"],
			[SIGN_OUT_PATH, "GET", "POST"],
			[COLLECTORS_PATH, "POST", "GET"],
		] as const
		for (const [path, method, allow] of cases) {
			const response = await handleRequest(
				new Request(`https://${APEX}${path}`, { method }),
				context.env,
				options,
			)
			expect(response.status).toBe(405)
			expect(response.headers.get("allow")).toBe(allow)
		}
	})

	test("redirects an old-host auth GET and answers its me read with 404", async () => {
		const context = harness()
		const options = { nowMs: NOW_MS }
		const redirect = await handleRequest(
			new Request(`https://${OLD}${SIGN_IN_PATH}`),
			context.env,
			options,
		)
		expect(redirect.status).toBe(301)
		expect(redirect.headers.get("location")).toBe(`https://trajectonomics.com${SIGN_IN_PATH}`)
		for (const path of [COLLECTORS_PATH, "/api/me/collectors"]) {
			const response = await handleRequest(
				new Request(`https://${OLD}${path}`),
				context.env,
				options,
			)
			expect(response.status).toBe(404)
		}
	})
})
