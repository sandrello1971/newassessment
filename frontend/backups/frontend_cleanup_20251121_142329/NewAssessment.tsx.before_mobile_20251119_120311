import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const NewAssessment: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const startAssessment = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('🚀 Creando sessione rapida...');
      
      // ✅ CHIAMATA API REALE
      const response = await axios.post('/api/assessment/session', {
        azienda_nome: 'Assessment Rapido', // Nome di default
        settore: 'Non specificato',
        dimensione: 'Non specificato', 
        referente: 'Non specificato',
        email: '',
        user_id: userId || undefined,
        company_id: companyId ? Number(companyId) : undefined,
      });
      
      const sessionId = response.data.id;
      console.log('✅ Sessione creata:', sessionId);
      
      // ✅ NAVIGAZIONE CORRETTA (senza /new)
      navigate(`/assessment/${sessionId}`);
      
    } catch (err: any) {
      console.error('💥 Errore creazione sessione:', err);
      
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 500) {
          setError('Errore del server. Verifica che il database sia configurato correttamente.');
        } else if (err.response?.status === 404) {
          setError('Endpoint non trovato. Verifica che l\'API sia attiva.');
        } else {
          setError(`Errore ${err.response?.status}: ${err.response?.data?.detail || 'Errore sconosciuto'}`);
        }
      } else {
        setError('Errore di connessione. Verifica la tua connessione internet.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/3 left-1/4 w-60 h-60 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="text-center mb-12">
            <button
              onClick={() => navigate('/admin/questions')}
              className="absolute top-4 right-4 z-20 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-sm transition-all"
            >
              ⚙️ Gestisci Modelli
            </button>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-4">
              Assessment Rapido
            </h1>
            <p className="text-white/70 text-xl">
              Inizia subito senza inserire dati azienda
            </p>
          </div>

          {/* Main Form Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 px-8 py-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30"></div>
              <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-20 -mt-20"></div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">⚡</span>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-2">
                  Modalità Rapida
                </h2>
                <p className="text-white/80">Salta i dati azienda e inizia subito l'assessment</p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              {error && (
                <div className="mb-8 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200 rounded-2xl flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <p className="font-medium">Errore</p>
                    <p className="text-sm opacity-90">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); startAssessment(); }} className="space-y-8">
                {/* Info Card */}
                <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 text-blue-200 rounded-2xl p-6">
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3">💡</span>
                    <h3 className="font-semibold text-blue-100">Avvio Rapido</h3>
                  </div>
                  <p className="text-blue-200/90 text-sm">
                    Questa modalità crea una sessione con dati minimi. 
                    Per un assessment completo, usa "<strong>Nuovo Assessment</strong>" dalla Dashboard.
                  </p>
                </div>

                {/* Optional Fields */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="text-2xl mr-3">⚙️</span>
                    Parametri Opzionali
                  </h3>

                  {/* ID Utente */}
                  <div>
                    <label className="block text-white/80 font-medium mb-3">
                      ID Utente (opzionale)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Inserisci ID utente"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <span className="text-white/30">👤</span>
                      </div>
                    </div>
                  </div>

                  {/* ID Azienda */}
                  <div>
                    <label className="block text-white/80 font-medium mb-3">
                      ID Azienda (opzionale)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Inserisci ID azienda esistente"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <span className="text-white/30">🏢</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-8">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-8 rounded-2xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-2xl border border-white/30 hover:scale-105 hover:shadow-blue-500/25"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                        Creazione in corso...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="mr-3 text-2xl group-hover:rotate-12 transition-transform duration-300">⚡</span>
                        Avvia Subito
                      </div>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="group bg-white/10 backdrop-blur-sm text-white py-4 px-8 rounded-2xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 font-medium border border-white/30 hover:scale-105"
                  >
                    <span className="mr-2 group-hover:rotate-12 transition-transform duration-300">←</span>
                    Dashboard
                  </button>
                </div>
              </form>

              {/* Alternative Option */}
              <div className="mt-8 pt-8 border-t border-white/20">
                <div className="text-center">
                  <p className="text-white/60 text-sm mb-4">
                    Preferisci un assessment completo con dati azienda?
                  </p>
                  <button
                    onClick={() => navigate('/company-form')}
                    className="group bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 font-medium shadow-lg border border-white/30 hover:scale-105"
                  >
                    <span className="mr-2 group-hover:rotate-12 transition-transform duration-300">🏢</span>
                    Assessment Completo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="text-center mt-8">
            <p className="text-white/50 text-sm">
              Assessment Digitale 4.0 • Modalità Rapida
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAssessment;
