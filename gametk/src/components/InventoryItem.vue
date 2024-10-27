<script setup>
// Add number prefixes to numbers
function formatNumber(num, digits) {
  const lookup = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'B' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'Q' },
    { value: 1e18, symbol: 'Qi' },
  ]

  const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/
  const item = lookup.findLast(item => num >= item.value)
  return item
    ? (num / item.value).toFixed(digits).replace(regexp, '').concat(item.symbol)
    : '0'
}
</script>

<template>
  <div
    class="bg-[#202020] px-8 py-4 w-full rounded-md hover:shadow-[#7a95b8] hover:shadow-md hover:z-10 transition-all"
  >
    <h2 class="text-xl text-slate-200">
      <span class="text-gray-600">LVL 210</span> - {{ name }}
    </h2>
    <div class="flex gap-2 mt-2 grid grid-cols-2 row-cols-2">
      <p class="text-red-500">
        <v-icon name="gi-broadsword" /> {{ formatNumber(physical, 2) }}
      </p>
      <p class="text-green-500">
        <v-icon name="bi-heart-fill" /> {{ formatNumber(health, 2) }}
      </p>
      <p class="text-purple-500">
        <v-icon name="si-codemagic" /> {{ formatNumber(spell, 2) }}
      </p>
      <p class="text-yellow-500"><v-icon name="px-plus" /> {{ upgrades }}</p>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    name: String,
    physical: { type: Number, default: 0 },
    spell: { type: Number, default: 0 },
    health: {
      type: Number,
      default: 0,
    },
    upgrades: {
      type: Number,
      default: 0,
    },
    maxUpgrades: {
      type: Number,
      default: 5,
    },
  },
}
</script>
