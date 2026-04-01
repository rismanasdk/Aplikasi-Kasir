import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from "../../config/api";
import { clearStoredAuthSession } from "../storage";

export default function LoginSuccess() {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    const processLogin = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      let token = hashParams.get("token") || queryParams.get("token");

      try {
        if (!token) {
          const response = await fetch(`${API_URL}/api/auth/google/session-token`, {
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            token = data?.token || null;
          }
        }

        if (!token) {
          navigate("/login");
          return;
        }

        window.history.replaceState({}, document.title, "/login-success");
        await auth.handleGoogleToken(token);
        const redirectPath = sessionStorage.getItem("redirectAfterLogin") || "/";
        sessionStorage.removeItem("redirectAfterLogin");
        navigate(redirectPath);
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
