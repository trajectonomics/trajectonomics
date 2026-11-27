/**
 * The Tax labels page a just-saved new income in a taxed plan needs its label on, offered where the drawer closes to.
 * It holds one href at a time, so a later save replaces an earlier notice.
 */
class TaxLabelNotice {
	href = $state<string | null>(null)

	offer(href: string): void {
		this.href = href
	}

	clear(): void {
		this.href = null
	}
}

/** The notice one page holds: the last saved income's Tax labels page, or null. */
export const taxLabelNotice = new TaxLabelNotice()
