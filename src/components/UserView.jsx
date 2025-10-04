import { useState } from "react";
import { Header, UserNavigation } from "./DashboardComponents";

export default function UserView({ user, onSwapView, onLogout }) {

    const [activeView, setActiveView] = useState('portfolio')

    return (

        <div className="w-screen h-screen bg-zinc-200 flex flex-col">
            <div className="w-full">
                <Header user={user} onSwapView={onSwapView} onLogout={onLogout} />
            </div>

            <div className="flex-grow flex justify-center items-center">
                <div className="w-11/12 h-[90%] bg-white rounded-2xl flex flex-col">

                    {/* Conditional Viewing */}
                    <div className="flex-grow flex justify-center items-center">
                        { activeView === "portfolio" &&     ( <PortfolioView /> )}
                        { activeView === "property" &&      ( <PropertyView /> )}
                        { activeView === "at-risk" &&       ( <AtRiskView /> )}
                    </div>

                    <div className="w-full mb-8">
                        <UserNavigation activeView={activeView} setActiveView={setActiveView} />
                    </div>
                </div>
            </div>

        </div>
    )
}

export function PortfolioView() {
    return (
        <p>This is the portfolio view</p>
    )
}
export function PropertyView() {
    return (
        <p>This is the property view</p>
    )
}
export function AtRiskView() {
    return (
        <p>This is the at-risk view</p>
    )
}