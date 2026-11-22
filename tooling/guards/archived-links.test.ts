import { describe, expect, it } from "bun:test"
import { lstatSync } from "node:fs"
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

/** Every tracked regular file of the repository, in git's order. Symlinks are links, not content. */
const trackedFiles = Bun.spawnSync(["git", "ls-files", "-z"], { cwd: ROOT })
	.stdout.toString()
	.split("\0")
	.filter((path) => path.length > 0 && lstatSync(join(ROOT, path)).isFile())

/** Every hit in the checked, text-only tracked files. */
async function allHits(): Promise<Hit[]> {
	const hits: Hit[] = []
	for (const path of trackedFiles.filter(isChecked)) {
		const text = await Bun.file(join(ROOT, path)).text()
		if (text.includes("\0")) continue
		hits.push(...hitsIn(path, text))
	}
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

	it("links to no archived repository outside a docs/adr folder, unless an allowance names the hit", async () => {
		const unlisted = (await allHits()).filter((hit) => !isAllowed(hit, allowlist))
		expect(unlisted.map(show)).toEqual([])
	})

	it("keeps each allowance tied to a hit that still exists, so a fixed link leaves no stale entry", async () => {
		const hits = await allHits()
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
