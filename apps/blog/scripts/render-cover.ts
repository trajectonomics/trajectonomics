import { mkdir, readFile } from "node:fs/promises"
import { dirname, extname, resolve } from "node:path"
import { chromium } from "playwright-core"
import { decorativeMark } from "../src/lib/mark"
import { themeRole } from "../src/lib/theme-role"
import { buildCoverHtml, parseCoverArgs } from "./cover-template"

const BRAND = "@trajectonomics/brand/current"

const MIME_BY_EXT: Readonly<Record<string, string>> = Object.freeze({
	".webp": "image/webp",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
})

function brandPath(subpath: string): string {
	return Bun.resolveSync(`${BRAND}/${subpath}`, import.meta.dir)
}

async function fontFaceRule(family: string, file: string, weight: string): Promise<string> {
	const bytes = await readFile(brandPath(`fonts/${file}`))
	const uri = `data:font/woff2;base64,${bytes.toString("base64")}`
	return `@font-face { font-family: "${family}"; src: url("${uri}") format("woff2"); font-weight: ${weight}; font-display: block; }`
}

async function encodeWebp(png: Uint8Array, outputPath: string): Promise<void> {
	await mkdir(dirname(outputPath), { recursive: true })
	const args = ["-y", "-f", "image2pipe", "-vcodec", "png", "-i", "pipe:0", "-c:v", "libwebp"]
	const proc = Bun.spawn(["ffmpeg", ...args, "-quality", "90", outputPath], {
		stdin: png,
		stdout: "ignore",
		stderr: "pipe",
	})
	const code = await proc.exited
	if (code !== 0) {
		const stderr = await new Response(proc.stderr).text()
		throw new Error(`ffmpeg failed (${code}): ${stderr.trim()}`)
	}
}

async function main(): Promise<void> {
	const options = parseCoverArgs(Bun.argv.slice(2))
	const inputPath = resolve(options.input)
	const outputPath = resolve(options.output)
	const mime = MIME_BY_EXT[extname(inputPath).toLowerCase()]
	if (mime === undefined) {
		throw new Error(`Unsupported image extension for ${inputPath}`)
	}

	const [rawImage, darkCss, rawMark, interLatin, interExt, monoCss] = await Promise.all([
		readFile(inputPath),
		readFile(brandPath("dark.css"), "utf8"),
		readFile(brandPath("logo/mark.svg"), "utf8"),
		fontFaceRule("Inter", "inter-latin-wght.woff2", "100 900"),
		fontFaceRule("Inter", "inter-latin-ext-wght.woff2", "100 900"),
		fontFaceRule("Azeret Mono", "azeret-mono-latin-500.woff2", "500"),
	])

	const html = buildCoverHtml({
		imageDataUri: `data:${mime};base64,${rawImage.toString("base64")}`,
		markSvg: decorativeMark(rawMark),
		fontsCss: `${interLatin}\n${interExt}\n${monoCss}`,
		title: options.title,
		...(options.kicker ? { kicker: options.kicker } : {}),
		shiftY: options.shiftY,
		titleSizePx: options.titleSizePx,
		colors: {
			background: themeRole(darkCss, "background"),
			foreground: themeRole(darkCss, "foreground"),
			accent: themeRole(darkCss, "accent"),
		},
	})

	const browser = await chromium.launch()
	try {
		const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
		await page.setContent(html, { waitUntil: "networkidle" })
		await page.evaluate(() => document.fonts.ready)
		const png = await page.screenshot({ type: "png" })
		await encodeWebp(png, outputPath)
		console.log(`cover: ${outputPath}`)
	} finally {
		await browser.close()
	}
}

await main()
