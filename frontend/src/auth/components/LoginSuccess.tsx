import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { clearStoredAuthSession } from "../storage";
import { useRef } from "react";

export default function LoginSuccess() {
  const navigate = useNavigate();
  const auth = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return; 
    processed.current = true;

    const processLogin = async () => {
      
      try {
        console.log("LoginSuccess mounted");
        console.log("Current URL:", window.location.href);
        const queryParams = new URLSearchParams(window.location.search);
        const token = queryParams.get("token");
        const error = queryParams.get("error");

        // Handle error dari Google
        if (error) {
          console.error("Google OAuth error:", error);
          navigate("/login");
          return;
        }

        
        if (!token) {
          console.error("No token found in URL");
          navigate("/login");
          return;
        }
        
        // Bersihkan token dari URL
        const authSession = await auth.handleGoogleToken(token);
        
        window.history.replaceState({}, document.title, "/login-success");
        if (!authSession) {
          console.error("No auth session after handleGoogleToken");
          navigate("/login");
          return;
        }

        const roleCode = authSession.role?.code || authSession.user?.role;
        if (roleCode === 'super-admin') {
          navigate('/super-admin/dashboard');
        } else if (roleCode === 'admin') {
          navigate('/admin/dashboard');
        } else if (roleCode === 'manajer') {
          navigate('/meneger/dashboard');
        } else if (roleCode === 'chef') {
          navigate('/chef/bahan-baku');
        } else if (roleCode === 'kasir') {
          navigate('/kasir/dashboard');
        } else if (roleCode === 'security') {
          navigate('/security/dashboard');
        } else if (roleCode === 'user') {
          navigate('/');
        }
      } catch (err) {
        console.error("Error processing Google token:", err);
        clearStoredAuthSession();
        navigate("/login");
      }
    };

    processLogin();
  }, [navigate, auth]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Sedang memproses login...</p>
      </div>
    </div>
  );
}