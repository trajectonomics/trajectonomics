import type { DateString, Flow } from "../types"

/** Whether a Milestone's fire date is known and no later than `date`. */
export function firedBy(
	fires: ReadonlyMap<string, DateString>,
	milestone: string,
	date: DateString,
): boolean {
	const fire = fires.get(milestone)
	return fire !== undefined && fire <= date
}

/** Whether a Flow lands on `date`: its `startAt` has fired by then, and its `endAt` has not. */
export function landsAt(
	fires: ReadonlyMap<string, DateString>,
	flow: Flow,
	date: DateString,
): boolean {
	if (flow.startAt !== undefined && !firedBy(fires, flow.startAt, date)) return false
	return flow.endAt === undefined || !firedBy(fires, flow.endAt, date)
}
