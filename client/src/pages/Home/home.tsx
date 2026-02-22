import { useEffect, useState } from "react"
import { getHealth } from "../../services/api"

const Home = () => {
    const [message, setMessage] = useState("Cargando...")

    useEffect(() => {
        getHealth()
            .then((data) => {
                setMessage(data.message)
            })
            .catch(() => {
                setMessage("Error conectando al backend")
            })
    }, [])

    return (
        <div>
            <h1>{message}</h1>
        </div>
    )
}

export default Home