import { describe, expect, it } from "bun:test"
import { NAMED_AGENTS, ROBOTS, ROBOTS_SITEMAPS } from "../crawl/robots"
import { checkRobots } from "./robots"
import { codes, edited } from "./testing/crawl-files"

/** The line one named agent's group opens with, so a test can name the agent it removes. */
function groupOf(agent: string): RegExp {
	return new RegExp(`^User-agent: ${agent}\\nAllow: /\\n\\n`, "m")
}

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

	it("fails a Robots file whose wildcard group allows no path", () => {
		expect(
			codes(
				checkRobots,
				edited(
					"robots.txt",
					/^User-agent: \*\nAllow: \/\n\n/m,
					"User-agent: *\nCrawl-delay: 1\n\n",
				),
			),
		).toEqual(["ROBOTS_ALLOW_MISSING"])
	})

	it("fails a Robots file that disallows a path", () => {
		expect(
			codes(checkRobots, edited("robots.txt", /^Allow: \/\n/m, "Allow: /\nDisallow: /docs\n")),
		).toEqual(["ROBOTS_DISALLOW_PRESENT"])
	})

	for (const url of ROBOTS_SITEMAPS) {
		it(`fails a Robots file that names no Sitemap at ${url}`, () => {
			expect(
				codes(checkRobots, edited("robots.txt", new RegExp(`^Sitemap: ${url}\\n`, "m"), "")),
			).toEqual(["ROBOTS_SITEMAP_MISSING"])
		})
	}

	it("fails a Sitemap line that is not one of the host's absolute Sitemap URLs", () => {
		expect(
			codes(checkRobots, edited("robots.txt", /^Sitemap: .*/m, "Sitemap: /sitemap.xml")),
		).toEqual(["ROBOTS_SITEMAP_MISSING", "ROBOTS_SITEMAP_TARGET"])
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

describe("the answer engines the Robots file invites", () => {
	it("names the ten engines the crawler policy invites, in one order", () => {
		expect(NAMED_AGENTS).toEqual([
			"GPTBot",
			"OAI-SearchBot",
			"ChatGPT-User",
			"ClaudeBot",
			"Claude-SearchBot",
			"PerplexityBot",
			"Google-Extended",
			"Applebot-Extended",
			"CCBot",
			"Bytespider",
		])
	})

	for (const agent of NAMED_AGENTS) {
		it(`fails a Robots file that names no group for ${agent}`, () => {
			expect(codes(checkRobots, edited("robots.txt", groupOf(agent), ""))).toEqual([
				"ROBOTS_NAMED_AGENT_MISSING",
			])
		})
	}

	it("fails a named group that allows no path to the agent it addresses", () => {
		expect(
			codes(
				checkRobots,
				edited(
					"robots.txt",
					groupOf("PerplexityBot"),
					"User-agent: PerplexityBot\nAllow: /docs\n\n",
				),
			),
		).toEqual(["ROBOTS_NAMED_ALLOW_MISSING"])
	})

	it("reads consecutive `User-agent` lines as one group, so two agents may share an `Allow`", () => {
		expect(
			codes(checkRobots, edited("robots.txt", groupOf("CCBot"), "User-agent: CCBot\n")),
		).toEqual([])
	})
})
