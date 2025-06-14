<script setup lang="ts">
import { Eye, MoreHorizontal, Shield, UserCheck, Users2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'

const supabase = useSupabaseClient()

// Reactive states
const activeTab = ref('expert')
const refreshKey = ref(0)
const detailDialogOpen = ref(false)
const selectedUser = ref<any>(null)

// Date range filtering
const dateRange = ref<DateRange | null>(null)

const filterStartDate = computed(() => {
  if (!dateRange.value?.start) 
    return null
  return dateRange.value.start.toDate('UTC').toISOString()
})

const filterEndDate = computed(() => {
  if (!dateRange.value?.end)
    return null
  return dateRange.value.end.toDate('UTC').toISOString()
})

// Fetch experts data
const { data: experts, pending: expertsPending, error: expertsError, refresh: refreshExperts } = await useAsyncData(
  `experts-${refreshKey.value}`,
  async () => {
    let query = supabase
      .from('experts')
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

// Fetch instructors data
const { data: instructors, pending: instructorsPending, error: instructorsError, refresh: refreshInstructors } = await useAsyncData(
  `instructors-${refreshKey.value}`,
  async () => {
    let query = supabase
      .from('instructors')
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

// Functions
function refreshAllData() {
  refreshKey.value++
}

function handleDateRangeChange(newRange: DateRange | null) {
  dateRange.value = newRange
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function updateUserStatus(userId: string, status: 'active' | 'inactive' | 'pending') {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      throw error
    }

    // Update local data
    const updateInList = (list: any[]) => {
      const userIndex = list.findIndex(user => user.id === userId)
      if (userIndex !== -1) {
        list[userIndex].status = status
      }
    }

    if (experts.value) {
      updateInList(experts.value)
    }
    if (instructors.value)
      updateInList(instructors.value)

    toast({
      title: 'Status diperbarui',
      description: `Status user telah diubah menjadi "${status}"`,
    })
  }
  catch (error) {
    console.error('Error updating user status:', error)
    toast({
      title: 'Error',
      description: 'Gagal memperbarui status user',
      variant: 'destructive',
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Expert Aktif
          </CardTitle>
          <UserCheck class="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-green-600">
            {{ "1" }}
          </div>
          <p class="text-xs text-muted-foreground">
            Siap memberikan konsultasi
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Instructor Aktif</CardTitle>
          <UserCheck class="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-blue-600">
            {{ "1" }}
          </div>
          <p class="text-xs text-muted-foreground">
            Siap mengajar petani
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Tabs Content -->
    <Tabs v-model="activeTab" class="space-y-4">
      <div class="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="expert">
            <Shield class="h-4 w-4 mr-2" />
            Expert ({{ "2" }})
          </TabsTrigger>
          <TabsTrigger value="instructor">
            <Users2 class="h-4 w-4 mr-2" />
            Instructor ({{ "2" }})
          </TabsTrigger>
        </TabsList>

        <div class="flex gap-2">
          <Button
            v-if="activeTab === 'expert'"
            @click="$router.push('/')"
          >
            + Tambah Expert
          </Button>
          <Button
            v-else
            @click="$router.push('/')"
          >
            + Tambah Instructor
          </Button>
        </div>
      </div>

      <!-- Expert Tab -->
      <TabsContent value="expert" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Expert</CardTitle>
            <CardDescription>Kelola expert yang memberikan konsultasi kepada petani</CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="expertsPending" class="flex items-center justify-center p-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span class="ml-2">Memuat data expert...</span>
            </div>

            <div v-else-if="expertsError" class="p-4 bg-red-50 border border-red-200 rounded-md">
              <p class="text-red-600">Terjadi kesalahan saat memuat data expert</p>
            </div>

            <div v-else class="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="w-[200px]">Expert</TableHead>
                    <TableHead>Spesialisasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead class="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-if="'0' === 0">
                    <TableCell colspan="6" class="text-center text-muted-foreground py-8">
                      Belum ada expert terdaftar
                    </TableCell>
                  </TableRow>
                  <TableRow v-for="expert in experts" :key="expert.id">
                    <TableCell>
                      <div class="flex items-center gap-3">
                        <Avatar class="h-10 w-10">
                          <AvatarImage />
                          <AvatarFallback>{{ 'nama' }}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div class="font-medium">{{ expert.full_name }}</div>
                          <div class="text-sm text-muted-foreground">{{ expert.email }}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div class="text-sm">
                        {{ expert.note || 'Belum ditentukan' }}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        :value="expert.status"
                        @update:value="(v: string) => updateUserStatus(expert.id, v as 'active' | 'inactive' | 'pending')"
                      >
                        <SelectTrigger class="w-32">
                          <SelectValue>
                            <Badge variant="default">
                              {{ expert.status }}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <Badge variant="default">
                              active
                            </Badge>
                          </SelectItem>
                          <SelectItem value="pending">
                            <Badge variant="secondary">
                              pending
                            </Badge>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <Badge variant="destructive">
                              inactive
                            </Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{{ formatDate(expert.created_at) }}</TableCell>
                    <TableCell class="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                          <Button variant="default" size="icon">
                            <MoreHorizontal class="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem class="flex cursor-pointer items-center gap-2">
                            <Eye class="h-4 w-4" />
                            Lihat Detail
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Instructor Tab -->
      <TabsContent value="instructor" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Instructor</CardTitle>
            <CardDescription>Kelola instructor yang mengajar dan melatih petani</CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="instructorsPending" class="flex items-center justify-center p-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span class="ml-2">Memuat data instructor...</span>
            </div>

            <div v-else-if="instructorsError" class="p-4 bg-red-50 border border-red-200 rounded-md">
              <p class="text-red-600">Terjadi kesalahan saat memuat data instructor</p>
            </div>

            <div v-else class="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="w-[200px]">Instructor</TableHead>
                    <TableHead>Spesialisasi</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead class="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-if="!instructors || instructors.length === 0">
                    <TableCell colspan="6" class="text-center text-muted-foreground py-8">
                      Belum ada instructor terdaftar
                    </TableCell>
                  </TableRow>
                  <TableRow v-for="instructor in instructors" :key="instructor.id">
                    <TableCell>
                      <div class="flex items-center gap-3">
                        <Avatar class="h-10 w-10">
                          <AvatarFallback>{{ '1' }}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div class="font-medium">{{ '1' }}</div>
                          <div class="text-sm text-muted-foreground">{{ '1' }}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div class="text-sm">
                        {{ '1' }}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select>
                        <SelectTrigger class="w-32">
                          <SelectValue>
                            <Badge variant="default">
                              1
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <Badge variant="default">active</Badge>
                          </SelectItem>
                          <SelectItem value="pending">
                            <Badge variant="secondary">pending</Badge>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <Badge variant="destructive">inactive</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{{ formatDate(instructor.created_at) }}</TableCell>
                    <TableCell class="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                          <Button variant="default" size="icon">
                            <MoreHorizontal class="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem class="flex cursor-pointer items-center gap-2">
                            <Eye class="h-4 w-4" />
                            Lihat Detail
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
