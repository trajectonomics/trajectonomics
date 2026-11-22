import { getCollection } from "astro:content"
import { toFumadocsSource } from "@fumadocs/astro/source"
import { loader } from "fumadocs-core/source"
import { pageHref } from "./page-href"
import { DOCS_BASE_PATH } from "./tabs"

/** The Fumadocs source over the authored Docs Portal pages. */
export const source = loader({
	source: toFumadocsSource(await getCollection("docs"), await getCollection("meta")),
	baseUrl: DOCS_BASE_PATH.length === 0 ? "/" : DOCS_BASE_PATH,
	// Sidebar links carry the slash their page is served at (astro.config.ts), so a click
	// does not answer 307. Page URLs themselves are unchanged.
	pageTree: {
		transformers: [
			{
				file: (node) => ({ ...node, url: pageHref(node.url) }),
				folder: (node) =>
					node.index === undefined
						? node
						: { ...node, index: { ...node.index, url: pageHref(node.index.url) } },
			},
		],
	},
})
