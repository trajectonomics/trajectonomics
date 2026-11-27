import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { Read } from "../../lib/contract"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import ChanceFocus from "./ChanceFocus.svelte"

const READ = DEMO.reads.chance["base"]
if (READ === undefined) throw new Error("the Demo has a chance read for base")

describe("ChanceFocus", () => {
	test("labels the section with the chance and the paths, and writes the percent beside the squares", () => {
		const { body } = render(ChanceFocus, { props: { read: READ, plan: "base" } })
		expect(body).toContain(
			"How likely is your plan to last? 96.5% chance. Lasts to 2053 in 193 of 200 markets.",
		)
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("96.5%")
		expect(body).toContain("To 2053")
		expect(body.match(/bg-accent/g)?.length).toBe(193)
		expect(body.match(/border-muted-foreground\/40/g)?.length).toBe(7)
		expect(body).not.toContain("data-primary-action")
	})

	test("keeps the percent with Hide amounts on: a rate is not money", () => {
		const { body } = render(ChanceFocus, { props: { read: READ, plan: "base" } })
		expect(body).toContain("96.5%")
		expect(body).not.toContain("•••••")
	})

	test("shows the CLI's error in place of the focus point when the read failed", () => {
		const read: Read<never> = {
			argv: ["projection", "chance", "--json"],
			ok: false,
			error: { code: "projection_refused", exitCode: 3, message: "The engine refused." },
		}
		const { body } = render(ChanceFocus, { props: { read, plan: "base" } })
		expect(body).toContain("Chance of success for base could not be read")
		expect(body).not.toContain("data-focus-section")
	})
})
