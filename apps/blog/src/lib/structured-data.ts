import { SITE_HOME_URL, SITE_NAME } from "./site"

/** The vocabulary every block states its keys come from. */
const CONTEXT = "https://schema.org"

/** The Organization that publishes the blog and writes its Posts: the author and the publisher both. */
export interface OrganizationNode {
	readonly "@type": "Organization"
	readonly name: string
	readonly url: string
}

const ORGANIZATION: OrganizationNode = Object.freeze({
	"@type": "Organization",
	name: SITE_NAME,
	url: SITE_HOME_URL,
})

/** What a Post page states about itself, read from its frontmatter and its address. */
export interface BlogPostingInput {
	readonly headline: string
	readonly description: string
	/** The publication date, as the `YYYY-MM-DD` the page's meta tags state. */
	readonly datePublished: string
	/** The cover's absolute URL, or `undefined` when the Post has no cover to name. */
	readonly image: string | undefined
	readonly inLanguage: string
	/** The Post page's canonical URL, which is also the page the article is the main entity of. */
	readonly url: string
}

/** The `BlogPosting` node one Post page states. */
export interface BlogPostingNode {
	readonly "@context": string
	readonly "@type": "BlogPosting"
	readonly headline: string
	readonly description: string
	readonly datePublished: string
	readonly image?: string
	readonly inLanguage: string
	readonly url: string
	readonly mainEntityOfPage: string
	readonly author: OrganizationNode
	readonly publisher: OrganizationNode
}

/** The front page's WebSite: the blog as a site, at the page's own URL, in the Interface Language. */
export interface WebSiteInput {
	readonly description: string
	readonly inLanguage: string
	readonly url: string
}

/** The `WebSite` node the front page states. */
export interface WebSiteNode {
	readonly "@context": string
	readonly "@type": "WebSite"
	readonly name: string
	readonly description: string
	readonly inLanguage: string
	readonly url: string
	readonly publisher: OrganizationNode
}

/** Any node a page states in its Structured data. */
export type JsonLdNode = BlogPostingNode | WebSiteNode

/** A `BlogPosting` node for one Post page. */
export function blogPosting(input: BlogPostingInput): BlogPostingNode {
	return Object.freeze({
		"@context": CONTEXT,
		"@type": "BlogPosting",
		headline: input.headline,
		description: input.description,
		datePublished: input.datePublished,
		...(input.image === undefined ? {} : { image: input.image }),
		inLanguage: input.inLanguage,
		url: input.url,
		mainEntityOfPage: input.url,
		author: ORGANIZATION,
		publisher: ORGANIZATION,
	})
}

/** A `WebSite` node for the front page of one Language Tree. */
export function website(input: WebSiteInput): WebSiteNode {
	return Object.freeze({
		"@context": CONTEXT,
		"@type": "WebSite",
		name: SITE_NAME,
		description: input.description,
		inLanguage: input.inLanguage,
		url: input.url,
		publisher: ORGANIZATION,
	})
}

/** A node as a `<script>` body, with every `<` escaped so no text can close the element. */
export function serializeJsonLd(node: JsonLdNode): string {
	return JSON.stringify(node).replace(/</g, "\\u003c")
}
