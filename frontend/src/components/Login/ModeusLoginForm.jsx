import { useState } from "react"
import { loginModeus } from "../../services/api/login"

const ModeusLoginForm = () => {
    const [email, setEmail] = useState(null)
    const [password, setPassword] = useState(null)

    const onClickLogin = async() => {
        let response = await loginModeus(email, password)
        
        if (response.status !== 200) {
            alert("Ты лох, введи правильные креды")
            return;
        }

        localStorage.setItem('token', response.data?.token)
    }

    return (
        <div>
            <p>Modeus Login</p><br/>
            <input id="email" type="email" onChange={(e) => setEmail(e.target.value)}/>
            <input id="password" type="password" onChange={(e) => setPassword(e.target.value)}/>
            <button id="login" onClick={onClickLogin}>Login</button>
        </div>
    )   
}

export default ModeusLoginForm
