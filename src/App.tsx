import { AuthLoading, useConvexAuth } from "convex/react";
import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";

import OfflineBanner from "@/components/common/OfflineBanner";
import { Spinner } from "@/components/ui/spinner";
import Root from "@/pages/Root";

const Home = lazy(() => import("@/pages/authenticated/home/Home"));
const TodoDetail = lazy(
  () => import("@/pages/authenticated/home/todos/TodoDetail"),
);
const Invite = lazy(() => import("@/pages/unauthenticated/invite/Invite"));

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
    <div className="flex h-svh flex-col overflow-hidden pt-[env(safe-area-inset-top)] supports-[height:100dvh]:h-dvh">
      <OfflineBanner />
      <main className="min-w-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Root />} />
            <Route path="/invite/:token" element={<Invite />} />

            <Route element={<ProtectedRoutes />}>
              <Route path="/home" element={<Home />} />
              <Route path="/home/todos/:todoId" element={<TodoDetail />} />
            </Route>
          </Routes>
        </Suspense>
      </main>
      <AuthLoading>
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <Spinner />
        </div>
      </AuthLoading>
    </div>
  );
}

function RouteLoading() {
  return (
    <div
      className="flex h-full min-h-40 items-center justify-center bg-background"
      role="status"
      aria-label="Loading page"
    >
      <Spinner />
    </div>
  );
}

export default App;
