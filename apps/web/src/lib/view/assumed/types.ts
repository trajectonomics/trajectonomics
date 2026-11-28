/** The words of a plan's Assumed values, as Home's card and the Plan page's list show them ([web ADR 0032](../../../../docs/adr/0032-home-and-the-plan-page-show-what-a-plan-assumes.md)). */

/** The groups, in the order the page lists them. */
export type AssumedGroupKey =
	| "inflation"
	| "account-rates"
	| "debt-rates"
	| "amounts"
	| "unlabelled"
	| "allowances"
	| "tax-figures"

/** The plan item a sentence or a line is about, which the page names by what a Read states (web ADR 0029). */
export interface AssumedSubject {
	readonly kind: "flow" | "account"
	readonly id: string
}

export interface AssumedLink {
	readonly href: string
	readonly label: string
}

/** A group in one sentence: the words alone, or the words that follow the subject's name. It carries no money. */
export interface AssumedSentence {
	readonly subject: AssumedSubject | null
	readonly text: string
}

/** The value a Keep states, at the path and as the Read printed it. */
export interface AssumedKeep {
	readonly path: string
	readonly value: number | string
}

/** One item of a group. */
export interface AssumedLine {
	/** The item's path, which is unique in a plan's list. */
	readonly key: string
	readonly subject?: AssumedSubject
	readonly text?: string
	/** True when the words are the CLI's own, which the page prints as they are. */
	readonly cli?: boolean
	/** The CLI's decimal string, with the plan's currency. Only a pre-filled amount carries money. */
	readonly amount?: { readonly value: string; readonly currency: string }
	/** Where this one line is changed, when its group has no one page. */
	readonly link?: AssumedLink
	/** What a Keep states: only a value the template wrote can be kept. */
	readonly keep?: AssumedKeep
}

export interface AssumedGroup {
	readonly key: AssumedGroupKey
	readonly sentence: AssumedSentence
	readonly lines: readonly AssumedLine[]
	readonly link: AssumedLink | null
}
