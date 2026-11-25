// Test stand-in for SvelteKit's `$app/state` and `$app/navigation`. A test sets the address with setTestUrl.

/** The address bar of the test. Mirrors `page` from `$app/state`: `page.url` is the current URL. */
export const page = { url: new URL("http://127.0.0.1/") }

/** Sets the address the components under test read as `page.url`. */
export function setTestUrl(href: string): void {
	page.url = new URL(href)
}

/** The addresses the page asked to go to, in order. A test reads them to see where the address bar would be. */
export const navigations: string[] = []

/** Records the address and goes nowhere: the tests render server output, which never navigates. */
export async function goto(url?: string): Promise<void> {
	if (url !== undefined) navigations.push(url)
}
