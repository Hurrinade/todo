import { Routes, Route, Outlet, Navigate } from "react-router";
import Home from "@/pages/authenticated/home/Home";
import Root from "@/pages/Root";
import { AuthLoading, useConvexAuth } from "convex/react";

function ProtectedRoutes() {
  const { isAuthenticated } = useConvexAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <main className="min-w-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Root />} />

          <Route element={<ProtectedRoutes />}>
            <Route path="/home" element={<Home />} />
          </Route>
        </Routes>
      </main>
      <AuthLoading>
        <p>Still loading</p>
      </AuthLoading>
    </div>
  );
}

export default App;
