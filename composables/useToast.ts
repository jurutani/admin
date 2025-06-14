// composables/useToast.ts
export interface ToastOptions {
  title: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export const useToast = () => {
  const toasts = ref<(ToastOptions & { id: string })[]>([])

  const showToast = (options: ToastOptions) => {
    const id = Date.now().toString()
    const toast = {
      id,
      ...options,
      duration: options.duration || 3000
    }

    toasts.value.push(toast)

    // Auto remove toast after duration
    setTimeout(() => {
      removeToast(id)
    }, toast.duration)
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts: readonly(toasts),
    showToast,
    removeToast
  }
}