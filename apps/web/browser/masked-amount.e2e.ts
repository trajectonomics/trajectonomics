import { test } from "@playwright/test"
import { maskedAmountEdit } from "./masked-amount"
import { maskedAmountFocusAway } from "./masked-away"
import { maskedAmountTabSwitch, maskedAmountTabThenClick } from "./masked-focus"
import { maskedAmountPasteMask, maskedAmountRedo, maskedAmountUndo } from "./masked-undo"
import { skipMaskingCheck } from "./masking"

// The masked amount checks of the editable scratch Dashboard (#761, #783, #807): with Hide amounts on a money field
// masks while it is away, and the browser's own Undo and Redo must never leave a mask or a doubled amount in the value
// the form sends. Each check opens the Income drawer of the scratch plan, and two of them save.

// The server runs one Edit at a time, so every check here takes turns rather than racing for it.
test.describe.configure({ mode: "serial" })

// Hide amounts must not let a masked amount be appended to, and a refusal must keep focus where the person put it.
test("typing into a masked amount replaces it, and a click selects the whole value", async ({
	page,
}) => {
	test.setTimeout(180_000)
	skipMaskingCheck()
	await maskedAmountEdit(page)
})

// A tab switch in the middle of typing must not drop the digits typed before it (web #783).
test("a tab switch mid-typing keeps the digits typed before it", async ({ page }) => {
	test.setTimeout(180_000)
	skipMaskingCheck()
	await maskedAmountTabSwitch(page)
})

// A click after a keyboard focus moves the caret, so typing appends rather than replacing (web #783).
test("a click after keyboard focus moves the caret, so typing appends", async ({ page }) => {
	test.setTimeout(180_000)
	skipMaskingCheck()
	await maskedAmountTabThenClick(page)
})

// An Undo can put the mask back into a masked amount, which must show the mask, not the draft it hides (web #783).
test("an undo at a masked amount shows the mask, and keeps the amount", async ({ page }) => {
	test.setTimeout(180_000)
	skipMaskingCheck()
	await maskedAmountUndo(page)
})

// A paste that holds the mask is dropped, and the caret stays where the paste was (web #783).
test("a paste holding the mask keeps the caret where the paste was", async ({ page }) => {
	test.setTimeout(180_000)
	skipMaskingCheck()
	await maskedAmountPasteMask(page)
})

// A Redo after an Undo must never double an amount the mask hid (web #807).
test("a redo after an undo at a masked amount never doubles it", async ({ page }) => {
	test.setTimeout(180_000)
	skipMaskingCheck()
	await maskedAmountRedo(page)
})

// A focus that moves while the window is away leaves no blur; the window's return must mask the field (web #783).
test("a focus moved while the window is away still masks the amount", async ({ page }) => {
	test.setTimeout(180_000)
	skipMaskingCheck()
	await maskedAmountFocusAway(page)
})
