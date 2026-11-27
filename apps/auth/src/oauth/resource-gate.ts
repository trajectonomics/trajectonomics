/** The one-resource gate shared by the device, authorize and token hooks (ADR 0002, gate 1). */
import { APIError } from "better-auth/api"
import { resourceParameterRejection } from "../core/resource-request"
import { requestResourceValues } from "./request"

export type ResourceGateContext = {
	path?: string | undefined
	body?: unknown
	query?: unknown
	request?: Request | undefined
}

/** Returns every `resource` value; throws `invalid_target` when the request names more than one. */
export async function checkResourceCount(ctx: ResourceGateContext): Promise<string[]> {
	const values = await requestResourceValues(ctx)
	if (resourceParameterRejection(values) !== null) {
		throw new APIError("BAD_REQUEST", {
			error: "invalid_target",
			error_description: "a request may name at most one resource",
		})
	}
	return values
}
