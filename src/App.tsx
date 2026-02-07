import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

/** Common pages import */
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Verify from "./pages/Verify";
import NotFound from "./pages/NotFound";
import PrivateRoute from "./pages/PrivateRoute";

/** User pages import */
import UserDashboard from "./pages/UserDashboard";
import BookCourt from "./pages/BookCourt";
import UserBookings from "./pages/UserBookings";
import HostActivity from "./pages/HostActivity";
import AllActivities from "./pages/AllActivities";

/** Super Admin pages import */
import AdminLanding from "./pages/AdminLanding";
import AdminOnboardAcademy from "./pages/AdminOnboardAcademy";

/** Academy pages import */
import AcademyLanding from "./pages/AcademyLanding";

// PlayC Components
// import PlayCRegister from "./pages/PlayC/Register";
// import PlayCLogin from "./pages/PlayC/Login";
// import PlayCVerifyOtp from "./pages/PlayC/VerifyOtp";
// import PlayCDashboard from "./pages/PlayC/Dashboard";
// import BookCourt from "./pages/PlayC/BookCourt";
// import UserBookings from "./pages/PlayC/UserBookings";
// import HostActivity from "./pages/PlayC/HostActivity";
// import AllActivities from "./pages/PlayC/AllActivities";
import MyHostedActivities from "./pages/PlayC/MyHostedActivities";
import MyRequests from "./pages/PlayC/MyRequests";
import AdminBookings from "./pages/PlayC/AdminBookings";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify" element={<Verify />} />

          {/* User Routes */}
          <Route path="/dashboard" element={<PrivateRoute requiredRole="user"><UserDashboard /></PrivateRoute>} />
          <Route path="/bookcourt" element={<BookCourt />} />
          <Route path="/my-bookings" element={<UserBookings />} />
          <Route path="/host-activity" element={<HostActivity />} />
          <Route path="/activities" element={<AllActivities />} />


          {/* Academy Routes*/}
          <Route path="/academy-setup" element={<PrivateRoute requiredRole="academy"><AcademyLanding /></PrivateRoute>} />


          {/* Super Admin Routes */}
          <Route path="/adminlanding" element={<PrivateRoute requiredRole="superadmin"><AdminLanding /></PrivateRoute>} />
          <Route path="/admin/onboard" element={<PrivateRoute requiredRole="superadmin"><AdminOnboardAcademy /></PrivateRoute>} />




          {/* PlayC Routes */}
          {/* <Route path="/playc/register" element={<PlayCRegister onRegistered={() => { }} />} />
          <Route path="/playc/login" element={<PlayCLogin />} />
          <Route path="/playc/verify-otp" element={<PlayCVerifyOtp email="" onVerified={() => { }} />} /> */}
          {/* <Route path="/playc/dashboard" element={<PlayCDashboard />} /> */}
          {/* <Route path="/playc/book" element={<BookCourt />} /> */}
          {/* <Route path="/playc/my-bookings" element={<UserBookings />} /> */}
          {/* <Route path="/playc/host-activity" element={<HostActivity />} /> */}
          {/* <Route path="/playc/activities" element={<AllActivities />} /> */}
          <Route path="/playc/my-hosted" element={<MyHostedActivities />} />
          <Route path="/playc/my-requests" element={<MyRequests />} />
          <Route path="/playc/admin/bookings" element={<AdminBookings />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
