import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import { HeaderMark } from "../components/header-mark"
import { DOCS_BASE_PATH } from "./tabs"

/**
 * Layout options shared by every Docs Portal page. Every page carries the Portal's one header
 * brand, here and nowhere else, so a page cannot choose another (docs#75, ADR 0009): the glyph tile
 * that leads back to the Site Home and the `Docs` marker that leads to the Landing Page, as the blog
 * draws its own header. No layout carries a header link item, because the tile is the way back. No
 * layout offers a theme switch, because the portal renders one Theme for every reader.
 */
export function baseOptions(): BaseLayoutProps {
	return {
		nav: { title: HeaderMark, url: `${DOCS_BASE_PATH}/` },
		links: [],
		// The Docs Portal exposes one Theme for now (docs#89), so no control offers the other
		// one. Light's return flips this option and deletes the provider's forced value.
		themeSwitch: { enabled: false },
	}
}
