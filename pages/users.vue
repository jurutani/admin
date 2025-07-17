<script lang="ts" setup>
// Middleware untuk admin
definePageMeta({
  middleware: 'admin',
})
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <NuxtPage />
  </div>
</template>
