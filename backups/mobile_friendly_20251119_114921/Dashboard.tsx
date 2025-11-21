import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface SessionEntry {
  id: string;
  creato_il: string;
  data_chiusura?: string;
  user_id?: string;
  company_id?: number;
  azienda_nome: string;
  settore?: string;
  dimensione?: string;
  referente?: string;
  effettuato_da?: string;
}

// ✅ INTERFACCIA CORRETTA - Basata sul modello database reale
interface AssessmentResult {
  id: string;
  session_id: string;
  process: string;
  category: string;
  dimension: string;
  score: number;              // ✅ Corretto: 'score' non 'answer'
  note?: string;
  is_not_applicable: boolean; // ✅ Aggiunto campo mancante
}

const Dashboard = () => {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [completedAssessments, setCompletedAssessments] = useState<number>(0);
  const navigate = useNavigate();

  // ✅ FUNZIONE CORRETTA per calcolare la media dei punteggi
  const calculateAverageScore = async () => {
    try {
      let totalScore = 0;
      let totalSessions = 0;
      let completedCount = 0;

      console.log('🔄 Calcolando media per', sessions.length, 'sessioni...');

      // Per ogni sessione, prendi i risultati e calcola la media
      for (const session of sessions) {
        try {
          const response = await axios.get(`/api/assessment/${session.id}/results`);
          const results: AssessmentResult[] = response.data;
          
          console.log(`📊 Sessione ${session.azienda_nome}:`, results.length, 'risultati totali');
          
          if (results.length > 0) {
            // ✅ Filtra solo i risultati applicabili
            const applicableResults = results.filter(r => !r.is_not_applicable);
            
            console.log(`   📈 Risultati applicabili:`, applicableResults.length);
            
            if (applicableResults.length > 0) {
              // ✅ Usa 'score' invece di 'answer'
              const sessionScore = applicableResults.reduce((sum, result) => sum + result.score, 0) / applicableResults.length;
              console.log(`   ⭐ Media sessione:`, sessionScore.toFixed(2));
              
              totalScore += sessionScore;
              totalSessions++;
              completedCount++;
            }
          } else {
            console.log(`   ⚠️ Nessun risultato per ${session.azienda_nome}`);
          }
        } catch (error) {
          console.warn(`❌ Errore nel caricamento risultati per sessione ${session.azienda_nome}:`, error);
        }
      }

      console.log('📊 Totale:', {
        totalSessions,
        totalScore: totalScore.toFixed(2),
        completedCount
      });

      // ✅ Aggiorna stati
      setCompletedAssessments(completedCount);
      
      if (totalSessions > 0) {
        const finalAverage = totalScore / totalSessions;
        console.log('✅ Media finale:', finalAverage.toFixed(2));
        setAverageScore(finalAverage);
      } else {
        console.log('⚠️ Nessuna sessione completata');
        setAverageScore(null);
      }
    } catch (error) {
      console.error('💥 Errore nel calcolo della media:', error);
      setAverageScore(null);
      setCompletedAssessments(0);
    }
  };

  useEffect(() => {
    axios.get('/api/assessment/sessions')
      .then(res => {
        if (Array.isArray(res.data)) {
          console.log('✅ Caricate', res.data.length, 'sessioni');
          setSessions(res.data);
        } else {
          console.warn("⚠️ Risposta inattesa:", res.data);
          setSessions([]);
        }
      })
      .catch(err => {
        console.error("💥 Errore nel caricamento delle sessioni:", err);
        setSessions([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Calcola la media quando le sessioni sono caricate
  useEffect(() => {
    if (sessions.length > 0) {
      calculateAverageScore();
    } else {
      setAverageScore(null);
      setCompletedAssessments(0);
    }
  }, [sessions]);

  const deleteAssessment = async (sessionId: string, companyName: string) => {
    if (!window.confirm(`⚠️ Sei sicuro di voler cancellare l'assessment di "${companyName}"?\n\nQuesta operazione è irreversibile!`)) {
      return;
    }

    try {
      await axios.delete(`/api/assessment/${sessionId}`);
      alert(`✅ Assessment "${companyName}" cancellato con successo!`);
      
      // Rimuovi dalla lista locale
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('💥 Errore cancellazione:', error);
      alert('❌ Errore durante la cancellazione. Riprova.');
    }
  };

  const getStatusColor = (date: string) => {
    const daysSince = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < 1) return 'from-emerald-500 to-emerald-600';
    if (daysSince < 7) return 'from-blue-500 to-blue-600';
    if (daysSince < 30) return 'from-amber-500 to-amber-600';
    return 'from-gray-500 to-gray-600';
  };

  const getStatusText = (date: string) => {
    const daysSince = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < 1) return 'Oggi';
    if (daysSince < 7) return `${daysSince}g fa`;
    if (daysSince < 30) return `${Math.floor(daysSince/7)}s fa`;
    return `${Math.floor(daysSince/30)}m fa`;
  };

  // ✅ Formattiamo la media con gestione casi edge
  const formatAverageScore = (score: number | null) => {
    if (score === null) {
      if (sessions.length === 0) {
        return '---'; // Nessuna sessione
      } else {
        return 'In corso'; // Sessioni esistono ma non completate
      }
    }
    return `${score.toFixed(1)}/5`;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="absolute inset-0 overflow-y-auto"></div>
      
      <div className="relative max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              Dashboard Assessment
            </h1>
            <p className="text-gray-700 text-lg">
              Gestisci e monitora tutti i tuoi assessment digitali
            </p>
          </div>
<div className="flex gap-4">          
          <button
            onClick={() => navigate('/company-form')}
            className="group bg-blue-500 text-white px-8 py-4 rounded-2xl hover:bg-blue-600 transition-all duration-300 font-bold flex items-center shadow-2xl"
          >
            <span className="mr-3 text-2xl group-hover:rotate-12 transition-transform duration-300">➕</span>
            Nuovo Assessment
          </button>
<button
            onClick={() => navigate('/admin/questions')}
            className="group bg-purple-500 text-white px-8 py-4 rounded-2xl hover:bg-purple-600 transition-all duration-300 font-bold flex items-center shadow-2xl"
          >
            <span className="mr-3 text-2xl group-hover:rotate-12 transition-transform duration-300">⚙️</span>
            Gestisci Modelli
          </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="group relative overflow-y-auto bg-white rounded-3xl p-6 text-gray-800 shadow-2xl border border-gray-200 transform hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 text-sm font-medium uppercase tracking-wider">Assessment Totali</p>
                  <p className="text-4xl font-bold mt-2">{sessions.length}</p>
                  <div className="w-16 h-1 bg-blue-300 rounded mt-3"></div>
                </div>
                <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">📊</div>
              </div>
            </div>
          </div>

          {/* ✅ AGGIORNATO: Mostra assessment completati invece di "oggi" */}
          <div className="group relative overflow-y-auto bg-white rounded-3xl p-6 text-gray-800 shadow-2xl border border-gray-200 transform hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 text-sm font-medium uppercase tracking-wider">Completati Oggi</p>
                  <p className="text-4xl font-bold mt-2">{completedAssessments}</p>
                  <div className="w-16 h-1 bg-emerald-300 rounded mt-3"></div>
                  {completedAssessments === 0 && sessions.length > 0 && (
                    <p className="text-gray-800/50 text-xs mt-2">Assessment in corso</p>
                  )}
                </div>
                <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">🚀</div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-y-auto bg-white rounded-3xl p-6 text-gray-800 shadow-2xl border border-gray-200 transform hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 text-sm font-medium uppercase tracking-wider">Media Punteggio</p>
                  <p className="text-4xl font-bold mt-2">
                    {formatAverageScore(averageScore)}
                  </p>
                  <div className="w-16 h-1 bg-purple-300 rounded mt-3"></div>
                  {/* ✅ MESSAGGI INFORMATIVI MIGLIORATI */}
                  {sessions.length === 0 && (
                    <p className="text-gray-800/50 text-xs mt-2">Nessun dato disponibile</p>
                  )}
                  {sessions.length > 0 && averageScore === null && (
                    <p className="text-gray-800/50 text-xs mt-2">Assessment non completati</p>
                  )}
                  {averageScore !== null && (
                    <p className="text-gray-800/50 text-xs mt-2">Su {completedAssessments} completati</p>
                  )}
                </div>
                <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">🎯</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Section */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6 text-gray-800 relative overflow-y-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20"></div>
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-20 -mt-20"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                📋 Sessioni Assessment
              </h2>
              <p className="text-gray-700 mt-2">Gestisci tutti i tuoi assessment aziendali</p>
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-6"></div>
                  <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 mx-auto animate-spin animation-delay-1000"></div>
                </div>
                <p className="text-gray-700 text-lg font-medium">Caricamento sessioni...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8">
                  <span className="text-6xl opacity-60">📝</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Nessun Assessment Trovato</h3>
                <p className="text-gray-700 mb-8 text-lg">Inizia creando il tuo primo assessment digitale</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => navigate('/company-form')}
                    className="group bg-gradient-to-r bg-blue-500 text-gray-800 px-10 py-4 rounded-2xl hover:bg-blue-600 transition-all duration-300 font-bold shadow-2xl border border-white/30 hover:scale-105"
                  >
                    <span className="mr-3 text-xl group-hover:rotate-12 transition-transform duration-300">🏢</span>
                    Assessment Completo
                  </button>
                  <button
                    onClick={() => navigate('/quick-assessment')}
                    className="group bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-10 py-4 rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 font-bold shadow-2xl border border-white/30 hover:scale-105"
                  >
                    <span className="mr-3 text-xl group-hover:rotate-12 transition-transform duration-300">⚡</span>
                    Quick Start
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="group bg-white/10 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-y-auto hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                          {/* Company Info */}
                          <div className="md:col-span-2">
                            <h3 className="text-lg font-bold text-gray-800 mb-1"><button onClick={() => navigate(`/session/${session.id}/edit`)} className="hover:text-blue-600 hover:underline transition-colors" title="Clicca per modificare i dati">{session.azienda_nome}</button></h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-700">
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                                {session.settore || 'Non specificato'}
                              </span>
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                                {session.dimensione || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div>
                            <p className="text-gray-700 text-sm uppercase tracking-wider mb-1">Effettuato da</p>
                            <p className="text-gray-800 font-medium">{session.effettuato_da || 'Non specificato'}</p>
                          </div>

                          {/* Dates */}
                          <div>
                            <p className="text-gray-700 text-sm uppercase tracking-wider mb-1">Data Creazione</p>
                            <p className="text-gray-800 font-medium">
                              {session.creato_il ? new Date(session.creato_il).toLocaleDateString('it-IT') : 'N/A'}
                            </p>
                            {session.data_chiusura && (
                              <>
                                <p className="text-gray-700 text-xs uppercase tracking-wider mt-2 mb-1">Chiusa il</p>
                                <p className="text-emerald-600 font-medium text-sm">
                                  {new Date(session.data_chiusura).toLocaleDateString('it-IT')}
                                </p>
                              </>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="flex justify-end">
                            <span className={`px-4 py-2 rounded-full text-xs font-bold text-gray-800 bg-gradient-to-r ${session.creato_il ? getStatusColor(session.creato_il) : 'from-gray-500 to-gray-600'} shadow-lg`}>
                              {session.creato_il ? getStatusText(session.creato_il) : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-3 ml-6">
                          <button
                            onClick={() => navigate(`/assessment/${session.id}`)}
                            className="group bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 font-medium shadow-lg border border-white/30 hover:scale-105"
                          >
                            <span className="mr-2 group-hover:rotate-12 transition-transform duration-300">▶️</span>
                            Survey
                          </button>

                          <button
                            onClick={() => navigate(`/results/${session.id}`)}
                            className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-lg border border-white/30 hover:scale-105"
                          >
                            <span className="mr-2 group-hover:rotate-12 transition-transform duration-300">📊</span>
                            Report
                          </button>
                          
                          <button
                            onClick={() => deleteAssessment(session.id, session.azienda_nome)}
                            className="group bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-medium shadow-lg border border-white/30 hover:scale-105"
                          >
                            <span className="mr-2 group-hover:rotate-12 transition-transform duration-300">🗑️</span>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-800/50 text-sm">
            Assessment Digitale 4.0 • Powered by{' '}
            <span className="text-blue-400 font-medium">Noscite - In Digitali Nova Virtus</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
