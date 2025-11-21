// src/pages/ResultsPage.tsx - AGGIORNATO PER GESTIRE NON APPLICABILI
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface ProcessRating {
  process: string;
  avg_score: number;
  status: string;
  level: number;
}

interface RadarData {
  benchmarks: number;
  ratings: ProcessRating[];
  total_processes: number;
}

interface SummaryData {
  session_id: string;
  total_questions: number;
  applicable_questions: number;  // ✅ NUOVO CAMPO
  not_applicable_questions: number;  // ✅ NUOVO CAMPO
  overall_score: number;
  score_distribution: { score: number; count: number }[];
  process_breakdown: {
    process: string;
    avg_score: number;
    applicable_count: number;  // ✅ RINOMINATO DA question_count
    percentage: number;
  }[];
}

interface ProcessData {
  process: string;
  dimensions: {
    governance?: number;
    monitoring_control?: number;
    technology?: number;
    organization?: number;
  };
  overall_score: number;
  status: string;
  level: number;
}

interface ProcessesRadarData {
  processes: ProcessData[];
  total_processes: number;
}

interface AISuggestions {
  critical_count: number;
  suggestions: string;
}

// ✅ NUOVO INTERFACCIA PER STATISTICHE DETTAGLIATE
interface DetailedStats {
  totals: {
    total_questions: number;
    applicable_questions: number;
    not_applicable_questions: number;
    applicable_percentage: number;
  };
  by_process: {
    process: string;
    applicable_count: number;
    not_applicable_count: number;
    avg_score_applicable: number;
    total_questions: number;
  }[];
}

// Status color mapping - rimane uguale
const getStatusColor = (status: string) => {
  switch (status) {
    case 'OTTIMO': return { bg: 'bg-emerald-500/20', text: 'text-emerald-200', border: 'border-emerald-400/30', accent: 'bg-emerald-500' };
    case 'BUONO': return { bg: 'bg-blue-500/20', text: 'text-blue-200', border: 'border-blue-400/30', accent: 'bg-blue-500' };
    case 'SUFFICIENTE': return { bg: 'bg-amber-500/20', text: 'text-amber-200', border: 'border-amber-400/30', accent: 'bg-amber-500' };
    case 'CARENTE': return { bg: 'bg-orange-500/20', text: 'text-orange-200', border: 'border-orange-400/30', accent: 'bg-orange-500' };
    default: return { bg: 'bg-red-500/20', text: 'text-red-200', border: 'border-red-400/30', accent: 'bg-red-500' };
  }
};

// Score color based on value - rimane uguale
const getScoreColor = (score: number) => {
  if (score >= 4.5) return 'text-emerald-300';
  if (score >= 3.5) return 'text-blue-300';
  if (score >= 2.5) return 'text-amber-300';
  if (score >= 1.5) return 'text-orange-300';
  return 'text-red-300';
};

// SummaryRadarComponent - rimane uguale
const SummaryRadarComponent = ({ sessionId }: { sessionId: string }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setLoading(true);
    setImageLoaded(false);
    setUseFallback(false);
    
    const testSvgEndpoint = async () => {
      try {
        const response = await fetch(`/api/assessment/${sessionId}/summary-radar-svg`);
        if (!response.ok) {
          setUseFallback(true);
        }
      } catch {
        setUseFallback(true);
      }
      setLoading(false);
    };
    
    testSvgEndpoint();
  }, [sessionId]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setLoading(false);
  };

  const handleImageError = () => {
    if (!useFallback) {
      setUseFallback(true);
      setImageLoaded(false);
    } else {
      setError('Errore nel caricamento del radar riassuntivo');
      setLoading(false);
    }
  };

  const imageUrl = useFallback
    ? `/api/assessment/${sessionId}/radar-image`
    : `/api/assessment/${sessionId}/summary-radar-svg`;

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-10 text-center border border-white/20">
        <div className="animate-spin h-12 w-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
        <p className="text-white/80 font-medium">Caricamento radar riassuntivo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-3xl p-10 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <p className="text-red-200 font-medium mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors border border-white/30"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="group bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
      <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 px-8 py-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30"></div>
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">📊 Radar Riassuntivo</h2>
              <p className="text-white/80 text-lg">Modello 4.0 - Politecnico di Milano</p>
            </div>
            {useFallback && (
              <span className="bg-amber-500/20 backdrop-blur-sm text-amber-200 px-4 py-2 rounded-full text-sm font-medium border border-amber-400/30">
                Modalità Compatibilità
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-10">
        <div className="max-w-lg mx-auto">
          <div className="text-center relative bg-gradient-to-br from-white/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-10 border border-white/20">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-2xl">
                <div className="text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
                  <p className="text-white/70">Generazione grafico in corso...</p>
                </div>
              </div>
            )}
            <img
              key={imageUrl}
              src={imageUrl}
              alt="Radar chart riassuntivo"
              className={`max-w-full h-auto mx-auto rounded-xl transition-all duration-500 ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ maxHeight: '400px', maxWidth: '400px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ProcessCard - rimane uguale ma aggiunta gestione errori migliorata
const ProcessCard = ({ process, sessionId, domains }: { process: ProcessData; sessionId: string; domains: any[] }) => {
  const statusColors = getStatusColor(process.status);
  return (
    <div className="group bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl hover:shadow-2xl transition-all duration-300 border border-white/20 overflow-hidden hover:bg-white/15 hover:scale-[1.02]">
      <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 px-6 py-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">{process.process}</h3>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text} border ${statusColors.border} backdrop-blur-sm`}>
              {process.status}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="text-2xl font-bold text-blue-300">{process.overall_score.toFixed(1)}</div>
              <div className="text-xs text-white/70">Punteggio</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="text-2xl font-bold text-emerald-300">{process.level}/5</div>
              <div className="text-xs text-white/70">Livello</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center justify-center">
                <div className={`w-3 h-3 rounded-full ${statusColors.accent} mr-2`}></div>
                <div className="text-xs text-white/70">Stato</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h4 className="text-lg font-semibold mb-4 text-white">🎯 Le 4 Dimensioni del Modello</h4>
        <div className="grid grid-cols-2 gap-4 mb-6">
           {domains.map((dim: any) => {
            const score = process.dimensions[dim.key as keyof typeof process.dimensions] || 0;
            const percentage = (score / 5) * 100;
            
            return (
              <div key={dim.key} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 hover:bg-white/10 transition-colors border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{dim.icon}</span>
                    <div>
                      <div className="font-medium text-sm text-white">{dim.name}</div>
                      <div className="text-xs text-white/60">{dim.desc}</div>
                    </div>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                    {score.toFixed(1)}
                  </span>
                </div>
                
                <div className="w-full bg-white/20 rounded-full h-3 shadow-inner">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      dim.color === 'blue' ? 'bg-blue-400' :
                      dim.color === 'green' ? 'bg-green-400' :
                      dim.color === 'purple' ? 'bg-purple-400' :
                      'bg-orange-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-br from-white/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
          <h5 className="font-semibold text-white mb-3">📈 Radar Chart - {process.process}</h5>
          <div className="max-w-xs mx-auto">
            <img 
              src={`/api/assessment/${sessionId}/process-radar-svg?process_name=${encodeURIComponent(process.process)}`}
              alt={`Radar chart per ${process.process}`}
              className="max-w-full h-auto rounded-lg mx-auto"
              style={{ maxHeight: '300px' }}
              onError={(e) => {
                console.error('Errore caricamento radar per:', process.process);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.error-message')) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'error-message text-white/70 bg-red-500/20 p-4 rounded-lg border border-red-400/30';
                  errorDiv.innerHTML = `⚠️ Radar temporaneamente non disponibile`;
                  parent.appendChild(errorDiv);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ NUOVO COMPONENTE PER STATISTICHE AGGIORNATE
const SummaryStats = ({ summaryData }: { summaryData: SummaryData | null }) => {
  if (!summaryData) return null;
  
  const applicablePercentage = summaryData.total_questions > 0 
    ? (summaryData.applicable_questions / summaryData.total_questions) * 100 
    : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
      <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-2xl border border-white/20 transform hover:scale-105 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Punteggio Medio</p>
              <p className="text-4xl font-bold mt-2">{summaryData.overall_score.toFixed(1)}/5</p>
              <div className="w-16 h-1 bg-blue-300 rounded mt-3"></div>
              <p className="text-blue-200 text-xs mt-2">Su {summaryData.applicable_questions} domande</p>
            </div>
            <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">📊</div>
          </div>
        </div>
      </div>
      
      <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-3xl p-8 text-white shadow-2xl border border-white/20 transform hover:scale-105 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Domande Totali</p>
              <p className="text-4xl font-bold mt-2">{summaryData.total_questions}</p>
              <div className="w-16 h-1 bg-emerald-300 rounded mt-3"></div>
              <p className="text-emerald-200 text-xs mt-2">{applicablePercentage.toFixed(1)}% applicabili</p>
            </div>
            <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">❓</div>
          </div>
        </div>
      </div>
      
      <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl border border-white/20 transform hover:scale-105 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium uppercase tracking-wider">Applicabili</p>
              <p className="text-4xl font-bold mt-2">{summaryData.applicable_questions}</p>
              <div className="w-16 h-1 bg-purple-300 rounded mt-3"></div>
              <p className="text-purple-200 text-xs mt-2">Incluse nelle medie</p>
            </div>
            <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">✅</div>
          </div>
        </div>
      </div>
      
      <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-3xl p-8 text-white shadow-2xl border border-white/20 transform hover:scale-105 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium uppercase tracking-wider">Non Applicabili</p>
              <p className="text-4xl font-bold mt-2">{summaryData.not_applicable_questions}</p>
              <div className="w-16 h-1 bg-amber-300 rounded mt-3"></div>
              <p className="text-amber-200 text-xs mt-2">Escluse dalle medie</p>
            </div>
            <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">🚫</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ NUOVO COMPONENTE PER STATISTICHE DETTAGLIATE
const DetailedStatsComponent = ({ sessionId }: { sessionId: string }) => {
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetailedStats = async () => {
      try {
        const response = await fetch(`/api/assessment/${sessionId}/detailed-stats`);
        if (response.ok) {
          const data = await response.json();
          setDetailedStats(data);
        }
      } catch (error) {
        console.error('Errore caricamento statistiche dettagliate:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDetailedStats();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!detailedStats) return null;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 px-8 py-6 border-b border-white/20 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">📋 Statistiche Dettagliate per Processo</h3>
          <p className="text-white/70 mt-1">Distribuzione domande applicabili vs non applicabili</p>
        </div>
      </div>
      
      <div className="p-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 backdrop-blur-sm border-b border-white/20">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-white">Processo</th>
                <th className="px-6 py-4 text-center font-bold text-white">Applicabili</th>
                <th className="px-6 py-4 text-center font-bold text-white">Non Applicabili</th>
                <th className="px-6 py-4 text-center font-bold text-white">Totale</th>
                <th className="px-6 py-4 text-center font-bold text-white">Media Applicabili</th>
                <th className="px-6 py-4 text-center font-bold text-white">% Applicabili</th>
              </tr>
            </thead>
            <tbody>
              {detailedStats.by_process.map((process, index) => {
                const applicablePercentage = process.total_questions > 0 
                  ? (process.applicable_count / process.total_questions) * 100 
                  : 0;
                
                return (
                  <tr key={index} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{process.process}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-emerald-300 font-bold">{process.applicable_count}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-amber-300 font-bold">{process.not_applicable_count}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-white/70 font-medium">{process.total_questions}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${getScoreColor(process.avg_score_applicable)}`}>
                        {process.avg_score_applicable.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-white/20 rounded-full h-2 mr-2">
                          <div 
                            className="h-2 bg-emerald-400 rounded-full transition-all duration-500" 
                            style={{ width: `${applicablePercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-white/70 text-sm font-medium">{applicablePercentage.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ResultsPage = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [processesData, setProcessesData] = useState<ProcessesRadarData | null>(null);

  // Carica domini dal template
  useEffect(() => {
    const loadDomains = async () => {
      if (!sessionId) return;
      try {
        const sessionRes = await fetch(`/api/assessment/session/${sessionId}`);
        const sessionData = await sessionRes.json();
        if (sessionData.template_version_id) {
          const domainsRes = await fetch(`/api/admin/templates/versions/${sessionData.template_version_id}/domains`);
          const domainsData = await domainsRes.json();
          setDomains(domainsData);
        }
      } catch (error) {
        console.error("Error loading domains:", error);
      }
    };
    loadDomains();
  }, [sessionId]);
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'processes' | 'analysis' | 'stats'>('overview');  // ✅ AGGIUNTO TAB 'stats'
const [domains, setDomains] = useState<any[]>([]);
  useEffect(() => {
    if (!sessionId) {
      setError('ID sessione mancante');
      setLoading(false);
      return;
    }

    const loadResults = async () => {
      try {
        setLoading(true);

        const radarResponse = await fetch(`/api/assessment/${sessionId}/radar`);
        if (radarResponse.ok) {
          setRadarData(await radarResponse.json());
        }

        const summaryResponse = await fetch(`/api/assessment/${sessionId}/summary`);
        if (summaryResponse.ok) {
          setSummaryData(await summaryResponse.json());
        }

        const processesResponse = await fetch(`/api/assessment/${sessionId}/processes-radar`);
        if (processesResponse.ok) {
          setProcessesData(await processesResponse.json());
        }

        try {
         const suggestionsResponse = await fetch(`/api/assessment/${sessionId}/ai-suggestions-enhanced?include_roadmap=true`);
          if (suggestionsResponse.ok) {
            const suggData = await suggestionsResponse.json();
            setSuggestions(suggData);
          }
        } catch {
          console.warn('Suggerimenti AI non disponibili');
        }

      } catch (err) {
        console.error(err);
        setError('Errore nel caricamento dei risultati');
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-lg p-10 rounded-3xl shadow-2xl border border-white/20">
          <div className="animate-spin h-16 w-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-6"></div>
          <h3 className="text-2xl font-bold text-white mb-2">Caricamento Assessment</h3>
          <p className="text-white/70">Elaborazione dei risultati in corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-lg p-10 rounded-3xl shadow-2xl border border-white/20">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-300 mb-4">Errore nel Caricamento</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-colors font-medium border border-white/30"
          >
            Torna alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>
      
      {/* Header */}
      <div className="relative bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-white/80 hover:text-white transition-all duration-300 font-medium bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20 hover:bg-white/20 hover:scale-105"
              >
                ← Dashboard
              </button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                  Assessment Digitale 4.0
                </h1>
                <p className="text-white/70 mt-2 text-lg">
                  Risultati completi della valutazione • Sessione: {sessionId?.slice(0, 8)}...
                  {summaryData && ` • ${summaryData.applicable_questions}/${summaryData.total_questions} domande applicabili`}
                </p>
              </div>
            </div>
            
            {summaryData && (
              <div className="flex items-center space-x-6">
                <div className="text-right bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20">
                  <div className="text-4xl font-bold text-white">{summaryData.overall_score.toFixed(1)}/5</div>
                  <div className="text-sm text-white/70 font-medium">Punteggio Globale</div>
                </div>
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/30">
                  <span className="text-3xl text-white">📈</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ NAVIGATION TABS AGGIORNATA */}
      <div className="relative max-w-7xl mx-auto px-8 mt-8">
        <div className="flex space-x-3 bg-white/10 backdrop-blur-lg p-3 rounded-2xl border border-white/20 w-fit">
          {[
            { key: 'overview', label: '📊 Panoramica', icon: '📊' },
            { key: 'processes', label: '🎯 Processi', icon: '🎯' },
            { key: 'analysis', label: '📈 Analisi', icon: '📈' },
            { key: 'stats', label: '📋 Statistiche', icon: '📋' }  // ✅ NUOVO TAB
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 transform ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-2xl scale-105 border-2 border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105 border-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-8 py-12">
        {activeTab === 'overview' && (
          <div className="space-y-12">
            <SummaryStats summaryData={summaryData} />
            
            {sessionId && <SummaryRadarComponent sessionId={sessionId} />}
            
            {/* Score Distribution */}
            {summaryData && (
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-12 border border-white/20">
                <h3 className="text-3xl font-bold mb-10 text-white text-center bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">📈 Distribuzione Punteggi (Solo Applicabili)</h3>
                <div className="max-w-3xl mx-auto">
                  <div className="space-y-8">
                    {summaryData.score_distribution.map(({ score, count }) => {
                      const percentage = summaryData.applicable_questions > 0 ? (count / summaryData.applicable_questions) * 100 : 0;
                      return (
                        <div key={score} className="group flex items-center space-x-8 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300">
                          <div className="w-20 text-center font-bold text-2xl text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-4 border border-white/30 group-hover:scale-105 transition-transform duration-300">{score}/5</div>
                          <div className="flex-1 bg-white/10 rounded-full h-8 overflow-hidden shadow-inner backdrop-blur-sm border border-white/20">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="w-28 text-right bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/30 group-hover:scale-105 transition-transform duration-300">
                            <span className="font-bold text-xl text-white block">{count}</span>
                            <span className="text-sm text-white/70">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'processes' && (
          <div className="space-y-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">🎯 Analisi Processi</h2>
              <p className="text-white/70">Valutazione dettagliata per ogni processo aziendale</p>
            </div>
            
            {processesData && sessionId && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {processesData.processes.map((process) => (
<ProcessCard key={process.process} process={process} sessionId={sessionId} domains={domains} />
                ))}
              </div>
            )}

            {/* AI Suggestions */}
            {suggestions && (
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm px-8 py-6 text-white border-b border-white/20">
                  <div className="flex items-center">
                    <span className="text-3xl mr-4">🤖</span>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">Suggerimenti AI per il Miglioramento</h3>
                      <p className="text-white/70 mt-1">Analisi automatica delle aree di crescita (solo su domande applicabili)</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  {suggestions.critical_count > 0 && (
                    <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl">
                      <div className="flex items-center justify-center">
                        <span className="text-2xl mr-3">⚠️</span>
                        <p className="text-red-200 font-medium">
                          {suggestions.critical_count} aree critiche identificate che richiedono attenzione immediata
                        </p>
                      </div>
                    </div>
                  )}

                  <div 
                    className="prose prose-invert max-w-none text-white/90"
                    dangerouslySetInnerHTML={{ 
                      __html: suggestions.suggestions
                        .replace(/###\s*(.*)/g, '<h3 class="text-lg font-bold text-white mt-6 mb-3 border-b border-white/20 pb-2">$1</h3>')
                        .replace(/##\s*(.*)/g, '<h2 class="text-xl font-bold text-blue-300 mt-6 mb-4">$1</h2>')
                        .replace(/#\s*(.*)/g, '<h1 class="text-2xl font-bold text-blue-300 mt-6 mb-4">$1</h1>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
                        .replace(/🎯\s*(.*?)(?=\n|$)/g, '<div class="flex items-start space-x-3 mb-4 p-4 bg-blue-500/20 backdrop-blur-sm rounded-lg border-l-4 border-blue-400"><span class="text-2xl">🎯</span><div class="text-white/90 font-medium">$1</div></div>')
                        .replace(/💰\s*(.*?)(?=\n|$)/g, '<div class="flex items-start space-x-3 mb-4 p-4 bg-green-500/20 backdrop-blur-sm rounded-lg border-l-4 border-green-400"><span class="text-2xl">💰</span><div class="text-white/90 font-medium">$1</div></div>')
                        .replace(/📈\s*(.*?)(?=\n|$)/g, '<div class="flex items-start space-x-3 mb-4 p-4 bg-purple-500/20 backdrop-blur-sm rounded-lg border-l-4 border-purple-400"><span class="text-2xl">📈</span><div class="text-white/90 font-medium">$1</div></div>')
                        .replace(/📊\s*(.*?)(?=\n|$)/g, '<div class="flex items-start space-x-3 mb-4 p-4 bg-orange-500/20 backdrop-blur-sm rounded-lg border-l-4 border-orange-400"><span class="text-2xl">📊</span><div class="text-white/90 font-medium">$1</div></div>')
                        .replace(/^\-\s+(.*)$/gm, '<div class="flex items-start space-x-2 mb-2 ml-6"><span class="text-blue-400 font-bold">•</span><div class="text-white/80">$1</div></div>')
                        .replace(/\n\n/g, '<div class="mb-4"></div>')
                        .replace(/\n/g, '<br>')
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-10">
            {summaryData && radarData && (
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 px-8 py-6 border-b border-white/20 text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30"></div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">📋 Riepilogo Dettagliato</h3>
                    <p className="text-white/70 mt-1">Confronto performance tra processi (solo domande applicabili)</p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 backdrop-blur-sm border-b border-white/20">
                      <tr>
                        <th className="px-6 py-4 text-left font-bold text-white">Processo</th>
                        <th className="px-6 py-4 text-center font-bold text-white">Punteggio</th>
                        <th className="px-6 py-4 text-center font-bold text-white">Domande Applicabili</th>
                        <th className="px-6 py-4 text-center font-bold text-white">Percentuale</th>
                        <th className="px-6 py-4 text-center font-bold text-white">Status</th>
                        <th className="px-6 py-4 text-center font-bold text-white">Livello</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.process_breakdown.map((process, index) => {
                        const rating = radarData.ratings.find(r => r.process === process.process);
                        const statusColors = rating ? getStatusColor(rating.status) : getStatusColor('CARENTE');
                        
                        return (
                          <tr key={index} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-bold text-white">{process.process}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-lg font-bold ${getScoreColor(process.avg_score)}`}>
                                {process.avg_score}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-white/70 font-medium">{process.applicable_count}</td>
                            <td className="px-6 py-4 text-center text-white/70 font-medium">{process.percentage}%</td>
                            <td className="px-6 py-4 text-center">
                              {rating && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors.bg} ${statusColors.text} ${statusColors.border} border backdrop-blur-sm`}>
                                  {rating.status}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-white">{rating?.level || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ✅ NUOVO TAB STATISTICHE */}
        {activeTab === 'stats' && (
          <div className="space-y-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">📋 Statistiche Dettagliate</h2>
              <p className="text-white/70">Analisi approfondita della distribuzione delle domande</p>
            </div>
            
            {sessionId && <DetailedStatsComponent sessionId={sessionId} />}
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-8 mt-20 pt-12 border-t border-white/20">
          <button 
            onClick={() => sessionId && navigate(`/assessment/${sessionId}`)}
            className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-12 py-5 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-bold flex items-center justify-center shadow-2xl border border-white/30 hover:scale-105 hover:shadow-blue-500/25"
          >
            <span className="mr-3 text-2xl group-hover:rotate-12 transition-transform duration-300">🔄</span>
            Modifica Assessment
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="group bg-gradient-to-r from-gray-600 to-gray-700 text-white px-12 py-5 rounded-2xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-bold flex items-center justify-center shadow-2xl border border-white/30 hover:scale-105 hover:shadow-gray-500/25"
          >
            <span className="mr-3 text-2xl group-hover:rotate-12 transition-transform duration-300">➕</span>
            Nuovo Assessment
          </button>
          <button 
            onClick={() => window.print()}
            className="group bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-5 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-bold flex items-center justify-center shadow-2xl border border-white/30 hover:scale-105 hover:shadow-green-500/25"
          >
            <span className="mr-3 text-2xl group-hover:rotate-12 transition-transform duration-300">🖨️</span>
            Stampa Risultati
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
