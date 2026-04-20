import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-4 md:p-5 xl:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
