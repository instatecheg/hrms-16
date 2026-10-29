<template>
	<div class="flex p-1 bg-[var(--color-surface)] rounded-full shadow-[var(--shadow-card)]">
		<button
			v-for="button in buttons"
			:key="button.key ?? button.label ?? button"
			class="px-6 py-2.5 transition-all rounded-full flex-auto font-semibold text-sm"
			:class="
				modelValue === (button.key ?? button.label ?? button)
					? 'bg-[var(--color-primary)] text-white'
					: 'text-gray-500'
			"
			@click="$emit('update:modelValue', button.key ?? button.label ?? button)"
		>
			{{ button.label ?? __(button) }}
		</button>
	</div>
</template>

<script setup>
const props = defineProps({
	buttons: {
		type: Array,
		required: true,
	},
	modelValue: {
		type: String,
	},
})

defineEmits(["update:modelValue"])
</script>
