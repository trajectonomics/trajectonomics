// Test stand-in for SvelteKit's `$app/state` and `$app/navigation`. A test sets the address with setTestUrl.

/** The address bar of the test. Mirrors `page` from `$app/state`: `page.url` is the current URL. */
export const page = { url: new URL("http://127.0.0.1/") }

/** Sets the address the components under test read as `page.url`. */
export function setTestUrl(href: string): void {
	page.url = new URL(href)
}

/** A no-op: the tests render server output, which never navigates. */
export async function goto(): Promise<void> {}
