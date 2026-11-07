import { createElement } from 'react'
import { toast } from 'react-toastify'
import ErrorToast from '../src/component/ErrorToast.jsx'
import DeleteConfirmationToast from '../src/component/DeleteConfirmationToast.jsx'

export function showErrorToast(message, title = 'Something went wrong') {
  if (typeof message !== 'string' || !message.trim()) return

  toast.error(
    createElement(ErrorToast, { title, message: message.trim() }),
    { toastId: `error-${title}-${message.trim()}` },
  )
}

export function showDeleteConfirmation(title, onConfirm) {
  const backdrop = document.createElement('div')
  backdrop.className = 'delete-confirmation-backdrop'
  backdrop.setAttribute('aria-hidden', 'true')
  document.body.append(backdrop)

  const removeBackdrop = () => backdrop.remove()

  toast(
    ({ closeToast }) => createElement(DeleteConfirmationToast, {
      title,
      onConfirm: () => {
        removeBackdrop()
        closeToast()
        onConfirm()
      },
      onCancel: () => {
        removeBackdrop()
        closeToast()
      },
    }),
    {
      toastId: `delete-conversation-${title}`,
      position: 'top-center',
      type: 'error',
      autoClose: false,
      closeOnClick: false,
      closeButton: false,
      draggable: false,
      onClose: removeBackdrop,
    },
  )
}
