// composables/useDialog.ts
export interface DialogOptions {
  title: string
  description?: string
  content?: any
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const useDialog = () => {
  const isOpen = ref(false)
  const dialogOptions = ref<DialogOptions>({
    title: '',
    size: 'md',
  })

  const openDialog = (options: DialogOptions) => {
    dialogOptions.value = {
      size: 'md',
      ...options,
    }
    isOpen.value = true
  }

  const closeDialog = () => {
    isOpen.value = false
    // Reset options after animation
    setTimeout(() => {
      dialogOptions.value = {
        title: '',
        size: 'md',
      }
    }, 300)
  }

  return {
    isOpen: readonly(isOpen),
    dialogOptions: readonly(dialogOptions),
    openDialog,
    closeDialog,
  }
}
