import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Clock, MapPin, MessageSquare, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SitterApplication {
  id: string;
  sitter_id: string;
  response: string;
  message: string | null;
  created_at: string;
  sitters: {
    id: string;
    first_name: string;
    last_name: string;
    hourly_rate: number;
    experience: string;
    languages: string[] | null;
    child_age_groups: any;
    special_skills: string | null;
    school: string;
  };
}

interface SitterApplicationsProps {
  bookingId: string;
  onSitterSelected: () => void;
}

const SitterApplications = ({ bookingId, onSitterSelected }: SitterApplicationsProps) => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<SitterApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [bookingId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("booking_responses")
        .select(`
          id,
          sitter_id,
          response,
          message,
          created_at,
          booking_id
        `)
        .eq("booking_id", bookingId)
        .eq("response", "accepted")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch sitter details for each application
      const applicationsWithSitters = await Promise.all(
        (data || []).map(async (application) => {
          const { data: sitterData, error: sitterError } = await supabase
            .from("sitters")
            .select(`
              id, first_name, last_name, hourly_rate, experience, 
              languages, child_age_groups, special_skills, school
            `)
            .eq("id", application.sitter_id)
            .single();

          if (sitterError) {
            console.error("Error fetching sitter:", sitterError);
            return null;
          }

          return {
            ...application,
            sitters: sitterData
          };
        })
      );

      // Filter out any null results
      const validApplications = applicationsWithSitters.filter(Boolean) as SitterApplication[];
      setApplications(validApplications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load sitter applications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSitter = async (sitterId: string) => {
    try {
      setSelecting(sitterId);

      const { data, error } = await supabase.functions.invoke('select-sitter', {
        body: {
          booking_id: bookingId,
          sitter_id: sitterId
        }
      });

      if (error) throw error;

      toast({
        title: "Sitter Selected!",
        description: data.message,
      });

      onSitterSelected();
    } catch (error: any) {
      console.error("Error selecting sitter:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to select sitter.",
        variant: "destructive",
      });
    } finally {
      setSelecting(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just applied";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Sitter Applications</h3>
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-pulse">Loading applications...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Sitter Applications</h3>
        <Card>
          <CardContent className="py-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No sitters have applied yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sitter Applications</h3>
        <Badge variant="secondary">{applications.length} applications</Badge>
      </div>
      
      <div className="grid gap-4">
        {applications.map((application) => (
          <Card key={application.id} className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10">
                      {getInitials(application.sitters.first_name, application.sitters.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {application.sitters.first_name} {application.sitters.last_name}
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">
                          {application.sitters.school}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatTimeAgo(application.created_at)}
                      </div>
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    €{application.sitters.hourly_rate}/hr
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Experience</p>
                  <p className="text-sm">{application.sitters.experience}</p>
                </div>
                
                {application.sitters.languages && application.sitters.languages.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Languages</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {application.sitters.languages.map((lang, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {application.sitters.special_skills && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Special Skills</p>
                  <p className="text-sm">{application.sitters.special_skills}</p>
                </div>
              )}

              {application.message && (
                <div className="p-3 bg-accent/50 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Message from sitter:</p>
                  <p className="text-sm italic">"{application.message}"</p>
                </div>
              )}

              <div className="pt-2 border-t">
                <Button
                  onClick={() => handleSelectSitter(application.sitters.id)}
                  disabled={selecting !== null}
                  className="w-full"
                >
                  {selecting === application.sitters.id ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      Selecting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Select {application.sitters.first_name}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SitterApplications;