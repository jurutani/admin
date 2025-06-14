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

// const { fetchSession, isAdmin } = useSession()
// await fetchSession()

// if (!isAdmin.value) {
//   // Redirect jika bukan admin
//   navigateTo('/auth/login')
// }
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
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
    </main>
    <NuxtPage />
  </div>
</template>

<style scoped>

</style>
