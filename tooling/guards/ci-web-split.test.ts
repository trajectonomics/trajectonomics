import { describe, expect, it } from "bun:test"
import { join } from "node:path"

// CI does not run `bun run check` for apps/web: it runs the same steps as separate jobs and splits
// the `./scripts` tests across shards (docs/runbooks/ci.md). These tests fail when the web `check`
// script, its test scripts or the workflow drift apart, so a step added to one is not lost in CI.

const ROOT = join(import.meta.dir, "..", "..")

type Step = { name?: string; if?: string; uses?: string; run?: string; with?: { path?: string } }
type Job = { name?: string; if?: string; needs?: string | string[]; steps?: Step[] }
type Tasks = Record<string, { dependsOn?: string[] }>

const web = (await Bun.file(join(ROOT, "apps/web/package.json")).json()) as {
	scripts: Record<string, string>
	devDependencies: Record<string, string>
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
		const shard = workflow.jobs["web-scripts"] as Job
		expect(commandsOf(shard)).toContain("test:scripts")
		expect(commandsOf(shard)).toContain("--shard=")
	})

	it("builds the command line and the Demo in a step of their own, then runs a shard without turbo", () => {
		// Turbo hashes the arguments after `--` into every task of the graph, so a `--shard` on the turbo
		// command made the shard's `demo` and builds miss the packages job's cache (#464). The prelude
		// carries no `--`, and the shard step runs bun directly.
		const runs = (workflow.jobs["web-scripts"] as Job).steps?.map((step) => step.run ?? "") ?? []
		const prelude = runs.findIndex((run) => run.includes("turbo run"))
		const test = runs.findIndex((run) => run.includes("test:scripts"))
		expect(prelude).toBeGreaterThanOrEqual(0)
		expect(test).toBeGreaterThan(prelude)
		const preludeTasks = (runs[prelude] ?? "").split(/\s+/)
		expect(preludeTasks).toContain("@trajectonomics/cli#build")
		expect(preludeTasks).toContain("@trajectonomics/web#demo")
		expect(runs[prelude]).not.toContain("--shard")
		expect(runs[prelude]).not.toMatch(/\s--(\s|$)/)
		expect(runs[test]).not.toContain("turbo")
		expect(runs[test]).toContain("--cwd apps/web test:scripts")
		// The step that runs the tests reads what test:scripts depends on in turbo, so everything that task
		// waits for is what the prelude has built (cli build, which builds the packages, and the Demo).
		const needs = webTurbo.tasks["test:scripts"]?.dependsOn ?? []
		expect(needs).toContain("@trajectonomics/cli#build")
		expect(needs).toContain("demo")
	})

	it("keeps the scripts tests behind a build of the command line they spawn", () => {
		const tasks = webTurbo.tasks
		expect(tasks["test:scripts"]?.dependsOn).toContain("@trajectonomics/cli#build")
	})

	it("generates the Demo snapshot before every task CI runs that reads it", () => {
		// The check script's demo step does nothing under turbo (scripts/demo-unless-turbo.ts), so the
		// CI jobs rely on these turbo edges to have the generated snapshot (web ADR on the Demo at build).
		const tasks = webTurbo.tasks
		for (const task of ["build", "test:src", "test:scripts"]) {
			expect(tasks[task]?.dependsOn).toContain("demo")
		}
	})

	it("runs the browser checks in a job of their own, only when the web jobs run", () => {
		// apps/web/browser (web ADR 0026): Chromium over the built Demo. It stays out of `bun run check`, so
		// the deploy-free local check needs no browser, and out of the shards, so it never lengthens them.
		const job = workflow.jobs["web-browser"] as Job
		expect(job.name).toBe("Check web browser")
		expect(job.needs).toBe("plan")
		expect(job.if).toBe((workflow.jobs["web"] as Job).if)
		expect(web.scripts["test:browser"]).toBe("playwright test")
		expect(web.scripts["check"]).not.toContain("browser")
		expect(web.scripts["test"]).not.toContain("browser")
		expect(Object.keys(web.devDependencies)).toContain("@playwright/test")
	})

	it("builds the web package for the browser job without arguments, so the build is a cache hit", () => {
		// Arguments after `--` are hashed into every task of the graph (the same rule as the shards, #464).
		const runs = ((workflow.jobs["web-browser"] as Job).steps ?? []).map((step) => step.run ?? "")
		const build = runs.find((run) => run.includes("turbo run"))
		expect(build).toBeDefined()
		expect(build?.split(/\s+/)).toContain("@trajectonomics/web#build")
		expect(build).not.toMatch(/\s--(\s|$)/)
		const test = runs.findIndex((run) => run.includes("test:browser"))
		expect(test).toBeGreaterThan(runs.indexOf(build ?? ""))
	})

	it("uploads the screenshots whether or not the checks passed", () => {
		const upload = ((workflow.jobs["web-browser"] as Job).steps ?? []).find((step) =>
			step.with?.path?.includes("screenshots"),
		)
		expect(upload?.uses).toContain("actions/upload-artifact@")
		expect(upload?.if).toBe("always()")
	})

	it("keeps the required check named Check, waiting for every other job and reading `needs`", () => {
		const check = workflow.jobs["check"] as Job
		expect(check.name).toBe("Check")
		// Not `!cancelled()`: a skipped required check counts as passing, so a cancelled run must fail it.
		expect(check.if).toBe("always()")
		const others = Object.keys(workflow.jobs).filter((id) => id !== "check")
		expect([...(check.needs as string[])].sort()).toEqual(others.sort())
		// It judges the whole `needs` object, so a job added to the list needs no edit to the script.
		expect(JSON.stringify(check.steps)).toContain("toJSON(needs)")
		expect(JSON.stringify(check.steps)).not.toMatch(/needs\.[\w-]+\.result/)
	})

	it("stamps the web build with its turbo hash and checks the Pack is reproducible (web ADR 0028)", async () => {
		// SvelteKit stamps a build with the time it ran, so two builds of one commit packed different bytes. The
		// stamp is TURBO_HASH (the hash of the task's inputs): reproducible, and new whenever a file changes. A
		// variable in the `env` of `build` would put the commit in the cache key and miss the cache every commit. TRAJ_WEB_VERSION
		// only pins the stamp of a build outside turbo, to compare two commits by raw sha256.
		const config = await Bun.file(join(ROOT, "apps/web/vite.config.ts")).text()
		expect(config).toContain('process.env["TURBO_HASH"]')
		expect(config).toContain('process.env["TRAJ_WEB_VERSION"]')
		expect(config).toMatch(/version:\s*\{\s*name:\s*version\s*\}/)
		const turbo = await Bun.file(join(ROOT, "apps/web/turbo.json")).text()
		expect(turbo).not.toContain("TRAJ_WEB_VERSION")
		// The web job builds twice with turbo, uncached, and compares the raw sha256 of dashboard.bin.
		const step = (workflow.jobs["web"] as Job).steps?.find((s) => s.run?.includes("sha256sum"))
		const runs = (step?.run ?? "").split("\n").filter((line) => line.includes("turbo run"))
		expect(runs).toHaveLength(2)
		for (const run of runs) {
			expect(run.split(/\s+/)).toContain("@trajectonomics/web#build")
			expect(run).toContain("--cache=local:")
			expect(run).toContain("--only")
			expect(run).not.toMatch(/\s--(\s|$)/)
		}
		expect(step?.run).toContain("pack/dashboard.bin")
	})
})
