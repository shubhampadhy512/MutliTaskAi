function ErrorToast({ title, message }) {
  return (
    <div className="error-toast" role="alert">
      <span className="error-toast-icon" aria-hidden="true">!</span>
      <span className="error-toast-copy">
        <strong>{title}</strong>
        <span>{message}</span>
      </span>
    </div>
  )
}

export default ErrorToast
