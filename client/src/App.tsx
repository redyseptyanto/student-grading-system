import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import LoginFailed from "@/pages/LoginFailed";
import Dashboard from "@/pages/Dashboard";
import GradeInput from "@/pages/GradeInput";
import StudentProgress from "@/pages/StudentProgress";
import RadarCharts from "@/pages/RadarCharts";
import AdminDashboard from "@/pages/AdminDashboard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/login" component={Login} />
      <Route path="/login-failed" component={LoginFailed} />
      
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route component={Landing} /> {/* Redirect any other route to landing when not authenticated */}
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/students" component={StudentProgress} />
          <Route path="/progress" component={StudentProgress} />
          <Route path="/grades" component={GradeInput} />
          <Route path="/charts" component={RadarCharts} />
          <Route path="/reports" component={RadarCharts} />
          <Route path="/communication" component={Dashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminDashboard} />
          <Route path="/admin/schools" component={AdminDashboard} />
          <Route path="/admin/reports" component={AdminDashboard} />
          <Route path="/superadmin" component={SuperAdminDashboard} />
        </>
      )}
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLoading && isAuthenticated && <Sidebar />}
      <div className={!isLoading && isAuthenticated ? "lg:pl-64" : ""}>
        <Router />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
