<script setup lang="ts">
import { ChevronUp, Settings, Palette, LogOut } from 'lucide-vue-next'
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useSidebar } from '~/components/ui/sidebar'

// Remove props, use auth instead
const { user, profile, logout } = useAuth()

const { isMobile, setOpenMobile } = useSidebar()

// Computed user data from auth
const userData = computed(() => {
  if (!user.value || !profile.value) return null
  
  return {
    name: profile.value.full_name || profile.value.username || 'Admin',
    email: user.value.email || profile.value.email || '',
    avatar: profile.value.avatar_url || '',
    initials: (profile.value.full_name || profile.value.username || 'A')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }
})

async function handleLogout() {
  await logout()
}

const showModalTheme = ref(false)
</script>

<template>
  <SidebarMenu v-if="userData">
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="h-8 w-8 rounded-lg">
              <AvatarImage 
                v-if="userData.avatar" 
                :src="userData.avatar" 
                :alt="userData.name" 
              />
              <AvatarFallback class="rounded-lg">
                {{ userData.initials }}
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">{{ userData.name }}</span>
              <span class="truncate text-xs text-muted-foreground">{{ userData.email }}</span>
            </div>
            <ChevronUp class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="min-w-56 w-[--radix-dropdown-menu-trigger-width] rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="h-8 w-8 rounded-lg">
                <AvatarImage 
                  v-if="userData.avatar" 
                  :src="userData.avatar" 
                  :alt="userData.name" 
                />
                <AvatarFallback class="rounded-lg">
                  {{ userData.initials }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ userData.name }}</span>
                <span class="truncate text-xs text-muted-foreground">{{ userData.email }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem as-child>
              <NuxtLink to="/settings" @click="setOpenMobile(false)">
                <Settings class="mr-2 h-4 w-4" />
                Settings
              </NuxtLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="showModalTheme = true">
              <Palette class="mr-2 h-4 w-4" />
              Theme
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout">
            <LogOut class="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>

  <!-- Loading state -->
  <SidebarMenu v-else>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" disabled>
        <div class="h-8 w-8 rounded-lg bg-muted animate-pulse" />
        <div class="grid flex-1 text-left text-sm leading-tight">
          <div class="h-4 bg-muted rounded animate-pulse mb-1" />
          <div class="h-3 bg-muted rounded animate-pulse w-3/4" />
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>

  <!-- Theme Modal -->
  <Dialog v-model:open="showModalTheme">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Customize Theme</DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground">
          Customize & Preview in Real Time
        </DialogDescription>
      </DialogHeader>
      <ThemeCustomize />
    </DialogContent>
  </Dialog>
</template>