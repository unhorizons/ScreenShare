// import clublogo from "../../assets/club-logo.png";
import screensharelogo from "../../assets/screenshare-logo.png";

import { useEffect, useState } from "react";

import PropTypes from "prop-types";
import { createWebSocket, utils } from "../../utils";

import styles from "../../styles/Live.module.css";

function Live({ session }) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                utils.api.patch("/users", { viewing: false });
            } else {
                utils.api.patch("/users", { viewing: true });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () =>
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
    }, []);

    useEffect(() => {
        const joinSession = async () => {
            if (session.id != undefined) {
                const connection = new utils.WebRTCConnectionSocket({
                    session: session.id,
                    type: "viewer",
                });
                const { ws } = await createWebSocket();

                await connection.open(ws);
                await connection.joinBroadcast();

                setLoading(false);
            }
        };

        joinSession();
    }, [session]);

    if (loading) {
        return (
            <>
                <div className="screen-share-title">
                    <img src={screensharelogo} />
                    Please wait...
                </div>
            </>
        );
    }

    return (
        <>
            <div className="screen-share-title">
                <img src={screensharelogo} />
                SCREEN SHARE
            </div>
            <video
                autoPlay
                controls
                className={styles.video}
                id="video"
            ></video>
        </>
    );
}

Live.propTypes = {
    tools: PropTypes.object.isRequired,
    session: PropTypes.object.isRequired,
};

export default Live;
