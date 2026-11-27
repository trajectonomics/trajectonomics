/**
 * The slice of Better Auth's adapter the OAuth hooks use, and the one paged read they all need.
 *
 * Better Auth caps `findMany` at 100 rows unless the caller passes a limit. A scan that misses a
 * row can leave a grant alive after a revoke, so every scan here uses `findAllPages`.
 */

export type AdapterWhere = Array<{ field: string; value: unknown }>

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
 * Every row matching `where`, page by page, ordered by id so a page boundary cannot repeat or
 * skip a row.
 */
export async function findAllPages<T>(
	ctx: { context: unknown },
	model: string,
	where: AdapterWhere,
): Promise<T[]> {
	const adapter = adapterOf(ctx)
	const rows: T[] = []
	for (let offset = 0; ; offset += PAGE_SIZE) {
		const page = (await adapter.findMany({
			model,
			where,
			limit: PAGE_SIZE,
			offset,
			sortBy: { field: "id", direction: "asc" },
		})) as T[]
		rows.push(...page)
		if (page.length < PAGE_SIZE) return rows
	}
}
