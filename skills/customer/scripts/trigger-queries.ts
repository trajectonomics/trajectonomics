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
}

/** A Skill as an agent's skill listing shows it: its name and its description, nothing else. */
export interface ListedSkill {
	name: string
	description: string
}

/** The twenty fixed queries, derived from the Factory's `qa-trigger-queries.md`. */
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
		"Which single skill would you load for this message? Answer with the skill name only, or `none` if no skill applies.",
	].join("\n\n")
}

/** The Skill name an answer picks, or `none` when it names no listed Skill. */
export function pickedSkill(answer: string, skills: ListedSkill[]): string {
	const word = answer
		.trim()
		.replace(/[`'"*.]/g, "")
		.toLowerCase()
	return skills.find((skill) => skill.name === word)?.name ?? "none"
}

/** Whether a run matches the fixed verdict: any Skill for `trigger`, none for `silent`. */
export function matchesVerdict(query: TriggerQuery, picked: string): boolean {
	return query.expect === "trigger" ? picked !== "none" : picked === "none"
}
