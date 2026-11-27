/** Default cap on concurrent read-only `traj` subprocesses during a Snapshot read. */
export const DEFAULT_READ_CONCURRENCY = 4

export type Pool = <T>(fn: () => Promise<T> | T) => Promise<T>

/**
 * Returns a scheduler that runs at most `concurrency` async tasks at once, preserving each caller's
 * promise result and rejection (including synchronous throws).
 */
export function createPool(concurrency = DEFAULT_READ_CONCURRENCY): Pool {
	const limit = Number.isFinite(concurrency)
		? Math.max(1, Math.floor(concurrency))
		: DEFAULT_READ_CONCURRENCY
	let active = 0
	const queue: (() => void)[] = []

	function release(): void {
		active -= 1
		const next = queue.shift()
		if (next !== undefined) next()
	}

	return <T>(fn: () => Promise<T> | T): Promise<T> =>
		new Promise<T>((resolve, reject) => {
			const start = () => {
				active += 1
				Promise.resolve()
					.then(fn)
					.then(
						(value) => {
							release()
							resolve(value)
						},
						(error) => {
							release()
							reject(error)
						},
					)
			}
			if (active < limit) start()
			else queue.push(start)
		})
}

/** Runs `items` through an existing `pool` scheduler, returning results in exact input order. */
export function mapWithPool<T, R>(
	pool: Pool,
	items: readonly T[],
	run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	return Promise.all(items.map((item, index) => pool(() => run(item, index))))
}

/** Runs `items` with bounded concurrency, returning results in the exact order of `items`. */
export function mapPool<T, R>(
	items: readonly T[],
	run: (item: T, index: number) => Promise<R>,
	concurrency = DEFAULT_READ_CONCURRENCY,
): Promise<R[]> {
	return mapWithPool(createPool(concurrency), items, run)
}

/** Runs every entry of a keyed record through an existing `pool` scheduler, preserving key order. */
export async function recordWithPool<T, R>(
	pool: Pool,
	plans: Record<string, T>,
	run: (item: T, key: string) => Promise<R>,
): Promise<Record<string, R>> {
	const entries = await Promise.all(
		Object.entries(plans).map(
			async ([key, item]) => [key, await pool(() => run(item, key))] as const,
		),
	)
	return Object.fromEntries(entries)
}

/** Runs every entry of a keyed record with bounded concurrency, preserving the record's key order. */
export function recordPool<T, R>(
	plans: Record<string, T>,
	run: (item: T, key: string) => Promise<R>,
	concurrency = DEFAULT_READ_CONCURRENCY,
): Promise<Record<string, R>> {
	return recordWithPool(createPool(concurrency), plans, run)
}
