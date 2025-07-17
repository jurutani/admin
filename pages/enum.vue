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
          Setting Enum
        </h2>
        <p class="text-muted-foreground">
          Halaman ini digunakan untuk mengelola kategori yang digunakan pada aplikasi Juru Tani.
          Anda dapat menambah, menghapus, dan mengedit kategori yang ada.
        </p>
      </div>
    </div>
    <NuxtPage />
  </div>
</template>
