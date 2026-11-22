import { z } from "zod"
import { EVENT_NAME, POSTHOG_PROJECT_KEY, POSTHOG_URL } from "./event"

/**
 * The exact body the sender forwards: this project's key, this event, and only the properties
 * `usageEvent` writes. Anything else in `TRAJ_TELEMETRY_EVENT` is not a body this CLI made.
 */
const usageBody = z.strictObject({
	api_key: z.literal(POSTHOG_PROJECT_KEY),
	event: z.literal(EVENT_NAME),
	distinct_id: z.uuid(),
	timestamp: z.iso.datetime(),
	uuid: z.uuid(),
	properties: z.strictObject({
		command: z
			.string()
			.regex(/^[a-z]+(?: [a-z]+)*$/)
			.optional(),
		exit_code: z.number().int(),
		error_code: z
			.string()
			.regex(/^[a-z_]+$/)
			.optional(),
		format: z.enum(["human", "json"]),
		version: z.string(),
		os: z.string(),
		arch: z.string(),
		surface: z.literal("cli"),
		$process_person_profile: z.literal(false),
	}),
})

/** Whether a raw `TRAJ_TELEMETRY_EVENT` value is a body this CLI made, and nothing more. */
export function isUsageBody(raw: string): boolean {
	try {
		return usageBody.safeParse(JSON.parse(raw)).success
	} catch {
		return false
	}
}

/**
 * The sender's half of the detached child: posts one event body and swallows every failure, so a
 * dropped request costs one count and nothing else. A body that is not a usage event is dropped.
 */
export async function postEvent(raw: string, fetcher: typeof fetch = fetch): Promise<void> {
	try {
		if (!isUsageBody(raw)) return
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
