import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Home, Loader2, Menu, Send, User } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import Sidebar from "../componentUtama/Sidebar";
import { API_URL } from "../../config/api";
import { getStoredToken } from "../../auth/storage";
import { useAuth } from "../../auth/hooks/useAuth";

interface FeedbackResponse {
  message?: string;
}

export default function BeriSaranPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState(user?.username || user?.nama_lengkap || "");
  const [saran, setSaran] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const saranLength = saran.trim().length;
  const canSubmit = useMemo(() => {
    return username.trim().length >= 2 && saranLength >= 10 && saranLength <= 2000 && !isSubmitting;
  }, [isSubmitting, saranLength, username]);

  const toggleSidebar = () => {
    setSidebarOpen((current) => !current);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (username.trim().length < 2) {
      setError("Username tidak valid.");
      return;
    }

    if (saranLength < 10) {
      setError("Saran minimal 10 karakter.");
      return;
    }

    if (saranLength > 2000) {
      setError("Saran maksimal 2000 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = getStoredToken();
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: username.trim(),
          saran: saran.trim(),
        }),
      });
      window.clearTimeout(timeoutId);

      const data = (await response.json().catch(() => ({}))) as FeedbackResponse;

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengirim saran.");
      }

      setMessage(data.message || "Saran berhasil dikirim.");
      setSaran("");
    } catch (err) {
      const errorMessage = err instanceof DOMException && err.name === "AbortError"
        ? "Pengiriman saran terlalu lama. Silakan coba lagi nanti."
        : err instanceof Error ? err.message : "Gagal mengirim saran.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="bg-white shadow-md rounded-b-xl">
        <div className="max-w-8x4 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <button
                type="button"
                onClick={toggleSidebar}
                className="mr-2 rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden"
                aria-label="Buka menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              <div className="flex items-center">
                <div className="rounded-xl bg-amber-500 p-2 shadow-md">
                  <span className="text-xl font-bold text-white">K+</span>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">KasirPlus</h1>
                  <p className="text-xs text-gray-500">Point of Sale System</p>
                </div>
              </div>

              <nav className="ml-10 hidden items-center md:flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-3">
                  <li>
                    <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-amber-600">
                      <Home className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </li>
                  <li className="flex items-center text-sm font-medium text-gray-500">
                    <span className="mr-3 text-gray-400">/</span>
                    Beri Saran
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex h-[calc(100vh-120px)] gap-4">
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

        <div className="flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-md sm:p-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Beri Saran</h1>
              <p className="mt-1 text-sm text-gray-600">
                Tulis masukanmu karena itu akan sangat membantu.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-6">
              {message && (
                <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{message}</p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="feedback-username" className="mb-2 block text-sm font-semibold text-gray-800">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="feedback-username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="username"
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="feedback-saran" className="block text-sm font-semibold text-gray-800">
                    Saran
                  </label>
                  <span className={`text-xs ${saranLength > 2000 ? "text-red-600" : "text-gray-500"}`}>
                    {saranLength}/2000
                  </span>
                </div>
                <textarea
                  id="feedback-saran"
                  value={saran}
                  onChange={(event) => setSaran(event.target.value)}
                  placeholder="Tulis saran, bug, masalah ui, atau feature baru..."
                  rows={8}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Kirim Saran
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
