# Copyright (c) 2026
# Driver Ledger
#
# A running ledger scoped to one or more drivers, combining:
#   CREDIT  (company owes driver)  — payouts for Completed Delivery Trips
#   DEBIT   (already given to driver) — submitted Expense Claims and
#            Employee Advances raised against that driver's linked Employee
#
# The running balance resets per driver (it does NOT accumulate across
# different drivers) — each driver's rows are sorted by date and their own
# balance column is computed independently, then all drivers' rows are
# concatenated together in the final report.
#
# git  is cumulative (credit - debit) within each driver's rows: positive
# means the company still owes that driver money; negative means the driver
# has been advanced more than they've earned and owes the company.
#
# Driver filter is optional — leave it empty to show every active driver.

import frappe
from frappe import _
from frappe.utils import flt, getdate


def execute(filters=None):
	filters = frappe._dict(filters or {})
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{
			"label": _("Driver ID"),
			"fieldname": "driver",
			"fieldtype": "Link",
			"options": "Driver",
			"width": 140,
		},
		{
			"label": _("Driver Name"),
			"fieldname": "driver_name",
			"fieldtype": "Data",
			"width": 160,
		},
		{
			"label": _("Posting Date"),
			"fieldname": "posting_date",
			"fieldtype": "Date",
			"width": 100,
		},
		{
			"label": _("Voucher Type"),
			"fieldname": "voucher_type",
			"fieldtype": "Data",
			"width": 130,
		},
		{
			"label": _("Voucher No"),
			"fieldname": "voucher_no",
			"fieldtype": "Dynamic Link",
			"options": "voucher_type",
			"width": 160,
		},
		{
			"label": _("Description"),
			"fieldname": "description",
			"fieldtype": "Data",
			"width": 260,
		},
		{
			"label": _("Debit (Given to Driver)"),
			"fieldname": "debit",
			"fieldtype": "Currency",
			"width": 160,
		},
		{
			"label": _("Credit (Owed to Driver)"),
			"fieldname": "credit",
			"fieldtype": "Currency",
			"width": 160,
		},
		{
			"label": _("Balance"),
			"fieldname": "balance",
			"fieldtype": "Currency",
			"width": 160,
		},
	]


def get_data(filters):
	drivers = get_selected_drivers(filters)

	data = []
	for driver in drivers:
		data += get_driver_ledger(driver, filters)

	return data


def get_selected_drivers(filters):
	"""Returns a list of dicts: {name, full_name, employee} for the drivers
	to include — either the ones picked in the filter, or every active
	driver when the filter is left empty."""

	selected = filters.get("driver")

	conditions = ["status = 'Active'"]
	values = {}

	if selected:
		if isinstance(selected, str):
			selected = [selected]
		conditions.append("name in %(drivers)s")
		values["drivers"] = tuple(selected)

	return frappe.db.sql(
		f"""
		select name, full_name, employee
		from `tabDriver`
		where {' and '.join(conditions)}
		order by full_name
		""",
		values,
		as_dict=True,
	)


def get_driver_ledger(driver, filters):
	entries = []
	entries += get_trip_entries(driver, filters)
	entries += get_expense_claim_entries(driver, filters)
	entries += get_employee_advance_entries(driver, filters)

	entries.sort(key=lambda row: (row["posting_date"], row["voucher_no"]))

	balance = 0
	data = []
	for row in entries:
		balance += flt(row["credit"]) - flt(row["debit"])
		row["balance"] = balance
		row["driver"] = driver.name
		row["driver_name"] = driver.full_name
		data.append(row)

	return data


def get_trip_entries(driver, filters):
	conditions = ["driver = %(driver)s", "docstatus = 1", "status = 'Completed'"]
	values = {"driver": driver.name}

	if filters.get("from_date"):
		conditions.append("DATE(departure_time) >= %(from_date)s")
		values["from_date"] = filters.from_date
	if filters.get("to_date"):
		conditions.append("DATE(departure_time) <= %(to_date)s")
		values["to_date"] = filters.to_date

	trips = frappe.db.sql(
		f"""
		select name, departure_time, lh_driver_payout, lh_source_city, lh_destination_city
		from `tabDelivery Trip`
		where {' and '.join(conditions)}
		""",
		values,
		as_dict=True,
	)

	return [
		{
			"posting_date": getdate(trip.departure_time),
			"voucher_type": "Delivery Trip",
			"voucher_no": trip.name,
			"description": _("Trip payout: {0} \u2192 {1}").format(
				trip.lh_source_city or "", trip.lh_destination_city or ""
			),
			"debit": 0,
			"credit": flt(trip.lh_driver_payout),
		}
		for trip in trips
	]


def get_expense_claim_entries(driver, filters):
	if not driver.employee:
		return []

	conditions = ["employee = %(employee)s", "docstatus = 1"]
	values = {"employee": driver.employee}

	if filters.get("from_date"):
		conditions.append("posting_date >= %(from_date)s")
		values["from_date"] = filters.from_date
	if filters.get("to_date"):
		conditions.append("posting_date <= %(to_date)s")
		values["to_date"] = filters.to_date

	claims = frappe.db.sql(
		f"""
		select name, posting_date, grand_total
		from `tabExpense Claim`
		where {' and '.join(conditions)}
		""",
		values,
		as_dict=True,
	)

	return [
		{
			"posting_date": claim.posting_date,
			"voucher_type": "Expense Claim",
			"voucher_no": claim.name,
			"description": _("Expense claim (fuel / maintenance / loan)"),
			"debit": flt(claim.grand_total),
			"credit": 0,
		}
		for claim in claims
	]


def get_employee_advance_entries(driver, filters):
	if not driver.employee:
		return []

	conditions = ["employee = %(employee)s", "docstatus = 1"]
	values = {"employee": driver.employee}

	if filters.get("from_date"):
		conditions.append("posting_date >= %(from_date)s")
		values["from_date"] = filters.from_date
	if filters.get("to_date"):
		conditions.append("posting_date <= %(to_date)s")
		values["to_date"] = filters.to_date

	advances = frappe.db.sql(
		f"""
		select name, posting_date, advance_amount, purpose
		from `tabEmployee Advance`
		where {' and '.join(conditions)}
		""",
		values,
		as_dict=True,
	)

	return [
		{
			"posting_date": adv.posting_date,
			"voucher_type": "Employee Advance",
			"voucher_no": adv.name,
			"description": _("Advance: {0}").format(adv.purpose or ""),
			"debit": flt(adv.advance_amount),
			"credit": 0,
		}
		for adv in advances
	]