import { defineCollection } from "astro:content"
import { metaLoader, pageLoader } from "@fumadocs/astro/loaders"
import { pageSchema } from "fumadocs-core/source/schema"
import { pageMascotSchema } from "./lib/mascot-schema"

export const collections = {
	// The docs schema is Fumadocs' own, plus the optional `mascot` pose the page layout draws
	// beside the title (ADR 0018). Everything else about a page is unchanged.
	docs: defineCollection({
		loader: pageLoader(),
		schema: pageSchema.extend({ mascot: pageMascotSchema }),
	}),
	meta: defineCollection({ loader: metaLoader() }),
}
