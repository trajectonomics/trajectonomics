import type { Env } from "../command"
import { telemetryDecision } from "./decide"
import { NOTICE, type RunRecord, usageEvent } from "./event"
import type { TelemetryState } from "./state"

/** Everything `afterRun` touches from outside, passed in so a test can drive it without I/O. */
export type AfterRunInput = {
	record: RunRecord
	env: Env
	version: string
	platform: string
	arch: string
	/** The instant the run ended, as an ISO 8601 string. */
	now: () => string
	newUuid: () => string
	readState: () => TelemetryState
	/** Saves the state file, and says whether it was saved. */
	writeState: (state: TelemetryState) => boolean
	/** Starts the sender with the event body; it must not wait for the network. */
	spawnSender: (body: string) => void
	/** Writes the one-time notice; it goes to stderr and only on a successful run. */
	notice: (text: string) => void
}

/**
 * Saves one change on a fresh read of the state, so a `traj telemetry off` that finished while this
 * run was going is never overwritten by this run's stale copy. A writer that throws counts as not
 * saved, and so does a state that is off by now.
 */
function saved(input: AfterRunInput, change: Partial<TelemetryState>): boolean {
	try {
		const fresh = input.readState()
		if (!fresh.enabled) return false
		return input.writeState({ ...fresh, ...change })
	} catch {
		return false
	}
}

/**
 * Runs after the command has finished and its exit code is settled. When counting is off it does
 * nothing. When it is on, it sends one event and, on a successful run that has never shown it, the
 * notice. Nothing here may throw or change the exit code, so every step is wrapped and swallowed.
 */
export function afterRun(input: AfterRunInput): void {
	try {
		const current = input.readState()
		const decision = telemetryDecision({ env: input.env, state: current, version: input.version })
		if (!decision.enabled) return
		const id = current.id ?? input.newUuid()
		const state: TelemetryState = { ...current, id }
		// An id that cannot be saved would be a new "person" on every run, which would inflate the
		// weekly count and repeat the notice each time (a read-only home in an agent's sandbox, say).
		// Such a machine sends nothing and prints nothing (ADR-0045).
		if (current.id === undefined && !saved(input, { id })) return
		input.spawnSender(
			JSON.stringify(
				usageEvent({
					id,
					record: input.record,
					version: input.version,
					platform: input.platform,
					arch: input.arch,
					timestamp: input.now(),
					uuid: input.newUuid(),
				}),
			),
		)
		if (input.record.exitCode === 0 && state.noticeShown !== true) {
			input.notice(NOTICE)
			// A file that took the id but not this flag shows the notice again next time: the honest outcome.
			saved(input, { noticeShown: true })
		}
	} catch {
		// Telemetry never changes what a person sees from their command.
	}
}
