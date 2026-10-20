<template>
	<ListItem>
		<template #left>
			<FeatherIcon name="truck" class="h-5 w-5 text-gray-500" />
			<div class="flex flex-col items-start gap-1.5">
				<div class="text-base font-normal text-gray-800">
					{{ props.doc.lh_customer }}
				</div>
				<div class="text-xs font-normal text-gray-500">
					<span>{{ props.doc.lh_destination_city }}</span>
				</div>
			</div>
		</template>
		<template #right>
			<Badge
				variant="outline"
				:theme="tripStatusTheme(props.doc.status)"
				:label="__(props.doc.status, null, 'Delivery Trip')"
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
import { tripStatusTheme } from "@/utils/statusColors"

const __ = inject("$translate")

const props = defineProps({
	doc: {
		type: Object,
	},
})
</script>