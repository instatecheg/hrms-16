<template>
	<div class="flex flex-col w-full min-w-0 justify-center gap-2.5">
		<div class="flex flex-row items-center justify-between gap-2">
			<div class="flex flex-row items-start gap-3 grow min-w-0">
				<slot name="left" />
			</div>
			<div class="flex flex-row justify-end items-center gap-2 shrink-0">
				<slot name="right" />
			</div>
		</div>
		<div v-if="props.isTeamRequest" class="flex flex-row items-center gap-2 ps-8">
			<EmployeeAvatar :employeeID="props.employee" />
			<div class="text-sm text-gray-600 grow">
				{{ props.employeeName }}
			</div>
		</div>
	</div>
</template>

<script setup>
import EmployeeAvatar from "@/components/EmployeeAvatar.vue"

const props = defineProps({
	isTeamRequest: {
		type: Boolean,
		default: false,
	},
	employee: {
		type: String,
		required: false,
	},
	employeeName: {
		type: String,
		required: false,
	},
})
</script>
