import glyph from "@trajectonomics/brand/current/logo/mark.svg?raw"
import { decorativeMark } from "@trajectonomics/brand/mark"
import type { ComponentProps } from "react"
import { PORTAL_NAME } from "../lib/portal"
import { SITE_HOME_LOAD, SITE_HOME_NAME, SITE_HOME_PATH } from "../lib/site-home"

/**
 * The Docs Portal's header brand, the blog's: the Site's glyph on the shared 40 px tile is the way
 * back to the Site Home, a full document load because the Site is another Worker rather than a
 * page of this app; the `Docs` marker beside it in the display face links to the Landing Page
 * under the portal's name (ADR 0009, ADR 0017). The tile and the marker come from
 * `@trajectonomics/brand/header.css`, so the Portal's frame matches the other static sites'.
 */
export function HeaderMark({ href, className }: ComponentProps<"a">) {
	return (
		<span className={className} data-header-brand="">
			<a
				href={SITE_HOME_PATH}
				{...SITE_HOME_LOAD}
				aria-label={SITE_HOME_NAME}
				data-site-home=""
				className="ds-brand"
			>
				<span
					className="ds-brand-tile"
					dangerouslySetInnerHTML={{ __html: decorativeMark(glyph) }}
				/>
			</a>
			<a href={href} aria-label={PORTAL_NAME} data-docs-marker="" className="ds-marker">
				Docs
			</a>
		</span>
	)
}
