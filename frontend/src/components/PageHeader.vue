<template>
	<div class="grid grid-cols-[2.75rem_1fr_2.75rem] items-center bg-[var(--color-surface)] px-4 py-3">
		<button
			class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-alt)] text-gray-700"
			:aria-label="__('Back')"
			@click="router.back()"
		>
			<FeatherIcon name="chevron-left" class="h-5 w-5" />
		</button>
		<h2 class="text-center truncate">{{ props.title }}</h2>
		<div class="flex items-center justify-end">
			<slot name="right" />
		</div>
	</div>
</template>

<script setup>
import { inject } from "vue"
import { useRouter } from "vue-router"
import { FeatherIcon } from "frappe-ui"

const __ = inject("$translate")
const router = useRouter()

const props = defineProps({
	title: { type: String, default: "" },
})
</script>
