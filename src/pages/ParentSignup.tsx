import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Shield, Users, Heart, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const ParentSignup = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    numChildren: "",
    childrenAges: "",
    emergencyContact: "",
    specialNeeds: "",
    agreeTerms: false,
    agreeBackground: false
  });

  // Check if user is authenticated and has profile
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    // Set email from user
    setFormData(prev => ({ ...prev, email: user.email || "" }));

    // Check if user already has a profile
    const checkProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setHasProfile(true);
          // Pre-fill form with existing data
          setFormData(prev => ({
            ...prev,
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            phone: data.phone || "",
            address: data.address || "",
            numChildren: data.num_children?.toString() || "",
            childrenAges: data.children_ages || "",
            emergencyContact: data.emergency_contact || "",
            specialNeeds: data.special_needs || ""
          }));
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }
    };

    checkProfile();
  }, [user, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be logged in to complete your profile");
      return;
    }

    if (!formData.agreeTerms || !formData.agreeBackground) {
      setError("Please agree to the terms and background verification");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const profileData = {
        user_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        num_children: parseInt(formData.numChildren),
        children_ages: formData.childrenAges,
        emergency_contact: formData.emergencyContact || null,
        special_needs: formData.specialNeeds || null
      };

      if (hasProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Profile updated!",
          description: "Your parent profile has been updated successfully.",
        });
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert(profileData);

        if (error) throw error;

        toast({
          title: "Profile completed!",
          description: "Your parent profile has been created successfully.",
        });
      }

      // Redirect to main page and scroll to booking
      window.location.href = '/#booking-system';
    } catch (error: any) {
      console.error('Profile save error:', error);
      setError(error.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-6">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {hasProfile ? "Update Your Profile" : "Complete Your Parent Profile"}
              </h1>
              <p className="text-xl text-muted-foreground">
                {hasProfile ? "Update your information and preferences" : "Complete your profile to start booking trusted babysitters"}
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Parent Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Home Address *</Label>
                        <Input
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Street, City, State, ZIP"
                          required
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="numChildren">Number of Children *</Label>
                          <Input
                            id="numChildren"
                            name="numChildren"
                            type="number"
                            min="1"
                            max="5"
                            value={formData.numChildren}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="childrenAges">Children's Ages *</Label>
                          <Input
                            id="childrenAges"
                            name="childrenAges"
                            value={formData.childrenAges}
                            onChange={handleInputChange}
                            placeholder="e.g., 3, 7, 12"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emergencyContact">Emergency Contact</Label>
                        <Input
                          id="emergencyContact"
                          name="emergencyContact"
                          value={formData.emergencyContact}
                          onChange={handleInputChange}
                          placeholder="Name and phone number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specialNeeds">Special Instructions / Medical Needs</Label>
                        <textarea
                          id="specialNeeds"
                          name="specialNeeds"
                          value={formData.specialNeeds}
                          onChange={handleInputChange}
                          className="w-full h-24 px-3 py-2 border border-input rounded-md resize-none text-sm"
                          placeholder="Any allergies, medical conditions, or special instructions..."
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="agreeTerms"
                            checked={formData.agreeTerms}
                            onCheckedChange={(checked) => handleCheckboxChange("agreeTerms", checked as boolean)}
                          />
                          <Label htmlFor="agreeTerms" className="text-sm">
                            I agree to the Terms of Service and Privacy Policy *
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="agreeBackground"
                            checked={formData.agreeBackground}
                            onCheckedChange={(checked) => handleCheckboxChange("agreeBackground", checked as boolean)}
                          />
                          <Label htmlFor="agreeBackground" className="text-sm">
                            I authorize background verification and understand all sitters are screened *
                          </Label>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        variant="hero" 
                        size="lg" 
                        className="w-full"
                        disabled={!formData.agreeTerms || !formData.agreeBackground || isLoading}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {hasProfile ? "Update Profile" : "Complete Profile"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-gradient-hero text-primary-foreground">
                  <CardContent className="p-6 text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Safety First</h3>
                    <p className="text-primary-foreground/90 text-sm">
                      All sitters undergo comprehensive background checks and verification
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Users className="w-8 h-8 text-primary" />
                      <h3 className="text-lg font-semibold">What You Get</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Access to 150+ verified sitters</li>
                      <li>• Easy online booking system</li>
                      <li>• 24/7 customer support</li>
                      <li>• Secure payment processing</li>
                      <li>• Insurance coverage</li>
                      <li>• Ratings and reviews</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-accent">
                  <CardContent className="p-6 text-center">
                    <Heart className="w-8 h-8 mx-auto mb-3 text-accent-foreground" />
                    <h3 className="font-semibold mb-2">Join 500+ Happy Families</h3>
                    <p className="text-sm text-accent-foreground/80">
                      "Best decision we made for our family's childcare needs!"
                    </p>
                    <div className="text-xs mt-2 text-accent-foreground/60">- Sarah M.</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ParentSignup;