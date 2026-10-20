<template>
	<ListItem>
		<template #left>
			<FeatherIcon name="clipboard" class="h-5 w-5 text-gray-500" />
			<div class="flex flex-col items-start gap-1.5">
				<div class="text-base font-normal text-gray-800">
					{{ props.doc.customer_name || props.doc.customer }}
				</div>
				<div class="text-xs font-normal text-gray-500">
					<span v-if="fromTo">{{ fromTo }}</span>
					<span v-if="fromTo"> &middot; </span>
					<span>{{ formatTimestamp(props.doc.departure_time) }}</span>
				</div>
			</div>
		</template>
		<template #right>
			<Badge
				v-if="props.doc.workflow_state"
				variant="outline"
				:theme="requestStateTheme(props.doc.workflow_state)"
				:label="__(props.doc.workflow_state, null, 'Transportation Request')"
				size="md"
				class="whitespace-nowrap shrink-0"
			/>
			<FeatherIcon name="chevron-right" class="h-5 w-5 text-gray-500" />
		</template>
	</ListItem>
</template>

<script setup>
import { computed, inject } from "vue"
import { FeatherIcon, Badge } from "frappe-ui"

import ListItem from "@/components/ListItem.vue"
import { requestStateTheme } from "@/utils/statusColors"
import { formatTimestamp } from "@/utils/formatters"

const __ = inject("$translate")

const props = defineProps({
	doc: {
		type: Object,
	},
})

// "From → To" of the request (either side may be empty)
const fromTo = computed(() => [props.doc.from, props.doc.to].filter(Boolean).join(" → "))
</script>