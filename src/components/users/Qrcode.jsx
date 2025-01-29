import { QRCodeCanvas } from "qrcode.react";
function Qrcode()
{
    return(
        <>
             <section className="template qr-share">
                   <div className="container">
                     <h2>SCREEN SHARE</h2>
                     <div className="qr-section">
                     <QRCodeCanvas value="https://mon-site.com" size={200} />
                       <p>Lien : http://example.com</p>
                       <a className="btn" href="/live">Commencer</a>
                     </div>
                   </div>
             </section>

        </>
    )
}
export default Qrcode