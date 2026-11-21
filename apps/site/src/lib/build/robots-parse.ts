/** One `field: value` directive of the Robots file, its field lowercased because the format's are. */
export interface Directive {
	readonly field: string
	readonly value: string
}

/** One group of the Robots file: the agents it addresses, and the directives under them. */
export interface RobotsGroup {
	readonly agents: readonly string[]
	readonly directives: readonly Directive[]
}

/** The Robots file read as the format reads it: every directive in order, and its groups. */
export interface ParsedRobots {
	readonly directives: readonly Directive[]
	readonly groups: readonly RobotsGroup[]
}

/** A line's directive, or nothing for a comment, a blank line and a line that names no field. */
function directiveOf(line: string): Directive | undefined {
	const text = (line.split("#")[0] ?? "").trim()
	const colon = text.indexOf(":")
	if (colon <= 0) return undefined
	return { field: text.slice(0, colon).trim().toLowerCase(), value: text.slice(colon + 1).trim() }
}

/** A group being built, with the agents it addresses so far and the directives after them. */
interface DraftGroup {
	readonly agents: string[]
	readonly directives: Directive[]
}

/** The group a `User-agent` line belongs to: the previous one while it states no rule yet. */
function groupFor(groups: DraftGroup[], agent: string): DraftGroup {
	const last = groups.at(-1)
	if (last !== undefined && last.directives.length === 0) {
		last.agents.push(agent)
		return last
	}
	const opened: DraftGroup = { agents: [agent], directives: [] }
	groups.push(opened)
	return opened
}

/**
 * The Robots file read as its groups: consecutive `User-agent` lines share one, a rule after them
 * opens the next group, and a rule before any agent belongs to no group at all.
 */
export function parseRobots(content: string): ParsedRobots {
	const drafts: DraftGroup[] = []
	const directives: Directive[] = []
	for (const line of content.split(/\r?\n/)) {
		const directive = directiveOf(line)
		if (directive === undefined) continue
		directives.push(directive)
		if (directive.field === "user-agent") {
			groupFor(drafts, directive.value)
			continue
		}
		drafts.at(-1)?.directives.push(directive)
	}
	return Object.freeze({
		directives: Object.freeze(directives),
		groups: Object.freeze(
			drafts.map((draft) =>
				Object.freeze({
					agents: Object.freeze([...draft.agents]),
					directives: Object.freeze([...draft.directives]),
				}),
			),
		),
	})
}
