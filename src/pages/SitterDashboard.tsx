import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Clock, Users, DollarSign, Languages, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import AvailabilityManager from "@/components/AvailabilityManager";
import BookingRequests from "@/components/BookingRequests";
import BookingsList from "@/components/BookingsList";
import { useToast } from "@/hooks/use-toast";
import { SitterOnboardingModal } from "@/components/SitterOnboardingModal";
import { useOnboarding } from "@/hooks/useOnboarding";
import { HelpCard } from "@/components/HelpCard";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import VerificationBanner from "@/components/VerificationBanner";

interface SitterProfile {
  id: string;
  first_name: string;
  last_name: string;
  hourly_rate: number;
  status: string;
  approved_at: string | null;
  availability: any;
  languages: string[] | null;
}

type DashboardState = "loading" | "ready" | "pending-approval" | "error";

const SitterDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sitterProfile, setSitterProfile] = useState<SitterProfile | null>(null);
  const [dashboardState, setDashboardState] = useState<DashboardState>("loading");
  const isMountedRef = useRef(true);

  const activeTab = searchParams.get("tab") || "requests";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const { showOnboarding, completeOnboarding } = useOnboarding("sitter");

  // Stable refetch for AvailabilityManager callback
  const refetchSitterProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("sitters")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!isMountedRef.current) return;
      if (error) throw error;
      if (data) setSitterProfile(data);
    } catch (err) {
      console.error("Error refetching sitter profile:", err);
    }
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth?role=sitter", { replace: true });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("sitters")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) throw error;

        if (!data) {
          navigate("/sitter-signup", { replace: true });
          return;
        }

        setSitterProfile(data);

        if (!data.approved_at) {
          setDashboardState("pending-approval");
        } else {
          setDashboardState("ready");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching sitter profile:", err);
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        });
        setDashboardState("error");
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate, toast]);

  // --- Render branches ---

  if (authLoading || dashboardState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (dashboardState === "pending-approval") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8">
          <div className="container mx-auto px-6 flex items-center justify-center">
            <Card className="max-w-md w-full">
              <CardContent className="p-8 text-center space-y-4">
                <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Approval Pending</h2>
                <p className="text-muted-foreground">
                  Your sitter profile is under review. We'll notify you once you're approved.
                </p>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Go Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (dashboardState === "error" || !sitterProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            {dashboardState === "error" ? "Something went wrong" : "Access Denied"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {dashboardState === "error"
              ? "Failed to load your profile. Please try again."
              : "You don't have access to the sitter dashboard."}
          </p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <SitterOnboardingModal isOpen={showOnboarding} onClose={completeOnboarding} />

      <main className="py-8">
        <div className="container mx-auto px-6">
          {user && !user.email_confirmed_at && (
            <div className="mb-6">
              <VerificationBanner userEmail={user.email || ""} />
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome, {sitterProfile.first_name}!
            </h1>
            <p className="text-muted-foreground">
              Manage your availability and view your bookings
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hourly Rate</p>
                    <p className="text-2xl font-bold">€{sitterProfile.hourly_rate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="text-2xl font-bold capitalize">{sitterProfile.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available Slots</p>
                    <p className="text-2xl font-bold">
                      {Array.isArray(sitterProfile.availability) ? sitterProfile.availability.length : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6 pb-20 md:pb-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="availability" className="hidden sm:flex">Availability</TabsTrigger>
              <TabsTrigger value="availability" className="sm:hidden">Schedule</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              <div className="space-y-6">
                <HelpCard
                  title="🔔 Managing Requests"
                  description="Best practices for handling booking requests"
                  tips={[
                    "Respond to requests quickly to improve your profile",
                    "Review all booking details before accepting",
                    "You can decline requests that don't fit your schedule",
                    "Parents get notified immediately when you respond",
                  ]}
                  storageKey="sitter_requests_help"
                />
                <BookingRequests />
              </div>
            </TabsContent>

            <TabsContent value="availability">
              <div className="space-y-6">
                <HelpCard
                  title="📅 Availability Tips"
                  description="Keep your calendar updated for more bookings"
                  tips={[
                    "Update your availability regularly to get more requests",
                    "Being available on weekends typically gets more bookings",
                    "Add multiple time slots to increase your chances",
                    "Mark yourself unavailable for dates you can't work",
                  ]}
                  storageKey="sitter_availability_help"
                />
                <AvailabilityManager
                  sitterId={sitterProfile.id}
                  currentAvailability={Array.isArray(sitterProfile.availability) ? sitterProfile.availability : []}
                  onAvailabilityUpdate={refetchSitterProfile}
                />
              </div>
            </TabsContent>

            <TabsContent value="bookings">
              <BookingsList sitterId={sitterProfile.id} />
            </TabsContent>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">Name</p>
                      <p className="text-muted-foreground">
                        {sitterProfile.first_name} {sitterProfile.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">{user?.email}</p>
                    </div>
                    <div>
                      <p className="font-medium">Hourly Rate</p>
                      <p className="text-muted-foreground">€{sitterProfile.hourly_rate}/hour</p>
                    </div>
                    <div>
                      <p className="font-medium">Status</p>
                      <p className="text-muted-foreground capitalize">{sitterProfile.status}</p>
                    </div>
                    {sitterProfile.languages && sitterProfile.languages.length > 0 && (
                      <div>
                        <p className="font-medium flex items-center space-x-2">
                          <Languages className="w-4 h-4" />
                          <span>Languages</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {sitterProfile.languages.map((language: string) => (
                            <span
                              key={language}
                              className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full"
                            >
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button variant="outline" onClick={() => navigate("/sitter-signup?edit=true")}>
                      Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <MobileBottomNav userType="sitter" />
    </div>
  );
};

export default SitterDashboard;
