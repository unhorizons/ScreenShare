const EventEmitter = require("events");
const databaseevent = new EventEmitter();

const database = {
    sessions : [],
    users : []
}

class BaseModel{

    _model_name = 'base'

    constructor(model_name) {
        // this._model_name = model_name
    }

}

class Session extends BaseModel{

    _model_name = 'base'

    id
    workshop
    lead
    start_time
    end_time
    _active
    slug
    broadcaster
    broadcast

    constructor({workshop, lead}){
        super()

        for(let session of database.sessions){
            if(session.workshop === workshop){
                throw Error('Session already exists')
            }
        }

        this.workshop = workshop

        this.slug = workshop
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')

        this.broadcast = null
        this.broadcaster = null
        this.lead = lead
        this._active = false
        this.start_time = new Date(Date.now())
        this.end_time = null
        
        this.id = database.sessions.length
        database.sessions.push(this)
    }

    get active(){
        return this._active
    }
    set active(active){
        this._active = active
        databaseevent.emit('updated', this)
    }


    static get(id){
        if(typeof id === "string"){
            for(let session of database.sessions){
                if(session.slug === id)
                    return session
            }
        }

        return database['sessions'][id]
    }

    static all(){
        return database['sessions']
    }

}

class User extends BaseModel{

    id
    username
    _session
    _viewing
    role

    constructor({username, session, role='member'}){
        super()
        this.username = username

        if(role == undefined)
            this.role = 'member'
        else
            this.role = role

        if(session != undefined){
            if(session instanceof Session){
                this._session = session
            }else{
                this._session = database.sessions[session]
            }
        }
        this._viewing = false
        this.id = database.users.length
        database.users.push(this)
    }

    get session(){
        return this._session
    }
    set session(session){
        this._session = session
        this.viewing = true
        databaseevent.emit('updated', session)
    }

    static get(id){
        if(typeof id === "string")
            id = Number(id)
        return database['users'][id]
    }

    get viewing(){
        return this._viewing
    }
    set viewing(value){
        if(value !== this.viewing){
            this._viewing = value
            databaseevent.emit('updated', this.session)
        }
    }

    static all(){
        return database['users']
    }

    logout(){
        database.users = database.users.filter(user => user !== this)
        databaseevent.emit('updated', this.session)
    }
}

module.exports = {
    User,
    Session,
    database,
    databaseevent
}