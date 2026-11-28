// Test stand-in for SvelteKit's `$app/state`, `$app/navigation` and `$app/paths`. A test sets the address with
// setTestUrl, and the error an error page reads with setTestError.

/** The error an error page reads, as `$app/state` states it. */
interface PageError {
	readonly message: string
}

/**
 * The address bar of the test. Mirrors `page` from `$app/state`: `page.url` is the current URL, and a page whose
 * load failed states `page.status` and `page.error`.
 */
export const page: { url: URL; status: number; error: PageError | null } = {
	url: new URL("http://127.0.0.1/"),
	status: 200,
	error: null,
}

/** Sets the address the components under test read as `page.url`. */
export function setTestUrl(href: string): void {
	page.url = new URL(href)
}

/** Sets the failure an error page reads, as a load that did not answer leaves it. */
export function setTestError(status: number, message: string): void {
	page.status = status
	page.error = { message }
}

/** Puts the page back to one that loaded. */
export function clearTestError(): void {
	page.status = 200
	page.error = null
}

/** The addresses the page asked to go to, in order. A test reads them to see where the address bar would be. */
export const navigations: string[] = []

/** Records the address and goes nowhere: the tests render server output, which never navigates. */
export async function goto(url?: string): Promise<void> {
	if (url !== undefined) navigations.push(url)
}

/** Registers a callback after each navigation: the tests render one page and never navigate, so it never runs. */
export function afterNavigate(_callback: () => void): void {}

/** A static asset's URL: the test build has no base path, so the asset sits at the root. */
export function asset(file: string): string {
	return `/${file}`
}
