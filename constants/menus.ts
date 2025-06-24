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
    ],
  },
  {
    heading: 'Discussions',
    items: [
      {
        title: 'Forum',
        icon: 'i-lucide-message-square',
        link: '/forum',
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
      {
        title: 'Users',
        icon: 'i-lucide-users',
        new: true,
        children: [
          {
            title: 'Petani',
            icon: 'i-lucide-circle',
            link: '/users',
          },
          {
            title: 'Pakar',
            icon: 'i-lucide-circle',
            link: '/users/experts',
          },
          {
            title: 'Penyuluh',
            icon: 'i-lucide-circle',
            link: '/users/instructors',
          },
        ],
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
