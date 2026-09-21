// Copyright (c) 2026
// Driver Ledger — filters

frappe.query_reports["Driver Ledger"] = {
	filters: [
		{
			fieldname: "driver",
			label: __("Driver"),
			fieldtype: "MultiSelectList",
			get_data: function(txt) {
				return frappe.db.get_link_options("Driver", txt);
			},
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
		},
	],
};