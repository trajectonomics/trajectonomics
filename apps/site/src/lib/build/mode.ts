/** The kind of build the checks judge: only production may not carry the owner's placeholder. */
export type BuildMode = "production" | "preview" | "development"

/** The mode a scan assumes when nothing says otherwise: the strictest, so the placeholder cannot hide. */
export const DEFAULT_BUILD_MODE: BuildMode = "production"

const BUILD_MODES: readonly BuildMode[] = Object.freeze(["production", "preview", "development"])

/** The Build Mode a name stands for; an absent or unknown name means `production`. */
export function buildMode(name: string | undefined): BuildMode {
	return BUILD_MODES.find((mode) => mode === name) ?? DEFAULT_BUILD_MODE
}
