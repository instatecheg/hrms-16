import { call } from "frappe-ui"

const REQUEST_FIELDS = [
	"name",
	"driver",
	"driver_name",
	"customer",
	"customer_name",
	"route",
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

// "Requests" panel on Home: only the ones actually handed to the driver,
// regardless of date.
export async function fetchDriverRequests() {
	return fetchRequests({ workflow_state: "Sent to driver" })
}

// "All" page: every state except Draft (Draft is Supervisor-only, so the
// driver shouldn't see it at all; everything else — Sent to driver,
// Converted to trip, Cancelled, and any future state — is fair game).
export async function fetchAllRequests() {
	return fetchRequests({ workflow_state: ["!=", "Draft"] })
}

export async function getTransportationRequest(name) {
	return call("frappe.client.get", {
		doctype: "Transportation Request",
		name,
	})
}