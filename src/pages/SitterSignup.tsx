import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, DollarSign, Calendar, AlertCircle, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SitterSignup = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    school: "",
    grade: "",
    address: "",
    hourlyRate: "",
    experience: "",
    specialSkills: "",
    references: "",
    transportation: "",
    agreeTerms: false,
    agreeBackground: false,
    over16: false
  });

  // Check authentication and existing sitter profile
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      console.log('SitterSignup: No user found, redirecting to sitter-auth');
      window.location.href = '/sitter-auth';
      return;
    }
    
    console.log('SitterSignup: User found:', user.email);

    // Check if sitter profile already exists
    const checkSitterProfile = async () => {
      try {
        console.log('SitterSignup: Checking sitter profile for user:', user.id);
        const { data, error } = await supabase
          .from('sitters')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('SitterSignup: Error fetching sitter profile:', error);
          throw error;
        }

        console.log('SitterSignup: Sitter profile data:', data);

        if (data) {
          // Check if user is explicitly accessing profile page (via "My Profile" button)
          const urlParams = new URLSearchParams(window.location.search);
          const isExplicitAccess = urlParams.get('edit') === 'true';
          
          console.log('SitterSignup: URL params edit flag:', isExplicitAccess);
          console.log('SitterSignup: Approved at:', data.approved_at);

          if (data.approved_at && !isExplicitAccess) {
            // Redirect to dashboard if already approved and not explicit access
            console.log('SitterSignup: Approved sitter accessing without edit flag, redirecting to dashboard');
            window.location.href = '/sitter-dashboard';
            return;
          }

          // Pre-fill form with existing data
          setFormData(prev => ({
            ...prev,
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            phone: data.phone || "",
            dateOfBirth: data.date_of_birth || "",
            school: data.school || "",
            grade: data.grade || "",
            address: data.address || "",
            hourlyRate: data.hourly_rate?.toString() || "",
            experience: data.experience || "",
            specialSkills: data.special_skills || "",
            references: data.reference_contacts || "",
            transportation: data.transportation || ""
          }));

          if (data.approved_at) {
            setSuccess(true);
          }
        }
      } catch (error) {
        console.error('Error checking sitter profile:', error);
      }
    };

    checkSitterProfile();
  }, [user, authLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.phone || 
          !formData.dateOfBirth || !formData.school || !formData.grade || 
          !formData.address || !formData.hourlyRate || !formData.experience) {
        throw new Error('Please fill in all required fields');
      }

      if (!formData.agreeTerms || !formData.agreeBackground || !formData.over16) {
        throw new Error('Please agree to all required terms');
      }

      // Prepare data for database
      const sitterData = {
        user_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth,
        school: formData.school,
        grade: formData.grade,
        address: formData.address,
        hourly_rate: parseInt(formData.hourlyRate),
        experience: formData.experience,
        special_skills: formData.specialSkills || null,
        reference_contacts: formData.references || null,
        transportation: formData.transportation || null,
        status: 'pending'
      };

      // Check if profile already exists
      const { data: existing } = await supabase
        .from('sitters')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing profile
        const { error } = await supabase
          .from('sitters')
          .update(sitterData)
          .eq('user_id', user.id);

        if (error) throw error;
        
          toast({
            title: "Profile Updated!",
            description: "Your profile has been updated successfully.",
          });
          
          // Check if this is an approved sitter editing their profile
          const { data: currentProfile } = await supabase
            .from('sitters')
            .select('approved_at')
            .eq('user_id', user.id)
            .single();
          
          if (currentProfile?.approved_at) {
            // Redirect approved sitters back to dashboard after edit
            setTimeout(() => {
              window.location.href = '/sitter-dashboard';
            }, 1000);
            return;
          }
        } else {
          // Create new profile
          const { error } = await supabase
            .from('sitters')
            .insert([sitterData]);

          if (error) throw error;
          
          toast({
            title: "Application Submitted!",
            description: "Your sitter application has been submitted for review.",
          });
        }

        setSuccess(true);
    } catch (error: any) {
      console.error('Error submitting sitter application:', error);
      setError(error.message || 'Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-success/10 border border-success/20 rounded-lg p-8 mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  Application Submitted Successfully! 🎉
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Thank you for applying to become a BabySit Club sitter. We'll review your application and get back to you within 2-3 business days.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Next Steps:</strong></p>
                  <p>1. Background check verification (2-3 days)</p>
                  <p>2. Phone interview with our team</p>
                  <p>3. Safety training session</p>
                  <p>4. Start receiving booking requests!</p>
                </div>
              </div>
              <Button onClick={() => window.location.href = '/'} variant="hero" size="lg">
                Return to Home
              </Button>
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
                Become a Sitter
              </h1>
              <p className="text-xl text-muted-foreground">
                Join our community of trusted student babysitters
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Sitter Application</CardTitle>
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
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={user?.email || ""}
                            disabled
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
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

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                          <Input
                            id="dateOfBirth"
                            name="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="school">School/University *</Label>
                          <Input
                            id="school"
                            name="school"
                            value={formData.school}
                            onChange={handleInputChange}
                            placeholder="Enter your school name"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="grade">Grade/Year *</Label>
                          <Select value={formData.grade} onValueChange={(value) => handleSelectChange("grade", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your grade/year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high-school-senior">High School Senior</SelectItem>
                              <SelectItem value="college-freshman">College Freshman</SelectItem>
                              <SelectItem value="college-sophomore">College Sophomore</SelectItem>
                              <SelectItem value="college-junior">College Junior</SelectItem>
                              <SelectItem value="college-senior">College Senior</SelectItem>
                              <SelectItem value="graduate">Graduate Student</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hourlyRate">Desired Hourly Rate *</Label>
                          <Input
                            id="hourlyRate"
                            name="hourlyRate"
                            type="number"
                            min="15"
                            max="30"
                            value={formData.hourlyRate}
                            onChange={handleInputChange}
                            placeholder="$15-25/hour"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Address *</Label>
                        <Input
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Street, City, State, ZIP"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="experience">Babysitting Experience *</Label>
                        <textarea
                          id="experience"
                          name="experience"
                          value={formData.experience}
                          onChange={handleInputChange}
                          className="w-full h-24 px-3 py-2 border border-input rounded-md resize-none text-sm"
                          placeholder="Describe your experience with children, any certifications, etc."
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specialSkills">Special Skills & Certifications</Label>
                        <textarea
                          id="specialSkills"
                          name="specialSkills"
                          value={formData.specialSkills}
                          onChange={handleInputChange}
                          className="w-full h-20 px-3 py-2 border border-input rounded-md resize-none text-sm"
                          placeholder="CPR certified, First Aid, tutoring experience, languages spoken, etc."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="references">References</Label>
                        <textarea
                          id="references"
                          name="references"
                          value={formData.references}
                          onChange={handleInputChange}
                          className="w-full h-20 px-3 py-2 border border-input rounded-md resize-none text-sm"
                          placeholder="Previous families you've worked with, teachers, etc. (Name and contact info)"
                        />
                      </div>

                        <div className="space-y-2">
                          <Label htmlFor="transportation">Transportation</Label>
                          <Select value={formData.transportation} onValueChange={(value) => handleSelectChange("transportation", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="How do you get around?" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="own-car">Own Car</SelectItem>
                              <SelectItem value="parent-dropoff">Parent Drop-off</SelectItem>
                              <SelectItem value="public-transport">Public Transportation</SelectItem>
                              <SelectItem value="walking-biking">Walking/Biking</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="over16"
                            checked={formData.over16}
                            onCheckedChange={(checked) => handleCheckboxChange("over16", checked as boolean)}
                          />
                          <Label htmlFor="over16" className="text-sm">
                            I confirm that I am at least 16 years old *
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="agreeBackground"
                            checked={formData.agreeBackground}
                            onCheckedChange={(checked) => handleCheckboxChange("agreeBackground", checked as boolean)}
                          />
                          <Label htmlFor="agreeBackground" className="text-sm">
                            I consent to background checks and verification *
                          </Label>
                        </div>

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
                      </div>

                      <Button 
                        type="submit" 
                        variant="book" 
                        size="lg" 
                        className="w-full"
                        disabled={!formData.agreeTerms || !formData.agreeBackground || !formData.over16 || isLoading}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Application
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-gradient-secondary text-secondary-foreground">
                  <CardContent className="p-6 text-center">
                    <DollarSign className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Earn $15-25/hour</h3>
                    <p className="text-secondary-foreground/90 text-sm">
                      Flexible schedule that works with your studies
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <GraduationCap className="w-8 h-8 text-primary" />
                      <h3 className="text-lg font-semibold">Requirements</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Must be at least 16 years old</li>
                      <li>• Currently enrolled in school</li>
                      <li>• Pass background check</li>
                      <li>• Provide references</li>
                      <li>• Complete safety training</li>
                      <li>• Valid phone number</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-muted">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Calendar className="w-8 h-8 text-primary" />
                      <h3 className="text-lg font-semibold">Next Steps</h3>
                    </div>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                      <li>1. Submit application</li>
                      <li>2. Background check (2-3 days)</li>
                      <li>3. Phone interview</li>
                      <li>4. Safety training session</li>
                      <li>5. Start getting bookings!</li>
                    </ol>
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

export default SitterSignup;