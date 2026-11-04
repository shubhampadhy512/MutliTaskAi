
import Home from './component/Home.jsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './style/Toast.css'

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3600}
        closeOnClick
        pauseOnHover
        newestOnTop
        theme="dark"
        icon={false}
      />
      <Home />
    </>
  )
}

export default App
