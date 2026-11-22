import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

type Step = { run?: string; with?: Record<string, unknown>; env?: Record<string, unknown> }
type Job = {
	uses?: string
	permissions?: Record<string, string>
	steps?: Step[]
	"timeout-minutes"?: number
}
type Workflow = {
	on?: Record<string, unknown>
	permissions?: Record<string, string>
	jobs?: Record<string, Job>
}

// The workflows live at the monorepo root, which is three folders up from this file.
const WORKFLOWS = join(import.meta.dir, "..", "..", "..", ".github", "workflows")

function load(file: string): Workflow {
	return Bun.YAML.parse(readFileSync(join(WORKFLOWS, file), "utf8")) as Workflow
}

/** A workflow here is one job; a second job means the file no longer does one thing. */
function soleJob(workflow: Workflow): Job {
	const jobs = Object.values(workflow.jobs ?? {})
	expect(jobs).toHaveLength(1)
	return jobs[0]!
}

function runsOf(job: Job): string[] {
	return (job.steps ?? []).flatMap((step) => (step.run === undefined ? [] : [step.run]))
}

describe("ci.yml, the one CI for the monorepo", () => {
	const workflow = load("ci.yml")
	const job = () => workflow.jobs?.["check"] ?? { steps: [] }

	it("runs on every pull request, whatever its base, on pushes to main, and by hand", () => {
		expect(workflow.on).toHaveProperty("pull_request")
		expect(workflow.on?.["pull_request"]).toBeNull()
		expect(workflow.on?.["push"]).toEqual({ branches: ["main"] })
		expect(workflow.on).toHaveProperty("workflow_dispatch")
		expect(workflow.permissions).toEqual({ contents: "read" })
	})

	it("checks only the packages a pull request affects, against its base commit", () => {
		const affected = (job().steps ?? []).find((step) => step.run?.includes("--affected"))
		expect(affected?.run).toContain("bunx turbo run check --affected --concurrency=2")
		expect(String(affected?.env?.["TURBO_SCM_BASE"])).toContain(
			"github.event.pull_request.base.sha",
		)
	})

	it("checks every package on main and by hand, two tasks at a time", () => {
		const full = (job().steps ?? []).find(
			(step) => step.run === "bunx turbo run check --concurrency=2",
		)
		expect(full).toBeDefined()
	})

	it("fetches the whole history, so turbo can compare a pull request with its base", () => {
		const checkout = (job().steps ?? []).find((step) => step.with?.["fetch-depth"] !== undefined)
		expect(checkout?.with?.["fetch-depth"]).toBe(0)
	})
})

describe("pr-title.yml, the conventional commit check", () => {
	const workflow = load("pr-title.yml")

	it("runs on every pull request event that sets a title", () => {
		expect(workflow.on?.["pull_request"]).toEqual({
			types: ["opened", "edited", "synchronize", "reopened"],
		})
	})

	it("accepts only the monorepo's scopes", () => {
		const script = runsOf(soleJob(workflow)).join("\n")
		for (const scope of ["site", "docs", "core", "money", "sim", "brand", "skills", "monorepo"]) {
			expect(script).toContain(scope)
		}
	})
})

describe("browser.yml, the workflow that needs a browser", () => {
	const workflow = load("browser.yml")
	const steps = () => soleJob(workflow).steps ?? []

	it("runs on pull requests and on pushes to main that touch the site, the brand or the lockfile", () => {
		const paths = ["apps/site/**", "packages/brand/**", "bun.lock"]
		expect(workflow.on?.["pull_request"]).toEqual({ paths })
		expect(workflow.on?.["push"]).toEqual({ branches: ["main"], paths })
	})

	it("is one job with a hard 15 minute limit and read-only permissions", () => {
		const job = soleJob(workflow)
		expect(job.uses).toBeUndefined()
		expect(job["timeout-minutes"]).toBe(15)
		expect(workflow.permissions).toEqual({ contents: "read" })
	})

	it("runs the Playwright steps inside apps/site", () => {
		const playwright = steps().filter((step) => step.run?.includes("playwright install"))
		expect(playwright).toHaveLength(1)
		expect(steps().some((step) => step.run?.includes("bun run test:browser"))).toBe(true)
		expect(steps().some((step) => step.run?.includes("bun run test:performance"))).toBe(true)
	})
})

describe("release-drift.yml, the weekly release report", () => {
	const workflow = load("release-drift.yml")
	const steps = () => soleJob(workflow).steps ?? []

	it("runs weekly and by hand, because a missed refresh is found by the report", () => {
		expect(workflow.on?.["schedule"]).toEqual([{ cron: "0 6 * * 2" }])
		expect(workflow.on).toHaveProperty("workflow_dispatch")
	})

	it("reads contents for the whole workflow, and grants issues to the drift job alone", () => {
		expect(workflow.permissions).toEqual({ contents: "read" })
		expect(soleJob(workflow).permissions).toEqual({ contents: "read", issues: "write" })
	})

	it("is one job that runs the check in apps/site, and opens no branch, pull request or deploy", () => {
		expect(Object.values(workflow.jobs ?? {})).toHaveLength(1)
		const run = steps().find((step) => step.run === "bun run release:drift")
		expect(run).toBeDefined()
		expect(steps().some((step) => step.run?.includes("bun install"))).toBe(false)
		expect(
			runsOf(soleJob(workflow)).some((script) => /\bgh pr\b|wrangler|git push/.test(script)),
		).toBe(false)
	})
})

describe("deploy.yml, the daily star refresh", () => {
	const workflow = load("deploy.yml")
	const deploy = () => workflow.jobs?.["deploy"] ?? { steps: [] }

	it("runs every day, so the star count is read again", () => {
		const schedule = workflow.on?.["schedule"] as { cron: string }[] | undefined
		expect(schedule).toHaveLength(1)
		expect(schedule?.[0]?.cron).toMatch(/^\d+ \d+ \* \* \*$/)
	})

	it("refreshes the star count before the Site's build, and never fails the deploy over it", () => {
		const steps = deploy().steps ?? []
		const refresh = steps.findIndex((step) => step.run?.startsWith("bun run stars:update"))
		const build = steps.findIndex((step) => step.run?.includes("turbo run build"))
		expect(refresh).toBeGreaterThan(-1)
		expect(refresh).toBeLessThan(build)
		expect(steps[refresh]?.run).toContain("||")
	})
})
