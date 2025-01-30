function Login(){
    return(
        <>
      <section className="template login-screen">
        <div className="container">
          <h2>SCREEN SHARE</h2>
          <form className="form">
            <label htmlFor="name">Nom</label>
            <input type="text" id="name" placeholder="Enter your name">
            </input>
            <label htmlFor="code">Code d'accès</label>
            <input type="text" id="code" placeholder="Enter access code">
            </input>
            <a className="btn" href="/session">Go</a>
          </form>
        </div>
      </section>
        </>
    )
}
export default Login