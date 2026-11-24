/** The address of one future: the plan and the path's index, with the rest of the query (such as `demo`) kept. */
export function futureHref(search: string, plan: string, index: number): string {
	const params = new URLSearchParams(search)
	params.set("scenario", plan)
	params.set("index", String(index))
	return `/chance/path/?${params.toString()}`
}

/** The address of the Chance page for a plan, with the rest of the query kept and the path's index dropped. */
export function chanceHref(search: string, plan: string): string {
	const params = new URLSearchParams(search)
	params.set("scenario", plan)
	params.delete("index")
	return `/chance/?${params.toString()}`
}
