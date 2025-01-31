// import { useState } from 'react'
import Home from './components/Home'
import Live from './components/users/Live'
import AddSession from './components/dashboard/AddSession'
import UserLogin from './components/users/UserLogin.jsx'
import Share from './components/dashboard/Share'
import Qrcode from './components/users/Qrcode'
import SessionControl from './components/dashboard/SessionControl'
import HostLogin from './components/dashboard/HostLogin'

import {Routes,Route} from "react-router-dom"
import { useEffect, useState } from 'react'

import Toast from "./components/Toast.jsx"
import { utils } from './utils'


class Tools{
    constructor({setToast, setSession}){
        this.setToast = setToast
        this.setSession = setSession
    }
    async updateSession({session_id = undefined, session = undefined}){
        if(session){
            utils.sessionID = session.id
            this.setSession(session)
            return
        }
        if(session_id == undefined ){
            session_id = utils.sessionID
        }
        try{
            const { data } = await utils.api.get(`/sessions/${session_id}`)
            if(data.id != undefined){
                utils.sessionID = data.id
                this.setSession(data)
            } else {
                this.setToast({msg : 'No session received', type : 'error'})
            }
        }catch (err){
            if(err.response.data)
                this.setToast({msg : err.response.data.detail, type : 'error'})
            else
                this.setToast({msg : 'Something went wrong', type : 'error'})
        }
    }
    updateToken(token){
        utils.token = token
    }
}

function App() {
    
    const [toast, setToast] = useState(null)
    const [session, setSession] = useState({})
    
    const tools = new Tools({setToast, setSession})

    useEffect(() => {
        const entries = performance.getEntriesByType("navigation")
        if(entries[0]?.type === "reload"){
            tools.updateSession({})
        }
    }, [])

    return (
        <>
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        <Routes>
        <Route path="/" element={<Home></Home>}></Route>
        <Route path="/HostLogin" element={<HostLogin tools={tools}></HostLogin>}></Route>
        <Route path="/add-session" element={<AddSession tools={tools}></AddSession>}></Route>
        <Route path="/session-control" element={<SessionControl session={session} tools={tools}></SessionControl>}></Route>
        <Route path="/live" element={<Live session={session} tools={tools}></Live>}></Route>
        <Route path="/:session_id" element={<UserLogin tools={tools}></UserLogin>}></Route>

        <Route path="/Qrcode" element={<Qrcode></Qrcode>}></Route>
        <Route path="/share" element={<Share></Share>}></Route>
        </Routes>
        </>
    )
}

export default App
