import { mkdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { chromium, type Page } from "playwright-core"

/** The built assets root the Worker serves. */
const BUILD_ROOT = resolve(import.meta.dir, "..", "dist")

/** Where the committed screenshots live, one folder per Theme. */
const OUTPUT_ROOT = resolve(import.meta.dir, "..", "docs", "screenshots")

/** The pages a Surface ticket shows, by file-name stem. */
const PAGES = Object.freeze([
	{ name: "front", path: "/" },
	{ name: "post", path: "/guides/one-answer-every-time/" },
	{ name: "not-found", path: "/missing/" },
])

/** The widths every Surface ticket's evidence covers: desktop, wide and phone. */
const WIDTHS = Object.freeze([1280, 2000, 390])

/** The device schemes, which pick the Theme because the blog follows the device. */
const SCHEMES = Object.freeze(["light", "dark"] as const)

/** Answers a request the way Workers Static Assets does for this build: index files and the Not-found Page. */
async function answer(request: Request): Promise<Response> {
	const { pathname } = new URL(request.url)
	const file = Bun.file(
		join(BUILD_ROOT, pathname.endsWith("/") ? `${pathname}index.html` : pathname),
	)
	if (await file.exists()) return new Response(file)
	return new Response(Bun.file(join(BUILD_ROOT, "404.html")), {
		status: 404,
		headers: { "content-type": "text/html; charset=utf-8" },
	})
}

/**
 * Loads the lazy images below the first screen. A full-page screenshot never scrolls,
 * so without this a Post's figures would show as blank space.
 */
async function loadEveryImage(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const images = [...document.images]
		for (const image of images) image.loading = "eager"
		await Promise.all(images.map((image) => image.decode()))
	})
}

const server = Bun.serve({ port: 0, fetch: answer })
const browser = await chromium.launch()
try {
	for (const scheme of SCHEMES) {
		await mkdir(join(OUTPUT_ROOT, scheme), { recursive: true })
		for (const width of WIDTHS) {
			const context = await browser.newContext({
				colorScheme: scheme,
				viewport: { width, height: 900 },
			})
			const page = await context.newPage()
			for (const { name, path } of PAGES) {
				await page.goto(new URL(path, server.url).href, { waitUntil: "networkidle" })
				await loadEveryImage(page)
				await page.screenshot({
					path: join(OUTPUT_ROOT, scheme, `${name}-${width}.png`),
					fullPage: true,
				})
			}
			await context.close()
		}
	}
	console.log(
		`screenshots: ${SCHEMES.length * WIDTHS.length * PAGES.length} files in ${OUTPUT_ROOT}`,
	)
} finally {
	await browser.close()
	server.stop()
}
