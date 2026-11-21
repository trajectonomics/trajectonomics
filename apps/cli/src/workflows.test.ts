import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ROOT } from "./launcher-test-support"
import {
	BINARIES,
	compiling,
	INSTALLER,
	needs,
	RELEASE,
	RELEASE_DOCS,
	runs,
} from "./workflow-support"

describe("every workflow that compiles the CLI", () => {
	it("installs the locked dependencies first, or the compiler cannot resolve them", () => {
		const jobs = [RELEASE, BINARIES, INSTALLER].flatMap(compiling)
		expect(jobs.length).toBeGreaterThan(0)
		for (const job of jobs) {
			expect(runs(job).join("\n")).toContain("bun install --frozen-lockfile")
		}
	})
})

describe("release.yml, the one workflow that publishes core and cli", () => {
	it("publishes an alpha on a push to main, and a stable only when dispatched", () => {
		expect(Object.keys(RELEASE.on).sort()).toEqual(["push", "workflow_dispatch"])
		expect(RELEASE.on["push"]?.branches).toEqual(["main"])
		expect(RELEASE.on["workflow_dispatch"]?.inputs).toHaveProperty("package")
		expect(RELEASE.on["workflow_dispatch"]?.inputs).toHaveProperty("bump")
	})

	it("grants the tokens npm provenance and the release need", () => {
		expect(RELEASE.permissions).toEqual({ contents: "write", "id-token": "write" })
	})

	it("plans, then publishes each package in its own job, then calls binaries after a stable cli", () => {
		expect(Object.keys(RELEASE.jobs).sort()).toEqual(["binaries", "plan", "publish"])
		const binaries = RELEASE.jobs["binaries"]
		expect(binaries?.uses).toBe("./.github/workflows/binaries.yml")
		expect(needs(binaries!).sort()).toEqual(["plan", "publish"])
		expect(binaries?.if).toContain("stable_cli")
	})

	it("serialises each package's publish and never cancels one in flight", () => {
		const publish = RELEASE.jobs["publish"]
		expect(publish?.concurrency).toMatchObject({ "cancel-in-progress": false })
		expect(String(publish?.concurrency?.["group"])).toContain("matrix.name")
	})

	it("checks, computes the version with the release tools, then publishes with provenance", () => {
		const text = runs(RELEASE.jobs["publish"]!).join("\n")
		expect(text).toContain("bunx turbo run check")
		expect(text).toContain("tooling/release/version.ts")
		expect(text).toContain("npm publish")
		expect(text).toContain("--provenance")
	})
})

describe("release-docs.yml, the check that keeps the docs honest", () => {
	it("runs on a pull request, weekly, and by dispatch", () => {
		expect(Object.keys(RELEASE_DOCS.on).sort()).toEqual([
			"pull_request",
			"schedule",
			"workflow_dispatch",
		])
	})

	it("reads the latest release's own schema, retrying through the npm-first window", () => {
		const command = runs(RELEASE_DOCS.jobs["check"]!).join("\n")
		expect(command).toContain("npm view")
		expect(command).toContain('npx --yes "$PACKAGE@$latest" schema --json')
		expect(command).toContain("SECONDS + 600")
	})

	it("adds the freshness rule on the schedule, and only there", () => {
		const step = (RELEASE_DOCS.jobs["check"]?.steps ?? []).find((entry) =>
			entry.run?.includes("release-docs-cli"),
		)
		expect(step?.env?.["RELEASE_DOCS_MODE"]).toContain("schedule")
		expect(step?.env?.["RELEASE_DOCS_MODE"]).toContain("freshness")
	})

	it("stays out of bun run check, which never reaches the network", () => {
		const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
			scripts: Record<string, string>
		}
		expect(pkg.scripts["check"]).not.toContain("release-docs")
	})
})
