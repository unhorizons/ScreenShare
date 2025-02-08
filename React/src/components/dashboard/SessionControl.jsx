


import clublogo from "../../assets/club-logo.png"; 
import screensharelogo from "../../assets/screenshare-logo.png"; 
import screenshareicon from "../../assets/club-icon.png"; 
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types'

import styles from '../../styles/SessionControl.module.css';

// import QRCode from 'qrcode';
import { QRCodeCanvas } from "qrcode.react";
import { utils, WebRTCConnection } from "../../utils.js";

let stream

function SessionControl({session, tools}){

    const [qrcodeurls, setQRCodeUrl] = useState('')
    const [loading, setLoading] = useState(true)

    let viewers = null
    if(session.users){
        viewers = session.users.map(viewer =>
            <div key={viewer.id} className={styles.viewer}>
                <div className={styles.profile}>{viewer.username[0]}</div>
                
                {viewer._viewing && <span className={`${styles.livebubble} ${styles.viewing}`}></span>}
                {!viewer._viewing && <span className={styles.livebubble}></span>}

                <div className={styles.name}>{viewer.username}</div>
            </div>
        )
    }

    useEffect(() => {
        if(loading && session.slug){

            setQRCodeUrl(`${utils.apiurl}/live/${session.slug}`)

            const eventSource = new EventSource(`${utils.apiurl}/sessions/${session.slug}/events?token=${utils.token}`);

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                tools.updateSession({session:data})
            };
            setLoading(false)

            // return () => eventSource.close(); // Cleanup on unmount
        }
        
        
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [session])


    const startSession = useCallback(async () => {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } })
        
        const connection = new WebRTCConnection({
            session : session.id,
            type : 'broadcaster',
            stream : stream
        })

        stream.getVideoTracks()[0].addEventListener('ended', async () => {
            try{
                const result = await connection.close()
                tools.setToast(result)
            }catch (err){
                if(err.response.data)
                    tools.setToast({msg : err.response.data.detail, type : 'error'})
                else
                    tools.setToast(err)
            }
        })
        connection.open()
        await tools.updateSession({})
    }, [session, tools])

    const endSession = async () => {
        if(stream){
            stream.getTracks().forEach(track => track.stop())
        }
        await tools.updateSession({})
    }

    if(loading)
        return(<div className="screen-share-title"><img src={screensharelogo}/>Loading...</div>)

    return( 
    <>
        <div className="header">
            <div className="screen-share-title"><img src={screensharelogo} />SCREEN SHARE</div>
            <img className="club-logo" src={clublogo}/>
        </div>
        <div className={styles.controls}>
            
            {session.active && <h2 className={styles.head}> <div className={`${styles.livebubble} ${styles.active}`}></div>En cours...</h2>}
            {!session.active && <h2 className={styles.head}> <div className={`${styles.livebubble}`}></div>Deconnecté</h2>}

            <div className={styles.btns}>
                <button disabled onClick={endSession}>Arreter</button>
                <button onClick={startSession}>Commencer</button>
            </div>
            <div className={styles.qrcode}>

                <div className={styles.img}>
                    <img src={screenshareicon}/>
                    <QRCodeCanvas value={qrcodeurls} size={200} />    
                </div>
                
                <div>{qrcodeurls}</div>
            </div>
        </div>
        <div className={styles.footer}>
            <h2>Participants</h2>
            <div className={styles.viewers}>
                {viewers}
            </div>
        </div>
    </>)
}

SessionControl.propTypes = {
    tools : PropTypes.object.isRequired,
    session : PropTypes.object.isRequired

}
export default SessionControl