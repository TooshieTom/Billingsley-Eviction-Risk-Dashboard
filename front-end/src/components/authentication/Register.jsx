import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"

export default function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(
                "http://127.0.0.1:5000/register",
                {
                    name,
                    email,
                    password,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            console.log(response.data);
            navigate("/login");

        } catch (error) {
            console.error("Cannot register:", error);
        }
    }

    return (
        <div className="h-screen w-screen flex justify-center items-center bg-zinc-200">
            <div className="w-3/12 bg-white pt-16 pb-16 rounded-xl shadow-2xl flex flex-col items-center">
                <img className="w-8/12 p-10 bg-[#0A1A33]" src="https://www.billingsleyco.com/wp-content/uploads/2022/02/BCO-Logo-White.svg" />

                <div className="flex flex-col justify-center items-center mt-12 w-full">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        type="text"
                        placeholder="Full Name"
                        className="border p-2 rounded w-full"
                    />

                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="Email"
                        className="border p-2 rounded w-full"
                    />

                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        placeholder="Password"
                        className="border p-2 rounded w-full"
                    />
                </div>

                <div className="flex justify-center items-center gap-20 mt-6 w-full">
                    <button onClick={handleRegister} className="auth-button">Create</button>
                    <a href="/login" className="auth-button">Login</a>
                </div>
            </div>
        </div>
    )
}