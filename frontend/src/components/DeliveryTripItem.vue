<template>
	<ListItem>
		<template #left>
			<div
				class="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-[var(--color-card-bg)] text-[var(--color-primary)]"
			>
				<FeatherIcon name="truck" class="h-5 w-5" />
			</div>
			<div class="flex flex-col items-start gap-1 min-w-0">
				<div class="text-xs font-medium text-[var(--color-text-muted)] truncate max-w-full">
					{{ requestNumber }}
				</div>
				<div class="text-base font-semibold text-gray-900 truncate max-w-full">
					{{ customerName }}
				</div>
				<div v-if="fromTo" class="text-xs font-normal text-[var(--color-text-muted)] truncate max-w-full">
					{{ fromTo }}
				</div>
			</div>
		</template>
		<template #right>
			<Badge
				variant="subtle"
				:theme="tripStatusTheme(props.doc.status)"
				:label="__(props.doc.status, null, 'Delivery Trip')"
				size="md"
				class="whitespace-nowrap shrink-0"
			/>
			<FeatherIcon name="chevron-right" class="h-4 w-4 text-gray-400" />
		</template>
	</ListItem>
</template>

<script setup>
import { computed, inject } from "vue"
import { FeatherIcon, Badge } from "frappe-ui"

import ListItem from "@/components/ListItem.vue"
import { tripStatusTheme } from "@/utils/statusColors"

const __ = inject("$translate")

const props = defineProps({
	doc: {
		type: Object,
	},
})

// A trip created without a request shows its own number.
const requestNumber = computed(() => props.doc.lh_transportation_request || props.doc.name)
// The customer's name (from the server); the Customer ID only if the name is unknown.
const customerName = computed(() => props.doc.customer_name || props.doc.lh_customer || __("No customer"))
const fromTo = computed(() =>
	[props.doc.from || props.doc.lh_source_city, props.doc.to || props.doc.lh_destination_city]
		.filter(Boolean)
		.join(" → ")
)
</script>
