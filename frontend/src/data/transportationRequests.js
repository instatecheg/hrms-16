import { call } from "frappe-ui"

const REQUEST_FIELDS = [
	"name",
	"driver",
	"driver_name",
	"customer",
	"customer_name",
	"route",
	"from",
	"to",
	"departure_time",
	"workflow_state",
	"docstatus",
]

let driverPromise = null

async function getSessionDriver() {
	if (driverPromise) return driverPromise

	driverPromise = (async () => {
		const user = await call("frappe.auth.get_logged_user")

		const drivers = await call("frappe.client.get_list", {
			doctype: "Driver",
			fields: ["name"],
			filters: { user },
			limit_page_length: 1,
		})

		return drivers.length ? drivers[0].name : null
	})()

	return driverPromise
}

async function fetchRequests(extraFilters = {}) {
	const driver = await getSessionDriver()
	if (!driver) return []

	return call("frappe.client.get_list", {
		doctype: "Transportation Request",
		fields: REQUEST_FIELDS,
		filters: { driver, ...extraFilters },
		order_by: "departure_time desc",
	})
}

// Workflow states in which the driver still has a step to do
// (Go to Location, Arrived at Loading Location, Confirm / Cancel, Request Documents).
export const DRIVER_ACTIVE_STATES = [
	"Sent to driver",
	"Driver heading to loading",
	"Driver at loading location",
	"Confirmed by driver",
]

// "Requests" panel on Home: only the ones still waiting on the driver,
// regardless of date.
export async function fetchDriverRequests() {
	return fetchRequests({ workflow_state: ["in", DRIVER_ACTIVE_STATES] })
}

// "All" page: every state except Draft (Draft is Supervisor-only, so the
// driver shouldn't see it at all; everything else — the driver steps,
// Documents requested, Trip created, Cancelled, and any future state — is fair game).
export async function fetchAllRequests() {
	return fetchRequests({ workflow_state: ["!=", "Draft"] })
}

export async function getTransportationRequest(name) {
	return call("frappe.client.get", {
		doctype: "Transportation Request",
		name,
	})
}