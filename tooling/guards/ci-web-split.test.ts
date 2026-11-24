import { describe, expect, it } from "bun:test"
import { join } from "node:path"

// CI does not run `bun run check` for apps/web: it runs the same steps as separate jobs and splits
// the `./scripts` tests across shards (docs/runbooks/ci.md). These tests fail when the web `check`
// script, its test scripts or the workflow drift apart, so a step added to one is not lost in CI.

const ROOT = join(import.meta.dir, "..", "..")

type Job = { name?: string; if?: string; needs?: string[]; steps?: { run?: string }[] }
type Tasks = Record<string, { dependsOn?: string[] }>

const web = (await Bun.file(join(ROOT, "apps/web/package.json")).json()) as {
	scripts: Record<string, string>
}
const workflow = Bun.YAML.parse(await Bun.file(join(ROOT, ".github/workflows/ci.yml")).text()) as {
	jobs: Record<string, Job>
}

const webTurbo = (await Bun.file(join(ROOT, "apps/web/turbo.json")).json()) as { tasks: Tasks }

/** The shell commands of a job's `run` steps, joined. */
const commandsOf = (job: Job) => (job.steps ?? []).map((step) => step.run ?? "").join("\n")

describe("the CI split of the web check", () => {
	it("keeps the web check script to the steps CI runs as jobs", () => {
		expect(web.scripts["check"]?.split(" && ")).toEqual([
			"bun run lint",
			"bun run typecheck",
			// Under turbo the `demo` task runs first (every web task depends on it); this step is for a direct run.
			"bun scripts/demo-unless-turbo.ts",
			"bun run test",
			"bun ../../tooling/scripts/build-unless-turbo.ts",
		])
	})

	it("keeps `test` equal to the `./src` half and the `./scripts` half CI runs apart", () => {
		expect(web.scripts["test"]).toBe("bun test ./src ./scripts")
		expect(web.scripts["test:src"]).toBe("bun test ./src")
		expect(web.scripts["test:scripts"]).toBe("bun test ./scripts")
	})

	it("runs lint, typecheck, test:src and build in the web job, and the scripts in shards", () => {
		const command = commandsOf(workflow.jobs["web"] as Job)
		const tokens = command.split(/\s+/)
		const tasks = tokens.slice(
			tokens.indexOf("run") + 1,
			tokens.findIndex((t) => t.startsWith("--")),
		)
		expect(tasks.sort()).toEqual(["build", "lint", "test:src", "typecheck"])
		const shard = commandsOf(workflow.jobs["web-scripts"] as Job)
		expect(shard).toContain("turbo run test:scripts")
		expect(shard).toContain("--shard=")
	})

	it("keeps the scripts tests behind a build of the command line they spawn", () => {
		const tasks = webTurbo.tasks
		expect(tasks["test:scripts"]?.dependsOn).toContain("@trajectonomics/cli#build")
	})

	it("keeps the required check named Check, waiting for every other job and reading `needs`", () => {
		const check = workflow.jobs["check"] as Job
		expect(check.name).toBe("Check")
		// Not `!cancelled()`: a skipped required check counts as passing, so a cancelled run must fail it.
		expect(check.if).toBe("always()")
		const others = Object.keys(workflow.jobs).filter((id) => id !== "check")
		expect([...(check.needs ?? [])].sort()).toEqual(others.sort())
		// It judges the whole `needs` object, so a job added to the list needs no edit to the script.
		expect(JSON.stringify(check.steps)).toContain("toJSON(needs)")
		expect(JSON.stringify(check.steps)).not.toMatch(/needs\.[\w-]+\.result/)
	})
})
