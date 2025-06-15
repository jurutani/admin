<script setup lang="ts">
import {
  MessageCircle,
  TrendingUp,
  Newspaper,
  BookOpen,
  Video,
  GraduationCap 
} from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
    title: 'Books',
    description: 'Lihat koleksi buku',
    route: '/resources/books',
    buttonText: 'Selengkapnya',
    icon: BookOpen,
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
    icon: GraduationCap,
  }
]
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold">Dashboard Jurutani</h1>
      <p class="text-muted-foreground">Platform pembelajaran dan trading</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  </div>
</template>
