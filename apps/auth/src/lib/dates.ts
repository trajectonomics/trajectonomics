/** A stored date as the page writes it; an unreadable value shows nothing rather than "Invalid Date". */
export function formatDate(iso: string | null | undefined, locale: string): string {
	if (iso === null || iso === undefined || iso === "") return ""
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ""
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(date)
}
