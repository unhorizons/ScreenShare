// import {styles} from '../styles/Home.module.css';
import clublogo from "../assets/club-logo.png"; 
import screensharelogo from "../assets/screenshare-logo.png"; 
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from 'react';


function Home(){
    const navigate = useNavigate()

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);

    const route = queryParams.get('route'); 

    useEffect(() => {
        if(route != undefined){
            navigate(`/${route}`)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const go = () => {
        navigate("/host-login"); 
    }

    return(
        <>
            <img className="club-logo" src={clublogo}/>
            <section className={`template welcome-screen`}>
            
                <h1>Welcome to</h1>
                <h2 className="screen-share-title"> <img src={screensharelogo}/> SCREEN SHARE</h2>
                <p>Share your screen to allow your friends to see what you want to show easily</p>
                <a className="btn" onClick={go}>Get Started</a>
        
            </section>
        </>
    )
}
export default Home