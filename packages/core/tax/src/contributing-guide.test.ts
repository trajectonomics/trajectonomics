import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"

// The guide's claims about the repository are checked here, so a renamed file or a removed script
// fails the build instead of misleading a contributor. Paths in the guide are relative to this
// package, but a path that starts with `packages/` is relative to the repository root.
const PACKAGE_DIR = resolve(import.meta.dir, "..")
const REPO_ROOT = resolve(PACKAGE_DIR, "../../..")
const GUIDE_PATH = join(PACKAGE_DIR, "CONTRIBUTING.md")

const guide = await Bun.file(GUIDE_PATH).text()
const packageScripts = Object.keys(
	(await Bun.file(join(PACKAGE_DIR, "package.json")).json()).scripts,
)

/** Inline code spans, outside fenced blocks, that name a file or directory path. */
function pathSpans(text: string): readonly string[] {
	const prose = text.replace(/```[\s\S]*?```/g, "")
	return [...prose.matchAll(/`([^`\s]+)`/g)]
		.map((match) => match[1] ?? "")
		.filter((span) => /^[A-Za-z][\w.@-]*(\/[\w.@-]+)+\/?$/.test(span))
		.filter((span) => !span.includes("/xx"))
		.filter((span) => !span.startsWith("@"))
}

/** Relative link targets in the guide, without their anchors. */
function linkTargets(text: string): readonly string[] {
	return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
		.map((match) => match[1] ?? "")
		.filter((target) => !/^(https?:|mailto:|#)/.test(target))
		.map((target) => target.split("#")[0] ?? "")
		.filter((target) => target !== "")
}

/** The script names the guide runs with `bun run`, wherever they appear. */
function namedScripts(text: string): readonly string[] {
	return [...text.matchAll(/\bbun run ([\w:.-]+)/g)].map((match) => match[1] ?? "")
}

/** Whether a path exists from the package folder, or from the repository root for `packages/` paths. */
function exists(path: string): boolean {
	const fromPackage = join(PACKAGE_DIR, path)
	const fromRoot = join(REPO_ROOT, path)
	return existsSync(fromPackage) || (path.startsWith("packages/") && existsSync(fromRoot))
}

describe("the tax contributor guide", () => {
	test("every repo-relative path it writes in backticks exists", () => {
		const missing = pathSpans(guide).filter((path) => !exists(path))
		expect(missing).toEqual([])
	})

	test("every relative link it contains points at a file that exists", () => {
		const missing = linkTargets(guide).filter((target) => !exists(target))
		expect(missing).toEqual([])
	})

	test("every bun run script it names is a script of this package", () => {
		const unknown = namedScripts(guide).filter((script) => !packageScripts.includes(script))
		expect(unknown).toEqual([])
	})

	test("it names at least one script, so the check above is not vacuous", () => {
		expect(namedScripts(guide)).toContain("check:th-sources")
	})
})
