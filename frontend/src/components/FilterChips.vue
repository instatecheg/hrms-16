<template>
	<!-- Horizontal, scrollable pill chips; the selected one is filled with the primary colour -->
	<div class="flex flex-row gap-2 overflow-x-auto hide-scrollbar">
		<button
			v-for="option in props.options"
			:key="option.value"
			:class="[
				'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap',
				modelValue === option.value
					? 'bg-[var(--color-primary)] text-white shadow-[0_6px_14px_-8px_rgba(10,159,132,0.9)]'
					: 'bg-[var(--color-surface)] text-gray-600 border border-gray-200',
			]"
			@click="$emit('update:modelValue', option.value)"
		>
			{{ option.label }}
		</button>
	</div>
</template>

<script setup>
const props = defineProps({
	// [{ value, label }]
	options: { type: Array, required: true },
	modelValue: { type: String, default: "" },
})

defineEmits(["update:modelValue"])
</script>
