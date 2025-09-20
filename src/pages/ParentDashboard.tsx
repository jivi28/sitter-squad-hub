import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Clock, Users, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import ParentBookingHistory from "@/components/ParentBookingHistory";
import RequestBasedBookingSystem from "@/components/RequestBasedBookingSystem";

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
}

const ParentDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    // Don't redirect if we're still loading auth state
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }
    
    if (!user) {
      console.log('No user found, redirecting to auth');
      navigate("/auth");
      return;
    }
    
    console.log('User authenticated, fetching parent data:', user.email);
    fetchParentData();
  }, [user, authLoading, navigate]);

  const fetchParentData = async () => {
    if (!user) {
      console.log('No user available for fetching parent data');
      return;
    }

    try {
      setDataLoading(true);
      console.log('Fetching parent data for user:', user.id);

      // Fetch parent profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, redirecting to signup');
          navigate("/parent-signup");
          return;
        }
        throw profileError;
      }

      console.log('Profile fetched successfully:', profile);

      // Fetch booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("status, total_cost, booking_date")
        .eq("user_id", user.id);

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        throw bookingsError;
      }

      console.log('Bookings fetched:', bookings?.length || 0, 'bookings');

      const now = new Date();
      const stats: BookingStats = {
        total_bookings: bookings?.length || 0,
        upcoming_bookings: bookings?.filter(b => 
          new Date(b.booking_date) >= now && 
          ['pending', 'confirmed'].includes(b.status)
        ).length || 0,
        completed_bookings: bookings?.filter(b => b.status === 'completed').length || 0,
        total_spent: bookings?.reduce((sum, b) => sum + (Number(b.total_cost) || 0), 0) || 0
      };

      setParentProfile(profile);
      setBookingStats(stats);
    } catch (error) {
      console.error("Error fetching parent data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

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
      <div className="container mx-auto px-4 py-8">
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
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{bookingStats?.total_spent}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="book-sitter">Book a Sitter</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <ParentBookingHistory />
          </TabsContent>

          <TabsContent value="book-sitter">
            <Card>
              <CardHeader>
                <CardTitle>Book a New Sitter</CardTitle>
                <CardDescription>
                  Submit a request and available sitters will respond to you.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
    </div>
  );
};

export default ParentDashboard;