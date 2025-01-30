import { useState } from 'react'
import Home from './components/users/Home'
import Login from './components/users/Login'
import Session from './components/users/Session'
import Welcome from './components/users/Welcome'
import Share from './components/dashboard/Share'
import Qrcode from './components/users/Qrcode'
import Live from './components/dashboard/Live'
import HostLogin from './components/dashboard/HostLogin'
import './styles/host.css'
import './styles/user.css'
//import Messages from './components/dashboard/Messages'
import {Routes,Route} from "react-router-dom"
function App() {
  

  return (
    <>
    <div className="container">
     <Routes>
      <Route path="/" element={<Home></Home>}></Route>
      <Route path="/login" element={<Login></Login>}></Route>
      <Route path="/session" element={<Session></Session>}></Route>
      <Route path="/welcome" element={<Welcome></Welcome>}></Route>
      <Route path="/Qrcode" element={<Qrcode></Qrcode>}></Route>
      <Route path="/share" element={<Share></Share>}></Route>
      <Route path="/live" element={<Live></Live>}></Route>
      <Route path="/HostLogin" element={<HostLogin></HostLogin>}></Route>
     </Routes>
     </div>
    </>
  )
}

export default App
