/** Joins the class names that are set, in order. Tailwind classes are written out in full in the source. */
export function cx(...names: readonly (string | false | null | undefined)[]): string {
	return names.filter((name) => typeof name === "string" && name !== "").join(" ")
}
