import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: 'General',
    items: [
      {
        title: 'Home',
        icon: 'i-lucide-home',
        link: '/',
      },
      {
        title: 'News',
        icon: 'i-lucide-newspaper',
        link: '/news',
      },
      {
        title: 'Markets',
        icon: 'i-lucide-bar-chart-2',
        link: '/markets',
      },
      {
        title: 'Chat',
        icon: 'i-lucide-message-circle',
        link: '/chat',
      },
    ],
  },
  {
    heading: 'Resources',
    items: [
      {
        title: 'Meetings',
        icon: 'i-lucide-users-round',
        link: '/resources/meetings',
      },
      {
        title: 'Videos',
        icon: 'i-lucide-video',
        link: '/resources/videos',
      },
      {
        title: 'Courses',
        icon: 'i-lucide-book-open',
        link: '/resources/courses',
      },
    ],
  },
  {
    heading: 'Users',
    items: [
      {
        title: 'Petani',
        icon: 'i-lucide-users-round',
        link: '/users',
      },
      {
        title: 'Penyuluh',
        icon: 'i-lucide-megaphone',
        link: '/users/instructors',
      },
      {
        title: 'Pakar',
        icon: 'i-lucide-graduation-cap',
        link: '/users/experts',
      },
    ],
  },
  {
    heading: 'Admin',
    items: [
      {
        title: 'Dashboard',
        icon: 'i-lucide-grid',
        link: '/dashboard',
      },
      {
        title: 'Enum',
        icon: 'i-lucide-list-check',
        link: '/enum',
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = [
  {
    title: 'Help & Support',
    icon: 'i-lucide-circle-help',
    link: 'https://github.com/IlhamKurniawanBlora',
  },
  {
    title: 'Feedback',
    icon: 'i-lucide-send',
    link: 'https://github.com/IlhamKurniawanBlora',
  },
]
