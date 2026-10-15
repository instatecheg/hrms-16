"""Transportation Request steps for the driver in the mobile app.

Go to Location / Arrived at Loading Location (with the phone's GPS), Accept,
Reject (with a reason, attachments optional), Cancel (at the loading location)
and Request Documents (needs at least one attachment).
The workflow itself (states, who may press what) is the "Transportation Request"
Workflow; these methods only add what the driver reports on each step.
"""

import frappe
from frappe import _
from frappe.model.workflow import apply_workflow, get_transitions

DOCTYPE = "Transportation Request"

# action -> field that keeps where the driver was when pressing it
LOCATION_FIELDS = {
	"Head to loading location": "driver_start_location",
	"Confirm arrival at loading": "loading_arrival_location",
}
DRIVER_ACTIONS = {*LOCATION_FIELDS, "Accept", "Reject", "Cancel request", "Request documents"}

DETAIL_FIELDS = (
	"customer",
	"customer_name",
	"customer_info",
	"departure_time",
	"from",
	"to",
	"vehicle",
	"driver",
	"driver_name",
	"location",
	"driver_start_location",
	"loading_arrival_location",
	"rejection_reason",
	"open_diesel",
	"delivery_trip",
	"route",
)


def _driver_user(driver):
	"""User of the driver: the Driver's own user, otherwise the user of the driver's Employee."""
	if not driver:
		return None
	user, employee = frappe.db.get_value("Driver", driver, ["user", "employee"]) or (None, None)
	if not user and employee:
		user = frappe.db.get_value("Employee", employee, "user_id")
	return user


def _get_request(name):
	"""The request, only for the driver it is assigned to (or a supervisor / admin)."""
	if not name or not frappe.db.exists(DOCTYPE, name):
		frappe.throw(_("Transportation Request not found"))
	doc = frappe.get_doc(DOCTYPE, name)
	is_manager = {"Supervisor", "System Manager"} & set(frappe.get_roles())
	if not is_manager and _driver_user(doc.get("driver")) != frappe.session.user:
		frappe.throw(_("This request is not assigned to you."), frappe.PermissionError)
	return doc


def _attachments(name):
	return frappe.get_all(
		"File",
		filters={"attached_to_doctype": DOCTYPE, "attached_to_name": name},
		fields=["name", "file_name", "file_url", "is_private", "file_size", "creation", "owner"],
		order_by="creation desc",
		limit_page_length=0,
	)


def _detail(doc):
	actions = [row.get("action") for row in (get_transitions(doc) or []) if row.get("action") in DRIVER_ACTIONS]
	return {
		"name": doc.name,
		"docstatus": doc.docstatus,
		"workflow_state": doc.get("workflow_state") or "",
		**{fieldname: doc.get(fieldname) for fieldname in DETAIL_FIELDS},
		"actions": actions,
		"attachments": _attachments(doc.name),
	}


@frappe.whitelist()
def get_driver_transportation_request(name=None):
	"""Request details, the driver's allowed actions for its current state, and its files."""
	return _detail(_get_request(name))


@frappe.whitelist(methods=["POST"])
def apply_driver_transportation_request_action(name=None, action=None, latitude=None, longitude=None, reason=None):
	if action not in DRIVER_ACTIONS:
		frappe.throw(_("Not a driver action: {0}").format(action))
	doc = _get_request(name)

	# apply_workflow reloads the request from the database, so extra values are written first;
	# if the transition fails the whole request (values included) is rolled back.
	location_field = LOCATION_FIELDS.get(action)
	if location_field:
		try:
			lat, lng = float(latitude), float(longitude)
		except (TypeError, ValueError):
			frappe.throw(_("Your location is required. Please allow location access and try again."))
		frappe.db.set_value(
			DOCTYPE, doc.name, location_field, f"https://maps.google.com/?q={lat},{lng}", update_modified=False
		)
	elif action == "Reject":
		reason = str(reason or "").strip()
		if not reason:
			frappe.throw(_("Please enter the reason for rejecting this request."))
		frappe.db.set_value(DOCTYPE, doc.name, "rejection_reason", reason, update_modified=False)
	elif action == "Request documents" and not _attachments(doc.name):
		frappe.throw(_("Add at least one attachment before requesting the documents."))

	apply_workflow(doc, action)
	frappe.db.commit()
	return _detail(frappe.get_doc(DOCTYPE, doc.name))
