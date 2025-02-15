import { useNavigate } from "react-router-dom";
// import { useState } from 'react';
import PropTypes from 'prop-types'

import clublogo from "../../assets/club-logo.png"; 
import screensharelogo from "../../assets/screenshare-logo.png"; 

import {api} from "../../utils.js"
// import Toast from "../Toast.jsx"
 
function AddSession({tools}){

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
            const { data } = await api.post('/sessions', formobject)
            if(data != undefined){
                await tools.updateSession({
                    session : data
                })
                navigate("/session-control"); 
            } else {
                tools.setToast({ msg: "No session data received", type: "error" })
            }
        }catch (err){
            if(err.response.data)
                tools.setToast({ msg: err.response.data.detail, type: "error" })
            else
                tools.setToast({ msg: "Something went wrong", type: "error" })
        }
    };

    return (
        <>
        <div className="header">
            <div className="screen-share-title"><img src={screensharelogo} />SCREEN SHARE</div>
            <img className="club-logo" src={clublogo}/>
        </div>

        <section className="template new-session">
            <h2>Nouvelle session</h2>
            <form className="container" onSubmit={handleSubmit}>
                <div className="input-box">
                    <label>Entrez le nom de la session</label>
                    <input type="text" name="name" id="name" required></input>
                </div>
                <button type="submit">Go</button>
            </form>
        </section>
        </>
    )
}

AddSession.propTypes = {
    tools : PropTypes.object.isRequired
}

export default AddSession