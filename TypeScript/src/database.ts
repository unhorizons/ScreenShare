import { EventEmitter } from 'events';
import { WebRTCConnection } from './webrtc';
import {WebSocket} from 'ws';

// Event emitter for handling custom events (e.g., session updates, user updates)
export const events = new EventEmitter();

// Type definition for identifiers (can be a string or number)
export type Identifier = string | number;

// Interface for a generic model with dynamic key-value pairs
export interface Model {
    [key: string]: any;
}

// Interface for the database structure
export interface Database {
    sessions: Model[]; // Array of session models
    users: Model[];    // Array of user models
    [key: string]: Model[]; // Allow additional collections with dynamic keys
}

// In-memory database instance
export const database: Database = {
    sessions: [], // Stores all sessions
    users: [],    // Stores all users
};

/**
 * Abstract base class for models.
 * Provides common functionality like fetching by ID or slug, and serialization.
 */
export abstract class BaseModel implements Model {
    static _collection_name = 'base'; // Default collection name
    id: number; // Unique identifier for the model
    slug: string; // URL-friendly identifier

    constructor(slug: string, _collection_name: string) {
        this.slug = slug;
        // Assign an ID based on the length of the collection
        this.id = database[_collection_name].length;
    }

    /**
     * Fetches a model by its identifier (ID or slug).
     * @param identifier - The ID or slug of the model.
     * @returns The model if found, otherwise undefined.
     */
    static get(identifier: Identifier): Model | undefined {
        const _identifier = Number(identifier);

        // If the identifier is a number, treat it as an ID
        if (Number.isNaN(_identifier)) {
            // Search by slug
            for (let item of database[this._collection_name]) {
                if (item.slug === identifier) return item;
            }
            return;
        }
        // Search by ID
        return database[this._collection_name][_identifier];
    }

    /**
     * Fetches all models in the collection.
     * @returns An array of models.
     */
    static all(): Model[] {
        return database[this._collection_name];
    }

    /**
     * Abstract method to serialize the model into an object.
     * Must be implemented by child classes.
     */
    abstract serialize(): Object;
}

// Interface for user data
export interface UserData {
    username: string; // User's username
    session?: Session; // Optional session the user is part of
    role?: string; // Optional role of the user (default: 'member')
}

// Interface for session data
export interface SessionData {
    name: string; // Name of the session
    host: string; // Host of the session
}

export interface SecondaryBroadcaster {
    sdp : RTCSessionDescriptionInit,
    ws : WebSocket, 
    count : number
}

/**
 * Session model representing a session.
 */
export class Session extends BaseModel {
    static _collection_name = 'sessions'; // Collection name for sessions

    name: string; // Name of the session
    host: string; // Host of the session
    start_time: Date; // Timestamp when the session started
    end_time?: Date; // Optional timestamp when the session ended
    _active: boolean; // Whether the session is active

    broadcaster?: WebRTCConnection; // Optional WebRTC broadcaster
    secondary_broadcaster: SecondaryBroadcaster[]; // Optional WebRTC broadcaster
    broadcast: undefined; // Placeholder for broadcast functionality

    constructor({ name, host }: SessionData) {
        // Generate a URL-friendly slug from the session name
        let slug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // Call the parent constructor
        super(slug, Session._collection_name);

        this.secondary_broadcaster = []
        this.name = name;
        this.host = host;
        this._active = false; // Session is inactive by default
        this.start_time = new Date(Date.now()); // Set the start time to now

        // Add the session to the database
        database.sessions.push(this);
    }

    /**
     * Getter for the active status of the session.
     */
    get active() {
        return this._active;
    }

    /**
     * Setter for the active status of the session.
     * Emits events when the status changes.
     */
    set active(active) {
        if (this._active != active) {
            this._active = active;
            events.emit('updated', this); // Emit an 'updated' event
            if (active) events.emit('started', this); // Emit a 'started' event
            else events.emit('ended', this); // Emit an 'ended' event
        }
    }

    /**
     * Getter for the users in the session.
     * @returns An array of users in the session.
     */
    get users(): User[] {
        const users: User[] = [];
        for (const user of User.all()) {
            if (user.session == this) {
                users.push(user as User);
            }
        }
        return users;
    }

    /**
     * Serializes the session into an object.
     * @returns An object representing the session.
     */
    serialize(): Object {
        return {
            id: this.id,
            name: this.name,
            host: this.host,
            start_time: this.start_time,
            end_time: this.end_time,
            active: this.active,
            slug: this.slug,
            users: this.users,
        };
    }
}

/**
 * User model representing a user.
 */
export class User extends BaseModel {
    static _collection_name = 'users'; // Collection name for users

    username: string; // User's username
    _session: Session | undefined; // Optional session the user is part of
    _viewing: boolean; // Whether the user is viewing the session
    _peer_connection : WebRTCConnection | undefined; // The webRTC connection associated with this user 
    role: string; // Role of the user (default: 'member')

    constructor({ username, session, role = 'member' }: UserData) {
        // Generate a URL-friendly slug from the username
        let slug = username
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // Call the parent constructor
        super(slug, User._collection_name);

        this.username = username;

        // Set the role (default to 'member' if not provided)
        if (role == undefined) this.role = 'member';
        else this.role = role;

        // Set the session if provided
        if (session != undefined) {
            this._session = session;
        }
        this._viewing = false; // User is not viewing by default

        // Add the user to the database
        database.users.push(this);
    }

    /**
     * Getter for the webRTC peer connection associated with the user.
     */
    get peer_connection() : WebRTCConnection | undefined{
        return this._peer_connection
    }

    /**
     * Setter for the webRTC peer connection associated with the user.
     */
    set peer_connection(connection : WebRTCConnection){
        this._peer_connection = connection
    }

    /**
     * Getter for the session the user is part of.
     */
    get session(): Session | undefined {
        return this._session;
    }

    /**
     * Setter for the session the user is part of.
     * Emits an 'updated' event when the session changes.
     */
    set session(session) {
        if(session){
            this._session = session;
            this._viewing = true; // Automatically set viewing to true
            events.emit('updated', session); // Emit an 'updated' event
        }
    }

    /**
     * Getter for the viewing status of the user.
     */
    get viewing(): boolean {
        return this._viewing;
    }

    /**
     * Setter for the viewing status of the user.
     * Emits an 'updated' event when the status changes.
     */
    set viewing(value) {
        if (value !== this.viewing) {
            if (value && this.session?.active) {
                this._viewing = value;
            } else {
                this._viewing = false;
            }
            this.session && events.emit('updated', this.session); // Emit an 'updated' event
        }
    }

    /**
     * Serializes the user into an object.
     * @returns An object representing the user.
     */
    serialize(): Object {
        return {
            id: this.id,
            username: this.username,
            session: this._session,
            viewing: this._viewing,
            role: this.role,
        };
    }
}