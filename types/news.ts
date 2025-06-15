export interface News {
  id: string
  title: string
  sub_title?: string
  content?: string
  category: string
  link?: string
  status_news: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  published_at?: string
  deleted_at?: string
  user_id: string
  image_url?: string
  attachment_url?: string
}

export interface Category {
  name: string
  value: string
}

export interface NewsFormData {
  title: string
  sub_title: string
  content: string
  category: string
  link: string
  status_news: string
  image_file: File | null
  attachment_file: File | null
}