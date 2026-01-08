import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const SitterAuth = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to unified auth page with sitter role
    navigate('/auth?role=sitter', { replace: true });
  }, [navigate]);
  
  // Show loading spinner instead of blank page during redirect
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default SitterAuth;
