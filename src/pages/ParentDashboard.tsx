import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Clock, Users, Star, TrendingUp, TrendingDown, Euro } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import ParentBookingHistory from "@/components/ParentBookingHistory";
import RequestBasedBookingSystem from "@/components/RequestBasedBookingSystem";
import { ParentOnboardingModal } from "@/components/ParentOnboardingModal";
import { useOnboarding } from "@/hooks/useOnboarding";
import { HelpCard } from "@/components/HelpCard";
import { FavoriteSitters } from "@/components/FavoriteSitters";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import VerificationBanner from "@/components/VerificationBanner";

interface ParentProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  num_children: number;
  children_ages: string;
  emergency_contact?: string;
  special_needs?: string;
}

interface BookingStats {
  total_bookings: number;
  upcoming_bookings: number;
  completed_bookings: number;
  total_spent: number;
  spent_this_month: number;
  spent_last_month: number;
}

const ParentDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [spentPeriod, setSpentPeriod] = useState<'month' | 'all'>('all');
  const tabsRef = useRef<HTMLDivElement>(null);
  
  // Get initial tab from URL params, default to "bookings"
  const initialTab = searchParams.get('tab') || 'bookings';
  
  // Onboarding
  const { showOnboarding, completeOnboarding } = useOnboarding("parent");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setDataLoading(true);
        setFetchError(false);

        // 1. Profile — maybeSingle avoids throw on 0 or >1 rows
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast({
            title: "Profile error",
            description: profileError.message,
            variant: "destructive",
          });
          setFetchError(true);
          return;
        }

        if (!profile) {
          navigate("/parent-signup");
          return;
        }

        // 2. Booking stats via server-side RPC (returns a single row)
        const { data: statsRows, error: statsError } = await supabase
          .rpc("get_parent_booking_stats");

        if (cancelled) return;

        const defaultStats: BookingStats = {
          total_bookings: 0, upcoming_bookings: 0, completed_bookings: 0,
          total_spent: 0, spent_this_month: 0, spent_last_month: 0,
        };

        if (statsError) {
          console.error("Error fetching stats:", statsError);
          toast({
            title: "Stats error",
            description: statsError.message,
            variant: "destructive",
          });
          setParentProfile(profile);
          setBookingStats(defaultStats);
          return;
        }

        if (cancelled) return;

        const row = Array.isArray(statsRows) ? statsRows[0] : null;
        setParentProfile(profile);
        setBookingStats(row ? row as BookingStats : defaultStats);
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching parent data:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        });
        setFetchError(true);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  // Auto-scroll to booking form when coming from homepage
  useEffect(() => {
    if (initialTab === 'book-sitter' && !dataLoading && parentProfile) {
      setTimeout(() => {
        const el = document.getElementById('how-it-works-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [initialTab, dataLoading, parentProfile]);

  // Show loading screen only if auth is loading OR if we're fetching data
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">
            {authLoading ? "Authenticating..." : "Loading your dashboard..."}
          </span>
        </div>
      </div>
    );
  }

  if (!parentProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground mb-8">
            We couldn't find your parent profile. Please complete your registration.
          </p>
          <Button onClick={() => navigate("/parent-signup")}>
            Complete Registration
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <ParentOnboardingModal isOpen={showOnboarding} onClose={completeOnboarding} />
      
      <div className="container mx-auto px-4 py-8">
        {user && !user.email_confirmed_at && (
          <div className="mb-6">
            <VerificationBanner userEmail={user.email || ''} />
          </div>
        )}
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {parentProfile.first_name}!
          </h1>
          <p className="text-muted-foreground">
            Manage your bookings and find trusted sitters for your family.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingStats?.total_bookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingStats?.upcoming_bookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingStats?.completed_bookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invested in Care</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-2xl font-bold">
                  €{spentPeriod === 'month' 
                    ? bookingStats?.spent_this_month.toFixed(2) 
                    : bookingStats?.total_spent.toFixed(2)}
                </div>
                {spentPeriod === 'month' && bookingStats && (
                  <div className={`flex items-center text-xs ${
                    bookingStats.spent_this_month > bookingStats.spent_last_month 
                      ? 'text-orange-500' 
                      : 'text-green-500'
                  }`}>
                    {bookingStats.spent_this_month > bookingStats.spent_last_month ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {bookingStats.spent_last_month > 0 
                      ? Math.abs(
                          ((bookingStats.spent_this_month - bookingStats.spent_last_month) / 
                          bookingStats.spent_last_month) * 100
                        ).toFixed(0)
                      : '0'}%
                  </div>
                )}
              </div>
              <Select value={spentPeriod} onValueChange={(val: 'month' | 'all') => setSpentPeriod(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs ref={tabsRef} defaultValue={initialTab} className="space-y-6 pb-20 md:pb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="favorites" className="hidden sm:flex">Favorites</TabsTrigger>
            <TabsTrigger value="favorites" className="sm:hidden">❤️</TabsTrigger>
            <TabsTrigger value="book-sitter">Book</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <div className="space-y-6">
              <HelpCard
                title="📚 Booking Management Tips"
                description="Get the most out of your booking experience"
                tips={[
                  "You can favorite sitters you trust for quick rebooking",
                  "Booking requests expire after 24 hours - book early!",
                  "Add special notes to help sitters prepare better",
                  "Check sitter profiles for languages and special skills"
                ]}
                storageKey="parent_booking_help"
              />
              <ParentBookingHistory />
            </div>
          </TabsContent>

          <TabsContent value="favorites">
            <FavoriteSitters />
          </TabsContent>

          <TabsContent value="book-sitter" id="how-it-works-section">
            <Card>
              <CardHeader>
                <CardTitle>Book a New Sitter</CardTitle>
                <CardDescription>
                  Submit a request and available sitters will respond to you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <HelpCard
                  title="🎯 How to Book a Sitter"
                  description="Follow these steps for a smooth booking"
                  tips={[
                    "Fill in all details including date, time, and number of children",
                    "Add your preferred language if you have a preference",
                    "Sitters typically respond within a few hours",
                    "You'll receive notifications when sitters apply"
                  ]}
                  storageKey="parent_booking_guide"
                />
                <RequestBasedBookingSystem />
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>
                  Your personal information and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <p className="text-lg">{parentProfile.first_name} {parentProfile.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p className="text-lg">{parentProfile.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Address</label>
                    <p className="text-lg">{parentProfile.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Number of Children</label>
                    <p className="text-lg">{parentProfile.num_children}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Children Ages</label>
                    <p className="text-lg">{parentProfile.children_ages}</p>
                  </div>
                  {parentProfile.emergency_contact && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Emergency Contact</label>
                      <p className="text-lg">{parentProfile.emergency_contact}</p>
                    </div>
                  )}
                  {parentProfile.special_needs && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Special Needs</label>
                      <p className="text-lg">{parentProfile.special_needs}</p>
                    </div>
                  )}
                </div>
                <div className="pt-4">
                  <Button onClick={() => navigate("/parent-signup?edit=true")}>
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <MobileBottomNav userType="parent" />
    </div>
  );
};

export default ParentDashboard;