import { MASCOT_SIZE, type MascotPose, mascotUrl } from "../lib/mascot"

export interface MascotProps {
	readonly pose: MascotPose
	/** The class that sets the rendered size; the file's own width and height reserve the box. */
	readonly className?: string | undefined
	/** Whether the robot is in the reader's first view, so it loads eagerly instead of lazily. */
	readonly eager?: boolean
}

/**
 * The Docs Portal's Mascot: the Site's rendered robot as decoration, with no words of its own
 * ([site ADR 0026][adr]). It never takes a pointer, focus or a screen reader's turn.
 *
 * [adr]: https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/docs/adr/0026-the-mascot-is-a-rendered-cut-out.md
 */
export function Mascot({ pose, className, eager = false }: MascotProps) {
	const size = MASCOT_SIZE[pose]
	return (
		<img
			alt=""
			aria-hidden="true"
			className={["pointer-events-none select-none", className].filter(Boolean).join(" ")}
			data-mascot={pose}
			decoding="async"
			draggable={false}
			height={size.height}
			loading={eager ? "eager" : "lazy"}
			src={mascotUrl(pose)}
			width={size.width}
		/>
	)
}
