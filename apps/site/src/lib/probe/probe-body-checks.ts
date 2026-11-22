import { type ProbeFailure, type ProbeResponse, probeFailure } from "./probe"

/**
 * The text a personalised home must carry, and the text it must not. A consent answer is judged by what
 * the page says about it: the banner's `data-consent` and the visitor id the page hands the analytics.
 */
export function checkBody(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe, html } = response
	const missing = probe.contains
		.filter((text) => !html.includes(text))
		.map((text) =>
			probeFailure(
				"PROBE_BODY_WRONG",
				probe.path,
				`the answer's body lacks ${JSON.stringify(text)}.`,
			),
		)
	const present = probe.lacks
		.filter((text) => html.includes(text))
		.map((text) =>
			probeFailure(
				"PROBE_BODY_WRONG",
				probe.path,
				`the answer's body carries ${JSON.stringify(text)}.`,
			),
		)
	return [...missing, ...present]
}
