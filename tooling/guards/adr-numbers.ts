/** A `docs/adr/` directory and the ADR files in it that share one number. */
export interface Collision {
	readonly directory: string
	readonly number: string
	readonly files: readonly string[]
}

/** A reviewed duplicate that stays until it is renumbered: the directory, the number and why it stays. */
export interface Allowance {
	readonly directory: string
	readonly number: string
	readonly reason: string
}

/** The ADR files of a tracked path: `<directory>/docs/adr/<NNNN>-<slug>.md`, outside agent and vendored folders. */
const ADR_FILE = /^(?:(.*)\/)?(docs\/adr)\/(\d{4})-[^/]+\.md$/
const SKIPPED = /(^|\/)(node_modules|\.agents|vendor|vendored)\//

/** The `docs/adr` directory and the number of a tracked path, or undefined when it is not an ADR file. */
export function adrOf(path: string): { directory: string; number: string } | undefined {
	if (SKIPPED.test(path)) return undefined
	const match = ADR_FILE.exec(path)
	if (match === null) return undefined
	const [, parent, adr, number] = match
	if (adr === undefined || number === undefined) return undefined
	return { directory: parent === undefined ? adr : `${parent}/${adr}`, number }
}

/** The numbers that two or more tracked files of one `docs/adr` directory share, in path order. */
export function collisionsIn(paths: readonly string[]): Collision[] {
	const groups = new Map<string, { directory: string; number: string; files: string[] }>()
	for (const path of [...paths].sort()) {
		const adr = adrOf(path)
		if (adr === undefined) continue
		const key = `${adr.directory}\0${adr.number}`
		const group = groups.get(key) ?? { ...adr, files: [] }
		group.files.push(path)
		groups.set(key, group)
	}
	return [...groups.values()].filter((group) => group.files.length > 1)
}

/** Whether an allowance covers a collision: the same directory and number. */
export function isAllowed(collision: Collision, allowances: readonly Allowance[]): boolean {
	return allowances.some(
		(allowance) =>
			allowance.directory === collision.directory && allowance.number === collision.number,
	)
}

/** The failure for a collision no allowance covers: which files collide, and what to do. */
export function describe(collision: Collision): string {
	return `${collision.directory} has ${collision.files.length} files numbered ${collision.number}: ${collision.files.join(", ")}. Give the new one the next free number in that directory.`
}
