function Messages(){
    return(
        <>
             <section className="template messages">
                 <div className="container">
                   <div className="live-controls">
                     <button className="btn live">Live</button>
                     <button className="btn stop">Stop</button>
                     <button className="btn red">Arrêter</button>
                   </div>
                   <div className="messages">
                     <h3>Messages</h3>
                     <div className="message">Message 1</div>
                     <div className="message">Message 2</div>
                     <input type="text" placeholder="Écrire un message"></input>
                   </div>
                 </div>
             </section>
        </>
    )
}