<script setup lang="ts">

</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Role Management User
      </h2>
      <div class="flex items-center space-x-2">
        <BaseRefreshButton @refresh="refreshAllData" />
        <BaseDateRangePicker @update:date-range="handleDateRangeChange" />
      </div>
    </div>
    <NuxtPage />
  </div>
</template>

<style scoped>

</style>
