import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SalesList from "./pages/SalesList";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCareerPlan from "./pages/AdminCareerPlan";
import AdminPaymentGateways from "./pages/AdminPaymentGateways";
import AdminProducts from "@/pages/AdminProducts";
import AdminProductsCreate from "@/pages/AdminProductsCreate";
import AdminCreateUser from "@/pages/AdminCreateUser";
import FirstAccess from "@/pages/FirstAccess";
import SaleDetails from "./pages/SaleDetails";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import NewSale from "./pages/NewSale";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/primeiro-acesso" element={<FirstAccess />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/nova-venda" element={<NewSale />} />
              <Route path="/vendas" element={<SalesList />} />
              <Route path="/vendas/:id" element={<SaleDetails />} />
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/carreira" element={<AdminCareerPlan />} />
                <Route path="/admin/payment-gateways" element={<AdminPaymentGateways />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/products/new" element={<AdminProductsCreate />} />
                <Route path="/admin/users/new" element={<AdminCreateUser />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
