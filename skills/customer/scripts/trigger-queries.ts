import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot } from "./repo"
import { skillFrontmatter } from "./skill-frontmatter"
import { parseSkillManifest } from "./skills-manifest"

/** One fixed trigger query: what a customer types, and the verdict the agent must reach. */
export interface TriggerQuery {
	q: string
	expect: "trigger" | "silent"
	/** The Skills whose firing is correct; empty for a silent query or an unclaimed job. */
	skills: string[]
	/** Set when no Skill claims the job yet, and who will. */
	unclaimed?: string
	/** Set on a query this repository added to the Factory's twenty. */
	extra?: boolean
}

/** A Skill as an agent's skill listing shows it: its name and its description, nothing else. */
export interface ListedSkill {
	name: string
	description: string
}

/** The fixed queries (the Factory's twenty, then two tax estimates), derived from the Factory's `qa-trigger-queries.md`. */
export function readTriggerQueries(): TriggerQuery[] {
	const file = join(repoRoot, "evals", "trigger-queries.json")
	return (JSON.parse(readFileSync(file, "utf8")) as { queries: TriggerQuery[] }).queries
}

/** The published Skills in install order, each with the frontmatter description an agent reads. */
export function readListedSkills(): ListedSkill[] {
	const manifest = parseSkillManifest(readFileSync(join(repoRoot, "skills.manifest.json"), "utf8"))
	return manifest.skills.map((row) => {
		const path = join(row.path, "SKILL.md")
		const { fields } = skillFrontmatter(readFileSync(join(repoRoot, path), "utf8"), path)
		return { name: row.name, description: fields.get("description")?.replace(/^"|"$/g, "") ?? "" }
	})
}

/** The prompt that asks which Skill an agent would load for one customer message. */
export function triggerPrompt(skills: ListedSkill[], message: string): string {
	const listing = skills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n")
	return [
		"You are an agent. These skills are available to load:",
		listing,
		`The user's message: ${JSON.stringify(message)}`,
		`Which single skill would you load for this message? Answer with exactly one of: ${[...skills.map((skill) => skill.name), "none"].join(", ")}. No other words.`,
	].join("\n\n")
}

/** The Skill name an answer picks, `none` when it says so, or `unparsed` when it is neither. */
export function pickedSkill(answer: string, skills: ListedSkill[]): string {
	const word = answer
		.trim()
		.replace(/[`'"*.]/g, "")
		.toLowerCase()
	if (word === "none") return "none"
	return skills.find((skill) => skill.name === word)?.name ?? "unparsed"
}

/** Whether a run matches the fixed verdict: any Skill for `trigger`, none for `silent`, never an unparsed answer. */
export function matchesVerdict(query: TriggerQuery, picked: string): boolean {
	if (picked === "unparsed") return false
	return query.expect === "trigger" ? picked !== "none" : picked === "none"
}
