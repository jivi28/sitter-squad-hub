import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Clock, Users, DollarSign, Languages } from "lucide-react";
import Header from "@/components/Header";
import AvailabilityManager from "@/components/AvailabilityManager";
import BookingRequests from "@/components/BookingRequests";
import BookingsList from "@/components/BookingsList";
import { useToast } from "@/hooks/use-toast";

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

const SitterDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [sitterProfile, setSitterProfile] = useState<SitterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = '/sitter-auth';
      return;
    }

    fetchSitterProfile();
  }, [user, authLoading]);

  const fetchSitterProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sitters')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // No sitter profile found, redirect to signup
        window.location.href = '/sitter-signup';
        return;
      }

      if (!data.approved_at) {
        // Not approved yet, redirect to signup page
        window.location.href = '/sitter-signup';
        return;
      }

      setSitterProfile(data);
    } catch (error) {
      console.error('Error fetching sitter profile:', error);
      toast({
        title: "Error",
        description: "Failed to load your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!sitterProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have access to the sitter dashboard.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-8">
        <div className="container mx-auto px-6">
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
                    <p className="text-2xl font-bold">{Array.isArray(sitterProfile.availability) ? sitterProfile.availability.length : 0}</p>
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
          <Tabs defaultValue="requests" className="space-y-6">
            <TabsList>
              <TabsTrigger value="requests">New Requests</TabsTrigger>
              <TabsTrigger value="availability">My Availability</TabsTrigger>
              <TabsTrigger value="bookings">My Bookings</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              <BookingRequests />
            </TabsContent>

            <TabsContent value="availability">
              <AvailabilityManager 
                sitterId={sitterProfile.id}
                currentAvailability={Array.isArray(sitterProfile.availability) ? sitterProfile.availability : []}
                onAvailabilityUpdate={fetchSitterProfile}
              />
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
                      <p className="text-muted-foreground">{sitterProfile.first_name} {sitterProfile.last_name}</p>
                    </div>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">{user.email}</p>
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
                            <span key={language} className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full">
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.href = '/sitter-signup?edit=true'}
                    >
                      Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default SitterDashboard;