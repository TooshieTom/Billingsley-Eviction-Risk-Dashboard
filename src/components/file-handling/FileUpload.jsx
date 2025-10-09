import { useState } from "react"

export default function FileUpload({ onUpload }) {

    const [file, setFile] = useState(null);
    const [error, setError] = useState("");

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        validateFile(file);
    }

    const validateFile = (file) => {
        if (!file) return;

        const validMIMEType = [
            // .csv
            "text/csv",
            // .xls
            "application/vnd.ms-excel",
            // .xlsx
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ];

        if (!validMIMEType.includes(file.type)) {
            setFile(null);
            setError("Excel and CSV are allowed file types");
            return;
        }

        setError("");
        setFile(file);

        // if (onUpload) onUpload(file);
    }

    const handleDragAndDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        validateFile(droppedFile);
    }

    const handleImport = async () => {
        if (onUpload && file) {
            try {
                await onUpload(file);
                setFile(null); // Clear the file after successful import
            } catch (err) {
                console.error("Import failed:", err);
                setError("Import failed. Please try again.");
            }
        }
    };

    return (
        <div className="w-full flex flex-col items-center">
            <div
                className="w-11/12 md:w-4/12 h-32 rounded-full bg-zinc-200  mt-4 flex flex-col justify-center items-center text-center shadow-2xl transition duration-500 ease-in-out file-upload-anim"
                onDrop={handleDragAndDrop}
                onDragOver={(e) => e.preventDefault()}
            >
                <input
                    type="file"
                    accept=".csv, .xls, .xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="fileInput"
                />

                <label htmlFor="fileInput" className="cursor-pointer w-full h-full flex flex-row justify-center items-center gap-8 rounded-full">
                    <p className="text-2xl font-extralight">
                        {file ? file.name : "Upload"}
                    </p>

                    <svg
                        className="fill-[#0A1A33] group-hover:fill-zinc-200 transition-colors duration-500 ease-in-out"
                        xmlns="http://www.w3.org/2000/svg"
                        width="32" height="32"
                        viewBox="0 0 256 256">
                        <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40v88a8,8,0,0,0,16,0V40h88V88a8,8,0,0,0,8,8h48V216H176a8,8,0,0,0,0,16h24a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM108,128a52,52,0,0,0-48,32,36,36,0,0,0,0,72h48a52,52,0,0,0,0-104Zm0,88H60a20,20,0,0,1-3.81-39.64,8,8,0,0,0,16,.36,38,38,0,0,1,1.06-6.09,7.56,7.56,0,0,0,.27-1A36,36,0,1,1,108,216Z"></path></svg>

                </label>

                {error && <p className="text-2xl mb-2 text-red-500">{error}</p>}
            </div>
            <div className="">
                {file && !error && (
                    <button
                    onClick={handleImport}
                    className="absolute top-[70%] left-1/2 -translate-x-1/2 px-8 py-3 bg-[#0A1A33] text-zinc-100 text-lg rounded-full shadow-lg hover:bg-[#13294B] transition-colors"
                    >
                    Import File
                    </button>
                )}
            </div>
        </div>
    )
}