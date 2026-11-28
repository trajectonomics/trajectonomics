/**
 * The words the document and an error page are titled by. `routes.ts` re-exports them, so every page imports its
 * title from the one module the hosted build swaps for its twin.
 */

/** The document's title for a page's heading: the heading, then the product it is a page of. */
export function documentTitle(heading: string): string {
	return `${heading} · Trajectonomics`
}

/** The heading of an error page: a path that no page has, or any other failure the Dashboard met. */
export function errorTitle(status: number): string {
	return status === 404 ? "Page not found" : "Something went wrong"
}
