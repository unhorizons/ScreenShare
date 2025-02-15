import { Response} from "express"


export function raise404(res : Response, detail : string){
    res.status(404)
    return res.json({
        detail : detail
    })
}