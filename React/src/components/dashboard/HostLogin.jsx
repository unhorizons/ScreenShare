import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types"

import '../../styles/HostLogin.module.css';
import clublogo from "../../assets/club-logo.png"; 
import screensharelogo from "../../assets/screenshare-logo.png"; 
// import { useState } from 'react';

import {api} from "../../utils.js"

// import Toast from "../Toast.jsx"

const HostLogin = ({tools}) => {
    // logique a supprime une fois le backend sera fait
    const navigate = useNavigate()
    // const [toast, setToast] = useState(null)

    const handleSubmit = async (event) => {
        event.preventDefault(); 

        const formdata = new FormData(event.target);
        const formobject = {};

        // Convert FormData to a plain JavaScript object
        formdata.forEach((value, key) => {
            formobject[key] = value;
        });

        try{
            const { data } = await api.post('/users/host-login', formobject)
            if (data.token) {
                tools.updateToken(data.token)
                navigate("/add-session"); 
            } else {
                tools.setToast({ msg: "Login failed : no token received", type: "error" })
            }
        }catch (err){
            console.error(err)
            if(err.response && err.response.data)
                tools.setToast({ msg: err.response.data.detail, type: "error" })
            else
                tools.setToast({ msg: "Something went wrong", type: "error" })
        }

    }

    return(
        <>
        {/* {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />} */}

        <div className="header">
            <div className="screen-share-title"><img src={screensharelogo} />SCREEN SHARE</div>
            <img className="club-logo" src={clublogo}/>
        </div>
        
        <div className="container">

            <h1>Connexion</h1>
            <form id="host-form" onSubmit={handleSubmit}>
                <div className="input-box">
                    <label htmlFor="username">Nom</label>
                    <input type="text" name="username" id="username" required></input>
                </div>
                <div className="input-box">
                    <label htmlFor="code">Code d&apos;access</label>
                    <input type="text" name="code" id="code" required></input>
                </div>
                <button type="submit">Go</button>
            </form>
        </div>

        </>
    )
}

HostLogin.propTypes = {
    tools : PropTypes.object.isRequired
}

export default HostLogin