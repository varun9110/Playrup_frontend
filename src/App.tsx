import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";

/** Common pages import */
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Verify from "./pages/Verify";
import NotFound from "./pages/NotFound";
import PrivateRoute from "./pages/PrivateRoute";

/** User pages import */
import UserDashboard from "./pages/UserDashboard";
import UserProfile from "./pages/UserProfile";
import BookCourt from "./pages/BookCourt";
import UserBookings from "./pages/UserBookings";
import HostActivity from "./pages/HostActivity";
import AllActivities from "./pages/AllActivities";
import MyHostedActivities from "./pages/MyHostedActivities";
import UserActivityRequests from "./pages/UserActivityRequests";
import ActivityFeedback from "./pages/ActivityFeedback";
import EditActivity from "./pages/EditActivity";
import PublicActivityShare from "./pages/PublicActivityShare";
import PublicParticipantProfile from "./pages/PublicParticipantProfile";

/** Super Admin pages import */
import AdminLanding from "./pages/AdminLanding";
import AdminOnboardAcademy from "./pages/AdminOnboardAcademy";
import AdminNotifications from "./pages/AdminNotifications";
import NotificationBell from "./components/notifications/NotificationBell";

/** Academy pages import */
import AcademySetup from "./pages/AcademySetup";
import AcademyDashboard from "./pages/AcademyDashboard";
import AcademyBooking from "./pages/AcademyBooking";
import AcademyDropIn from "./pages/AcademyDropIn";
import PublicDropInShare from "./pages/PublicDropInShare";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const authRoutes = ["/", "/login", "/signup", "/verify"];
  const isPublicRoute =
    location.pathname.startsWith('/activity/share/') ||
    location.pathname.startsWith('/public/profile/') ||
    location.pathname.startsWith('/dropin/share/');
  const isAuthRoute = authRoutes.includes(location.pathname);
  const hideNotificationBellRoutes = ["/", "/login", "/signup", "/verify"];
  const shouldShowNotificationBell = !hideNotificationBellRoutes.includes(location.pathname) && !isPublicRoute;

  const getStoredUser = () => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  };

  const getHomeRouteByRole = (role?: string) => {
    if (role === "superadmin") return "/adminlanding";
    if (role === "academy") return "/academy-dashboard";
    return "/dashboard";
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (isAuthRoute && token && user) {
      navigate(getHomeRouteByRole(user.role), { replace: true });
    }
  }, [isAuthRoute, navigate]);

  useEffect(() => {
    const onStorageChange = (event: StorageEvent) => {
      if (!["token", "user", null].includes(event.key)) {
        return;
      }

      const token = localStorage.getItem("token");
      const user = getStoredUser();

      if (isPublicRoute) {
        return;
      }

      if (!token || !user) {
        if (!authRoutes.includes(location.pathname)) {
          navigate("/", { replace: true });
        }
        return;
      }

      if (authRoutes.includes(location.pathname)) {
        navigate(getHomeRouteByRole(user.role), { replace: true });
      }
    };

    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, [isPublicRoute, location.pathname, navigate]);

  return (
    <>
      {shouldShowNotificationBell && <NotificationBell />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Index />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/activity/share/:shareCode" element={<PublicActivityShare />} />
        <Route path="/public/profile/:userToken" element={<PublicParticipantProfile />} />
        <Route path="/dropin/share/:shareCode" element={<PublicDropInShare />} />

        {/* User Routes */}
        <Route path="/dashboard" element={<PrivateRoute requiredRole="user"><UserDashboard /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute requiredRole="user"><UserProfile /></PrivateRoute>} />
        <Route path="/participant-profile/:userToken" element={<PrivateRoute requiredRole="user"><UserProfile /></PrivateRoute>} />
        <Route path="/bookcourt" element={<BookCourt />} />
        <Route path="/my-bookings" element={<UserBookings />} />
        <Route path="/host-activity" element={<HostActivity />} />
        <Route path="/activities" element={<AllActivities />} />
        <Route path="/activities/edit/:activityId" element={<PrivateRoute requiredRole="user"><EditActivity /></PrivateRoute>} />
        <Route path="/my-hosted" element={<MyHostedActivities />} />
        <Route path="/activities/:activityId/feedback" element={<PrivateRoute requiredRole="user"><ActivityFeedback /></PrivateRoute>} />
        <Route path="/activity-requests" element={<UserActivityRequests />} />


        {/* Academy Routes*/}
        <Route path="/academy-dashboard" element={<PrivateRoute requiredRole="academy"><AcademyDashboard /></PrivateRoute>} />
        <Route path="/academy-setup" element={<PrivateRoute requiredRole="academy"><AcademySetup /></PrivateRoute>} />
        <Route path="/academy-bookings" element={<PrivateRoute requiredRole="academy"><AcademyBooking /></PrivateRoute>} />
        <Route path="/academy-booking" element={<PrivateRoute requiredRole="academy"><AcademyBooking /></PrivateRoute>} />
        <Route path="/academy-dropin" element={<PrivateRoute requiredRole="academy"><AcademyDropIn /></PrivateRoute>} />


        {/* Super Admin Routes */}
        <Route path="/adminlanding" element={<PrivateRoute requiredRole="superadmin"><AdminLanding /></PrivateRoute>} />
        <Route path="/admin/onboard" element={<PrivateRoute requiredRole="superadmin"><AdminOnboardAcademy /></PrivateRoute>} />
        <Route path="/admin/notifications" element={<PrivateRoute requiredRole="superadmin"><AdminNotifications /></PrivateRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
