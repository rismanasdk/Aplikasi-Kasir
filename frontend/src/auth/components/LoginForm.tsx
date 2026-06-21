// src/auth/components/LoginForm.tsx
import React, { useState, useEffect } from "react";
import { User, Lock, Eye, EyeOff, Home } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../hooks/useAuth';
import type { Variants } from "framer-motion";
import logologin from '../../images/logologin.jpg';
import { API_URL } from '../../config/api';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginForm() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({ username: false, password: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (isGoogleLoading) setIsGoogleLoading(false);
    };
  }, [isGoogleLoading]);

  useEffect(() => {
    if (auth.user && !auth.isLoading) {
      const from = location.state?.from?.pathname || '/';
      if (auth.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (auth.user.role === 'manajer') {
        navigate('/meneger/dashboard');
      } else if (auth.user.role === 'chef') {
        navigate('/chef/bahan-baku');
      } else if (auth.user.role === 'kasir') {
        navigate('/kasir/dashboard');
      } else {
        navigate(from);
      }
    }
  }, [auth.user, auth.isLoading, navigate, location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleFocus = (field: 'username' | 'password') =>
    setIsFocused({ ...isFocused, [field]: true });

  const handleBlur = (field: 'username' | 'password') =>
    setIsFocused({ ...isFocused, [field]: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!form.username.trim()) {
        setError("Username tidak boleh kosong");
        return;
      }
      if (!form.password.trim()) {
        setError("Password tidak boleh kosong");
        return;
      }
      const result = await auth.login(form.username, form.password);
      if (!result.success) {
        setError(result.message || "Username atau password salah");
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError("Terjadi kesalahan saat login. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
  setIsGoogleLoading(true);
  
  const currentPath = location.pathname;
  const safePath = currentPath === '/login' || currentPath === '/' ? null : currentPath;
  
  if (safePath) {
    sessionStorage.setItem('redirectAfterLogin', safePath);
  } else {
    sessionStorage.removeItem('redirectAfterLogin'); 
  }

  const targetUrl = API_URL && API_URL !== "undefined"
    ? `${API_URL}/api/auth/google`
    : `${window.location.origin}/api/auth/google`;
  window.location.href = targetUrl;
};

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, when: "beforeChildren" }
    }
  };

  const leftVariants: Variants = {
    hidden: { x: -100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", damping: 15, stiffness: 100 }
    }
  };

  const rightVariants: Variants = {
    hidden: { x: 100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", damping: 15, stiffness: 100, delay: 0.2 }
    }
  };

  const formVariants: Variants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", damping: 20, stiffness: 100 }
    }
  };

  const inputVariants: Variants = {
    rest: { scale: 1 },
    focus: {
      scale: 1.02,
      transition: { type: "spring", stiffness: 300, damping: 10 }
    }
  };

  const buttonVariants: Variants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.03,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    },
    tap: {
      scale: 0.97,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }
  };

  const errorVariants: Variants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 15 }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.2 }
    }
  };

  const Spinner = ({ color = "text-white" }: { color?: string }) => (
    <svg
      className={`animate-spin -ml-1 mr-2 h-4 w-4 ${color}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  return (
    <motion.div
      className="flex min-h-screen w-full overflow-x-hidden md:h-screen md:overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Panel Kiri — hanya render di desktop */}
      {!isMobile && (
        <motion.div
          variants={leftVariants}
          className="hidden md:flex w-1/2 bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex-col justify-center items-center p-10 relative overflow-hidden"
        >
          <div className="absolute inset-0 z-0">
            <img
              src={logologin}
              alt="Kasir App Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/80 to-yellow-400/80" />
          </div>

          <div className="z-10 flex flex-col items-center justify-center">
            <motion.h1
              className="text-5xl font-bold mb-6 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Kasir App
            </motion.h1>
            <motion.p
              className="text-xl max-w-md text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              Kelola transaksi dan produk dengan mudah, cepat, dan aman.
            </motion.p>
          </div>
        </motion.div>
      )}

      {/* Panel Kanan — Form */}
      <motion.div
        variants={rightVariants}
        className="flex w-full md:w-1/2 justify-center items-center bg-gradient-to-br from-amber-50 to-yellow-50 p-4 sm:p-6"
      >
        <motion.form
          onSubmit={handleSubmit}
          variants={formVariants}
          initial="hidden"
          animate="visible"
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md backdrop-blur-sm bg-opacity-90 relative z-10"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-6 sm:mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Selamat Datang</h2>
            <p className="text-gray-500 text-sm sm:text-base">Silakan login untuk melanjutkan</p>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                variants={errorVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-4"
              >
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Username */}
          <motion.div
            className="mb-4 sm:mb-6"
            variants={inputVariants}
            initial="rest"
            animate={isFocused.username ? "focus" : "rest"}
          >
            <div className="flex items-center border-2 border-gray-200 rounded-xl p-3 focus-within:border-orange-500 transition-colors">
              <motion.div
                animate={{ color: isFocused.username ? "#F97316" : "#9CA3AF" }}
                transition={{ duration: 0.2 }}
              >
                <User className="w-5 h-5 mr-3" />
              </motion.div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                onFocus={() => handleFocus('username')}
                onBlur={() => handleBlur('username')}
                className="w-full outline-none bg-transparent text-gray-700"
                required
              />
            </div>
          </motion.div>

          {/* Input Password */}
          <motion.div
            className="mb-6 sm:mb-8"
            variants={inputVariants}
            initial="rest"
            animate={isFocused.password ? "focus" : "rest"}
          >
            <div className="flex items-center border-2 border-gray-200 rounded-xl p-3 focus-within:border-orange-500 transition-colors">
              <motion.div
                animate={{ color: isFocused.password ? "#F97316" : "#9CA3AF" }}
                transition={{ duration: 0.2 }}
              >
                <Lock className="w-5 h-5 mr-3" />
              </motion.div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                onFocus={() => handleFocus('password')}
                onBlur={() => handleBlur('password')}
                className="w-full outline-none bg-transparent text-gray-700"
                required
              />
              <motion.button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </motion.button>
            </div>
          </motion.div>

          {/* Tombol Login */}
          <motion.button
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-70 mb-3 sm:mb-4"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Spinner />
                Loading...
              </span>
            ) : 'Login'}
          </motion.button>

          {/* Tombol Google */}
          <motion.button
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-70 mb-4 sm:mb-6"
          >
            {isGoogleLoading ? (
              <span className="flex items-center justify-center">
                <Spinner color="text-gray-700" />
                Memproses...
              </span>
            ) : (
              <>
                <GoogleIcon />
                Login Dengan Google
              </>
            )}
          </motion.button>

          {/* Daftar */}
          <motion.div
            className="mt-3 sm:mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-gray-600 text-sm">
              Belum punya akun?{' '}
              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                type="button"
                onClick={() => navigate('/register')}
                className="text-orange-500 hover:text-orange-700 font-medium"
              >
                Daftar di sini
              </motion.button>
            </p>
          </motion.div>

          {/* Kembali ke Halaman Utama */}
          <motion.div
            className="mt-4 sm:mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <motion.button
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Kembali ke Halaman Utama
            </motion.button>
          </motion.div>

          <motion.p
            className="text-center text-xs text-gray-400 mt-6 sm:mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            © 2025 Kasir App. All rights reserved.
          </motion.p>
        </motion.form>
      </motion.div>
    </motion.div>
  );
}