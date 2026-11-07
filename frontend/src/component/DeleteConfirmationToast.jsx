function DeleteConfirmationToast({ title, onConfirm, onCancel }) {
  return (
    <div className="delete-confirmation-toast" role="alertdialog" aria-label="Confirm conversation deletion">
      <span className="error-toast-icon" aria-hidden="true">!</span>
      <span className="delete-confirmation-copy">
        <strong>Delete this conversation?</strong>
        <span>“{title}” and its chat will be permanently deleted.</span>
        <span className="delete-confirmation-actions">
          <button type="button" className="delete-confirmation-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="delete-confirmation-confirm" onClick={onConfirm}>
            Delete
          </button>
        </span>
      </span>
    </div>
  )
}

export default DeleteConfirmationToast
