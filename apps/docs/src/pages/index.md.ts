import type { APIRoute } from "astro"
import { buildLandingTwin, portalOrigin, runBuildStep } from "../lib/agent"
import { readReleaseLine } from "../lib/release-line-source"

export const prerender = true

/** The Landing Page's Markdown twin at `/docs/index.md`, from the constants the page renders and the release line. */
export const GET: APIRoute = ({ site }) =>
	runBuildStep(
		() =>
			new Response(buildLandingTwin(portalOrigin(site), readReleaseLine()), {
				headers: { "content-type": "text/markdown; charset=utf-8" },
			}),
	)
