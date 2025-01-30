function Session(){
    return (
        <>
            <section className="template new-session">
              <div className="container">
                <h2>SCREEN SHARE</h2>
                <h3>Nouvelle session</h3>
                <input type="text" placeholder="Entrez le nom de l'atelier"></input>
                <a className="btn" href="/welcome">Go</a>
              </div>
            </section>
        </>
    )
}
export default Session