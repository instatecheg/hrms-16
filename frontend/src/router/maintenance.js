const routes = [
	{
		name: "MaintenanceListPage",
		path: "/maintenance",
		component: () => import("@/views/maintenance/List.vue"),
	},
	{
		name: "MaintenanceFormPage",
		path: "/maintenance/new",
		component: () => import("@/views/maintenance/Form.vue"),
	},
	{
		name: "MaintenanceDetailPage",
		path: "/maintenance/:id",
		props: true,
		component: () => import("@/views/maintenance/Detail.vue"),
	},
]

export default routes