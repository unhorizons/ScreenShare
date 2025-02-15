// import clublogo from "../../assets/club-logo.png"; 
import screensharelogo from "../../assets/screenshare-logo.png"; 

import { useEffect, useState } from 'react';

import PropTypes from "prop-types"
import { utils } from "../../utils";

import styles from '../../styles/Live.module.css';

function Live({session, tools}){
    const [ loading, setLoading ] = useState(true) 

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                utils.api.patch('/users', {viewing : false})
            } else {
                utils.api.patch('/users', {viewing : true})
            }
        }
    
        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, []);
 
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
        if(session.active){   
            joinSession()
        }else{
            if(session.id != undefined){
                const eventSource = new EventSource(`${utils.apiurl}/sessions/${session.slug}/started-events?token=${utils.token}`);
    
                eventSource.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    tools.updateSession({session:data})
                    joinSession()
                    eventSource.close()
                };
            }
        }
        // return () => eventSource.close(); // Cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session])
   

    if(loading){
        return (
            <>
            <div className="screen-share-title"><img src={screensharelogo}/>Please wait...</div>
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
    tools : PropTypes.object.isRequired,
    session : PropTypes.object.isRequired
}


export default Live