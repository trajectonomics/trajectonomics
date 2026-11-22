import { type ProbeFailure, type ProbeResponse, probeFailure } from "./probe"
import {
	checkContentSecurityPolicy,
	checkEtag,
	checkLanguage,
	checkLocation,
	checkMediaType,
	checkStatus,
} from "./probe-answer-checks"
import { checkBody } from "./probe-body-checks"
import { checkSetCookie } from "./probe-cookie-checks"
import { checkCacheControl, checkVary } from "./probe-header-checks"
import { PROBES } from "./probes"

/** Every rule the local Worker fails; a probe that was never asked fails too. */
export function checkProbeResponses(responses: readonly ProbeResponse[]): readonly ProbeFailure[] {
	const missing = PROBES.filter(
		(probe) => !responses.some((response) => response.probe === probe),
	).map((probe) =>
		probeFailure("PROBE_NOT_ASKED", probe.path, "the probe never asked for this path."),
	)
	return [
		...missing,
		...responses.flatMap((response) => [
			...checkStatus(response),
			...checkLocation(response),
			...checkLanguage(response),
			...checkMediaType(response),
			...checkVary(response),
			...checkCacheControl(response),
			...checkEtag(response),
			...checkSetCookie(response),
			...checkBody(response),
			...checkContentSecurityPolicy(response),
		]),
	]
}
