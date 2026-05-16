import { Routes, Route } from "react-router";
import Home from "@/pages/authenticated/home/Home";
import Root from "@/pages/Root";
import Public from "@/pages/unauthenticated/public/Public";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

function App() {
  return (
    <div className="h-svh flex flex-col overflow-hidden">
      <main className="min-w-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/public" element={<Public />} />
          <Route
            path="/home"
            element={
              <>
                <Unauthenticated>
                  <Root />
                </Unauthenticated>
                <Authenticated>
                  <Home />
                </Authenticated>
              </>
            }
          />
        </Routes>
      </main>
      <AuthLoading>
        <p>Still loading</p>
      </AuthLoading>
    </div>
  );
}

export default App;
