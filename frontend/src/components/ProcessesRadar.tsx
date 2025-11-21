// src/components/ProcessesRadar.tsx - VERSIONE AGGIORNATA CON GESTIONE NON APPLICABILI
import React, { useEffect, useState } from 'react';

interface ProcessesRadarProps {
  sessionId: string;
  showSuggestions?: boolean;
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

// ✅ NUOVO INTERFACE PER STATISTICHE DETTAGLIATE
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

const ProcessesRadar: React.FC<ProcessesRadarProps> = ({ sessionId, showSuggestions = false }) => {
  const [processesData, setProcessesData] = useState<ProcessesRadarData | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);  // ✅ NUOVO STATE
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Carica dati processi
        const processesResponse = await fetch(`/api/assessment/${sessionId}/processes-radar`);
        if (processesResponse.ok) {
          const data = await processesResponse.json();
          setProcessesData(data);
        }

        // ✅ CARICA STATISTICHE DETTAGLIATE
        try {
          const statsResponse = await fetch(`/api/assessment/${sessionId}/detailed-stats`);
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setDetailedStats(statsData);
          }
        } catch (statsErr) {
          console.warn('Statistiche dettagliate non disponibili:', statsErr);
        }

        // Carica suggerimenti AI se richiesti
        if (showSuggestions) {
          try {
            const suggestionsResponse = await fetch(`/api/assessment/${sessionId}/ai-suggestions`);
            if (suggestionsResponse.ok) {
              const suggData = await suggestionsResponse.json();
              setSuggestions(suggData);
            }
          } catch (suggErr) {
            console.warn('Suggerimenti non disponibili:', suggErr);
          }
        }

      } catch (err) {
        console.error('Errore nel caricamento:', err);
        setError('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId, showSuggestions]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl shadow-xl border border-blue-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Caricamento Assessment</h3>
            <p className="text-gray-600">Elaborazione dei dati processi in corso...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-8 rounded-xl shadow-xl border border-red-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-6">
              <span className="text-3xl text-white">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Errore nel Caricamento</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto space-y-8 px-6">
        
        {/* ✅ HEADER AGGIORNATO CON INFO APPLICABILI */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">
              📊 Assessment Digitale per Processo
            </h2>
            <p className="text-blue-100 mb-2">
              Modello di valutazione Politecnico di Milano - 4 Dimensioni di Maturità
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {processesData && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 text-sm">
                  <span className="font-medium">
                    {processesData.total_processes} processi analizzati • Sessione: {sessionId.slice(0, 8)}...
                  </span>
                </div>
              )}
              {detailedStats && (
                <>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 text-sm">
                    <span className="font-medium">
                      ✅ {detailedStats.totals.applicable_questions} applicabili
                    </span>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 text-sm">
                    <span className="font-medium">
                      🚫 {detailedStats.totals.not_applicable_questions} non applicabili
                    </span>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 text-sm">
                    <span className="font-medium">
                      📊 {detailedStats.totals.applicable_percentage}% applicabili
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Le 4 Dimensioni del Modello - rimane uguale */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">
            🎯 Le 4 Dimensioni del Modello Politecnico di Milano
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-2">
                <div className="text-2xl mr-3">🏛️</div>
                <h4 className="text-lg font-bold text-blue-800">Governance</h4>
              </div>
              <p className="text-gray-700 text-sm">Best practices, standardizzazione, integrazione processi</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-2">
                <div className="text-2xl mr-3">📊</div>
                <h4 className="text-lg font-bold text-green-800">Monitoring & Control</h4>
              </div>
              <p className="text-gray-700 text-sm">Miglioramento continuo, feedback, riconfigurazione</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-2">
                <div className="text-2xl mr-3">💻</div>
                <h4 className="text-lg font-bold text-purple-800">Technology</h4>
              </div>
              <p className="text-gray-700 text-sm">Sistemi ICT, automazione, digitalizzazione</p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-2">
                <div className="text-2xl mr-3">👥</div>
                <h4 className="text-lg font-bold text-orange-800">Organization</h4>
              </div>
              <p className="text-gray-700 text-sm">Responsabilità, collaborazione, consapevolezza</p>
            </div>
          </div>
        </div>

        {/* ✅ NUOVO PANNELLO STATISTICHE RIEPILOGATIVE */}
        {detailedStats && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">
              📈 Riepilogo Statistiche per Processo
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Processo</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Applicabili</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Non Applicabili</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Totale</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Media (Solo App.)</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">% Applicabili</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedStats.by_process.map((processStats, index) => {
                    const applicablePercentage = processStats.total_questions > 0 
                      ? (processStats.applicable_count / processStats.total_questions) * 100 
                      : 0;
                    
                    return (
                      <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{processStats.process}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                            {processStats.applicable_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-sm font-medium">
                            {processStats.not_applicable_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 font-medium">
                          {processStats.total_questions}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-lg ${
                            processStats.avg_score_applicable >= 4 ? 'text-blue-600' :
                            processStats.avg_score_applicable >= 3 ? 'text-green-600' :
                            processStats.avg_score_applicable >= 2 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {processStats.avg_score_applicable.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                                style={{ width: `${applicablePercentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-600">
                              {applicablePercentage.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Processi */}
        <div className="space-y-8">
          <h3 className="text-2xl font-bold text-gray-800 text-center mb-8">
            🎯 Analisi Dettagliata per Processo
          </h3>

          {processesData && processesData.processes.map((process) => {
            // ✅ TROVA STATISTICHE DETTAGLIATE PER QUESTO PROCESSO
            const processStats = detailedStats?.by_process.find(p => p.process === process.process);
            
            return (
              <div key={process.process} className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-shadow">
                
                {/* ✅ PROCESS HEADER AGGIORNATO */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-3">{process.process}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <span className="text-sm font-medium opacity-90">Status:</span>
                        <div className="text-lg font-bold">{process.status}</div>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <span className="text-sm font-medium opacity-90">Livello:</span>
                        <div className="text-lg font-bold">{process.level}/5</div>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <span className="text-sm font-medium opacity-90">Punteggio:</span>
                        <div className="text-2xl font-bold">{process.overall_score.toFixed(1)}</div>
                      </div>
                      {processStats && (
                        <>
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                            <span className="text-sm font-medium opacity-90">Applicabili:</span>
                            <div className="text-lg font-bold text-green-200">{processStats.applicable_count}</div>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                            <span className="text-sm font-medium opacity-90">Non Appl.:</span>
                            <div className="text-lg font-bold text-amber-200">{processStats.not_applicable_count}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Process Content */}
                <div className="p-6">
                  
                  {/* 4 Dimensions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { key: 'governance', name: 'Governance', icon: '🏛️', color: 'blue' },
                      { key: 'monitoring_control', name: 'Monitoring', icon: '📊', color: 'green' },
                      { key: 'technology', name: 'Technology', icon: '💻', color: 'purple' },
                      { key: 'organization', name: 'Organization', icon: '👥', color: 'orange' }
                    ].map((dim) => {
                      const score = process.dimensions[dim.key as keyof typeof process.dimensions] || 0;
                      return (
                        <div key={dim.key} className="text-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="text-2xl mb-2">{dim.icon}</div>
                          <h5 className="font-bold text-gray-800 text-sm mb-2">{dim.name}</h5>
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {score.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500">/ 5.0 (Solo Appl.)</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ✅ AVVISO IMPORTANTE SULLE MEDIE */}
                  {processStats && processStats.not_applicable_count > 0 && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-amber-500 text-xl mr-3">ℹ️</span>
                        <div>
                          <p className="text-amber-800 font-medium text-sm">
                            Questo processo ha {processStats.not_applicable_count} domande marcate come "Non Applicabili" 
                            che sono state escluse dal calcolo delle medie.
                          </p>
                          <p className="text-amber-700 text-xs mt-1">
                            Punteggio calcolato su {processStats.applicable_count} domande applicabili su {processStats.total_questions} totali.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Radar Chart */}
                  <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">
                      📈 Radar Chart - {process.process}
                    </h4>
                    <div className="flex justify-center">
                      <img 
                        src={`/api/assessment/${sessionId}/process-radar-svg?process_name=${encodeURIComponent(process.process)}`}
                        alt={`Radar chart per ${process.process}`}
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '350px' }}
                        onError={(e) => {
                          console.error('Errore caricamento radar per:', process.process);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.error-message')) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'error-message text-gray-600 bg-gray-100 p-4 rounded-lg border text-center';
                            errorDiv.innerHTML = `<div class="text-4xl mb-2">📊</div><div class="text-sm">Radar Chart non disponibile</div><div class="text-xs mt-1 opacity-75">Basato solo su domande applicabili</div>`;
                            parent.appendChild(errorDiv);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ✅ AI SUGGESTIONS AGGIORNATE */}
        {showSuggestions && suggestions && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mb-3">
                <span className="text-2xl text-white">🤖</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Suggerimenti AI per il Miglioramento
              </h3>
              <p className="text-gray-600 text-sm">
                Analisi automatica delle aree di crescita (basata solo su domande applicabili)
              </p>
            </div>
            
            {suggestions.critical_count > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-center">
                  <span className="text-xl mr-2">⚠️</span>
                  <p className="text-red-800 font-medium">
                    {suggestions.critical_count} aree critiche identificate nelle domande applicabili che richiedono attenzione immediata
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div 
                className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: suggestions.suggestions
                    .replace(/###\s*(.*)/g, '<h3 class="text-lg font-bold text-gray-800 mt-6 mb-3 border-b border-gray-200 pb-2">$1</h3>')
                    .replace(/##\s*(.*)/g, '<h2 class="text-xl font-bold text-blue-700 mt-6 mb-4">$1</h2>')
                    .replace(/#\s*(.*)/g, '<h1 class="text-2xl font-bold text-blue-800 mt-6 mb-4">$1</h1>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-800">$1</strong>')
                    .replace(/🎯\s*(.*?)(?=\n|$)/g, '<div class="flex items-start space-x-3 mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400"><span class="text-2xl">🎯</span><div class="text-gray-700 font-medium">$1</div></div>')
                    .replace(/💰\s*(.*?)(?=\n|$)/g, '<div class="flex items-start space-x-3 mb-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-400"><span class="text-2xl">💰</span><div class="text-gray-700 font-medium">$1</div></div>')
                    .replace(/📈\s*(.*?)(?=\n|$)/g, '<div class="flex items-start space-x-3 mb-4 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400"><span class="text-2xl">📈</span><div class="text-gray-700 font-medium">$1</div></div>')
                    .replace(/📊\s*(.*?)(?=\n|$)/g, '<div class="flex items-start space-x-3 mb-4 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400"><span class="text-2xl">📊</span><div class="text-gray-700 font-medium">$1</div></div>')
                    .replace(/^\-\s+(.*)$/gm, '<div class="flex items-start space-x-2 mb-2 ml-6"><span class="text-blue-500 font-bold">•</span><div class="text-gray-700">$1</div></div>')
                    .replace(/\n\n/g, '<div class="mb-4"></div>')
                    .replace(/\n/g, '<br>')
                }}
              />
            </div>

            {/* ✅ DISCLAIMER IMPORTANTE */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-blue-500 text-xl mr-3">💡</span>
                <div>
                  <p className="text-blue-800 font-medium text-sm">
                    Nota Importante: Analisi AI
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    Questi suggerimenti sono basati esclusivamente sulle domande applicabili al vostro business. 
                    Le domande marcate come "Non Applicabili" non influenzano l'analisi AI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProcessesRadar;
