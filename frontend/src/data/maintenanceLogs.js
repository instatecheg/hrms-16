import { call } from "frappe-ui"

// `notes` must be in this list: the edit popup pre-fills from the list row,
// so without it saving an existing log would blank out its notes.
// NOTE: `parts` (the line-items child table) is NOT fetchable via get_list —
// Frappe's list API only returns flat fields. The edit popup fetches the full
// document separately (getMaintenanceLog) whenever it needs parts.
const LOG_LIST_FIELDS = [
	"name",
	"maintenance_date",
	"vehicle",
	"odometer_km",
	"maintenance_type",
	"service_provider_type",
	"supplier",
	"notes",
	"status",
]

// Resolve the vehicle(s) currently assigned to the logged-in driver, via
// Driver.user -> Fleet Driver Assignment.driver -> Fleet Driver Assignment.vehicle
// (only "Active" assignments count). Cached per session.
let vehiclesPromise = null

async function getAssignedVehicles() {
	if (vehiclesPromise) return vehiclesPromise

	vehiclesPromise = (async () => {
		const user = await call("frappe.auth.get_logged_user")

		const drivers = await call("frappe.client.get_list", {
			doctype: "Driver",
			fields: ["name"],
			filters: { user },
			limit_page_length: 1,
		})

		if (!drivers.length) return []

		const assignments = await call("frappe.client.get_list", {
			doctype: "Fleet Driver Assignment",
			fields: ["vehicle"],
			filters: {
				driver: drivers[0].name,
				status: "Active",
				docstatus: ["!=", 2],
			},
		})

		return assignments.map((a) => a.vehicle)
	})()

	return vehiclesPromise
}

// Flat list for the driver's assigned vehicle(s). No docstatus filter on
// purpose: drivers create logs as Drafts (docstatus 0), and those must show up
// in the list or a freshly saved log would look like it vanished.
export async function fetchAllDriverLogs() {
	const vehicles = await getAssignedVehicles()
	if (!vehicles.length) return []

	return call("frappe.client.get_list", {
		doctype: "Truck Maintenance Log",
		fields: LOG_LIST_FIELDS,
		filters: { vehicle: ["in", vehicles] },
		order_by: "maintenance_date desc, creation desc",
	})
}

// The vehicle(s) the driver may log maintenance against (first one is used
// to pre-fill the popup).
export async function getDriverVehicles() {
	return getAssignedVehicles()
}

// Full document, including the parts child table — needed whenever the edit
// popup opens an existing log, since the list fetch above can't carry parts.
export async function getMaintenanceLog(name) {
	return call("frappe.client.get", {
		doctype: "Truck Maintenance Log",
		name,
	})
}

export async function createMaintenanceLog(payload) {
	return call("frappe.client.insert", {
		doc: {
			doctype: "Truck Maintenance Log",
			...payload,
		},
	})
}

// Uses fetch -> merge -> save rather than frappe.client.set_value, because
// set_value only reliably updates plain fields — it doesn't handle replacing
// a child table (parts) the way a full doc save does.
export async function updateMaintenanceLog(name, payload) {
	const doc = await getMaintenanceLog(name)
	Object.assign(doc, payload)
	return call("frappe.client.save", { doc })
}

export async function deleteMaintenanceLog(name) {
	return call("frappe.client.delete", {
		doctype: "Truck Maintenance Log",
		name,
	})
}