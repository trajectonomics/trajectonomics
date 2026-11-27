import { type CollectionEntry, getCollection } from "astro:content"
import { toFumadocsSource } from "@fumadocs/astro/source"
import { loader } from "fumadocs-core/source"
import { DOCS_BASE_PATH } from "./tabs"

const docs = await getCollection("docs")
const meta = await getCollection("meta")

/**
 * The Fumadocs source over the authored Docs Portal pages. The collection types are named
 * explicitly, so a page's own frontmatter (the `mascot` pose, ADR 0018) reaches `page.data`.
 */
export const source = loader({
	source: toFumadocsSource<CollectionEntry<"docs">, CollectionEntry<"meta">>(docs, meta),
	baseUrl: DOCS_BASE_PATH.length === 0 ? "/" : DOCS_BASE_PATH,
})
