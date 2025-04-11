<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { Megaphone, ShoppingCart, Newspaper, RefreshCw, Users } from 'lucide-vue-next'

const dataCard = ref({
  announcements: 0,
  announcementsDesc: 0,
  markets: 0,
  marketsDesc: 0,
  news: 0,
  newsDesc: 0,
  updates: 0,
  updatesDesc: 0,
})

const dataRecentUsers = [
  {
    name: 'Budi Santoso',
    role: 'Petani Padi',
    lastActive: '5 menit yang lalu',
  },
  {
    name: 'Siti Rahayu',
    role: 'Penyuluh Pertanian',
    lastActive: '20 menit yang lalu',
  },
  {
    name: 'Ahmad Wijaya',
    role: 'Distributor Pupuk',
    lastActive: '1 jam yang lalu',
  },
  {
    name: 'Dewi Lestari',
    role: 'Petani Sayuran',
    lastActive: '3 jam yang lalu',
  },
  {
    name: 'Hadi Purnomo',
    role: 'Administrator',
    lastActive: '5 jam yang lalu',
  },
]

const juruTaniImages = [
  {
    src: '/images/panen.png',
    alt: 'Petani sedang menanam padi',
    title: 'Penanaman Padi Organik',
  },
  {
    src: '/images/panen.png',
    alt: 'Proses panen hasil pertanian',
    title: 'Panen Raya Desa Sukamaju',
  },
  {
    src: '/images/panen.png',
    alt: 'Pelatihan petani',
    title: 'Pelatihan Teknologi Pertanian',
  },
]

onMounted(() => {
  dataCard.value = {
    announcements: 12,
    announcementsDesc: 3 / 100,
    markets: 28,
    marketsDesc: 12.5 / 100,
    news: 45,
    newsDesc: 8.7 / 100,
    updates: 17,
    updatesDesc: 5,
  }
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Dashboard Juru Tani
      </h2>
      <div class="flex items-center space-x-2">
        <BaseDateRangePicker />
      </div>
    </div>
    <main class="flex flex-1 flex-col gap-4 md:gap-8">
      <div class="grid gap-4 lg:grid-cols-4 md:grid-cols-2 md:gap-8">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle class="text-sm font-medium">
              Pengumuman
            </CardTitle>
            <Megaphone class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              <NumberFlow
                :value="dataCard.announcements"
              />
            </div>
            <p class="text-xs text-muted-foreground">
              <NumberFlow
                :value="dataCard.announcementsDesc"
                prefix="+"
                :format="{ style: 'percent', minimumFractionDigits: 1 }"
              />
              dari minggu lalu
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle class="text-sm font-medium">
              Markets
            </CardTitle>
            <ShoppingCart class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              <NumberFlow
                :value="dataCard.markets"
              />
            </div>
            <p class="text-xs text-muted-foreground">
              <NumberFlow
                :value="dataCard.marketsDesc"
                prefix="+"
                :format="{ style: 'percent', minimumFractionDigits: 1 }"
              /> dari minggu lalu
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle class="text-sm font-medium">
              News
            </CardTitle>
            <Newspaper class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              <NumberFlow
                :value="dataCard.news"
              />
            </div>
            <p class="text-xs text-muted-foreground">
              <NumberFlow
                :value="dataCard.newsDesc"
                prefix="+"
                :format="{ style: 'percent', minimumFractionDigits: 1 }"
              /> dari minggu lalu
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle class="text-sm font-medium">
              Updates
            </CardTitle>
            <RefreshCw class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              <NumberFlow
                :value="dataCard.updates"
              />
            </div>
            <p class="text-xs text-muted-foreground">
              <NumberFlow
                :value="dataCard.updatesDesc"
                prefix="+"
              /> dari kemarin
            </p>
          </CardContent>
        </Card>
      </div>
      <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 md:gap-8">
        <Card class="xl:col-span-2">
          <CardHeader>
            <CardTitle>Galeri Juru Tani</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div v-for="(image, index) in juruTaniImages" :key="index" class="flex flex-col gap-2">
                <img :src="image.src" :alt="image.alt" class="rounded-md w-full h-48 object-cover" />
                <p class="text-sm font-medium">{{ image.title }}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Users Aktif</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-8">
            <div
              v-for="user in dataRecentUsers" :key="user.name"
              class="flex items-center gap-4"
            >
              <Avatar class="hidden h-9 w-9 sm:flex">
                <AvatarFallback>{{ user.name.split(' ')[0][0] }}{{ user.name.split(' ').length > 1 ? user.name.split(' ')[1][0] : '' }}</AvatarFallback>
              </Avatar>
              <div class="grid gap-1">
                <p class="text-sm font-medium leading-none">
                  {{ user.name }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ user.role }}
                </p>
              </div>
              <div class="ml-auto text-xs text-muted-foreground">
                {{ user.lastActive }}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>