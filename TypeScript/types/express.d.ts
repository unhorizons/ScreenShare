import { User, Session} from "../src/database"

declare module 'express-serve-static-core' {
    interface Request {
        session?: Session
        user?: User
    }
}