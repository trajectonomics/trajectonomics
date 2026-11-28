import { navigate } from "astro:transitions/client"
import { RootProvider } from "fumadocs-ui/provider/astro"
import type { ComponentProps, ReactNode } from "react"
import { withPortalSlash } from "../lib/docs-links"
import SearchDialog from "./search"

export interface ProviderProps {
	/** `Astro.url.pathname` */
	pathname: string
	/** `Astro.params` */
	params: Record<string, string | undefined>
	children?: ReactNode
}

/** The props Fumadocs gives a framework link: an anchor plus its static-site prefetch hint. */
type PortalLinkProps = ComponentProps<"a"> & { readonly prefetch?: boolean }

/**
 * The one link component every internal link Fumadocs draws goes through, so the sidebar, the
 * folder cards, the previous/next pages and the search results all end with the slash the Portal
 * serves a page under and a click costs no 307 redirect (trajectonomics#46). The page tree keeps
 * Fumadocs' slashless URLs, which its own path matching needs; only the rendered link gains the
 * slash.
 */
function PortalLink({ href, prefetch: _prefetch, ...props }: PortalLinkProps) {
	return <a href={href === undefined ? undefined : withPortalSlash(href)} {...props} />
}

/**
 * Navigation Fumadocs starts itself, such as choosing a search result, with the same slash, so that
 * click costs no 307 either: the search index keeps Fumadocs' slashless page URLs.
 */
function portalNavigate(url: string): ReturnType<typeof navigate> {
	return navigate(withPortalSlash(url))
}

/** Fumadocs root provider wired to the local static search dialog. */
export function Provider({ pathname, params, children }: ProviderProps) {
	return (
		<RootProvider
			pathname={pathname}
			params={params}
			navigate={portalNavigate}
			components={{ Link: PortalLink }}
			search={{ SearchDialog }}
			// next-themes emits both attributes, so the design-system Theme CSS
			// (scoped to [data-theme]) follows the same toggle as Fumadocs' .dark class.
			// The Docs Portal exposes the dark Theme only while the organisation ships one look
			// (the owner reversed the light-only decision on 17 Nov 2026, docs#89): `forcedTheme`
			// is applied before the stored preference and the device's scheme are read, so both
			// lose, and `hotKey` off leaves no shortcut that flips nothing. The light Theme CSS
			// stays loaded: light's return deletes these three values and re-enables the switch
			// in lib/layout.shared.tsx.
			theme={{
				attribute: ["class", "data-theme"],
				forcedTheme: "dark",
				enableSystem: false,
				hotKey: false,
			}}
		>
			{children}
		</RootProvider>
	)
}
