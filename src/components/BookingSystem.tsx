import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, Star, Heart } from "lucide-react";

const BookingSystem = () => {
  const [selectedSitter, setSelectedSitter] = useState<number | null>(null);

  const sitters = [
    {
      id: 1,
      name: "Emma Johnson",
      age: 19,
      school: "State University",
      rating: 4.9,
      reviews: 24,
      hourlyRate: 18,
      experience: "3 years",
      specialties: ["Infants", "Homework Help"],
      avatar: "👩‍🎓",
      availability: "Weekends & Evenings"
    },
    {
      id: 2,
      name: "Michael Chen",
      age: 20,
      school: "Community College",
      rating: 4.8,
      reviews: 18,
      hourlyRate: 16,
      experience: "2 years",
      specialties: ["Toddlers", "Activities"],
      avatar: "👨‍🎓",
      availability: "Flexible Schedule"
    },
    {
      id: 3,
      name: "Sarah Williams",
      age: 21,
      school: "Local High School",
      rating: 5.0,
      reviews: 32,
      hourlyRate: 20,
      experience: "4 years",
      specialties: ["Multiple Children", "Special Needs"],
      avatar: "👩‍🎓",
      availability: "After School"
    }
  ];

  return (
    <section className="py-20 bg-gradient-soft">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Book a Sitter
          </h2>
          <p className="text-xl text-muted-foreground">
            Choose from our verified student babysitters
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-6">
              {sitters.map((sitter) => (
                <Card 
                  key={sitter.id} 
                  className={`cursor-pointer transition-all duration-300 hover:shadow-glow ${
                    selectedSitter === sitter.id ? 'ring-2 ring-primary shadow-glow' : ''
                  }`}
                  onClick={() => setSelectedSitter(sitter.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-4xl">{sitter.avatar}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-xl font-semibold text-foreground">{sitter.name}</h3>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 fill-secondary text-secondary" />
                              <span className="text-sm font-medium">{sitter.rating}</span>
                              <span className="text-sm text-muted-foreground">({sitter.reviews} reviews)</span>
                            </div>
                          </div>
                          <p className="text-muted-foreground mb-2">
                            {sitter.age} years old • {sitter.school} • {sitter.experience} experience
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {sitter.specialties.map((specialty, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{sitter.availability}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>Within 5 miles</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">${sitter.hourlyRate}</div>
                        <div className="text-sm text-muted-foreground">per hour</div>
                        <Button 
                          variant={selectedSitter === sitter.id ? "default" : "outline"} 
                          size="sm" 
                          className="mt-2"
                        >
                          {selectedSitter === sitter.id ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Booking Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input type="date" id="date" />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input type="time" id="start-time" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input type="time" id="end-time" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="children">Number of Children</Label>
                  <Input type="number" id="children" min="1" max="5" defaultValue="1" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Special Instructions</Label>
                  <textarea 
                    id="notes"
                    className="w-full h-20 px-3 py-2 border border-input rounded-md resize-none text-sm"
                    placeholder="Any special needs or instructions..."
                  />
                </div>

                {selectedSitter && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Hourly Rate:</span>
                      <span>${sitters.find(s => s.id === selectedSitter)?.hourlyRate}/hr</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Estimated Hours:</span>
                      <span>4 hours</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t border-border pt-2">
                      <span>Total:</span>
                      <span>${(sitters.find(s => s.id === selectedSitter)?.hourlyRate || 0) * 4}</span>
                    </div>
                  </div>
                )}

                <Button 
                  variant="book" 
                  className="w-full" 
                  size="lg"
                  disabled={!selectedSitter}
                >
                  Book Now
                </Button>

                <div className="text-xs text-muted-foreground text-center">
                  By booking, you agree to our terms and conditions
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingSystem;