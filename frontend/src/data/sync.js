// Keeps the app in sync with the server without leaving and re-opening a page.
//
// A change is announced to every listener (see onDataChange) when:
// - the server saves a Delivery Trip / Transportation Request / PWA Notification
//   (socket "list_update", sent by Frappe on every save),
// - the app comes back to the foreground or the phone gets back online,
// - every POLL_INTERVAL while the app is visible: a fallback for when the socket is not connected.
//
// Listeners get the changed doctype and name, or doctype "*" for "anything may have changed".

import { session } from "@/data/session"

export const SYNCED_DOCTYPES = ["Delivery Trip", "Transportation Request", "PWA Notification"]
const POLL_INTERVAL = 30 * 1000
// several saves in a row (e.g. a trip and its request) cause one reload
const DEBOUNCE = 400

const listeners = new Set()
let pending = new Map()
let timer = null

function flush() {
	timer = null
	const changes = [...pending.values()]
	pending = new Map()
	for (const listener of listeners) {
		try {
			listener(changes)
		} catch (err) {
			console.error("Sync listener failed", err)
		}
	}
}

export function notifyDataChange(doctype = "*", name = null) {
	pending.set(`${doctype}:${name}`, { doctype, name })
	if (!timer) timer = setTimeout(flush, DEBOUNCE)
}

// `listener(changes)` with changes = [{ doctype, name }]. Returns a function that stops listening.
export function onDataChange(listener) {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

// true if one of `changes` is about one of `doctypes` (a "*" change matches everything)
export function changeMatches(changes, doctypes, name = null) {
	return changes.some(
		(change) =>
			change.doctype === "*" ||
			(doctypes.includes(change.doctype) && (!name || !change.name || change.name === name))
	)
}

let started = false

export function initSync(socket) {
	if (started) return
	started = true

	const subscribe = () => SYNCED_DOCTYPES.forEach((doctype) => socket.emit("doctype_subscribe", doctype))
	subscribe()
	// rooms are lost on reconnect: join them again, and catch up on what was missed meanwhile
	socket.on("connect", () => {
		subscribe()
		notifyDataChange()
	})

	socket.on("list_update", (data) => {
		if (SYNCED_DOCTYPES.includes(data?.doctype)) notifyDataChange(data.doctype, data.name)
	})

	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") notifyDataChange()
	})
	window.addEventListener("online", () => notifyDataChange())

	setInterval(() => {
		if (document.visibilityState === "visible") notifyDataChange()
	}, POLL_INTERVAL)

	// the bell dot in the header follows new notifications everywhere in the app
	// (imported lazily: data/notifications needs the logged-in user when it loads)
	onDataChange(async (changes) => {
		if (!session.isLoggedIn || !changeMatches(changes, ["PWA Notification"])) return
		const { unreadNotificationsCount } = await import("@/data/notifications")
		unreadNotificationsCount.reload()
	})
}
