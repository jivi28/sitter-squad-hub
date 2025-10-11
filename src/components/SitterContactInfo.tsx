import { Phone, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SitterContactInfoProps {
  sitterId: string;
  sitterName: string;
  bookingStatus: string;
  paymentStatus: string;
}

interface SitterContact {
  phone: string;
  address: string;
}

export const SitterContactInfo = ({ sitterId, sitterName, bookingStatus, paymentStatus }: SitterContactInfoProps) => {
  const [contactInfo, setContactInfo] = useState<SitterContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContactInfo = async () => {
      // Only fetch if booking is confirmed AND payment is completed
      if (bookingStatus !== 'confirmed' || !['completed', 'paid'].includes(paymentStatus)) {
        setError("Contact information will be available after payment confirmation");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('sitters')
          .select('phone, address')
          .eq('id', sitterId)
          .single();

        if (fetchError) throw fetchError;
        
        setContactInfo(data);
      } catch (err: any) {
        console.error("Error fetching sitter contact info:", err);
        setError("Unable to load contact information");
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, [sitterId, bookingStatus, paymentStatus]);

  if (loading) {
    return (
      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading contact information...</span>
        </div>
      </div>
    );
  }

  if (error || !contactInfo) {
    return (
      <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">{error || "Contact information unavailable"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
      <h4 className="font-semibold mb-3 text-foreground">Contact Information for {sitterName}</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${contactInfo.phone}`} className="text-primary hover:underline">
            {contactInfo.phone}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{contactInfo.address}</span>
        </div>
      </div>
    </div>
  );
};
