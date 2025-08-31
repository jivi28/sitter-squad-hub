import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Json } from "@/integrations/supabase/types";

export interface SitterProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  school: string;
  grade: string;
  address: string;
  hourly_rate: number;
  experience: string;
  special_skills?: string;
  reference_contacts?: string;
  transportation?: string;
  availability: Json;
  child_age_groups: Json;
  status: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export const useSitter = () => {
  const { user, loading: authLoading } = useAuth();
  const [sitterProfile, setSitterProfile] = useState<SitterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSitterProfile = async () => {
      if (authLoading || !user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sitters')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        setSitterProfile(data as SitterProfile);
      } catch (err: any) {
        console.error('Error fetching sitter profile:', err);
        setError(err.message || 'Failed to fetch sitter profile');
      } finally {
        setLoading(false);
      }
    };

    fetchSitterProfile();
  }, [user, authLoading]);

  const isSitter = !!sitterProfile;
  const isApprovedSitter = sitterProfile?.status === 'approved';
  const isPendingSitter = sitterProfile?.status === 'pending';
  const isRejectedSitter = sitterProfile?.status === 'rejected';

  return {
    sitterProfile,
    loading,
    error,
    isSitter,
    isApprovedSitter,
    isPendingSitter,
    isRejectedSitter,
  };
};