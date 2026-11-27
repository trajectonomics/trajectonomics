import { describe, expect, test } from "bun:test"
import { SITE_ORIGIN } from "../site"
import { DOCS_BASE_PATH } from "../tabs"
import { type AssetsBinding, handleRequest } from "./handler"
import { LEGACY_HOST } from "./legacy-host"

const PAGE = "<!doctype html><h1>tx</h1>"

/** The assets the Worker sees: the built files by public path, and the assets' own 404 page. */
const pages: AssetsBinding = {
	fetch: async (request) => {
		const path = new URL(request.url).pathname
		const file = path === `${DOCS_BASE_PATH}/cli/` ? PAGE : undefined
		if (file === undefined) {
			return new Response("Not found", {
				status: 404,
				headers: { "content-type": "text/html; charset=utf-8" },
			})
		}
		return new Response(file, { headers: { "content-type": "text/html; charset=utf-8" } })
	},
}

describe("the Worker moves the old Docs host to the Site with a 301", () => {
	test("its root goes to the Portal's Landing Page", async () => {
		const response = await handleRequest(new Request(`https://${LEGACY_HOST}/`), pages)

		expect(response.status).toBe(301)
		expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/docs/`)
	})

	test("a deep path keeps its path and query in one hop", async () => {
		const response = await handleRequest(
			new Request(`https://${LEGACY_HOST}/cli/commands/tx/?q=1`),
			pages,
		)

		expect(response.status).toBe(301)
		expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/docs/cli/commands/tx/?q=1`)
	})

	test("a path that already carries /docs is not prefixed twice", async () => {
		const response = await handleRequest(new Request(`https://${LEGACY_HOST}/docs/cli/`), pages)

		expect(response.status).toBe(301)
		expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/docs/cli/`)
	})

	test("a retired path reaches its final target in one hop", async () => {
		const response = await handleRequest(
			new Request(`https://${LEGACY_HOST}/developers/tax-core/`),
			pages,
		)

		expect(response.status).toBe(301)
		expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/docs/contribute/tax/`)
	})

	test("the new host answers the assets, not a redirect", async () => {
		const response = await handleRequest(new Request(`${SITE_ORIGIN}${DOCS_BASE_PATH}/cli/`), pages)

		expect(response.status).toBe(200)
		expect(response.headers.get("location")).toBeNull()
		expect(await response.text()).toBe(PAGE)
	})

	test("a request that is not a read is left for the assets", async () => {
		const response = await handleRequest(
			new Request(`https://${LEGACY_HOST}${DOCS_BASE_PATH}/not-a-page/`, { method: "POST" }),
			pages,
		)

		expect(response.status).toBe(404)
		expect(response.headers.get("location")).toBeNull()
	})
})
