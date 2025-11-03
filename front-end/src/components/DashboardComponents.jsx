import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function Header({ user, onLogout }) {
    const navigate = useNavigate();
    
    const [dropDown, setDropDown] = useState(false);

    const handleSwitchViewAsAdmin = () => {
        if(user?.role === "admin") {
            navigate(window.location.pathname === "/admin" ? "/end-user" : "/admin");
        }
    }

    return (
        <div className="w-full flex justify-end p-4 bg-[#0A1A33] shadow-md relative">
            <div className="flex flex-row justify-between items-center w-full">
                <img
                    className="w-72 p-8 rounded-2xl"
                    src="https://www.billingsleyco.com/wp-content/uploads/2022/02/BCO-Logo-White.svg"
                    alt="Logo"
                />
                <div className="bg-white rounded-full">{
                    user?.email && (
                        // <img
                        //     alt="Profile"
                        //     src={user.profilePicture}
                        //     className="w-20 h-20 rounded-full cursor-pointer shadow-2xl"
                        //     onClick={() => setDropDown(!dropDown)}
                        // />

                        <div 
                            className="w-20 h-20 rounded-full cursor-pointer shadow-2xl"
                            onClick={() => setDropDown(!dropDown)}
                            ></div>
                    )
                }</div>
            </div>

            {/* Drop Down */}
            {dropDown && (
                <div className="absolute right-4 top-[55px] mt-12 w-56 bg-white shadow-lg rounded-lg border border-gray-200 z-10">
                    <div className="p-4 border-b border-gray-200">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex flex-col p-2 gap-2">
                        {user.role === "admin" && (
                            <button
                                className="text-left px-2 py-1 rounded hover:bg-gray-100"
                                onClick={() => {
                                    handleSwitchViewAsAdmin();
                                    setDropDown(false);
                                }}
                            >
                                Switch View
                            </button>
                        )}

                        {/* Logout */}
                        <button
                            onClick={onLogout}
                            className="text-red-500 italic text-left px-2 py-1 rounded hover:bg-gray-100"
                            // Logout Function
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function AdminNavigation({ activeView, setActiveView }) {
    return (
        <div className="flex justify-center items-center">
            <div className="w-full h-32 bg-zinc-200 rounded-br-2xl rounded-bl-2xl flex justify-evenly items-center">
                <button
                    onClick={() => setActiveView("tenant-transaction")}
                    className={`px-4 py-2 w-[180px] flex flex-col items-center ${activeView === "tenant-transaction"
                        ? "border-b-4 border-[#0A1A33] font-extralight"
                        : "opacity-70"
                        }`}
                >
                    <p className="text-xl text-center text-black">Resident Transactions</p>
                </button>

                <button
                    onClick={() => setActiveView("screening-data")}
                    className={`px-4 py-2 w-[180px] flex flex-col items-center ${activeView === "screening-data"
                        ? "border-b-4 border-[#0A1A33] font-extralight"
                        : "opacity-70"
                        }`}
                >
                    <p className="text-xl text-center text-black">Screening Data</p>
                </button>
            </div>
        </div>
    )
}


export function UserNavigation({ activeView, setActiveView }) {

    return (
        <div className="flex justify-center items-center">
            <div className="w-full h-32 rounded-br-2xl rounded-bl-2xl bg-zinc-200">
                <div className="w-full h-full flex flex-row justify-evenly items-center">

                    <button onClick={() => setActiveView("portfolio")} className={`px-4 py-2 w-[100px] ${activeView === "portfolio"
                        ? "border-b-4 border-[#0A1A33] font-extralight"
                        : "opacity-70"
                        }`}
                    >
                        <p className="text-xl text-center text-black">Portfolio</p>
                    </button>

                    <button onClick={() => setActiveView("property")} className={`px-4 py-2 w-[100px] ${activeView === "property"
                        ? "border-b-4 border-[#0A1A33] font-extralight"
                        : "opacity-70"
                        }`}
                    >
                        <p className="text-xl text-center text-black">Property</p>
                    </button>

                    <button onClick={() => setActiveView("at-risk")} className={`px-4 py-2 w-[100px] ${activeView === "at-risk"
                        ? "border-b-4 border-[#0A1A33] font-extralight"
                        : "opacity-70"
                        }`}
                    >
                        <p className="text-xl text-center text-black">At-risk</p>
                    </button>

                </div>
            </div>
        </div>
    )
}