import { Navigate } from "react-router-dom";

export default function PrivateRoute({ user, children, requiredRole }) {
    if (!user) return <Navigate to={"/login"} />;
    
    if (requiredRole && user.role !== requiredRole) { return <Navigate to="/end-user" replace />; }
    
    return children;
}