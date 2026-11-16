import { describe, expect, it } from "bun:test"
import { ROBOTS } from "../crawl/robots"
import { checkRobots } from "./robots"
import { codes, edited } from "./testing/crawl-files"

describe("the Robots file of the host", () => {
	it("passes a Robots file that allows every agent every path and names the Sitemap", () => {
		expect(codes(checkRobots)).toEqual([])
	})

	it("passes the Robots file the build generates", () => {
		expect(codes(checkRobots, [{ path: "robots.txt", content: ROBOTS }])).toEqual([])
	})

	it("fails a build that produced no Robots file", () => {
		expect(codes(checkRobots, [])).toEqual(["ROBOTS_MISSING"])
	})

	it("fails a Robots file that addresses no agent", () => {
		expect(codes(checkRobots, edited("robots.txt", /^User-agent: \*\n/m, ""))).toEqual([
			"ROBOTS_AGENT_MISSING",
		])
	})

	it("fails a Robots file that allows no path", () => {
		expect(codes(checkRobots, edited("robots.txt", /^Allow: \/\n/m, ""))).toEqual([
			"ROBOTS_ALLOW_MISSING",
		])
	})

	it("fails a Robots file that disallows a path", () => {
		expect(
			codes(checkRobots, edited("robots.txt", /^Allow: \/\n/m, "Allow: /\nDisallow: /docs\n")),
		).toEqual(["ROBOTS_DISALLOW_PRESENT"])
	})

	it("fails a Robots file that names no Sitemap", () => {
		expect(codes(checkRobots, edited("robots.txt", /^Sitemap: .*\n/m, ""))).toEqual([
			"ROBOTS_SITEMAP_MISSING",
		])
	})

	it("fails a Sitemap line that is not the absolute Sitemap URL", () => {
		expect(
			codes(checkRobots, edited("robots.txt", /^Sitemap: .*/m, "Sitemap: /sitemap.xml")),
		).toEqual(["ROBOTS_SITEMAP_TARGET"])
	})

	it("reads no rule out of a comment", () => {
		expect(
			codes(
				checkRobots,
				edited("robots.txt", /^User-agent: \*/m, "# Content-Signal: search=yes\n\nUser-agent: *"),
			),
		).toEqual([])
	})
})
