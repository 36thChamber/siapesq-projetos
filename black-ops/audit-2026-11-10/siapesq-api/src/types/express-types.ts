
import { Request } from "express"
export interface RequestAutenticado extends Request {
    id_usuario:number | string
}