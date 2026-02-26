import express from "express";
import cors from "cors";
import db from "./config/firebase.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/guardar", async (req, res) => {
  const data = req.body;

  await db.collection("usuarios").add(data);

  res.json({ mensaje: "Guardado correctamente" });
});

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});