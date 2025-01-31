


import clublogo from "../../assets/club-logo.png"; 
import screensharelogo from "../../assets/screenshare-logo.png"; 
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types'

import styles from '../../styles/Live.module.css';

import QRCode from 'qrcode';
import { WebRTCConnection } from "../../utils.js";

let stream

function SessionControl({session, tools}){

    const [qrcode, setQRCode] = useState(null)

    console.log(session)

    useEffect(() => {
        QRCode.toDataURL(`sreenshare.net/${session.slug}`, {width : 200})
        .then(dataUrl => setQRCode(dataUrl))
        .catch(err => tools.setToast({msg : err, type : 'error'}))
        
      }, [session, tools])


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
    }, [session, tools])

    const endSession = async () => {
        if(stream){
            stream.getTracks().forEach(track => track.stop())
        }
    }

    return( 
    <>
        <div className="header">
            <div className="screen-share-title"><img src={screensharelogo} />SCREEN SHARE</div>
            <img className="club-logo" src={clublogo}/>
        </div>
        <div className={styles.controls}>
            <h2 className={styles.head}> <div className={`${styles.livebubble} ${styles.active}`}></div>En cours...</h2>
            <div className={styles.btns}>
                <button onClick={endSession}>Arreter</button>
                <button onClick={startSession}>Commencer</button>
            </div>
            <img className={styles.qrcode} src={qrcode}/>
        </div>
        <div className={styles.footer}>
            <h2>Participants</h2>
            <div className={styles.viewers}>
                <div className={styles.viewer}>
                    <div className={styles.profile}></div>
                    <span className={styles.livebubble}></span>
                    <div className={styles.name}>Franck</div>
                </div>
                <div className={styles.viewer}>
                    <div className={styles.profile}></div>
                    <span className={styles.livebubble}></span>
                    <div className={styles.name}>Franck</div>
                </div>
                <div className={styles.viewer}>
                    <div className={styles.profile}></div>
                    <span className={styles.livebubble}></span>
                    <div className={styles.name}>Franck</div>
                </div>
            </div>
        </div>
    </>)
}

SessionControl.propTypes = {
    tools : PropTypes.object.isRequired,
    session : PropTypes.object.isRequired

}
export default SessionControl