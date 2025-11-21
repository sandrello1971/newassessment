// frontend/src/pages/AssessmentForm-ByDimension.tsx
// NUOVA VERSIONE: Organizzata per DIMENSIONI invece che per PROCESSI

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

interface Question {
  process: string;
  category: string;
  dimension: string;
  activity: string; // Aggiungo l'attività per maggiore chiarezza
}

interface Answer extends Question {
  score: number;
  note?: string;
  is_not_applicable?: boolean;
}

interface ProcessGroup {
  process: string;
  questions: Question[];
}

interface SessionInfo {
  id: string;
  azienda_nome: string;
  settore?: string;
  dimensione?: string;
  referente?: string;
  email?: string;
}

// Le 4 dimensioni del modello Politecnico
const DIMENSIONS = ['Governance', 'Monitoring & Control', 'Technology', 'Organization'];

const ScoreSelectorComponent: React.FC<{
  value: number;
  onChange: (v: number) => void;
  isNotApplicable: boolean;
  onNotApplicableChange: (v: boolean) => void;
}> = ({ value, onChange, isNotApplicable, onNotApplicableChange }) => {
  return (
    <div className="space-y-4">
      {/* Toggle Non Applicabile */}
      <div className="flex items-center justify-center">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isNotApplicable}
            onChange={(e) => onNotApplicableChange(e.target.checked)}
            className="mr-3 w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500 focus:ring-2"
          />
          <span className="text-white/90 font-medium">
            ⚠️ Non Applicabile alla mia azienda
          </span>
        </label>
      </div>

      {/* Scala valutazione */}
      {!isNotApplicable && (
        <div className="space-y-3">
          <div className="grid grid-cols-6 gap-4">
            {[0, 1, 2, 3, 4, 5].map((scoreValue) => (
              <button
                key={scoreValue}
                type="button"
                onClick={() => onChange(scoreValue)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
                  value === scoreValue
                    ? scoreValue === 0 ? 'bg-red-600 border-red-400 shadow-lg shadow-red-500/50' :
                      scoreValue === 1 ? 'bg-orange-600 border-orange-400 shadow-lg shadow-orange-500/50' :
                      scoreValue === 2 ? 'bg-yellow-600 border-yellow-400 shadow-lg shadow-yellow-500/50' :
                      scoreValue === 3 ? 'bg-yellow-500 border-yellow-300 shadow-lg shadow-yellow-500/50' :
                      scoreValue === 4 ? 'bg-green-500 border-green-300 shadow-lg shadow-green-500/50' :
                      'bg-blue-500 border-blue-300 shadow-lg shadow-blue-500/50'
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <div className={`text-2xl font-bold ${
                  value === scoreValue ? 'text-white' : 'text-white/50'
                }`}>
                  {scoreValue}
                </div>
              </button>
            ))}
          </div>

          <div className={`w-${Math.round((value / 5) * 100)}% h-2 bg-gradient-to-r ${
            value === 0 ? 'from-red-600 to-red-400' :
            value === 1 ? 'from-orange-600 to-orange-400' :
            value === 2 ? 'from-yellow-600 to-yellow-400' :
            value === 3 ? 'from-yellow-500 to-yellow-300' :
            value === 4 ? 'from-green-500 to-green-300' :
            'from-blue-500 to-blue-300'
          } rounded-full transition-all duration-300`} />

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

const AssessmentFormByDimension: React.FC = () => {
  const { sessionId } = useParams();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [groupedByDimension, setGroupedByDimension] = useState<Record<string, ProcessGroup[]>>({});
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const navigate = useNavigate();

  const currentDimension = DIMENSIONS[currentDimensionIndex];

  useEffect(() => {
    if (!sessionId) {
      setSubmissionStatus('ID sessione mancante');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // Carica sessione
        console.log('🔄 Caricamento sessione:', sessionId);
        const sessionResponse = await axios.get(`/api/assessment/session/${sessionId}`);
        setSessionInfo(sessionResponse.data);

        // Carica JSON domande
        const jsonResponse = await axios.get('/i40_assessment_fto.json');
        let questionsData = jsonResponse.data;

        if (typeof questionsData === 'string') {
          const cleanedJsonString = questionsData
            .replace(/:\s*NaN/g, ': null')
            .replace(/:\s*Infinity/g, ': null')
            .replace(/:\s*-Infinity/g, ': null');
          questionsData = JSON.parse(cleanedJsonString);
        }

        if (!Array.isArray(questionsData)) {
          if (questionsData.processes) questionsData = questionsData.processes;
          else if (questionsData.data) questionsData = questionsData.data;
        }

        // ✅ RIORGANIZZA PER DIMENSIONE
        const byDimension: Record<string, Record<string, Question[]>> = {};
        const allAnswers: Answer[] = [];

        // Inizializza le strutture
        DIMENSIONS.forEach(dim => {
          byDimension[dim] = {};
        });

        questionsData.forEach((processGroup: any) => {
          if (!processGroup.activities || !Array.isArray(processGroup.activities)) return;

          const processName = processGroup.process;

          processGroup.activities.forEach((activity: any) => {
            const activityName = activity.name;

            if (!activity.categories || typeof activity.categories !== 'object') return;

            Object.keys(activity.categories).forEach(categoryName => {
              const categoryData = activity.categories[categoryName];

              if (!byDimension[categoryName]) return; // Salta se non è una dimensione valida

              if (!byDimension[categoryName][processName]) {
                byDimension[categoryName][processName] = [];
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
                    dimension: dimensionKey,
                    activity: activityName
                  };

                  byDimension[categoryName][processName].push(question);
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
        });

        // Converte in formato ProcessGroup[]
        const groupedFinal: Record<string, ProcessGroup[]> = {};
        DIMENSIONS.forEach(dim => {
          groupedFinal[dim] = Object.keys(byDimension[dim]).map(proc => ({
            process: proc,
            questions: byDimension[dim][proc]
          })).filter(pg => pg.questions.length > 0);
        });

        setGroupedByDimension(groupedFinal);
        setAnswers(allAnswers);
        setLoading(false);
        console.log('✅ Dati caricati e riorganizzati per dimensione');

      } catch (err) {
        console.error('❌ Errore caricamento:', err);
        setSubmissionStatus('Errore durante il caricamento dei dati');
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId]);

  const updateAnswer = (question: Question, newScore: number, newNotApplicable: boolean) => {
    setAnswers(prev => prev.map(a => {
      if (a.process === question.process &&
          a.category === question.category &&
          a.dimension === question.dimension &&
          a.activity === question.activity) {
        return { ...a, score: newScore, is_not_applicable: newNotApplicable };
      }
      return a;
    }));
  };

  const getAnswer = (question: Question) => {
    return answers.find(a =>
      a.process === question.process &&
      a.category === question.category &&
      a.dimension === question.dimension &&
      a.activity === question.activity
    );
  };

  const handleNext = () => {
    if (currentDimensionIndex < DIMENSIONS.length - 1) {
      setCurrentDimensionIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
    }
  };

  const handlePrevious = () => {
    if (currentDimensionIndex > 0) {
      setCurrentDimensionIndex(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmissionStatus('📤 Invio in corso...');
      await axios.post(`/api/assessment/${sessionId}/submit`, answers);
      setSubmissionStatus('✅ Assessment inviato con successo!');
      setTimeout(() => navigate(`/results/${sessionId}`), 1500);
    } catch (error) {
      console.error('❌ Errore invio:', error);
      setSubmissionStatus('❌ Errore durante l\'invio');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-6"></div>
          <p className="text-white/80 text-lg font-medium">Caricamento assessment...</p>
        </div>
      </div>
    );
  }

  const applicableCount = answers.filter(a => !a.is_not_applicable).length;
  const notApplicableCount = answers.filter(a => a.is_not_applicable).length;

  const progressPercentage = ((currentDimensionIndex + 1) / DIMENSIONS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header con progress */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Assessment Digitale 4.0
          </h1>
          {sessionInfo && (
            <p className="text-white/60 text-sm mb-2">
              Azienda: <strong>{sessionInfo.azienda_nome}</strong>
              {sessionInfo.settore && ` | Settore: ${sessionInfo.settore}`}
            </p>
          )}
          <p className="text-white/70 mb-6">
            Dimensione {currentDimensionIndex + 1} di {DIMENSIONS.length}: <strong>{currentDimension}</strong>
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-white/60 text-sm text-right">
            {Math.round(progressPercentage)}% completato
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center">
            <p className="text-white/70 text-sm">Domande Applicabili</p>
            <p className="text-white text-2xl font-bold">{applicableCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center">
            <p className="text-white/70 text-sm">Non Applicabili</p>
            <p className="text-white text-2xl font-bold">{notApplicableCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center">
            <p className="text-white/70 text-sm">Totale Domande</p>
            <p className="text-white text-2xl font-bold">{answers.length}</p>
          </div>
        </div>

        {/* Contenuto della dimensione corrente */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            {currentDimension === 'Governance' && '🎯'}
            {currentDimension === 'Monitoring & Control' && '📊'}
            {currentDimension === 'Technology' && '💻'}
            {currentDimension === 'Organization' && '👥'}
            <span className="ml-3">{currentDimension}</span>
          </h2>

          {groupedByDimension[currentDimension]?.map((processGroup, idx) => (
            <div key={idx} className="mb-8 last:mb-0">
              <h3 className="text-2xl font-semibold text-purple-300 mb-4 pb-2 border-b border-purple-400/30">
                {processGroup.process}
              </h3>

              {processGroup.questions.map((q, qIdx) => {
                const answer = getAnswer(q);
                if (!answer) return null;

                return (
                  <div key={qIdx} className="mb-6 bg-white/5 rounded-xl p-6 border border-white/10">
                    <p className="text-white/90 font-medium mb-1">
                      <span className="text-purple-300">{q.activity}</span>
                    </p>
                    <p className="text-white text-lg mb-4">
                      {q.dimension}
                    </p>

                    <ScoreSelectorComponent
                      value={answer.score}
                      onChange={(v) => updateAnswer(q, v, answer.is_not_applicable || false)}
                      isNotApplicable={answer.is_not_applicable || false}
                      onNotApplicableChange={(na) => updateAnswer(q, answer.score, na)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentDimensionIndex === 0}
            className="px-8 py-4 bg-white/10 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-all"
          >
            ← Precedente
          </button>

          {currentDimensionIndex < DIMENSIONS.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 font-bold transition-all"
            >
              Avanti →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-bold transition-all"
            >
              ✅ Completa Assessment
            </button>
          )}
        </div>

        {submissionStatus && (
          <div className="mt-6 p-4 bg-white/10 rounded-xl text-center text-white">
            {submissionStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentFormByDimension;

// ISTRUZIONI PER IL TEST:
// 1. Salva questo file come: frontend/src/pages/AssessmentFormByDimension.tsx
// 2. Aggiorna App.tsx aggiungendo:
//    import AssessmentFormByDimension from './pages/AssessmentFormByDimension';
//    <Route path="/assessment-test/:sessionId" element={<AssessmentFormByDimension />} />
// 3. Testa navigando a: http://localhost:5173/assessment-test/[tuo-session-id]
