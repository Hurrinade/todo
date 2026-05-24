import { Routes, Route, Outlet, Navigate } from "react-router";
import Home from "@/pages/authenticated/home/Home";
import TodoDetail from "@/pages/authenticated/home/todos/TodoDetail";
import Invite from "@/pages/unauthenticated/invite/Invite";
import Root from "@/pages/Root";
import { AuthLoading, useConvexAuth } from "convex/react";
import { Spinner } from "./components";

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return null;
  }

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
          <Route path="/invite/:token" element={<Invite />} />

          <Route element={<ProtectedRoutes />}>
            <Route path="/home" element={<Home />} />
            <Route path="/home/todos/:todoId" element={<TodoDetail />} />
          </Route>
        </Routes>
      </main>
      <AuthLoading>
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <Spinner />
        </div>
      </AuthLoading>
    </div>
  );
}

export default App;
