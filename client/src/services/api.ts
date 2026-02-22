const API_URL = "http://localhost:4000/api"

export const getHealth = async () => {
    const response = await fetch(`${API_URL}/rutas`, {
        credentials: "include"
    })

    if (!response.ok) {
        throw new Error("Error al conectar con el backend")
    }

    return response.json()
}