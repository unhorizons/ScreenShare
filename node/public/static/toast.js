
class Toast{

    constructor({msg, type}){
        this.type = type
        this.msg = msg
        this._toast = document.createElement('div')
        this._toast.innerHTML = ''
        this._toast.classList.add('toast')
        this._toast.classList.add(type)

        if(type == 'waiting'){
            this._toast.innerHTML = '<div id="loading-spinner" class="spinner"></div>'
        }
        else{
            this._toast.classList.add('show')
            this._toast.addEventListener("animationend", (event) => {
                this.close()
            });
        }
        this._toast.innerHTML += msg
        document.body.append(this._toast)

    }

    close(){
        if(this.type != 'waiting'){
            this._toast.remove()
        }else{
            this._toast.classList.add('closing')
            this._toast.addEventListener("animationend", (event) => {
                this._toast.remove()
            });
        }
    }
}



