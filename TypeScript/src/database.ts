import { EventEmitter } from 'events'
import {WebRTCConnection} from './webrtc'

export const events = new EventEmitter()

export type Identifier = string | number

export interface Model{
    [key: string]: any
}

export interface Database {
    sessions : Model[]
    users : Model[]
    [key: string]: Model[]
}

export const database : Database = {
    sessions : [],
    users : []
}

export abstract class BaseModel implements Model {

    static _collection_name = 'base'
    id : number
    slug : string

    constructor(slug : string, _collection_name : string){
        this.slug = slug
        this.id = database[_collection_name].length
    }

    static get(identifier : Identifier) : Model | undefined{

        const _identifier = Number(identifier)

        if(Number.isNaN(_identifier)){
            for(let item of database[this._collection_name]){
                if(item.slug === identifier)
                    return item
            }
            return
        }
        return database[this._collection_name][_identifier]
    }
    static all() : Model[] {
        return database[this._collection_name]
    }

    abstract serialize() : Object
}

export interface UserData {
    username : string
    session? : Session
    role? : string
}
export interface SessionData {
    name : string
    host : string
}


export class Session extends BaseModel{

    static _collection_name = 'sessions'

    name : string
    host : string
    start_time : Date
    end_time? : Date
    _active : boolean

    broadcaster? : WebRTCConnection
    broadcast : undefined

    constructor({name, host} : SessionData){
        let slug = name.toLowerCase().trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')

        super(slug, Session._collection_name)

        this.name = name

        this.host = host
        this._active = false
        this.start_time = new Date(Date.now())
        
        database.sessions.push(this)
    }

    get active(){
        return this._active
    }
    set active(active){
        if(this._active != active){
            this._active = active
            events.emit('updated', this)
            if(active)
                events.emit('started', this)
            else
                events.emit('ended', this)
        }
    }

    get users() : User[]{
        const users : User[] = []
        for(const user of User.all()){
            if(user.session == this){
                users.push(user as User)
            }
        } 

        return users
    }

    serialize(): Object {

        return {
            id: this.id,
            name: this.name,
            host: this.host,
            start_time: this.start_time,
            end_time: this.end_time,
            active: this.active,
            slug: this.slug,
            users: this.users
        }
    }
}


export class User extends BaseModel{

    static _collection_name = 'users'

    username : string
    _session : Session | undefined
    _viewing : boolean
    role : string

    constructor({username, session, role='member'} : UserData){
        
        let slug = username.toLowerCase().trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')

        super(slug, User._collection_name)

        this.username = username

        if(role == undefined)
            this.role = 'member'
        else
            this.role = role

        if(session != undefined){
            this._session = session
        }
        this._viewing = false

        database.users.push(this)
    }

    get session() : Session | undefined{
        return this._session
    }
    set session(session){
        this._session = session
        this._viewing = true
        events.emit('updated', session)
    }

    get viewing() : boolean{
        return this._viewing
    }
    set viewing(value){
        if(value !== this.viewing){
            if(value && this.session?.active)
                this._viewing = value
            else
                this._viewing = false
            events.emit('updated', this.session)
        }
    }

    serialize() : Object{
        return {
            id : this.id,
            username : this.username,
            session : this._session,
            viewing : this._viewing,
            role : this.role
        }
    }
}



