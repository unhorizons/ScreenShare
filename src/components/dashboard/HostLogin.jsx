import { useNavigate } from "react-router-dom";
function HostLogin(){
    // logique a supprime une fois le backend sera fait
    const navigate = useNavigate();

    const handleSubmit = (event) => {
        event.preventDefault(); 
        navigate("/Qrcode"); 
    };
    return(
        <>
        <h1>SCREEN SHARE</h1>
        <p>Connexion de l'instructeur</p>
        <form id="host-form" onSubmit={handleSubmit}>
            <input type="text" name="username" id="username" placeholder="Nom de l'instructeur" required></input>
            <input type="text" name="code" id="code" placeholder="Code d'access" required></input>
            <button type="submit">Se connecter</button>
        </form>

        </>
    )
}
export default HostLogin