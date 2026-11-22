import type { ErrorCode } from "../errors"

/** The PostHog project the Site and the Docs Portal also post to. Write-only, public by design. */
export const POSTHOG_PROJECT_KEY = "phc_o5LAcajRLpXxdxbUKg4f4veqqdM9xwQ954aQ92vCNvsF"

/** The EU capture endpoint of that project. */
export const POSTHOG_URL = "https://eu.i.posthog.com/i/v0/e/"

/** The one event name this CLI sends. */
export const EVENT_NAME = "traj_command_run"

/** The sentence printed once, on stderr, after the first successful run that counts. */
export const NOTICE =
	'traj counts anonymous usage (the command name, exit code, version and OS, never your ledger) to learn what helps. Turn it off with "traj telemetry off" or DO_NOT_TRACK=1. Details: https://github.com/trajectonomics/trajectonomics/tree/main/apps/cli#telemetry'

/**
 * What one run reports. `command` is the leaf the command line named, absent when no command of
 * the tree was named; `errorCode` is set when the run failed. Nothing else about the run is here.
 */
export type RunRecord = {
	command?: string | undefined
	exitCode: number
	errorCode?: ErrorCode | undefined
	format: "human" | "json"
}

export type UsageInput = {
	id: string
	record: RunRecord
	version: string
	platform: string
	arch: string
	timestamp: string
	uuid: string
}

/** The PostHog capture body. `properties` is closed: `usageEvent` is the only writer of it. */
export type UsageEvent = {
	api_key: string
	event: typeof EVENT_NAME
	distinct_id: string
	timestamp: string
	uuid: string
	properties: {
		command?: string
		exit_code: number
		error_code?: ErrorCode
		format: "human" | "json"
		version: string
		os: string
		arch: string
		surface: "cli"
		$process_person_profile: false
	}
}

/**
 * The event a run sends. Arguments, flag values, paths, account names, amounts, the data
 * directory and environment variables never reach this function, so they never reach PostHog.
 * `$process_person_profile: false` keeps PostHog from creating a person for each id.
 */
export function usageEvent(input: UsageInput): UsageEvent {
	const { record } = input
	return {
		api_key: POSTHOG_PROJECT_KEY,
		event: EVENT_NAME,
		distinct_id: input.id,
		timestamp: input.timestamp,
		uuid: input.uuid,
		properties: {
			...(record.command === undefined ? {} : { command: record.command }),
			exit_code: record.exitCode,
			...(record.errorCode === undefined ? {} : { error_code: record.errorCode }),
			format: record.format,
			version: input.version,
			os: input.platform,
			arch: input.arch,
			surface: "cli",
			$process_person_profile: false,
		},
	}
}
