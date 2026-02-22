import { Router } from "express"
import { getExample } from "../controllers/controlador.js"

const router = Router()

router.get("/", getExample)

export default router