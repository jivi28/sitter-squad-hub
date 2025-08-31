import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, DollarSign, Calendar, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const SitterSignup = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApplication, setHasApplication] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
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

  // Check if user is authenticated and has existing application
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    // Set email from user
    setFormData(prev => ({ ...prev, email: user.email || "" }));

    // Check if user already has a sitter application
    const checkApplication = async () => {
      try {
        const { data, error } = await supabase
          .from('sitters')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setHasApplication(true);
          setApplicationStatus(data.status);
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
        }
      } catch (error) {
        console.error('Error checking application:', error);
      }
    };

    checkApplication();
  }, [user, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("Please enter your full name");
      return false;
    }

    if (!formData.phone.trim()) {
      setError("Please enter your phone number");
      return false;
    }

    if (!formData.dateOfBirth) {
      setError("Please enter your date of birth");
      return false;
    }

    // Check if user is at least 16 years old
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (age < 16 || (age === 16 && monthDiff < 0)) {
      setError("You must be at least 16 years old to become a sitter");
      return false;
    }

    if (!formData.school.trim() || !formData.grade) {
      setError("Please provide your school and grade information");
      return false;
    }

    if (!formData.address.trim()) {
      setError("Please enter your address");
      return false;
    }

    if (!formData.hourlyRate || parseInt(formData.hourlyRate) < 15 || parseInt(formData.hourlyRate) > 30) {
      setError("Please enter a valid hourly rate between $15-$30");
      return false;
    }

    if (!formData.experience.trim()) {
      setError("Please describe your babysitting experience");
      return false;
    }

    if (!formData.agreeTerms || !formData.agreeBackground || !formData.over16) {
      setError("Please agree to all required terms");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be logged in to submit an application");
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const sitterData = {
        user_id: user.id,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim(),
        date_of_birth: formData.dateOfBirth,
        school: formData.school.trim(),
        grade: formData.grade,
        address: formData.address.trim(),
        hourly_rate: parseInt(formData.hourlyRate),
        experience: formData.experience.trim(),
        special_skills: formData.specialSkills.trim() || null,
        reference_contacts: formData.references.trim() || null,
        transportation: formData.transportation || null,
        status: 'pending'
      };

      if (hasApplication) {
        // Update existing application
        const { error } = await supabase
          .from('sitters')
          .update(sitterData)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Application updated!",
          description: "Your sitter application has been updated successfully.",
        });
      } else {
        // Create new application
        const { error } = await supabase
          .from('sitters')
          .insert(sitterData);

        if (error) throw error;

        toast({
          title: "Application submitted!",
          description: "Your sitter application has been submitted for review. You'll hear back from us within 2-3 business days.",
        });
      }

      // Redirect to main page
      window.location.href = '/';
    } catch (error: any) {
      console.error('Application submission error:', error);
      if (error.message.includes('duplicate')) {
        setError('You already have an application on file. Please update your existing application instead.');
      } else {
        setError(error.message || 'Failed to submit application');
      }
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

  // Calculate status display information
  let statusMessage, statusIcon, statusColor;
  if (hasApplication && applicationStatus) {
    switch (applicationStatus) {
      case 'pending':
        statusMessage = "Your application is under review. We'll contact you within 2-3 business days.";
        statusIcon = <Loader2 className="w-6 h-6 animate-spin" />;
        statusColor = "text-amber-600";
        break;
      case 'approved':
        statusMessage = "Congratulations! Your application has been approved. You can now start receiving bookings.";
        statusIcon = <CheckCircle className="w-6 h-6" />;
        statusColor = "text-green-600";
        break;
      case 'rejected':
        statusMessage = "Your application was not approved at this time. You can update and resubmit your application.";
        statusIcon = <AlertCircle className="w-6 h-6" />;
        statusColor = "text-red-600";
        break;
      default:
        statusMessage = "Application status unknown.";
        statusIcon = <AlertCircle className="w-6 h-6" />;
        statusColor = "text-gray-600";
    }
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
                    {/* Application Status Alert */}
                    {hasApplication && applicationStatus && (
                      <Alert className="mb-6">
                        <div className="flex items-center space-x-2">
                          <div className={statusColor}>{statusIcon}</div>
                          <AlertDescription className="flex-1">
                            <strong>Application Status:</strong> {statusMessage}
                            {applicationStatus === 'approved' && (
                              <div className="mt-2">
                                <Button 
                                  onClick={() => window.location.href = '/'}
                                  variant="outline" 
                                  size="sm"
                                >
                                  Go to Dashboard
                                </Button>
                              </div>
                            )}
                          </AlertDescription>
                        </div>
                      </Alert>
                    )}

                    {/* Error Alert */}
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
                             required
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
                         variant="default" 
                         size="lg" 
                         className="w-full"
                         disabled={!formData.agreeTerms || !formData.agreeBackground || !formData.over16 || isLoading}
                       >
                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         {hasApplication ? "Update Application" : "Submit Application"}
                       </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                 <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                   <CardContent className="p-6 text-center">
                     <DollarSign className="w-12 h-12 mx-auto mb-4 text-primary" />
                     <h3 className="text-xl font-bold mb-2">Earn $15-25/hour</h3>
                     <p className="text-muted-foreground text-sm">
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