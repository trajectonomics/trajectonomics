import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"
import { POST_TYPES } from "./lib/posts"

/** An image a Post shows, served from `public/`, with the words that say what it shows. */
const image = z.object({
	src: z.string().startsWith("/"),
	alt: z.string().min(1),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
})

/** Every Post: one Markdown file under `src/content/posts/`, whose file name is its slug. */
const posts = defineCollection({
	loader: glob({ pattern: "*.md", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string().min(1),
		description: z.string().min(1),
		type: z.enum(POST_TYPES),
		publishedOn: z.coerce.date(),
		cover: image,
		draft: z.boolean().default(false),
	}),
})

export const collections = { posts }
