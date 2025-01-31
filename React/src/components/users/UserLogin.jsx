

import clublogo from "../../assets/club-logo.png"; 
import screensharelogo from "../../assets/screenshare-logo.png"; 

import { /*useState,*/ useEffect, useCallback, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types"
import { utils } from "../../utils";

function UserLogin({tools}){
    const navigate = useNavigate()
    const { session_id } = useParams()
    const [ loading, setLoading ] = useState(true) 

    useEffect(() => {
        const updateSession = async () => {
            await tools.updateSession({session_id})
            setLoading(false)
        }
        updateSession()
    }, [session_id])

    const login = useCallback(async (event) => {
        event.preventDefault(); 

        const formdata = new FormData(event.target);
        const formobject = {};

        // Convert FormData to a plain JavaScript object
        formdata.forEach((value, key) => {
            formobject[key] = value;
        });

        try{
            const { data } = await utils.api.post('/users', formobject)
            if (data.token) {
                tools.updateToken(data.token)
                navigate("/live");
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
    }, [])

    if(loading){
        return (
            <>
            <div className="screen-share-title"><img src={screensharelogo}/> Loading...</div>
            </>
        )
    }
    return(

        <>
        <div className="header">
            <div className="screen-share-title"><img src={screensharelogo} />SCREEN SHARE</div>
            <img className="club-logo" src={clublogo}/>
        </div>

        <section className="template">
            <h2>Bienvenue sur screenshare</h2>
            <form className="container" onSubmit={login}>
                <div className="input-box">
                    <label>Entrez un pseudo</label>
                    <input type="text" name="username" id="username"></input>
                </div>
                <button type="submit">Go</button>
            </form>
        </section>
        </>
    )
}

UserLogin.propTypes = {
    tools : PropTypes.object.isRequired

}

export default UserLogin