/**
 * The slice of Better Auth's adapter the OAuth hooks use, and the one paged read they need.
 *
 * Better Auth caps `findMany` at 100 rows unless the caller passes a limit. A scan that misses a
 * row can leave a grant alive after a revoke, so every page here steps on `id > lastId`: a table
 * that shrinks underneath the scan cannot shift a row past the page boundary the way `offset` can.
 */

export type AdapterWhere = Array<{
	field: string
	value: unknown
	operator?: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in"
}>

export type Adapter = {
	findOne: (input: { model: string; where: AdapterWhere }) => Promise<unknown>
	findMany: (input: {
		model: string
		where: AdapterWhere
		limit?: number
		offset?: number
		sortBy?: { field: string; direction: "asc" | "desc" }
	}) => Promise<unknown[]>
	create: (input: { model: string; data: Record<string, unknown> }) => Promise<unknown>
	update: (input: {
		model: string
		where: AdapterWhere
		update: Record<string, unknown>
	}) => Promise<unknown>
	delete: (input: { model: string; where: AdapterWhere }) => Promise<unknown>
	deleteMany: (input: { model: string; where: AdapterWhere }) => Promise<unknown>
}

const PAGE_SIZE = 100

export function adapterOf(ctx: { context: unknown }): Adapter {
	return (ctx.context as { adapter: Adapter }).adapter
}

/**
 * Every row matching `where`, page by page, ordered by id. The next page starts strictly after
 * the last id seen, so a row deleted mid-scan cannot make the scan skip a later row.
 */
export async function findAllPages<T>(
	ctx: { context: unknown },
	model: string,
	where: AdapterWhere,
): Promise<T[]> {
	const rows: T[] = []
	let lastId: string | undefined
	for (;;) {
		const page = (await adapterOf(ctx).findMany({
			model,
			where: lastId === undefined ? where : [...where, nextPage(lastId)],
			limit: PAGE_SIZE,
			sortBy: { field: "id", direction: "asc" },
		})) as T[]
		rows.push(...page)
		if (page.length < PAGE_SIZE) return rows
		const id = (page[page.length - 1] as { id?: unknown } | undefined)?.id
		// Without a usable id the scan cannot advance; stop rather than read the same page forever.
		if (typeof id !== "string" || id === lastId) return rows
		lastId = id
	}
}

function nextPage(lastId: string): AdapterWhere[number] {
	return { field: "id", value: lastId, operator: "gt" }
}
