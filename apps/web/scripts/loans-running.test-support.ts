import { SLOW_MS } from "./edit-slow.test-support"
import type { Editor } from "./serve-edit"

// The Edits a loan end-to-end test has sent to its editor and that are still running.
/** The Edits the editor is running now: `send` adds each one and takes it out when it settles. */
export const running = new Set<Promise<unknown>>()

/** Records a request the editor is running and takes it out when it settles; answers the request itself. */
export function track<T>(request: Promise<T>): Promise<T> {
	running.add(request)
	const forget = () => running.delete(request)
	request.then(forget, forget)
	return request
}

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

/**
 * The editor with each request that holds it recorded in `running`, so an `afterEach(settle, SLOW_MS)` can wait
 * for a request whose test timed out: the editor frees itself only when that request settles.
 */
export function recorded(inner: Editor): Editor {
	return {
		get body() {
			return inner.body
		},
		refresh: () => inner.refresh(),
		session: (request, port) => inner.session(request, port),
		edit: (request, port) => track(inner.edit(request, port)),
		reread: (request, port) => track(inner.reread(request, port)),
		whatIf: (request, port) => track(inner.whatIf(request, port)),
	}
}
