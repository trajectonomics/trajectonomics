import type { Env } from "../command"
import { telemetryDecision } from "./decide"
import { EVENT_NAME, NOTICE, POSTHOG_URL, type RunRecord, usageEvent } from "./event"
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

/** Saves the state through the injected writer; a writer that throws counts as not saved. */
function saved(input: AfterRunInput, state: TelemetryState): boolean {
	try {
		return input.writeState(state)
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
		if (current.id === undefined && !saved(input, state)) return
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
			saved(input, { ...state, noticeShown: true })
		}
	} catch {
		// Telemetry never changes what a person sees from their command.
	}
}

/** The shape the sender accepts: a capture body for the one event this CLI sends. */
export function isUsageBody(value: unknown): value is { event: typeof EVENT_NAME } {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { event?: unknown }).event === EVENT_NAME
	)
}

/**
 * The sender's half of the detached child: posts one event body and swallows every failure, so a
 * dropped request costs one count and nothing else. A body that is not a usage event is dropped.
 */
export async function postEvent(raw: string, fetcher: typeof fetch = fetch): Promise<void> {
	try {
		const parsed: unknown = JSON.parse(raw)
		if (!isUsageBody(parsed)) return
		await fetcher(POSTHOG_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: raw,
			signal: AbortSignal.timeout(5000),
		})
	} catch {
		// Offline, slow or refused: the count is lost, and the command that spawned this was already done.
	}
}
