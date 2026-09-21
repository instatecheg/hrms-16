<template>
	<ListItem>
		<template #left>
			<FeatherIcon name="tool" class="h-5 w-5 text-gray-500" />
			<div class="flex flex-col items-start gap-1.5">
				<div class="text-base font-normal text-gray-800">
					{{ props.doc.vehicle }}
				</div>
				<div class="text-xs font-normal text-gray-500">
					<span>{{ props.doc.maintenance_type }}</span>
					<span> · </span>
					<span>{{ formatTimestamp(props.doc.maintenance_date) }}</span>
				</div>
			</div>
		</template>
		<template #right>
			<Badge
				variant="outline"
				:theme="statusMap[props.doc.status] || 'gray'"
				:label="__(props.doc.status, null, 'Truck Maintenance Log')"
				size="md"
			/>
			<FeatherIcon name="chevron-right" class="h-5 w-5 text-gray-500" />
		</template>
	</ListItem>
</template>

<script setup>
import { inject } from "vue"
import { FeatherIcon, Badge } from "frappe-ui"

import ListItem from "@/components/ListItem.vue"
import { formatTimestamp } from "@/utils/formatters"

const __ = inject("$translate")

const props = defineProps({
	doc: {
		type: Object,
	},
})

const statusMap = {
	Draft: "gray",
	"Parts Issued": "blue",
	Completed: "green",
	Cancelled: "red",
}
</script>