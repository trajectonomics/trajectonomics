import { describe, expect, it } from "bun:test"
import { lstatSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
	type Allowance,
	ARCHIVED_REFERENCE,
	type Hit,
	hitsIn,
	isAllowed,
	isChecked,
} from "./archived-links"
import allowlist from "./archived-links.allowlist.json"

const ROOT = join(import.meta.dir, "..", "..")

/** Every tracked text-candidate regular file that mentions `trajectonomics/`. Symlinks are links, not content. */
const candidateFiles = (() => {
	const proc = Bun.spawnSync(["git", "grep", "-I", "-l", "-F", "-z", "trajectonomics/"], {
		cwd: ROOT,
	})
	if (proc.exitCode !== 0 && proc.exitCode !== 1) {
		throw new Error(`git grep failed (${proc.exitCode}): ${proc.stderr.toString()}`)
	}
	return proc.stdout
		.toString()
		.split("\0")
		.filter((path) => path.length > 0 && lstatSync(join(ROOT, path)).isFile())
})()

let cachedHits: Hit[] | undefined

/** Every hit in the checked, text-only tracked files. */
function allHits(): Hit[] {
	if (cachedHits !== undefined) return cachedHits
	const hits: Hit[] = []
	for (const path of candidateFiles.filter(isChecked)) {
		const bytes = readFileSync(join(ROOT, path))
		if (bytes.includes(0)) continue
		hits.push(...hitsIn(path, bytes.toString("utf8")))
	}
	cachedHits = hits
	return hits
}

const show = (hit: Hit) => `${hit.path}:${hit.line}: ${hit.text}`

describe("links to archived repositories", () => {
	it("names every archived repository's GitHub URL and owner/repo form", () => {
		for (const reference of [
			"see https://github.com/trajectonomics/docs/issues/1",
			"npx skills add trajectonomics/internal-skills -y",
			"tracked as trajectonomics/cli#117",
			"repo trajectonomics/tax-core",
		]) {
			expect(reference.search(ARCHIVED_REFERENCE)).toBeGreaterThanOrEqual(0)
		}
	})

	it("reads no npm scope and no path inside this repository as a reference", () => {
		for (const text of [
			"npm i @trajectonomics/cli",
			"npx skills add trajectonomics/trajectonomics/skills/customer --skill traj",
			"github.com/trajectonomics/trajectonomics/tree/main/apps/cli",
		]) {
			expect(text.search(ARCHIVED_REFERENCE)).toBe(-1)
		}
	})

	it("links to no archived repository outside a docs/adr folder, unless an allowance names the hit", () => {
		const unlisted = allHits().filter((hit) => !isAllowed(hit, allowlist))
		expect(unlisted.map(show)).toEqual([])
	})

	it("keeps each allowance tied to a hit that still exists, so a fixed link leaves no stale entry", () => {
		const hits = allHits()
		const stale = allowlist.filter(
			(allowance: Allowance) =>
				!hits.some((hit) => hit.path === allowance.path && hit.text.includes(allowance.match)),
		)
		expect(stale.map((allowance: Allowance) => `${allowance.path}: ${allowance.match}`)).toEqual([])
	})

	it("gives every allowance a one-line reason", () => {
		for (const allowance of allowlist as Allowance[]) {
			expect(allowance.reason.trim().length).toBeGreaterThan(0)
			expect(allowance.reason.includes("\n")).toBe(false)
		}
	})
})
