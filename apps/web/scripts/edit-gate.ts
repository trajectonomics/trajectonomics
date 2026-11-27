// The one-Edit-at-a-time lock of the write path: the flag the guards read, held for one request and cleared
// however that request ends, a throw included, so a failed Edit never leaves the page refused as running
// ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).

/** The flag the Edit guards read, and the run that holds it: one request at a time. */
export type EditGate = {
	readonly busy: boolean
	run: <T>(work: () => Promise<T>) => Promise<T>
}

/**
 * A gate for one editor. `run` sets `busy` before it awaits anything, so a second request that arrives while the
 * first runs reads `true` and is refused; the `finally` clears it when the work answers or throws.
 */
export function createEditGate(): EditGate {
	let busy = false
	return {
		get busy() {
			return busy
		},
		async run(work) {
			busy = true
			try {
				return await work()
			} finally {
				busy = false
			}
		},
	}
}
