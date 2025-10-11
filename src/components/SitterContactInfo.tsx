import { Phone, MapPin } from "lucide-react";

interface SitterContactInfoProps {
  phone: string;
  address: string;
  sitterName: string;
}

export const SitterContactInfo = ({ phone, address, sitterName }: SitterContactInfoProps) => {
  return (
    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
      <h4 className="font-semibold mb-3 text-foreground">Contact Information for {sitterName}</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${phone}`} className="text-primary hover:underline">
            {phone}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{address}</span>
        </div>
      </div>
    </div>
  );
};
