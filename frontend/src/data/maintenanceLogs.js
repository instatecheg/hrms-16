import { call } from "frappe-ui"

const STATUS_GROUPS = {
	active: ["Draft", "Parts Issued"],
	history: ["Completed", "Cancelled"],
}

const ALL_STATUSES = ["Draft", "Parts Issued", "Completed", "Cancelled"]

const LOG_LIST_FIELDS = [
	"name",
	"maintenance_date",
	"vehicle",
	"odometer_km",
	"maintenance_type",
	"service_provider_type",
	"supplier",
	"status",
	"total_parts_qty",
]

function transformLogData(data) {
	return data.map((log) => {
		log.doctype = "Truck Maintenance Log"
		return log
	})
}

// Resolve the vehicle(s) currently assigned to the logged-in driver, via
// Driver.user -> Fleet Driver Assignment.driver -> Fleet Driver Assignment.vehicle
// (only "Active" assignments count). Cached per session since it won't
// change mid-session in normal use.
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

async function fetchLogs(extraFilters = {}, limit = 0) {
	const vehicles = await getAssignedVehicles()
	if (!vehicles.length) return []

	const data = await call("frappe.client.get_list", {
		doctype: "Truck Maintenance Log",
		fields: LOG_LIST_FIELDS,
		filters: {
			docstatus: ["!=", 0],
			vehicle: ["in", vehicles],
			...extraFilters,
		},
		order_by: "maintenance_date desc",
		...(limit ? { limit_page_length: limit } : {}),
	})

	return transformLogData(data)
}

export async function fetchMaintenanceSummary() {
	const logs = await fetchLogs()

	const summary = { Draft: 0, "Parts Issued": 0, Completed: 0, Cancelled: 0 }
	logs.forEach((log) => {
		if (summary[log.status] !== undefined) summary[log.status] += 1
	})

	return summary
}

export async function fetchRecentMaintenance(limit = 5) {
	return fetchLogs({}, limit)
}

export async function fetchMaintenanceByStatusGroup(group) {
	return fetchLogs({
		status: ["in", STATUS_GROUPS[group] || ALL_STATUSES],
	})
}

// Exposed for the "new log" form — the vehicle(s) the driver is allowed to
// log maintenance against. Returns the primary assignment's vehicle first,
// if there is one.
export async function getDriverVehicles() {
	return getAssignedVehicles()
}

export async function createMaintenanceLog(payload) {
	return call("frappe.client.insert", {
		doc: {
			doctype: "Truck Maintenance Log",
			...payload,
		},
	})
}

export { STATUS_GROUPS, ALL_STATUSES }