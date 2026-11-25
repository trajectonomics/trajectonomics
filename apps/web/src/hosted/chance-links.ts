import { withBase } from "./links"

/** The Chance page's link to one future, under the base path. */
export function futureHref(search: string, plan: string, index: number): string {
	const params = new URLSearchParams(search)
	params.set("scenario", plan)
	params.set("index", String(index))
	return withBase(`/chance/path/?${params.toString()}`)
}

/** The link back to the Chance page, under the base path. */
export function chanceHref(search: string, plan: string): string {
	const params = new URLSearchParams(search)
	params.set("scenario", plan)
	params.delete("index")
	return withBase(`/chance/?${params.toString()}`)
}
