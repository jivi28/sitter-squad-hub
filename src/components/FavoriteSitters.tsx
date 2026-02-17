import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Star, Calendar, Heart, Euro, Languages } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { useNavigate } from "react-router-dom";

interface FavoriteSitter {
  id: string;
  sitter_id: string;
  created_at: string;
  sitters: {
    id: string;
    first_name: string;
    last_name: string;
    hourly_rate: number;
    experience: string;
    languages: string[] | null;
    special_skills: string | null;
    school: string;
    pet_experience: string | null;
  };
}

export const FavoriteSitters = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteSitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data: favoritesData, error: favError } = await supabase
        .from("favorite_sitters")
        .select("id, sitter_id, created_at")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (favError) throw favError;

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        return;
      }

      // Fetch sitter details for each favorite
      const favoritesWithSitters = await Promise.all(
        favoritesData.map(async (fav) => {
          const { data: sitterData, error: sitterError } = await supabase
            .from("sitters_public_view" as any)
            .select("id, first_name, last_name, hourly_rate, experience, languages, special_skills, school, pet_experience")
            .eq("id", fav.sitter_id)
            .single();

          if (sitterError || !sitterData) {
            console.error("Error fetching sitter:", sitterError);
            return null;
          }

          return {
            ...fav,
            sitters: sitterData as any
          };
        })
      );

      // Filter out any null results
      const validFavorites = favoritesWithSitters.filter(Boolean) as FavoriteSitter[];
      setFavorites(validFavorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast({
        title: "Error",
        description: "Failed to load favorite sitters.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      setRemoving(favoriteId);
      const { error } = await supabase
        .from("favorite_sitters")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      toast({
        title: "Removed",
        description: "Sitter removed from favorites.",
      });

      fetchFavorites();
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast({
        title: "Error",
        description: "Failed to remove favorite.",
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  };

  const handleBookFavorite = () => {
    navigate("/parent-dashboard?tab=book-sitter");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No Favorite Sitters Yet"
        description="Save your trusted sitters to quickly book them again in the future."
        tips={[
          "Complete a booking to add that sitter to favorites",
          "Favorite sitters appear here for quick access",
          "You can book favorite sitters with just a few clicks"
        ]}
        actionLabel="Browse Available Sitters"
        onAction={handleBookFavorite}
      />
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Favorite Sitters</h2>
          <p className="text-muted-foreground">Your trusted babysitters</p>
        </div>
        <Badge variant="secondary">{favorites.length} favorites</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {favorites.map((favorite) => (
          <Card key={favorite.id} className="hover-scale">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10">
                      {getInitials(favorite.sitters.first_name, favorite.sitters.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {favorite.sitters.first_name} {favorite.sitters.last_name}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {favorite.sitters.school}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-primary">€{favorite.sitters.hourly_rate}/hr</span>
              </div>

              {favorite.sitters.languages && favorite.sitters.languages.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                    <Languages className="h-4 w-4" />
                    <span>Languages:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {favorite.sitters.languages.map((lang, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {favorite.sitters.pet_experience && (
                <Badge variant="secondary" className="w-full justify-center">
                  🐾 Pet Friendly
                </Badge>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleBookFavorite} className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Again
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeFavorite(favorite.id)}
                  disabled={removing === favorite.id}
                >
                  {removing === favorite.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Heart className="h-4 w-4 fill-current" />
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
