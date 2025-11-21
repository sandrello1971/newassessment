import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Answer {
  score: number | 'N/A';
  note: string;
  is_not_applicable: boolean;
}

interface Question {
  id: string;
  process: string;
  activity: string;
  dimension: string;
  category: string;
  question_text: string;
  is_active: boolean;
}

interface CompanyInfo {
  azienda_nome: string;
  settore: string;
  dimensione: string;
  logo_path?: string;
}

const TestTableForm: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentDimension, setCurrentDimension] = useState<string>('Governance');
  const [currentProcess, setCurrentProcess] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const dimensions = ['Governance', 'Monitoring & Control', 'Technology', 'Organization'];

  // Carica dati sessione e risposte dal DB
  useEffect(() => {
    const loadData = async () => {
      console.log('🔍 TestTableForm: Loading data for session', sessionId);
      try {
        setLoading(true);
        
        // 1. Carica info azienda
        const sessionRes = await fetch(`/api/assessment/session/${sessionId}`);
        const sessionData = await sessionRes.json();
        console.log('📊 Session data loaded:', sessionData);
        setCompanyInfo({
          azienda_nome: sessionData.azienda_nome,
          settore: sessionData.settore,
          dimensione: sessionData.dimensione,
          logo_path: sessionData.logo_path
        });

        // 2. Carica domande dal template
        const questionsRes = await fetch(`/api/template-versions/${sessionData.template_version_id}/questions`);
        const questionsData = await questionsRes.json();
        console.log('❓ Questions loaded:', questionsData.length);
        setQuestions(questionsData);

        // 3. Carica risposte esistenti dal DB (assessment_result)
        const answersRes = await fetch(`/api/assessment/${sessionId}/results`);
        console.log('🎯 Fetching results from:', `/api/assessment/${sessionId}/results`);
        if (answersRes.ok) {
          const resultsData = await answersRes.json();
          console.log('✅ Results loaded:', resultsData.length, 'items');
          console.log('📋 First 3 results:', resultsData.slice(0, 3));
          
          // Converti array di risultati in mappa
          const answersMap: Record<string, Answer> = {};
          resultsData.forEach((r: any) => {
            const key = `${r.process}|${r.activity}|${r.dimension}`;
            answersMap[key] = {
              score: r.is_not_applicable ? 'N/A' : r.score,
              note: r.note || '',
              is_not_applicable: r.is_not_applicable
            };
          });
          
          setAnswers(answersMap);
        }

        // Set processo iniziale
        if (questionsData.length > 0) {
          const firstProcess = questionsData[0].process;
          setCurrentProcess(firstProcess);
        }

      } catch (error) {
        console.error('Errore caricamento:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      loadData();
    }
  }, [sessionId]);

  // Salva risposta
  const handleAnswerChange = async (questionKey: string, field: 'score' | 'note', value: any) => {
    const [process, activity, dimension] = questionKey.split('|');
    
    const newAnswer = {
      ...answers[questionKey],
      [field]: value,
      is_not_applicable: value === 'N/A'
    };
    
    setAnswers(prev => ({ ...prev, [questionKey]: newAnswer }));

    // Salva nel DB
    try {
      await fetch(`/api/assessment/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          process,
          activity,
          dimension,
          score: newAnswer.is_not_applicable ? 0 : newAnswer.score,
          note: newAnswer.note,
          is_not_applicable: newAnswer.is_not_applicable
        })
      });
    } catch (error) {
      console.error('Errore salvataggio:', error);
    }
  };

  // Filtra domande per dimensione e processo correnti
  const filteredQuestions = questions.filter(
    q => q.dimension === currentDimension && q.process === currentProcess && q.is_active
  );

  // Ottieni lista processi unici per dimensione corrente
  const processesInDimension = [...new Set(
    questions
      .filter(q => q.dimension === currentDimension && q.is_active)
      .map(q => q.process)
  )];

  // Calcola completamento
  const totalQuestions = questions.filter(q => q.is_active).length;
  const answeredQuestions = Object.keys(answers).length;
  const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // Naviga dimensione
  const handleNextDimension = () => {
    const currentIndex = dimensions.indexOf(currentDimension);
    if (currentIndex < dimensions.length - 1) {
      setCurrentDimension(dimensions[currentIndex + 1]);
      const nextProcess = [...new Set(
        questions
          .filter(q => q.dimension === dimensions[currentIndex + 1] && q.is_active)
          .map(q => q.process)
      )][0];
      setCurrentProcess(nextProcess);
    } else {
      navigate(`/results/${sessionId}`);
    }
  };

  const handlePrevDimension = () => {
    const currentIndex = dimensions.indexOf(currentDimension);
    if (currentIndex > 0) {
      setCurrentDimension(dimensions[currentIndex - 1]);
      const prevProcess = [...new Set(
        questions
          .filter(q => q.dimension === dimensions[currentIndex - 1] && q.is_active)
          .map(q => q.process)
      )][0];
      setCurrentProcess(prevProcess);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header con logo e nome azienda */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {companyInfo?.logo_path && (
            <img 
              src={companyInfo.logo_path} 
              alt={companyInfo.azienda_nome}
              className="h-16 w-16 object-contain"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold">{companyInfo?.azienda_nome}</h2>
            <p className="text-sm text-gray-600">{companyInfo?.settore} - {companyInfo?.dimensione}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Dashboard
        </button>
      </div>

      {/* Titolo con nome processo */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">ENTERPRISE ASSESSMENT - {currentDimension}</h1>
        <p className="text-lg text-gray-600 mt-2">
          Dimensione {dimensions.indexOf(currentDimension) + 1} di {dimensions.length}
        </p>
        <div className="mt-4 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-right text-sm text-gray-600 mt-1">{completionPercentage}% completato</p>
      </div>

      {/* Selector processi */}
      {processesInDimension.length > 1 && (
        <div className="mb-6 flex gap-2">
          {processesInDimension.map(proc => (
            <button
              key={proc}
              onClick={() => setCurrentProcess(proc)}
              className={`px-4 py-2 rounded ${
                currentProcess === proc
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {proc}
            </button>
          ))}
        </div>
      )}

      {/* Tabella */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4">
          <h2 className="text-2xl font-bold text-white text-center">
            {currentDimension} | {currentProcess}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Attività</th>
                {[...new Set(filteredQuestions.map(q => q.category))].map(cat => (
                  <th key={cat} className="px-4 py-3 text-center font-semibold min-w-[150px]">
                    {cat}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold min-w-[100px]">Media</th>
                <th className="px-4 py-3 text-center font-semibold min-w-[200px]">Note</th>
              </tr>
            </thead>
            <tbody>
              {[...new Set(filteredQuestions.map(q => q.activity))].map((activity, idx) => {
                const activityQuestions = filteredQuestions.filter(q => q.activity === activity);
                const categories = [...new Set(activityQuestions.map(q => q.category))];
                
                // Calcola media
                const scores = activityQuestions
                  .map(q => {
                    const key = `${q.process}|${q.activity}|${q.dimension}`;
                    const ans = answers[key];
                    return ans && !ans.is_not_applicable ? Number(ans.score) : null;
                  })
                  .filter(s => s !== null);
                
                const avgScore = scores.length > 0
                  ? (scores.reduce((a, b) => a! + b!, 0)! / scores.length).toFixed(2)
                  : '-';

                return (
                  <tr key={activity} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 font-medium border-r">{activity}</td>
                    {categories.map(cat => {
                      const question = activityQuestions.find(q => q.category === cat);
                      if (!question) return <td key={cat} className="px-4 py-3 border-r"></td>;
                      
                      const key = `${question.process}|${question.activity}|${question.dimension}`;
                      const answer = answers[key] || { score: 0, note: '', is_not_applicable: false };

                      return (
                        <td key={cat} className="px-4 py-3 border-r">
                          <div className="flex flex-col items-center gap-2">
                            <select
                              value={answer.is_not_applicable ? 'N/A' : answer.score}
                              onChange={(e) => handleAnswerChange(key, 'score', e.target.value === 'N/A' ? 'N/A' : Number(e.target.value))}
                              className="w-20 px-2 py-1 border rounded text-center"
                            >
                              <option value={0}>0</option>
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                              <option value={5}>5</option>
                              <option value="N/A">N/A</option>
                            </select>
                            <label className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={answer.is_not_applicable}
                                onChange={(e) => handleAnswerChange(key, 'score', e.target.checked ? 'N/A' : 0)}
                              />
                              N/A
                            </label>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-bold border-r bg-blue-50">
                      {avgScore}
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={activityQuestions[0] ? (answers[`${activityQuestions[0].process}|${activityQuestions[0].activity}|${activityQuestions[0].dimension}`]?.note || '') : ''}
                        onChange={(e) => {
                          if (activityQuestions[0]) {
                            const key = `${activityQuestions[0].process}|${activityQuestions[0].activity}|${activityQuestions[0].dimension}`;
                            handleAnswerChange(key, 'note', e.target.value);
                          }
                        }}
                        placeholder="Note..."
                        className="w-full px-2 py-1 border rounded text-sm resize-none"
                        rows={2}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevDimension}
          disabled={currentDimension === dimensions[0]}
          className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Precedente
        </button>
        <button
          onClick={handleNextDimension}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {currentDimension === dimensions[dimensions.length - 1] ? 'Vai ai Risultati' : 'Successivo →'}
        </button>
      </div>
    </div>
  );
};

export default TestTableForm;
