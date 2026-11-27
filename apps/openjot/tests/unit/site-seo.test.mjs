import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { test } from "node:test"

const file = (name) => new URL(`../../site/public/${name}`, import.meta.url)
const read = (name) => readFileSync(file(name), "utf8")
const SITE = "https://trajectonomics.com"
const PAGE = `${SITE}/openjot/meowjot-alternative/`
const ASSET_PATH = "/openjot/meowjot-alternative/"
const LANDING = `${SITE}/openjot/`
const html = read("index.html")
const visible = html
	.replace(/<script[\s\S]*?<\/script>/g, "")
	.replace(/<wbr>/g, "")
	.replace(/<[^>]+>/g, "")
	.replace(/\s+/g, "")
const squash = (text) => text.replace(/\s+/g, "")

const graph = () => {
	const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
	assert.ok(match, "the comparison page carries a JSON-LD block")
	return JSON.parse(match[1])["@graph"]
}

test("the comparison page is the only page, and the old host-root files are gone", () => {
	assert.ok(existsSync(file("index.html")), "the comparison page is public/index.html")
	for (const name of [
		"meowjot-alternative.html",
		"robots.txt",
		"llms.txt",
		"404.html",
		"4bc4ff77c0b12a6d0f261b2c61f7ac41.txt",
	]) {
		assert.equal(existsSync(file(name)), false, `${name} belongs to the Site now`)
	}
})

test("the page's own sitemap, under its path, lists the page at its new address", () => {
	const sitemap = readFileSync(file("sitemap.xml"), "utf8")
	const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
	assert.deepEqual(locs, [PAGE])
})

test("the JSON-LD names the comparison page, its breadcrumb and its FAQ", () => {
	const types = graph().map((node) => [node["@type"]].flat())
	for (const type of ["WebPage", "BreadcrumbList", "FAQPage"]) {
		assert.ok(types.some((t) => t.includes(type)), `${type} is stated`)
	}
	assert.match(html, new RegExp(`<link rel="canonical" href="${PAGE}">`))
	assert.match(html, new RegExp(`<meta property="og:url" content="${PAGE}">`))
	const page = graph().find((node) => node["@type"] === "WebPage")
	assert.equal(page.url, PAGE)
	assert.equal(page["@id"], `${PAGE}#page`)
	assert.equal(page.primaryImageOfPage, `${PAGE}img/og.jpg`)
	const breadcrumb = graph().find((node) => node["@type"] === "BreadcrumbList")
	assert.equal(breadcrumb.itemListElement[0].item, LANDING)
	assert.equal(breadcrumb.itemListElement[1].item, PAGE)
})

test("the page is free, and states no claim it cannot support", () => {
	const written = JSON.stringify(graph())
	for (const claim of ["aggregateRating", "review", "reviewRating", "softwareVersion"]) {
		assert.ok(!written.includes(claim), `${claim} is not stated`)
	}
})

test("every FAQ question and answer in the JSON-LD is on the page in the same words", () => {
	const faq = graph().find((node) => node["@type"] === "FAQPage")
	assert.equal(faq.mainEntity.length, 6)
	for (const question of faq.mainEntity) {
		assert.ok(visible.includes(squash(question.name)), `question on the page: ${question.name}`)
		for (const sentence of question.acceptedAnswer.text.split(". ")) {
			assert.ok(visible.includes(squash(sentence.replace(/\.$/, ""))), `answer on the page: ${sentence}`)
		}
	}
})

test("every stylesheet, script, image and font resolves under the new public path and exists", () => {
	const paths = new Set(
		[...html.matchAll(/(?:src|href|data-animated)="(\/openjot\/meowjot-alternative\/[^"]+)"/g)].map(
			(match) => match[1],
		),
	)
	// og:image is absolute, so the regex above does not see it.
	const ogImage = html.match(/<meta property="og:image" content="([^"]+)">/)?.[1]
	assert.equal(ogImage, `${PAGE}img/og.jpg`)
	paths.add(ogImage.slice(SITE.length))

	for (const source of [read("styles.css"), read("app.js"), read("analytics.js")]) {
		for (const match of source.matchAll(/url\((\/openjot\/meowjot-alternative\/[^)]+)\)/g)) {
			paths.add(match[1])
		}
	}

	assert.ok(paths.size > 20, "the page and its stylesheet name their assets")
	for (const path of paths) {
		assert.ok(path.startsWith(ASSET_PATH), `${path} is under ${ASSET_PATH}`)
		const name = path.slice(ASSET_PATH.length)
		assert.ok(existsSync(file(name)), `${path} is in public/${name}`)
	}
})

test("the page and its scripts call only the prefixed Worker endpoints", () => {
	const app = read("app.js")
	const analytics = read("analytics.js")
	assert.match(app, /fetch\("\/openjot\/api\/release"/)
	assert.match(app, /\/openjot\/download\/checksums/)
	assert.match(analytics, /location\.origin \+ "\/openjot\/ingest"/)
	for (const source of [html, app, analytics, read("styles.css")]) {
		assert.doesNotMatch(source, /openjot\.trajectonomics\.com|moojot\.trajectonomics\.com/)
	}
	for (const match of html.matchAll(/(?:src|href)="(\/[^"]*)"/g)) {
		assert.ok(
			match[1].startsWith(ASSET_PATH) || match[1].startsWith("/openjot/download"),
			`${match[1]} is a page asset or the download short link`,
		)
	}
	assert.ok(html.includes(`href="${LANDING}#install"`), "the install link points at the Site's page")
})

test("the CSP and cache rules name the page's full public path", () => {
	const headers = read("_headers")
	assert.match(headers, new RegExp(`^${ASSET_PATH}\\*$`, "m"))
	assert.match(headers, new RegExp(`^${ASSET_PATH}img/\\*$`, "m"))
	assert.match(headers, new RegExp(`^${ASSET_PATH}fonts/\\*$`, "m"))
	assert.match(headers, /Content-Security-Policy: default-src 'self';.*connect-src 'self'; font-src 'self'/)
})

test("the comparison page's home and install links point at the Site's OpenJot page", () => {
	assert.match(html, new RegExp(`class="brand" href="${LANDING}"`))
	assert.match(html, /href="\/openjot\/download"/)
})
