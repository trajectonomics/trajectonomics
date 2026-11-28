import { afterAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { clearTestError, setTestError, setTestUrl } from "../../scripts/svelte/app-stub"
import ErrorPage from "./+error.svelte"

afterAll(() => {
	clearTestError()
	setTestUrl("http://127.0.0.1/")
})

describe("the error page", () => {
	test("names a path no page has as Page not found, and links back to Overview", () => {
		setTestUrl("http://127.0.0.1/nowhere/")
		setTestError(404, "Not Found")
		const { body } = render(ErrorPage)
		expect(body).toContain("Page not found")
		expect(body).toContain("This page is not part of the Dashboard.")
		expect(body).toContain("Back to Overview")
		expect(body).toMatch(/<a\b[^>]*href="\/"[^>]*>/)
	})

	test("names any other failure as Something went wrong", () => {
		setTestError(500, "Internal Error")
		const { body } = render(ErrorPage)
		expect(body).toContain("Something went wrong")
		expect(body).toContain("The Dashboard could not show this page.")
	})
})
