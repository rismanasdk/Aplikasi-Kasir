import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { clearStoredAuthSession, getStoredUser } from "../storage";

interface User {
  id?: string;
  _id?: string;
  nama_lengkap: string;
  username?: string;
  role: 'admin' | 'manajer' | 'kasir' | 'user' | 'chef' | 'security';
  status: string;
  profilePicture?: string;
}

export default function LoginSuccess() {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    const processLogin = async () => {
      try {
        // Ambil token dari URL query param
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
        window.history.replaceState({}, document.title, "/login-success");

        // Simpan token dan set auth state
        await auth.handleGoogleToken(token);

        // Ambil user yang sudah disimpan
        const savedUser = getStoredUser<User>();

        if (!savedUser) {
          console.error("No user saved after handleGoogleToken");
          navigate("/login");
          return;
        }

        // Redirect berdasarkan role
        if (savedUser.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (savedUser.role === 'manajer') {
          navigate('/meneger/dashboard');
        } else if (savedUser.role === 'chef') {
          navigate('/chef/bahan-baku');
        } else if (savedUser.role === 'kasir') {
          navigate('/kasir/dashboard');
        } else if (savedUser.role === 'security') {
          navigate('/security/dashboard');
        } else {
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