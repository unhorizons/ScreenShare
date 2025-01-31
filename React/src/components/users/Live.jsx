// import clublogo from "../../assets/club-logo.png"; 
import screensharelogo from "../../assets/screenshare-logo.png"; 

import { useEffect, useState } from 'react';

import PropTypes from "prop-types"
import { utils } from "../../utils";

import styles from '../../styles/Live.module.css';

function Live({session/*, tools*/}){
    const [ loading, setLoading ] = useState(true) 

 
    useEffect(() => {
        const joinSession = async () => {
            if(session.id != undefined){
                const connection = new utils.WebRTCConnection({
                    session : session.slug,
                    type : 'viewer',
                })
                await connection.open()
                setLoading(false)
            }
        }
        joinSession()
    }, [session])
   

    if(loading){
        return (
            <>
            <div className="screen-share-title"><img src={screensharelogo}/>Loading...</div>
            </>
        )
    }

    return(
        <>
            <div className="screen-share-title"><img src={screensharelogo}/>SCREEN SHARE</div>
            <video autoPlay controls className={styles.video} id="video"></video>
        </>
    )
}

Live.propTypes = {
    // tools : PropTypes.object.isRequired,
    session : PropTypes.object.isRequired
}


export default Live