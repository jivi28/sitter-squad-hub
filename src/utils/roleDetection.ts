import { supabase } from "@/integrations/supabase/client";

export interface UserRoles {
  isParent: boolean;
  isSitter: boolean;
  hasBothRoles: boolean;
}

export const detectUserRole = async (userId: string): Promise<UserRoles> => {
  try {
    // Check user roles from the user_roles table
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const roleSet = new Set(roles?.map(r => r.role) || []);
    
    const isParent = roleSet.has('parent');
    const isSitter = roleSet.has('sitter');

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
