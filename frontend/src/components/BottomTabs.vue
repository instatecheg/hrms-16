<template>
	<ion-tab-bar
		slot="bottom"
		class="sm:w-96 pt-2 pb-2 standalone:pb-safe-bottom"
	>
		<ion-tab-button
			v-for="item in tabItems"
			:key="item.route"
			:tab="item.route"
			:href="item.route"
			:aria-label="item.title"
			class="transition active:scale-95"
		>
			<span
				:class="[
					'flex flex-col items-center gap-1 text-[11px]',
					isActive(item) ? 'text-[var(--color-primary)] font-semibold' : 'text-gray-400 font-normal',
				]"
			>
				<component :is="item.icon" class="h-6 w-6" />
				<span>{{ item.title }}</span>
				<span
					:class="[
						'h-1 w-1 rounded-full',
						isActive(item) ? 'bg-[var(--color-accent)]' : 'bg-transparent',
					]"
				></span>
			</span>
		</ion-tab-button>
	</ion-tab-bar>
</template>

<script setup>
import { useRoute } from "vue-router"

import { IonTabBar, IonTabButton } from "@ionic/vue"

import HomeIcon from "@/components/icons/HomeIcon.vue"
import ExpenseIcon from "@/components/icons/ExpenseIcon.vue"
import DeliveryTripIcon from "@/components/icons/DeliveryTripIcon.vue"
import MaintenanceIcon from "@/components/icons/MaintenanceIcon.vue"

import { inject } from "vue"

const __ = inject("$translate")

const route = useRoute()

const isActive = (item) => route.path === item.route

const tabItems = [
	{
		icon: HomeIcon,
		title: __("Home"),
		route: "/home",
	},
	{
		icon: DeliveryTripIcon,
		title: __("Delivery"),
		route: "/dashboard/delivery_trip",
	},
	{
		icon: ExpenseIcon,
		title: __("Expenses"),
		route: "/dashboard/expense-claims",
	},
	{
		icon: MaintenanceIcon,
		title: __("Maintenance"),
		route: "/maintenance",
	},
]
</script>
