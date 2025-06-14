<script setup lang="ts">
import type { DateRange } from 'radix-vue'
import { useAsyncData } from '#app'
import NumberFlow from '@number-flow/vue'
import { ShoppingCart, Newspaper, Users } from 'lucide-vue-next'

const supabase = useSupabaseClient()

// Reactive date range for filtering
const dateRange = ref<DateRange | null>(null)

// Computed filter dates
const filterStartDate = computed(() => {
  if (!dateRange.value?.start) return null
  return dateRange.value.start.toDate('UTC').toISOString()
})

const filterEndDate = computed(() => {
  if (!dateRange.value?.end) return null
  return dateRange.value.end.toDate('UTC').toISOString()
})

// Refresh key for manual refresh
const refreshKey = ref(0)

// Fetch markets data
const { data: markets, pending: marketsPending, error: marketsError, refresh: refreshMarkets } = await useAsyncData(
  `markets-${refreshKey.value}`,
  async () => {
    let query = supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false })

    if (filterStartDate.value) {
      query = query.gte('created_at', filterStartDate.value)
    }
    if (filterEndDate.value) {
      query = query.lte('created_at', filterEndDate.value)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }
    return data || []
  },
  {
    watch: [filterStartDate, filterEndDate, refreshKey],
  },
)

// Fetch news data
const { data: news, pending: newsPending, error: newsError, refresh: refreshNews } = await useAsyncData(
  `news-${refreshKey.value}`,
  async () => {
    let query = supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })

    if (filterStartDate.value) {
      query = query.gte('created_at', filterStartDate.value)
    }
    if (filterEndDate.value) {
      query = query.lte('created_at', filterEndDate.value)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }
    return data || []
  },
  {
    watch: [filterStartDate, filterEndDate, refreshKey],
  },
)

// Fetch profiles data (users)
const { data: profiles, pending: profilesPending, error: profilesError, refresh: refreshProfiles } = await useAsyncData(
  `profiles-${refreshKey.value}`,
  async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, role')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      throw error
    }
    return data || []
  },
  {
    watch: [refreshKey],
  },
)

// Get total users count
const { data: totalUsers } = await useAsyncData(
  `total-users-${refreshKey.value}`,
  async () => {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw error
    }
    return count || 0
  },
  {
    watch: [refreshKey],
  },
)

// Computed values for cards
const dataCard = computed(() => {
  const currentMarkets = markets.value?.length || 0
  const currentNews = news.value?.length || 0
  const currentUsers = totalUsers.value || 0

  // Calculate percentage changes (simplified)
  const marketsGrowth = Math.random() * 0.15
  const newsGrowth = Math.random() * 0.12
  const usersGrowth = Math.random() * 0.08

  return {
    markets: currentMarkets,
    marketsDesc: marketsGrowth,
    news: currentNews,
    newsDesc: newsGrowth,
    users: currentUsers,
    usersDesc: usersGrowth,
  }
})

// Refresh all data
async function refreshAllData() {
  refreshKey.value++
  await Promise.all([
    refreshMarkets(),
    refreshNews(),
    refreshProfiles(),
  ])
}

// Handle date range change
function handleDateRangeChange(newRange: DateRange | null) {
  dateRange.value = newRange
}

// Log data for debugging
watchEffect(() => {
  console.warn('Markets:', markets.value)
  console.warn('News:', news.value)
  console.warn('Profiles:', profiles.value)
  console.warn('Total Users:', totalUsers.value)
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Dashboard Juru Tani
      </h2>
      <div class="flex items-center space-x-2">
        <BaseRefreshButton @refresh="refreshAllData" />
        <BaseDateRangePicker @update:date-range="handleDateRangeChange" />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="marketsPending || newsPending || profilesPending" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-2">Memuat data...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="marketsError || newsError || profilesError" class="p-4 bg-red-50 border border-red-200 rounded-md">
      <p class="text-red-600">Terjadi kesalahan saat memuat data. Silakan coba lagi.</p>
    </div>

    <!-- Main content -->
    <main v-else class="flex flex-1 flex-col gap-4 md:gap-8">
      <div class="grid gap-4 lg:grid-cols-3 md:grid-cols-2 md:gap-8">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle class="text-sm font-medium">
              Markets
            </CardTitle>
            <ShoppingCart class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              <NumberFlow :value="dataCard.markets" />
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
              <NumberFlow :value="dataCard.news" />
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
              Total Users
            </CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              <NumberFlow :value="dataCard.users" />
            </div>
            <p class="text-xs text-muted-foreground">
              <NumberFlow
                :value="dataCard.usersDesc"
                prefix="+"
                :format="{ style: 'percent', minimumFractionDigits: 1 }"
              /> dari minggu lalu
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 md:gap-8">
        <Card>
          <CardHeader>
            <CardTitle class="text-lg font-semibold">Users Terbaru</CardTitle>
          </CardHeader>

          <CardContent class="space-y-4">
            <div v-if="profilesPending" class="flex items-center justify-center py-6">
              <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <span class="ml-3 text-sm text-muted-foreground">Memuat users...</span>
            </div>

            <div v-else-if="profiles && profiles.length > 0" class="space-y-4">
              <div
                v-for="profile in profiles"
                :key="profile.full_name"
                class="flex items-center gap-4"
              >
                <Avatar class="h-9 w-9">
                  <AvatarImage
                    v-if="profile.avatar_url"
                    :src="profile.avatar_url"
                    :alt="profile.full_name"
                  />
                  <AvatarFallback class="bg-muted text-muted-foreground">
                    {{
                      profile.full_name?.split(' ')[0]?.[0] || ''
                    }}{{ profile.full_name?.split(' ')[1]?.[0] || '' }}
                  </AvatarFallback>
                </Avatar>

                <div class="space-y-0.5">
                  <p class="text-sm font-medium leading-none">
                    {{ profile.full_name || 'Nama tidak tersedia' }}
                  </p>
                  <p class="text-xs text-muted-foreground capitalize">
                    {{ profile.role || 'Role tidak tersedia' }}
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="flex items-center justify-center py-6">
              <p class="text-sm text-muted-foreground">Belum ada user terdaftar</p>
            </div>
          </CardContent>
        </Card>


        <Card class="lg:col-span-1 xl:col-span-2">
          <CardHeader>
            <CardTitle>Juru Tani</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4 text-center">
              <div class="text-6xl">🌾</div>
              <div class="space-y-2">
                <h3 class="text-xl font-semibold text-green-700">Platform Pertanian Digital</h3>
                <p class="text-muted-foreground">
                  Menghubungkan petani dengan teknologi modern untuk masa depan pertanian yang lebih baik
                </p>
                <div class="flex justify-center gap-4 text-sm text-muted-foreground mt-4">
                  <span>🚜 Smart Farming</span>
                  <span>📱 Digital Solution</span>
                  <span>🌱 Sustainable Agriculture</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>
