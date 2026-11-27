import { z } from "zod"
import { PAGE_MASCOT_POSES } from "./mascot"

/**
 * The optional `mascot` frontmatter field of a docs page: one pose from the closed list, or no
 * robot. It is frontmatter rather than JSX in the body, because the Markdown twin cannot carry an
 * element ([ADR 0018](../docs/adr/0018-the-portal-carries-the-mascot.md)).
 */
export const pageMascotSchema = z.enum(PAGE_MASCOT_POSES).optional()
