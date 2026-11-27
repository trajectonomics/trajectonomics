import glyph from "@trajectonomics/brand/current/logo/mark.svg?raw"
import type { ComponentProps } from "react"
import { PORTAL_NAME } from "../lib/portal"
import { SITE_HOME_LOAD, SITE_HOME_NAME, SITE_HOME_PATH } from "../lib/site-home"

/** The attributes the artwork names itself with; the anchor carries the name instead. */
const ARTWORK_NAME = /\s(?:role|aria-label)="[^"]*"/g

/** The artwork's own `<title>`, which would name the link a second time. */
const ARTWORK_TITLE = /<title>[\s\S]*?<\/title>/

const ARTWORK_OPEN = /<svg\b/

/**
 * The Site's glyph as decoration: the anchor names the link, so the SVG keeps no role, no
 * accessible name and no title, and assistive technology skips it.
 */
function decoration(artwork: string): string {
	return artwork
		.replace(ARTWORK_TITLE, "")
		.replace(ARTWORK_NAME, "")
		.replace(ARTWORK_OPEN, '<svg aria-hidden="true" focusable="false"')
}

/**
 * The Docs Portal's header brand, the blog's: the Site's glyph on a tile, 32 px and 40 px from
 * `sm` up, is the way back to the Site Home, a full document load because the Site is another
 * Worker rather than a page of this app; the `Docs` marker beside it in the display face links to
 * the Landing Page under the portal's name (ADR 0009, ADR 0017).
 */
export function HeaderMark({ href, className }: ComponentProps<"a">) {
	return (
		<span className={className} data-header-brand="">
			<a
				href={SITE_HOME_PATH}
				{...SITE_HOME_LOAD}
				aria-label={SITE_HOME_NAME}
				data-site-home=""
				className="rounded-md"
			>
				<span
					className="inline-flex size-8 items-center justify-center rounded-md bg-fd-primary text-fd-primary-foreground sm:size-10 [&_svg]:size-5"
					dangerouslySetInnerHTML={{ __html: decoration(glyph) }}
				/>
			</a>
			<a
				href={href}
				aria-label={PORTAL_NAME}
				data-docs-marker=""
				className="font-(family-name:--font-display) text-xl font-light tracking-[-0.01em] text-fd-foreground hover:underline hover:underline-offset-4"
			>
				Docs
			</a>
		</span>
	)
}
