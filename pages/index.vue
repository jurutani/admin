<script setup lang="ts">
import {
  BookOpen,
  MessageCircle,
  Newspaper,
  TrendingUp,
  Users,
  Video,
  User,
  LogOut,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/composables/useAuth'

// Middleware untuk admin
definePageMeta({
  middleware: 'admin'
})

// Auth composable
const { user, profile, logout } = useAuth()

interface DashboardItem {
  id: number
  title: string
  description: string
  route: string
  buttonText: string
  icon: any
}

const dashboardItems: DashboardItem[] = [
  {
    id: 1,
    title: 'Chat',
    description: 'Lihat chat dari user',
    route: '/chat',
    buttonText: 'Selengkapnya',
    icon: MessageCircle,
  },
  {
    id: 2,
    title: 'Markets',
    description: 'Lihat Produk user',
    route: '/markets',
    buttonText: 'Selengkapnya',
    icon: TrendingUp,
  },
  {
    id: 3,
    title: 'News',
    description: 'Lihat berita terbaru',
    route: '/news',
    buttonText: 'Selengkapnya',
    icon: Newspaper,
  },
  {
    id: 4,
    title: 'Meetings',
    description: 'Lihat Pertemuan terbaru',
    route: '/resources/meetings',
    buttonText: 'Selengkapnya',
    icon: Users,
  },
  {
    id: 5,
    title: 'Videos',
    description: 'Lihat video terbaru',
    route: '/resources/videos',
    buttonText: 'Selengkapnya',
    icon: Video,
  },
  {
    id: 6,
    title: 'Courses',
    description: 'Kursus trading lengkap',
    route: '/resources/courses',
    buttonText: 'Selengkapnya',
    icon: BookOpen,
  },
]

async function handleLogout() {
  await logout()
}
</script>

<template>
  <div class="container mx-auto p-6">
    <!-- Header with user info -->
    <div class="mb-8 flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-bold">Dashboard Jurutani</h1>
        <p class="text-muted-foreground">Platform pembelajaran dan trading</p>
      </div>
      
      <!-- User info and logout -->
      <div class="flex items-center gap-4">
        <div class="text-right">
          <p class="text-sm font-medium">{{ profile?.full_name || profile?.username || 'Admin' }}</p>
          <p class="text-xs text-muted-foreground">{{ user?.email }}</p>
        </div>
        <Button @click="handleLogout" variant="outline" size="sm">
          <LogOut class="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>

    <!-- Dashboard Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <Card v-for="item in dashboardItems" :key="item.id" class="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <component :is="item.icon" class="h-5 w-5" />
            {{ item.title }}
          </CardTitle>
          <CardDescription>
            {{ item.description }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild class="w-full">
            <NuxtLink :to="item.route">
              {{ item.buttonText }}
            </NuxtLink>
          </Button>
        </CardContent>
      </Card>
    </div>

    <!-- User Data Display -->
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <User class="h-5 w-5" />
            User Data
          </CardTitle>
          <CardDescription>
            Current authenticated user information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div>
              <h3 class="font-semibold text-sm text-muted-foreground mb-2">Auth User Data:</h3>
              <pre class="bg-muted p-4 rounded-lg text-sm overflow-auto">{{ JSON.stringify(user, null, 2) }}</pre>
            </div>
            
            <div>
              <h3 class="font-semibold text-sm text-muted-foreground mb-2">Profile Data:</h3>
              <pre class="bg-muted p-4 rounded-lg text-sm overflow-auto">{{ JSON.stringify(profile, null, 2) }}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>