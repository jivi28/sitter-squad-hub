import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SitterAuth = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to unified auth page with sitter role
    navigate('/auth?role=sitter', { replace: true });
  }, [navigate]);
  
  return null;
};

export default SitterAuth;