import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

type Step = { run?: string; with?: Record<string, unknown> }
type Job = { uses?: string; steps?: Step[]; "timeout-minutes"?: number }
type Workflow = {
	on?: Record<string, unknown>
	permissions?: Record<string, string>
	jobs?: Record<string, Job>
}

const WORKFLOWS = join(import.meta.dir, "..", ".github", "workflows")

function load(file: string): Workflow {
	return Bun.YAML.parse(readFileSync(join(WORKFLOWS, file), "utf8")) as Workflow
}

/** A caller is one job; a second job means this is no longer the shape a new repository copies. */
function soleJob(workflow: Workflow): Job {
	const jobs = Object.values(workflow.jobs ?? {})
	expect(jobs).toHaveLength(1)
	return jobs[0]!
}

const callers = [
	{ file: "ci.yml", uses: "trajectonomics/cicd/.github/workflows/check.yml@v1" },
	{ file: "pr-title.yml", uses: "trajectonomics/cicd/.github/workflows/pr-title.yml@v1" },
	{ file: "drift.yml", uses: "trajectonomics/cicd/.github/workflows/drift.yml@v1" },
]

describe("the three callers a new repository copies", () => {
	for (const caller of callers) {
		it(`${caller.file} calls the shared workflow at v1 and has no steps`, () => {
			const job = soleJob(load(caller.file))
			expect(job.uses).toBe(caller.uses)
			expect(job.steps).toBeUndefined()
		})
	}
})

describe("drift.yml, the third caller", () => {
	it("runs weekly and by hand, because the caller owns the schedule", () => {
		const workflow = load("drift.yml")
		expect(workflow.on?.["schedule"]).toEqual([{ cron: "0 6 * * 1" }])
		expect(workflow.on).toHaveProperty("workflow_dispatch")
	})

	it("grants contents to check the repository out and issues to report drift", () => {
		expect(load("drift.yml").permissions).toEqual({ contents: "read", issues: "write" })
	})
})

describe("browser.yml, the workflow that needs a browser", () => {
	const steps = () => soleJob(load("browser.yml")).steps ?? []
	const runs = () => steps().flatMap((step) => (step.run === undefined ? [] : [step.run]))

	it("is one job with its own steps and a hard 15 minute limit", () => {
		const job = soleJob(load("browser.yml"))
		expect(job.uses).toBeUndefined()
		expect(job.steps?.length).toBeGreaterThan(0)
		expect(job["timeout-minutes"]).toBe(15)
	})

	it("runs on every pull request to main, and not on the push to main after the merge", () => {
		const workflow = load("browser.yml")
		expect(workflow.on).toHaveProperty("pull_request")
		expect(workflow.on).not.toHaveProperty("push")
		expect(workflow.permissions).toEqual({ contents: "read" })
	})

	it("installs the Node version package.json declares and a Chromium", () => {
		expect(steps().some((step) => step.with?.["node-version-file"] === "package.json")).toBe(true)
		expect(runs().some((run) => run.includes("playwright install"))).toBe(true)
	})

	it("runs the browser checks and the performance budget", () => {
		expect(runs()).toContain("bun run test:browser")
		expect(runs()).toContain("bun run test:performance")
	})
})
