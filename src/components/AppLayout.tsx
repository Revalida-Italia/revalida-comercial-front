import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { t } from "@/i18n";

const AppLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <div className="hidden h-full md:flex">
        <AppSidebar />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-border/60 px-3 py-2 md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-11 px-0"
                aria-label={t("common.openMenu")}
                title={t("common.openMenu")}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="!w-72 !max-w-[85vw] border-0 p-0" aria-describedby={undefined}>
              <SheetTitle className="sr-only">{t("common.menu")}</SheetTitle>
              <AppSidebar />
            </SheetContent>
          </Sheet>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-5 xl:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
