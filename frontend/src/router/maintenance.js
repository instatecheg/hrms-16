const routes = [
	{
		name: "MaintenanceListPage",
		path: "/maintenance",
		component: () => import("@/views/maintenance/List.vue"),
	},
]

export default routes