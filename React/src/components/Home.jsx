import '../styles/Home.module.css';
import clublogo from "../assets/club-logo.png"; 
import screensharelogo from "../assets/screenshare-logo.png"; 

function Home(){
    return(
        <>
            <img className="club-logo" src={clublogo}/>
            <section className="template welcome-screen">
            
                <h1>Welcome to</h1>
                <h2 className="screen-share-title"> <img src={screensharelogo}/> SCREEN SHARE</h2>
                <p>Share your screen to allow your friends to see what you want to show easily</p>
                <a className="btn" href="/HostLogin">Get Started</a>
        
            </section>
        </>
    )
}
export default Home