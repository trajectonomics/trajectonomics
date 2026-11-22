// Shared loaders and helpers for the workflow tests. The workflows live at the repository root.

import { expect } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ROOT } from "./launcher-test-support"

export const dir: string = join(ROOT, "../..", ".github/workflows")

export type Step = {
	name?: string
	run?: string
	uses?: string
	with?: Record<string, unknown>
	env?: Record<string, unknown>
}
export type Job = {
	uses?: string
	needs?: string | string[]
	if?: string
	concurrency?: Record<string, unknown>
	permissions?: Record<string, string>
	with?: Record<string, unknown>
	secrets?: string
	steps?: Step[]
	strategy?: { matrix?: { include?: Record<string, string>[] } }
}
export type Workflow = {
	on: Record<
		string,
		{
			inputs?: Record<string, unknown>
			paths?: string[]
			branches?: string[]
			workflows?: string[]
			types?: string[]
		} | null
	>
	permissions?: Record<string, string>
	jobs: Record<string, Job>
}

export function load(file: string): Workflow {
	return Bun.YAML.parse(readFileSync(join(dir, file), "utf8")) as Workflow
}

export function needs(job: Job): string[] {
	return job.needs === undefined ? [] : Array.isArray(job.needs) ? job.needs : [job.needs]
}

export function runs(job: Job): string[] {
	return (job.steps ?? []).map((step) => step.run ?? "")
}

export function stepIndex(job: Job, text: string): number {
	const index = (job.steps ?? []).findIndex((step) => step.run?.includes(text))
	expect(index).toBeGreaterThanOrEqual(0)
	return index
}

export const RELEASE: Workflow = load("release.yml")
export const BINARIES: Workflow = load("binaries.yml")
export const INSTALLER: Workflow = load("installer-smoke.yml")
export const RELEASE_DOCS: Workflow = load("release-docs.yml")
export const RELEASE_DRIFT: Workflow = load("release-drift.yml")
export const SKILLS_CEILING: Workflow = load("skills-ceiling.yml")

/** Every job whose steps compile the CLI, wherever it lives. */
export function compiling(workflow: Workflow): Job[] {
	return Object.values(workflow.jobs).filter((job) =>
		runs(job).some((command) => command.includes("bun build")),
	)
}
