import { isRecord } from "./shape"

/** The Account ids of a raw `cashflow.withdraw` list: a plain id, or the `account` of a floored entry. */
export function withdrawAccountIds(list: unknown): readonly string[] {
	if (!Array.isArray(list)) return []
	const ids: string[] = []
	for (const entry of list as unknown[]) {
		if (typeof entry === "string") ids.push(entry)
		else if (isRecord(entry) && typeof entry["account"] === "string") ids.push(entry["account"])
	}
	return ids
}
