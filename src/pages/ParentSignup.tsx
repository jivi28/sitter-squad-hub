import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Users, Heart } from "lucide-react";
import Header from "@/components/Header";

const ParentSignup = () => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Parent signup form submitted:", formData);
    // Handle form submission
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Join as a Parent
              </h1>
              <p className="text-xl text-muted-foreground">
                Create your account to start booking trusted babysitters
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Parent Information</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                        disabled={!formData.agreeTerms || !formData.agreeBackground}
                      >
                        Create Parent Account
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