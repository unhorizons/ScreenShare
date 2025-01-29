function Share(){
    return(
        <>
        <section className="template workshop-options">
          <div className="container">
            <h2>SCREEN SHARE</h2>
            <p>Partage ton écran pour permettre aux utilisateurs de participer</p>
            <button className="btn">Ajouter un atelier</button>
            <div className="workshops">
              <a className="workshop-btn" href="/Qrcode">Programmation web</a>
              <a className="workshop-btn" href="/Qrcode">Introduction prog</a>
            </div>
          </div>
        </section>        
        </>

    )
}
export default Share