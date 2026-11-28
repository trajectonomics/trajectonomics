import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot } from "./skills-files"

/**
 * The mascot poses the customer Skills show. A Skill cannot read the Site at run time, and setup
 * promises only two network requests, so each pose ships inside the Skill folder and is the Site's
 * own bytes. A Skill shows only the poses its SKILL.md names
 * ([ADR 0008](../docs/adr/0008-the-skills-speak-as-traji.md)).
 */
const SITE_POSES = join(repoRoot, "..", "..", "apps/site/public/mascot")
const SKILLS = join(repoRoot, "skills")
const POSE_FILE = /assets\/([a-z0-9-]+\.webp)/g
const POSE_IMAGE = /!\[([^\]]*)\]\([^)]*assets\/([a-z0-9-]+\.webp)\)/g

/** Every Skill directory, which the manifest pairs with a row. */
function skills(): string[] {
	return readdirSync(SKILLS, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort()
}

/** One Skill's SKILL.md. */
function source(name: string): string {
	return readFileSync(join(SKILLS, name, "SKILL.md"), "utf8")
}

/** The pose files one SKILL.md names, in document order. */
function namedPoses(name: string): string[] {
	return [...source(name).matchAll(POSE_FILE)].map((match) => match[1] ?? "")
}

/** The pose files one Skill ships beside its SKILL.md. */
function shippedPoses(name: string): string[] {
	try {
		return readdirSync(join(SKILLS, name, "assets"))
			.filter((file) => file.endsWith(".webp"))
			.sort()
	} catch {
		return []
	}
}

describe("the mascot poses the customer Skills ship", () => {
	it("has every pose a SKILL.md names in that Skill's own folder", () => {
		for (const name of skills()) {
			for (const pose of new Set(namedPoses(name))) {
				const shipped = shippedPoses(name).includes(pose)
				expect({ skill: name, pose, shipped }).toEqual({ skill: name, pose, shipped: true })
			}
		}
	})

	it("ships no pose its SKILL.md does not name, so a folder holds only the moments it shows", () => {
		for (const name of skills()) {
			expect({ skill: name, poses: shippedPoses(name) }).toEqual({
				skill: name,
				poses: [...new Set(namedPoses(name))].sort(),
			})
		}
	})

	it("is byte-identical to the Site's same-named pose, never a redraw or a re-encode", () => {
		for (const name of skills()) {
			for (const pose of shippedPoses(name)) {
				const same = readFileSync(join(SKILLS, name, "assets", pose)).equals(
					readFileSync(join(SITE_POSES, pose)),
				)
				expect({ skill: name, pose, same }).toEqual({ skill: name, pose, same: true })
			}
		}
	})

	it("gives every pose image alt text that names Traji, so a terminal still says who is there", () => {
		for (const name of skills()) {
			for (const [, alt] of source(name).matchAll(POSE_IMAGE)) {
				expect({ skill: name, alt, names: (alt ?? "").includes("Traji") }).toEqual({
					skill: name,
					alt,
					names: true,
				})
			}
		}
	})
})
