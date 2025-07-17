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
          Forum Chat
        </h2>
        <p class="text-muted-foreground">
          ini adalah data dari News yang ada di dashboard juru tani
        </p>
      </div>
    </div>
    <NuxtPage />
  </div>
</template>
