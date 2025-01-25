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
    active
    slug

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

        this.lead = lead
        this.active = false
        this.start_time = new Date(Date.now())
        this.end_time = null
        
        this.id = database.sessions.length
        database.sessions.push(this)
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
    session
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
                this.session = session
            }else{
                this.session = database.sessions[session]
            }
        }
        
        this.id = database.users.length
        database.users.push(this)
    }

    static get(id){
        if(typeof id === "string")
            id = Number(id)
        return database['users'][id]
    }

    static all(){
        return database['users']
    }
}

module.exports = {
    User,
    Session,
    database
}