import { Header, AdminNavigation } from "./DashboardComponents";
import FileUpload from "./file-handling/FileUpload"
import { useState } from "react";

export default function AdminView({ user, onLogout }) {

    const [activeView, setActiveView] = useState('tenant-transaction')

    return (
        <div className="w-screen h-screen bg-zinc-200 flex flex-col">
            <div className="w-full">
                <Header user={user} onLogout={onLogout} />
            </div>

            <div className="flex-grow flex justify-center items-center">
                <div className="w-11/12 h-[90%] bg-white rounded-2xl flex flex-col">

                    <div className="flex-grow flex justify-center items-center">
                        {activeView === "tenant-transaction" && (<TenantTransaction />)}
                        {activeView === "screening-data" && (<ScreeningData />)}
                    </div>

                    <div className="w-full mb-8">
                        <AdminNavigation activeView={activeView} setActiveView={setActiveView} />
                    </div>
                </div>
            </div>

        </div>
    )
}

function TenantTransaction() {

    const handleFileUpload = async (file) => {
        try {
            console.log("Uploading file!");
            const formData = new FormData();
            formData.append("transact", file);

            const response = await fetch("http://127.0.0.1:5000/upload", {
            method: "POST",
            body: formData,
            });

            if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
            }

            const data = await response.json();
            console.log(data);
        } catch (err) {
            console.error("Upload failed:", err);
        }
    }

    return (
        <div className="w-full h-full flex justify-center items-center relative">
            <p className="absolute top-0 pt-24 text-7xl font-extralight">Import Transaction Data</p>
            <FileUpload onUpload={handleFileUpload} />

        </div>
    )
}

function ScreeningData() {

    const handleFileUpload = async (file) => {
        try {
            console.log("Uploading file!");
            const formData = new FormData();
            formData.append("screening", file);

            const response = await fetch("http://localhost:5000/upload", {
            method: "POST",
            body: formData,
            });

            if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
            }

            const data = await response.json();
            console.log(data);
        } catch (err) {
            console.error("Upload failed:", err);
        }
    }

    return (
        <div className="w-full h-full flex justify-center items-center relative">
            <p className="absolute top-0 pt-24 text-7xl font-extralight">Import Screening Data</p>
            <FileUpload onUpload={handleFileUpload} />
   
        </div>
    )
}