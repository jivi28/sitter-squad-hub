import { supabase } from "@/integrations/supabase/client";

export interface UserRoles {
  isParent: boolean;
  isSitter: boolean;
  hasBothRoles: boolean;
}

export const detectUserRole = async (userId: string): Promise<UserRoles> => {
  try {
    // Check for parent profile
    const { data: parentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    // Check for sitter profile
    const { data: sitterProfile } = await supabase
      .from('sitters')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const isParent = !!parentProfile;
    const isSitter = !!sitterProfile;

    return {
      isParent,
      isSitter,
      hasBothRoles: isParent && isSitter,
    };
  } catch (error) {
    console.error('Error detecting user role:', error);
    return {
      isParent: false,
      isSitter: false,
      hasBothRoles: false,
    };
  }
};
