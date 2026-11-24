import { SLOW_MS } from "./edit-fixture.test-support"

// The Edits a loan end-to-end test has sent to its editor and that are still running.
/** The Edits the editor is running now: `send` adds each one and takes it out when it settles. */
export const running = new Set<Promise<unknown>>()

/**
 * Waits for every Edit still running. The editor takes one Edit at a time, and a test that timed out leaves
 * its Edit holding it, so an `afterEach` that awaits this keeps one timeout from failing the tests after it
 * with "Another Edit is running".
 */
export async function settle(ms = SLOW_MS - 5_000): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | undefined
	const stuck = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`an Edit still holds the editor after ${ms} ms`)), ms)
	})
	try {
		while (running.size > 0) await Promise.race([Promise.allSettled([...running]), stuck])
	} finally {
		// A timer left running would reject after the wait is over, with nobody to catch it.
		clearTimeout(timer)
	}
}
