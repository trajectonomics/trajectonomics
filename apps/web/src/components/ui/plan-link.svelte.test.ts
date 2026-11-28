import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import PlanLink from "./PlanLink.svelte"

const children = createRawSnippet(() => ({ render: () => "Open the Plan" }))

function planLink(href: string, plan: string): string {
	return render(PlanLink, {
		props: { href, plan, class: "text-sm text-accent", children },
	}).body
}

beforeEach(() => setTestUrl("http://127.0.0.1/plans/"))
afterAll(() => setTestUrl("http://127.0.0.1/"))

describe("PlanLink", () => {
	test("renders the path it was given, through SiteLink", () => {
		expect(planLink("/projection/?scenario=base", "base")).toContain(
			'href="/projection/?scenario=base"',
		)
	})

	test("keeps the plan it names, and still carries demo=1", () => {
		setTestUrl("http://127.0.0.1/plans/?scenario=retire-early&demo=1")
		const body = planLink("/projection/?scenario=base", "base")
		expect(body).toContain('href="/projection/?scenario=base&amp;demo=1"')
		expect(body).toContain("Open the Plan")
	})
})
