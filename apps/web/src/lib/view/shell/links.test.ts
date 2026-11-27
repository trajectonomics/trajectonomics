import { describe, expect, test } from "bun:test"
import { NAV_GROUPS } from "../routes"
import { type NavLinkGroup, navLinks } from "./links"

const linksOf = (groups: readonly NavLinkGroup[]) => groups.flatMap((group) => group.links)

describe("the side navigation's links", () => {
	test("marks the link of the page being rendered as current, and no other", () => {
		const current = linksOf(navLinks("/net-worth/", () => {}, true)).filter((link) => link.current)
		expect(current.map((link) => link.path)).toEqual(["/net-worth/"])
	})

	test("closes the menu drawer when a link is followed", () => {
		let closed = 0
		const groups = navLinks("/", () => closed++, true)
		const link = linksOf(groups).find((one) => one.path === "/projection/")
		link?.follow()
		expect(closed).toBe(1)
	})

	test("leaves out a page that needs a plan's document when the Snapshot has none", () => {
		const paths = linksOf(navLinks("/", () => {}, false)).map((link) => link.path)
		expect(paths).toContain("/projection/")
		expect(paths).not.toContain("/income/")
	})

	test("keeps the group headings of the navigation, in their order", () => {
		const headings = navLinks("/", () => {}, true).map((group) => group.heading)
		expect(headings).toEqual(NAV_GROUPS.map((group) => group.heading))
	})
})
