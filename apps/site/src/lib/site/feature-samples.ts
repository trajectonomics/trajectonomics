import { RELEASE_SNAPSHOT } from "./release-snapshot"

/** One sample of the CLI's own output on a wide Features card: the command and its abridged JSON. */
export interface FeatureSample {
	/** The command as a visitor would type it, without the prompt. */
	readonly command: string
	/** The command's JSON, abridged with `…` where fields are left out. */
	readonly output: string
}

/**
 * The samples for the Features section's two wide cards, in the order of the Dictionary's first two
 * features: "Shows its working" (`traj fi`) and "Agent-operated" (`traj schema`). The field names follow
 * the CLI's real output (`apps/cli/src/projection/fi-view.ts` and `traj schema fi --json`); the figures
 * match the demo above the section. Code is the same in every Language, so it lives here, not in a
 * Dictionary.
 */
export function featureSamples(version: string): readonly FeatureSample[] {
	return Object.freeze([
		Object.freeze({
			command: "traj fi --scenario base --as-of 2026-03-31 --json",
			output: [
				"{",
				'  "asOf": "2026-03-31",',
				'  "engine": {',
				'    "package": "@trajectonomics/cli",',
				`    "version": "${version}"`,
				"  },",
				'  "scenario": { "name": "base", … },',
				'  "tax": "not_applied",',
				'  "fi": { "reachable": true, "fiDate": "2041-08-01" … }',
				"}",
			].join("\n"),
		}),
		Object.freeze({
			command: "traj schema fi --json",
			output: [
				"{",
				'  "name": "fi",',
				'  "input": {',
				'    "properties": {',
				'      "scenario": …, "asOf": …, "horizon": …, …',
				"    }",
				"  },",
				'  "output": { "properties": { "fi": …, … } },',
				'  "errorCodes": ["projection_refused", …]',
				"}",
			].join("\n"),
		}),
	])
}

/** The samples the Site ships, with the engine version of the committed Release snapshot. */
export const FEATURE_SAMPLES: readonly FeatureSample[] = featureSamples(RELEASE_SNAPSHOT.version)
