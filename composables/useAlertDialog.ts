// composables/useAlertDialog.ts
export interface AlertDialogOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}

export const useAlertDialog = () => {
  const isOpen = ref(false)
  const isLoading = ref(false)
  const alertOptions = ref<AlertDialogOptions>({
    title: '',
    confirmText: 'Ya',
    cancelText: 'Batal',
    type: 'info',
  })

  const openAlert = (options: AlertDialogOptions) => {
    alertOptions.value = {
      confirmText: 'Ya',
      cancelText: 'Batal',
      type: 'info',
      ...options,
    }
    isOpen.value = true
  }

  const closeAlert = () => {
    isOpen.value = false
    isLoading.value = false
    // Reset options after animation
    setTimeout(() => {
      alertOptions.value = {
        title: '',
        confirmText: 'Ya',
        cancelText: 'Batal',
        type: 'info',
      }
    }, 300)
  }

  const handleConfirm = async () => {
    if (alertOptions.value.onConfirm) {
      try {
        isLoading.value = true
        await alertOptions.value.onConfirm()
      }
      finally {
        isLoading.value = false
      }
    }
    closeAlert()
  }

  const handleCancel = () => {
    if (alertOptions.value.onCancel) {
      alertOptions.value.onCancel()
    }
    closeAlert()
  }

  return {
    isOpen: readonly(isOpen),
    isLoading: readonly(isLoading),
    alertOptions: readonly(alertOptions),
    openAlert,
    closeAlert,
    handleConfirm,
    handleCancel,
  }
}
