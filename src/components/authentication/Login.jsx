import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login({ onLogin }) {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");


    const handleLogin = async () => {
        try {
            const response = await axios.post("http://127.0.0.1:5000/login", {
                email,
                password,
            });

            if(response.status === 200 && response.data.email) {
                onLogin(response.data);
            }

        } catch (error) {
            if(error.response) {
                console.log("Error occured")
            }
        }

       
    }

    return (
        <div className="h-screen w-screen flex justify-center items-center bg-zinc-200">
            <div className="w-3/12 bg-white pt-16 pb-16 rounded-xl shadow-2xl flex flex-col items-center">
                <img className="w-8/12 p-10 bg-[#0A1A33]" src="https://www.billingsleyco.com/wp-content/uploads/2022/02/BCO-Logo-White.svg" />
                <div className="flex flex-col justify-center items-center mt-16 w-full">
                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="Email"
                        className="border p-2 rounded w-full" />

                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        placeholder="Password"
                        className="border p-2 rounded w-full" />
                </div>

                <div className="flex justify-center items-center gap-20 mt-6 w-full">
                    <button onClick={() => navigate("/register")} className="auth-button">Register</button>
                    <button onClick={handleLogin} className="auth-button">Login</button>
                </div>
            </div>
        </div>
    )
}