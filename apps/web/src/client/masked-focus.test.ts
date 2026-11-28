import { afterAll, describe, expect, test } from "bun:test"
import { tick } from "svelte"
import { maskedFocus } from "./masked-focus"

// `maskedFocus` touches the window only when it registers its listeners, so a fake field can send it the events.
const SAVED_WINDOW = Object.getOwnPropertyDescriptor(globalThis, "window")

interface SentEvent {
	prevented: boolean
	preventDefault(): void
}

function fakeInput(): { node: HTMLInputElement; send: (type: string) => SentEvent } {
	const listeners = new Map<string, (event: Event) => void>()
	const node = {
		addEventListener(type: string, listener: (event: Event) => void): void {
			listeners.set(type, listener)
		},
		removeEventListener(type: string): void {
			listeners.delete(type)
		},
		select(): void {},
		dispatchEvent(): boolean {
			return true
		},
	}
	function send(type: string): SentEvent {
		const event: SentEvent = {
			prevented: false,
			preventDefault() {
				this.prevented = true
			},
		}
		listeners.get(type)?.(event as unknown as Event)
		return event
	}
	return { node: node as unknown as HTMLInputElement, send }
}

afterAll(() => {
	if (SAVED_WINDOW === undefined) Reflect.deleteProperty(globalThis, "window")
	else Object.defineProperty(globalThis, "window", SAVED_WINDOW)
})

describe("a masked amount's focus", () => {
	test("a drag that ends before the mouseup lets that mouseup through", async () => {
		Object.defineProperty(globalThis, "window", {
			value: { addEventListener: () => {}, removeEventListener: () => {} },
			configurable: true,
			writable: true,
		})
		const { node, send } = fakeInput()
		const action = maskedFocus(node, () => true)
		send("mousedown")
		send("focus")
		await tick()
		send("dragend")
		send("mousedown")
		expect(send("mouseup").prevented).toBe(false)
		action.destroy()
	})

	test("without a drag, the mouseup of the click that focused the field is held", async () => {
		Object.defineProperty(globalThis, "window", {
			value: { addEventListener: () => {}, removeEventListener: () => {} },
			configurable: true,
			writable: true,
		})
		const { node, send } = fakeInput()
		const action = maskedFocus(node, () => true)
		send("mousedown")
		send("focus")
		await tick()
		expect(send("mouseup").prevented).toBe(true)
		action.destroy()
	})
})
