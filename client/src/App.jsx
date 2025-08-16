import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";

import Home from "@/pages/home";
import AuctionDetail from "@/pages/auction-detail";
import CreateAuction from "@/pages/create-auction";
import SellerDashboard from "@/pages/seller-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auction/:id" component={AuctionDetail} />
        <Route path="/create-auction" component={CreateAuction} />
        <Route path="/seller-dashboard" component={SellerDashboard} />
        <Route path="/admin-dashboard" component={AdminDashboard} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
