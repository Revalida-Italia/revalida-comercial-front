import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <AppSidebar />
      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5 xl:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
