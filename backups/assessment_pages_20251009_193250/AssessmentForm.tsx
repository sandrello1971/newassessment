// src/pages/AssessmentForm.tsx - VERSIONE AGGIORNATA CON 0 E NON APPLICABILE
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

interface Question {
  process: string;
  category: string;
  dimension: string;
}

interface Answer extends Question {
  score: number;
  note?: string;
  is_not_applicable?: boolean;  // ✅ NUOVO CAMPO
}

interface CategoryGroup {
  category: string;
  dimensions: Question[];
}

interface SessionInfo {
  id: string;
  azienda_nome: string;
  settore?: string;
  dimensione?: string;
  referente?: string;
  email?: string;
}

// ✅ COMPONENTE PER SELEZIONE PUNTEGGIO CON OPZIONI AVANZATE - SLIDER CORRETTO
const ScoreSelector: React.FC<{
  value: number;
  isNotApplicable: boolean;
  onChange: (score: number, isNotApplicable: boolean) => void;
  questionText: string;
}> = ({ value, isNotApplicable, onChange, questionText }) => {
  
  const handleScoreChange = (newScore: number) => {
    onChange(newScore, false);
  };
  
  const handleNotApplicableToggle = () => {
    onChange(value, !isNotApplicable);
  };

  // ✅ CALCOLO CORRETTO DEL GRADIENTE
  const getSliderBackground = (currentValue: number) => {
    const percentage = (currentValue / 5) * 100;
    
    // Colori per ogni valore
    const colors = [
      '#ef4444', // 0 - Rosso (Totale assenza)
      '#f97316', // 1 - Arancione (Molto carente)  
      '#f59e0b', // 2 - Giallo scuro (Carente)
      '#eab308', // 3 - Giallo (Sufficiente)
      '#22c55e', // 4 - Verde (Buono)
      '#3b82f6'  // 5 - Blu (Eccellente)
    ];
    
    if (currentValue === 0) {
      return `linear-gradient(to right, ${colors[0]} 0%, ${colors[0]} 0%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) 100%)`;
    }
    
    const currentColor = colors[currentValue];
    return `linear-gradient(to right, ${currentColor} 0%, ${currentColor} ${percentage}%, rgba(255,255,255,0.2) ${percentage}%, rgba(255,255,255,0.2) 100%)`;
  };

  return (
    <div className="space-y-4">
      <p className="mb-4 font-medium text-white leading-relaxed">{questionText}</p>
      
      {/* Toggle Non Applicabile */}
      <div className="flex items-center space-x-3 p-4 bg-gray-500/20 backdrop-blur-sm rounded-xl border border-gray-400/30">
        <input
          type="checkbox"
          id={`na-${questionText.slice(0, 20)}`}
          checked={isNotApplicable}
          onChange={handleNotApplicableToggle}
          className="w-5 h-5 text-yellow-500 bg-white/10 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2"
        />
        <label htmlFor={`na-${questionText.slice(0, 20)}`} className="text-yellow-200 font-medium cursor-pointer">
          🚫 Non Applicabile
        </label>
        {isNotApplicable && (
          <span className="text-yellow-200/70 text-sm italic">
            (escluso dalle medie)
          </span>
        )}
      </div>

      {/* Selettore Punteggio */}
      {!isNotApplicable && (
        <div className="space-y-4">
          {/* Labels descrittive */}
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Totale assenza</span>
            <span>Molto carente</span>
            <span>Carente</span>
            <span>Sufficiente</span>
            <span>Buono</span>
            <span>Eccellente</span>
          </div>
          
          {/* Slider da 0 a 5 - CORRETTO */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60 font-medium">0</span>
            <input
              type="range"
              min="0"
              max="5"
              value={value}
              onChange={e => handleScoreChange(Number(e.target.value))}
              className="flex-1 h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: getSliderBackground(value)
              }}
            />
            <span className="text-sm text-white/60 font-medium">5</span>
            <div className={`px-4 py-2 rounded-xl font-bold min-w-[60px] text-center shadow-lg text-white ${
              value === 0 ? 'bg-red-600' :
              value === 1 ? 'bg-orange-600' :
              value === 2 ? 'bg-yellow-600' :
              value === 3 ? 'bg-yellow-500' :
              value === 4 ? 'bg-green-500' :
              'bg-blue-500'
            }`}>
              {value}
            </div>
          </div>
          
          {/* Descrizione del punteggio */}
          <div className="text-center">
            <span className={`text-sm font-medium ${
              value === 0 ? 'text-red-300' :
              value === 1 ? 'text-orange-300' :
              value === 2 ? 'text-yellow-300' :
              value === 3 ? 'text-yellow-200' :
              value === 4 ? 'text-green-300' :
              'text-blue-300'
            }`}>
              {value === 0 && '🔴 Totale Assenza'}
              {value === 1 && '🟠 Molto Carente'}
              {value === 2 && '🟡 Carente'}
              {value === 3 && '🟨 Sufficiente'}
              {value === 4 && '🟢 Buono'}
              {value === 5 && '🔵 Eccellente'}
            </span>
          </div>
        </div>
      )}
      
      {/* Messaggio se Non Applicabile */}
      {isNotApplicable && (
        <div className="text-center p-4 bg-yellow-500/20 backdrop-blur-sm rounded-xl border border-yellow-400/30">
          <span className="text-yellow-200 font-medium">
            ⚠️ Questa domanda è marcata come "Non Applicabile" e non influenzerà i punteggi medi
          </span>
        </div>
      )}
    </div>
  );
};

const AssessmentForm: React.FC = () => {
  const { sessionId } = useParams();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [groupedQuestions, setGroupedQuestions] = useState<Record<string, CategoryGroup[]>>({});
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<string>('');
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      setSubmissionStatus('ID sessione mancante');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // Carica sessione
        console.log('🔄 Caricamento sessione specifica:', sessionId);
        const sessionResponse = await axios.get(`/api/assessment/session/${sessionId}`);
        const session = sessionResponse.data;
        
        setSessionInfo(session);
        console.log('✅ Sessione caricata:', session);

        // Carica JSON domande
        console.log('🔄 Caricamento JSON domande...');
        const jsonResponse = await axios.get('/i40_assessment_fto.json', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        let questionsData = jsonResponse.data;
        
        if (typeof questionsData === 'string' && questionsData.includes('<html>')) {
          throw new Error('Ricevuto HTML invece di JSON - probabilmente il file non è stato trovato (404)');
        }
        
        if (typeof questionsData === 'string') {
          console.log('🔧 Parsing JSON string...');
          try {
            const cleanedJsonString = questionsData
              .replace(/:\s*NaN/g, ': null')
              .replace(/:\s*Infinity/g, ': null')
              .replace(/:\s*-Infinity/g, ': null');
            
            questionsData = JSON.parse(cleanedJsonString);
            console.log('✅ JSON string parsato correttamente');
          } catch (parseError) {
            console.error('❌ Errore nel parsing JSON:', parseError);
            throw new Error('JSON malformato: ' + (parseError as Error).message);
          }
        }
        
        if (!Array.isArray(questionsData)) {
          if (questionsData.data && Array.isArray(questionsData.data)) {
            questionsData = questionsData.data;
          } else if (questionsData.processes && Array.isArray(questionsData.processes)) {
            questionsData = questionsData.processes;
          } else if (questionsData.questions && Array.isArray(questionsData.questions)) {
            questionsData = questionsData.questions;
          } else {
            throw new Error(`JSON non è un array valido. Tipo ricevuto: ${typeof questionsData}`);
          }
        }

        // Processa le domande
        const grouped: Record<string, CategoryGroup[]> = {};
        const allAnswers: Answer[] = [];

        questionsData.forEach((processGroup: any) => {
          if (!processGroup.activities || !Array.isArray(processGroup.activities) || processGroup.activities.length === 0) {
            return;
          }

          const processName = processGroup.process;
          if (!grouped[processName]) {
            grouped[processName] = [];
          }

          const categoriesMap: Record<string, Question[]> = {};

          processGroup.activities.forEach((activity: any) => {
            const activityName = activity.name;
            
            if (!activity.categories || typeof activity.categories !== 'object') {
              return;
            }

            Object.keys(activity.categories).forEach(categoryName => {
              const categoryData = activity.categories[categoryName];
              
              if (!categoriesMap[categoryName]) {
                categoriesMap[categoryName] = [];
              }

              if (categoryData && typeof categoryData === 'object') {
                Object.keys(categoryData).forEach(dimensionKey => {
                  const dimensionValue = categoryData[dimensionKey];
                  
                  if (dimensionKey === 'note' || dimensionValue == null || 
                      (typeof dimensionValue === 'number' && isNaN(dimensionValue))) {
                    return;
                  }

                  const question: Question = {
                    process: processName,
                    category: categoryName,
                    dimension: `${activityName} - ${dimensionKey}`
                  };

                  categoriesMap[categoryName].push(question);
                  // ✅ DEFAULT ora è 3, is_not_applicable = false
                  allAnswers.push({ 
                    ...question, 
                    score: 3, 
                    note: '', 
                    is_not_applicable: false 
                  });
                });
              }
            });
          });

          Object.keys(categoriesMap).forEach(categoryName => {
            if (categoriesMap[categoryName].length > 0) {
              grouped[processName].push({
                category: categoryName,
                dimensions: categoriesMap[categoryName]
              });
            }
          });
        });
        
        setGroupedQuestions(grouped);
        setAnswers(allAnswers);

      } catch (error) {
        console.error('💥 Errore completo nel caricamento:', error);
        setSubmissionStatus('Errore: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId]);

  const handleScoreChange = (index: number, score: number, isNotApplicable: boolean) => {
    setAnswers(prev => {
      const updated = [...prev];
      updated[index].score = score;
      updated[index].is_not_applicable = isNotApplicable;
      return updated;
    });
  };

  const handleNoteChange = (index: number, note: string) => {
    setAnswers(prev => {
      const updated = [...prev];
      updated[index].note = note;
      return updated;
    });
  };

  const validateAnswers = () => {
    return answers.every(a => {
      // Se è "non applicabile", è sempre valida
      if (a.is_not_applicable) return true;
      // Altrimenti deve avere un punteggio tra 0 e 5
      return a.score >= 0 && a.score <= 5;
    });
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) {
      setSubmissionStatus('Per favore completa tutte le valutazioni (0-5) o marca come "Non Applicabile".');
      return;
    }

    if (!sessionId) {
      setSubmissionStatus('ID sessione mancante');
      return;
    }

    try {
      setSubmissionStatus('📤 Invio in corso... Questo può richiedere alcuni secondi.');
      console.log('🚀 Inviando', answers.length, 'risposte...');
      
      const response = await axios.post(`/api/assessment/${sessionId}/submit`, answers, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Risposta server:', response.data);
      setSubmissionStatus('✅ Assessment inviato con successo! Reindirizzamento...');
      setTimeout(() => navigate(`/results/${sessionId}`), 1500);
    } catch (error) {
      console.error('💥 Errore durante invio:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 500) {
          setSubmissionStatus("❌ Errore del server (500). Verifica che il database sia configurato correttamente.");
        } else if (error.response?.status === 404) {
          setSubmissionStatus("❌ Endpoint non trovato. Verifica che l'API sia attiva.");
        } else {
          setSubmissionStatus(`❌ Errore ${error.response?.status}: ${error.response?.data?.message || 'Errore sconosciuto'}`);
        }
      } else {
        setSubmissionStatus("❌ Errore di connessione. Verifica la tua connessione internet.");
      }
    }
  };

  // Loading State - rimane uguale
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 mx-auto animate-spin animation-delay-1000"></div>
          </div>
          <p className="text-white/80 text-lg font-medium">Caricamento assessment...</p>
        </div>
      </div>
    );
  }

  // Error State - rimane uguale
  if (!sessionInfo || Object.keys(groupedQuestions).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 max-w-2xl text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {!sessionInfo ? 'Sessione non trovata' : 'Nessuna domanda caricata'}
          </h2>
          <p className="text-white/70 mb-8">{submissionStatus}</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-lg border border-white/30 hover:scale-105"
            >
              <span className="mr-2 group-hover:rotate-12 transition-transform duration-300">🔄</span>
              Riprova
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="group bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-300 font-medium border border-white/30 hover:scale-105"
            >
              <span className="mr-2 group-hover:rotate-12 transition-transform duration-300">←</span>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ STATISTICHE AGGIORNATE PER INCLUDERE NON APPLICABILI
  const applicableCount = answers.filter(a => !a.is_not_applicable).length;
  const notApplicableCount = answers.filter(a => a.is_not_applicable).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/3 left-1/4 w-60 h-60 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-4">
            Assessment Digitale 4.0
          </h1>
          <p className="text-white/70 text-xl">
            Valuta la maturità digitale della tua azienda
          </p>
        </div>

        {/* Company Info Card - rimane uguale */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 px-8 py-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-2">
                🏢 {sessionInfo.azienda_nome}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {sessionInfo.settore && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <span className="text-white/70 text-sm font-medium">Settore</span>
                    <p className="text-white font-semibold">{sessionInfo.settore}</p>
                  </div>
                )}
                {sessionInfo.dimensione && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <span className="text-white/70 text-sm font-medium">Dimensione</span>
                    <p className="text-white font-semibold">{sessionInfo.dimensione}</p>
                  </div>
                )}
                {sessionInfo.referente && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <span className="text-white/70 text-sm font-medium">Referente</span>
                    <p className="text-white font-semibold">{sessionInfo.referente}</p>
                  </div>
                )}
                {sessionInfo.email && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <span className="text-white/70 text-sm font-medium">Email</span>
                    <p className="text-white font-semibold">{sessionInfo.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ STATS AGGIORNATE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 text-emerald-200 rounded-2xl p-6">
            <h3 className="font-semibold text-emerald-100 mb-3 flex items-center">
              <span className="text-2xl mr-3">📊</span>
              Domande Applicabili
            </h3>
            <p className="text-emerald-200/90">
              <strong>{applicableCount}</strong> su <strong>{answers.length}</strong> domande
            </p>
          </div>

          <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 text-yellow-200 rounded-2xl p-6">
            <h3 className="font-semibold text-yellow-100 mb-3 flex items-center">
              <span className="text-2xl mr-3">🚫</span>
              Non Applicabili
            </h3>
            <p className="text-yellow-200/90">
              <strong>{notApplicableCount}</strong> domande escluse dalle medie
            </p>
          </div>

          <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 text-blue-200 rounded-2xl p-6">
            <h3 className="font-semibold text-blue-100 mb-3 flex items-center">
              <span className="text-2xl mr-3">📋</span>
              Scala Valutazione
            </h3>
            <p className="text-blue-200/90 text-sm">
              <strong>0-5:</strong> Da Totale Assenza a Eccellente
            </p>
          </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); setShowSummary(true); }}>
          {Object.entries(groupedQuestions).map(([process, categories]) => (
            <div key={process} className="mb-8 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 px-8 py-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    {process}
                  </h3>
                  <p className="text-white/80 mt-2">{categories.length} categorie</p>
                </div>
              </div>
              
              <div className="p-8">
                {categories.map((cat, catIdx) => (
                  <details key={catIdx} className="mb-6 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
                    <summary className="cursor-pointer font-semibold text-lg text-white p-6 bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center">
                      <span className="text-2xl mr-3">📊</span>
                      {cat.category} 
                      <span className="ml-auto text-white/60 text-sm">({cat.dimensions.length} domande)</span>
                    </summary>
                    <div className="p-6 space-y-6">
                      {cat.dimensions.map((dim, idx) => {
                        const answerIndex = answers.findIndex(
                          a => a.process === dim.process && a.category === dim.category && a.dimension === dim.dimension
                        );
                        if (answerIndex === -1) return null;
                        
                        return (
                          <div key={idx} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            {/* ✅ NUOVO COMPONENTE SCORE SELECTOR */}
                            <ScoreSelector
                              value={answers[answerIndex]?.score || 3}
                              isNotApplicable={answers[answerIndex]?.is_not_applicable || false}
                              onChange={(score, isNotApplicable) => handleScoreChange(answerIndex, score, isNotApplicable)}
                              questionText={dim.dimension}
                            />

                            <input
                              type="text"
                              placeholder="Note aggiuntive (opzionale)"
                              value={answers[answerIndex]?.note || ''}
                              onChange={e => handleNoteChange(answerIndex, e.target.value)}
                              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 mt-4"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-center mt-12">
            <button 
              type="submit" 
              className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-12 py-4 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-bold text-xl shadow-2xl border border-white/30 hover:scale-105 hover:shadow-blue-500/25"
            >
              <span className="mr-3 text-2xl group-hover:rotate-12 transition-transform duration-300">📋</span>
              Mostra Riepilogo
            </button>
          </div>
        </form>

        {/* ✅ RIEPILOGO AGGIORNATO */}
        {showSummary && (
          <div className="mt-12 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 px-8 py-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30"></div>
              <div className="relative z-10">
                <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  📊 Riepilogo Valutazioni
                </h4>
                <p className="text-white/80 mt-2">
                  {applicableCount} domande applicabili • {notApplicableCount} non applicabili
                </p>
              </div>
            </div>
            
            <div className="p-8">
              <div className="max-h-96 overflow-y-auto mb-8 space-y-3">
                {answers.map((a, i) => (
                  <div key={i} className={`backdrop-blur-sm rounded-2xl p-4 border ${
                    a.is_not_applicable 
                      ? 'bg-gray-500/10 border-gray-400/20' 
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-semibold text-blue-300">{a.process}</span>
                        <span className="text-white/50 mx-2">→</span>
                        <span className="font-medium text-white">{a.category}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {a.is_not_applicable ? (
                          <div className="bg-gray-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                            N/A
                          </div>
                        ) : (
                          <div className={`text-white px-3 py-1 rounded-lg font-bold ${
                            a.score === 0 ? 'bg-red-600' :
                            a.score === 1 ? 'bg-orange-600' :
                            a.score === 2 ? 'bg-yellow-600' :
                            a.score === 3 ? 'bg-yellow-500' :
                            a.score === 4 ? 'bg-green-500' :
                            'bg-blue-500'
                          }`}>
                            {a.score}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-white/80 mt-2 text-sm">{a.dimension}</p>
                    {a.note && (
                      <p className="text-white/60 mt-2 italic text-sm">📝 {a.note}</p>
                    )}
                    {a.is_not_applicable && (
                      <p className="text-yellow-300/80 mt-2 text-xs">🚫 Non applicabile (escluso dalle medie)</p>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center">
                <button 
                  onClick={handleSubmit} 
                  className="group bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-bold text-xl shadow-2xl border border-white/30 hover:scale-105 hover:shadow-green-500/25"
                >
                  <span className="mr-3 text-2xl group-hover:rotate-12 transition-transform duration-300">✅</span>
                  Conferma e Invia Assessment
                </button>
              </div>
            </div>
          </div>
        )}

        {submissionStatus && (
          <div className="mt-8 text-center">
            <div className="inline-block bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 text-blue-200 px-6 py-3 rounded-2xl font-semibold">
              {submissionStatus}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex justify-center mt-12">
          <button
            onClick={() => navigate('/dashboard')}
            className="group bg-white/10 backdrop-blur-sm text-white px-8 py-3 rounded-2xl hover:bg-white/20 transition-all duration-300 font-medium border border-white/30 hover:scale-105"
          >
            <span className="mr-2 group-hover:rotate-12 transition-transform duration-300">←</span>
            Torna alla Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentForm;
