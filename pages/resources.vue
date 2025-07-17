<script lang="ts" setup>
// Middleware untuk admin
definePageMeta({
  middleware: 'admin',
})
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Resource jurutani
        </h2>
        <p class="text-muted-foreground">
          Halaman ini berisi berbagai sumber daya yang dapat membantu Anda dalam mengelola dan memahami pertanian berkelanjutan.
        </p>
      </div>
    </div>
    <NuxtPage />
  </div>
</template>
