import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });
      
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#5DAFB0]/10 via-white to-[#E67E50]/10 flex items-center justify-center p-4">
      {/* Background decorations con colori Noscite */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#5DAFB0]/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#E67E50]/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/3 left-1/4 w-60 h-60 bg-[#5DAFB0]/15 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card principale */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Header con logo BIANCO */}
          <div className="bg-white px-8 py-12 text-center relative overflow-hidden border-b-4 border-[#5DAFB0]">
            <div className="relative z-10">
              {/* Logo Noscite */}
              <div className="flex justify-center mb-8">
                <img 
                  src="/uploads/nosciteLOGO.png" 
                  alt="Noscite" 
                  className="h-32 w-auto object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#5DAFB0' }}>
                Enterprise Assessment
              </h1>
              <p className="text-gray-600 text-sm">
                Accedi alla piattaforma professionale
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-10">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg animate-shake">
                <div className="flex items-center">
                  <span className="text-red-500 text-xl mr-3">⚠️</span>
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="nome@azienda.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#5DAFB0] focus:ring-2 focus:ring-[#5DAFB0]/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#5DAFB0] focus:ring-2 focus:ring-[#5DAFB0]/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Submit button con colori Noscite */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#5DAFB0] to-[#4A9E9F] text-white py-3 rounded-xl hover:from-[#4A9E9F] hover:to-[#3D8D8E] focus:outline-none focus:ring-4 focus:ring-[#5DAFB0]/30 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Accesso in corso...</span>
                  </>
                ) : (
                  <>
                    <span>Accedi</span>
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm">
                Problemi di accesso?{' '}
                <a href="mailto:support@noscite.it" className="font-semibold hover:underline" style={{ color: '#5DAFB0' }}>
                  Contatta il supporto
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer esterno con tagline */}
        <div className="text-center mt-8">
          <p className="text-sm font-semibold mb-2" style={{ color: '#E67E50' }}>
            In digitāli nova virtūs
          </p>
          <p className="text-gray-600 text-sm">
            © 2025 Noscite SRLS - Enterprise Assessment Platform
          </p>
        </div>
      </div>
    </div>
  );
}
