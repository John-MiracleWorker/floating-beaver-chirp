import React from "react";
import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthProvider";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;