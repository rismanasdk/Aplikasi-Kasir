import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginSuccess() {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const token = hashParams.get("token") || queryParams.get("token");

    if (token) {
      window.history.replaceState({}, document.title, "/login-success");
      auth.handleGoogleToken(token)
        .then(() => {
          const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirectPath);
        })
        .catch((err) => {
          console.error('Error processing Google token:', err);
          localStorage.removeItem("token");
          navigate("/login");
        });
    } else {
      navigate("/login");
    }
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
