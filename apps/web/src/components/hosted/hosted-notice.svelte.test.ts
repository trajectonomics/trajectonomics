import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import HostedNotice from "./HostedNotice.svelte"

/** The anchors of the rendered notice, as their opening tags. */
function anchors(body: string): string[] {
	return [...body.matchAll(/<a\b[^>]*>/g)].map((match) => match[0])
}

afterEach(() => setTestUrl("http://127.0.0.1/"))

describe("the hosted notice's feedback faces", () => {
	test("render three links to the Demo feedback form, filled with the page", () => {
		setTestUrl("http://127.0.0.1/demo/income/?demo=1&scenario=base")
		const body = render(HostedNotice).body
		const links = anchors(body).filter((anchor) => anchor.includes('aria-label="Feedback: '))
		expect(links).toHaveLength(3)
		for (const link of links) {
			const href = /href="([^"]+)"/.exec(link)?.[1] ?? ""
			expect(
				href.startsWith(
					"https://github.com/trajectonomics/trajectonomics/issues/new?template=demo-feedback.yml",
				),
			).toBe(true)
			expect(href).toContain("page=%2Fdemo%2Fincome%2F")
			expect(link).toContain('target="_blank"')
			expect(link).toContain('rel="noopener"')
			expect(link).toContain("focus-visible:outline-2")
		}
		// Only the pathname goes in: the page's query string stays on the page.
		expect(body).not.toContain("scenario")
	})

	test("name the face each link opens, and switch nothing on", () => {
		setTestUrl("http://127.0.0.1/demo/")
		const body = render(HostedNotice).body
		expect(body).toContain('aria-label="Feedback: Like it, opens GitHub in a new tab"')
		expect(body).toContain('aria-label="Feedback: It\'s okay, opens GitHub in a new tab"')
		expect(body).toContain('aria-label="Feedback: Confusing, opens GitHub in a new tab"')
		expect(body).toContain('title="Like it"')
		expect(body).toContain('title="Confusing"')
		expect(body).toContain('role="note"')
	})
})
