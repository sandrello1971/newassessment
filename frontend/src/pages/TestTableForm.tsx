import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

interface ProcessData {
  process: string;
  activities: Array<{
    name: string;
    categories: {
      [category: string]: {
        [dimension: string]: number;
      };
    };
  }>;
}

interface Answer {
  process: string;
  activity: string;
  category: string;
  dimension: string;
  score: number;
  note?: string;
  is_not_applicable?: boolean;
}

const CATEGORIES = ['Governance', 'Monitoring & Control', 'Technology', 'Organization'];

const TestTableFormByCategory = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [processesData, setProcessesData] = useState<ProcessData[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [floatingMenu, setFloatingMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    process: string;
    activity: string;
    category: string;
    dimension: string;
    score: number;
    rowIndex: number;
    colIndex: number;
  } | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Carica sessione e version_id
        const sessionRes = await axios.get(`/api/assessment/session/${sessionId}`);
        const versionId = sessionRes.data.template_version_id;
        
        if (!versionId) {
          console.error('❌ Nessun template_version_id nella sessione!');
          setLoading(false);
          return;
        }
        
        console.log('🔄 Caricamento domande da DB, version:', versionId);
        
        // Carica domande dal DB
        const questionsRes = await axios.get(`/api/admin/templates/versions/${versionId}`);
        
        // Trasforma formato DB in formato atteso
        const data = questionsRes.data.domains.reduce((acc: any[], domain: any) => {
          domain.questions.forEach((q: any) => {
            let proc = acc.find(p => p.process === q.process);
            if (!proc) {
              proc = { process: q.process, activities: [] };
              acc.push(proc);
            }
            
            let act = proc.activities.find((a: any) => a.name === q.activity);
            if (!act) {
              act = { name: q.activity, categories: {} };
              proc.activities.push(act);
            }
            
            if (!act.categories[domain.domain_name]) {
              act.categories[domain.domain_name] = {};
            }
            
            act.categories[domain.domain_name][q.text] = q.max_score || 5;
          });
          
          return acc;
        }, []);
        
        console.log('✅ Domande caricate dal DB:', data.length, 'processi');

        const validProcesses = data.filter((p: ProcessData) => 
          p.activities && p.activities.length > 0
        );
        setProcessesData(validProcesses);

        try {
          const resultsRes = await axios.get(`/api/assessment/${sessionId}/results`);
          if (resultsRes.data && resultsRes.data.length > 0) {
            const existingAnswers = new Map();
            resultsRes.data.forEach((result: any) => {
              const key = `${result.process}|${result.activity}|${result.category}|${result.dimension}`;
              existingAnswers.set(key, {
                process: result.process,
                activity: result.activity,
                category: result.category,
                dimension: result.dimension,
                score: result.score,
                note: result.note || '',
                is_not_applicable: result.is_not_applicable || false
              });
            });
            setAnswers(existingAnswers);
          }
        } catch (err) {
          console.log('Nessun risultato esistente');
        }

        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    loadData();
  }, [sessionId]);

  const createKey = (process: string, activity: string, category: string, dimension: string) => {
    return `${process}|${activity}|${category}|${dimension}`;
  };

  const handleScoreChange = (process: string, activity: string, category: string, dimension: string, score: number) => {
    const key = createKey(process, activity, category, dimension);
    const updated = new Map(answers);
    const existing = answers.get(key) || { process, activity, category, dimension, score: 0, note: '', is_not_applicable: false };
    updated.set(key, { ...existing, score });
    setAnswers(updated);
  };

  const handleNoteChange = (process: string, activity: string, category: string, dimension: string, note: string) => {
    const key = createKey(process, activity, category, dimension);
    const updated = new Map(answers);
    const existing = answers.get(key) || { process, activity, category, dimension, score: 0, is_not_applicable: false };
    updated.set(key, { ...existing, note });
    setAnswers(updated);
  };

  const handleNotApplicableToggle = (process: string, activity: string, category: string, dimension: string) => {
    const key = createKey(process, activity, category, dimension);
    const updated = new Map(answers);
    const existing = answers.get(key) || { process, activity, category, dimension, score: 0, note: '', is_not_applicable: false };
    updated.set(key, { ...existing, is_not_applicable: !existing.is_not_applicable, score: !existing.is_not_applicable ? 0 : existing.score });
    setAnswers(updated);
  };

  // Copia in colonna (verso il basso)
  const copyToColumn = (process: string, category: string, dimension: string, score: number, startRowIndex: number) => {
    const updated = new Map(answers);
    const allActivities = processesData.find(p => p.process === process)?.activities || [];
    
    let count = 0;
    allActivities.forEach((act, idx) => {
      if (idx >= startRowIndex) {
        const key = createKey(process, act.name, category, dimension);
        const existing = answers.get(key) || { process, activity: act.name, category, dimension, score: 0, note: '', is_not_applicable: false };
        updated.set(key, { ...existing, score });
        count++;
      }
    });
    
    setAnswers(updated);
    setFloatingMenu(null);
    // Copiato
  };

  // Copia in riga (verso destra)
  const copyToRow = (process: string, activity: string, category: string, score: number, startColIndex: number, allDimensions: string[]) => {
    const updated = new Map(answers);
    
    let count = 0;
    allDimensions.forEach((dim, idx) => {
      if (idx >= startColIndex) {
        const key = createKey(process, activity, category, dim);
        const existing = answers.get(key) || { process, activity, category, dimension: dim, score: 0, note: '', is_not_applicable: false };
        updated.set(key, { ...existing, score });
        count++;
      }
    });
    
    setAnswers(updated);
    setFloatingMenu(null);
    // Copiato
  };

  // Funzione per calcolare la media di una riga
  const calculateRowAverage = (process: string, activityName: string, category: string, dimensions: string[]) => {
    let total = 0;
    let count = 0;
    
    dimensions.forEach(dim => {
      const key = createKey(process, activityName, category, dim);
      const answer = answers.get(key);
      
      // Se non è N/A, considera il valore (anche se è 0)
      if (answer && !answer.is_not_applicable) {
        total += answer.score;
        count++;
      }
    });
    
    // Se non ci sono valori validi, ritorna null
    return count > 0 ? (total / count) : null;
  };

  // Auto-save senza validazione
  const autoSave = useCallback(async () => {
    if (!sessionId || answers.size === 0) return;
    
    setSaving(true);
    try {
      console.log('💾 Salvataggio in corso...');
      const results = Array.from(answers.values());
      await axios.post(`/api/assessment/${sessionId}/submit`, results);
      console.log('✅ Salvato!');
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('❌ Errore salvataggio:', error);
    } finally {
      setSaving(false);
    }
  }, [sessionId, answers]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const results = Array.from(answers.values());
      await axios.post(`/api/assessment/${sessionId}/submit`, results);
      alert('Assessment completato!');
      navigate(`/results/${sessionId}`);
    } catch (error) {
      console.error(error);
      alert('Errore invio');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Caricamento...</div>;
  if (processesData.length === 0) return <div className="p-8 text-center">Nessun dato</div>;

  const currentCategory = CATEGORIES[currentCategoryIndex];
  const progressPercentage = ((currentCategoryIndex + 1) / CATEGORIES.length) * 100;

  return (
    <>
      {/* Bottone Dashboard - Fixed */}
      <button
        onClick={async () => { await autoSave(); navigate('/dashboard'); }}
        className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={saving}
      >
        {saving ? "💾 Salvataggio..." : "← Dashboard"}
      </button>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Assessment Digitale 4.0 - {currentCategory}</h1>
            <p className="text-gray-600 mb-4">Dimensione {currentCategoryIndex + 1} di {CATEGORIES.length}</p>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
            </div>
            <p className="text-gray-500 text-sm text-right">{Math.round(progressPercentage)}% completato</p>
          </div>

          {processesData.map((process, procIdx) => {
            const processActivities = process.activities.filter(activity => 
              activity.categories && activity.categories[currentCategory]
            );
            if (processActivities.length === 0) return null;

            const processDimensions = new Set<string>();
            processActivities.forEach(activity => {
              if (activity.categories[currentCategory]) {
                Object.keys(activity.categories[currentCategory]).forEach(d => processDimensions.add(d));
              }
            });
            const processDimensionsArray = Array.from(processDimensions);

            return (
              <div key={procIdx} className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 mb-8">
                <div className="flex justify-between items-center mb-6 pb-3 border-b-2 border-blue-500">
                  <button
                    onClick={() => setCurrentCategoryIndex(Math.max(0, currentCategoryIndex - 1))}
                    disabled={currentCategoryIndex === 0}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-gray-800 rounded-lg font-semibold transition"
                  >
                    ← {currentCategoryIndex > 0 ? CATEGORIES[currentCategoryIndex - 1] : ''}
                  </button>
                  <h2 className="text-2xl font-bold text-gray-800">{process.process}</h2>
                  <button
                    onClick={() => setCurrentCategoryIndex(Math.min(CATEGORIES.length - 1, currentCategoryIndex + 1))}
                    disabled={currentCategoryIndex === CATEGORIES.length - 1}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-gray-800 rounded-lg font-semibold transition"
                  >
                    {currentCategoryIndex < CATEGORIES.length - 1 ? CATEGORIES[currentCategoryIndex + 1] : ''} →
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-500">
                        <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold min-w-[150px]">Attività</th>
                        {processDimensionsArray.map((dim) => (
                          <th key={dim} className="border border-gray-300 px-2 py-2 text-center text-white font-semibold min-w-[150px]">
                            <div className="text-xs leading-tight whitespace-normal">{dim}</div>
                          </th>
                        ))}
                        <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold min-w-[80px]">Media</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold min-w-[250px]">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processActivities.map((activity, actIdx) => {
                        const row = { process: process.process, activityName: activity.name, dimensions: Object.keys(activity.categories[currentCategory]) };
                        const rowAverage = calculateRowAverage(row.process, row.activityName, currentCategory, processDimensionsArray);
                        
                        return (
                          <tr key={actIdx} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-3 py-2 text-gray-800 font-medium bg-white">{row.activityName}</td>
                            {processDimensionsArray.map(dim => {
                              const key = createKey(row.process, row.activityName, currentCategory, dim);
                              const answer = answers.get(key);
                              const hasDimension = row.dimensions.includes(dim);
                              if (!hasDimension) {
                                return <td key={dim} className="border border-gray-300 px-2 py-2 text-center bg-gray-100"><span className="text-gray-400 text-xs">-</span></td>;
                              }
                              return (
                                <td key={dim} className="border border-gray-300 px-2 py-2 text-center bg-white" style={{ position: "relative" }}>
                                  <div className="flex flex-col items-center gap-2">
                                    <input 
                                      onFocus={(e) => {
                                        // Cancella eventuali timeout di chiusura
                                        if (blurTimeoutRef.current) {
                                          clearTimeout(blurTimeoutRef.current);
                                          blurTimeoutRef.current = null;
                                        }
                                        e.currentTarget.select();
                                        const process = e.currentTarget.getAttribute("data-process") || "";
                                        const activity = e.currentTarget.getAttribute("data-activity") || "";
                                        const category = e.currentTarget.getAttribute("data-category") || "";
                                        const dimension = e.currentTarget.getAttribute("data-dimension") || "";
                                        const allActivities = processesData.find(p => p.process === process)?.activities || [];
                                        const actIdx = allActivities.findIndex(a => a.name === activity);
                                        const act = allActivities.find(a => a.name === activity);
                                        const dims = act?.categories[category] ? Object.keys(act.categories[category]) : [];
                                        const colIdx = dims.indexOf(dimension);
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const xPos = rect.left + (rect.width / 2) - 40;
                                        const yPos = rect.bottom + 5;
                                        setFloatingMenu({ visible: true, x: xPos, y: yPos, process, activity, category, dimension, score: answer?.score ?? 0, rowIndex: actIdx, colIndex: colIdx });
                                      }}
                                      onBlur={(e) => { 
                                        const rt = e.relatedTarget as HTMLElement; 
                                        if (!rt || !rt.hasAttribute("data-floating-button")) {
                                          blurTimeoutRef.current = setTimeout(() => setFloatingMenu(null), 300);
                                        }
                                      }}
                                      type="number" 
                                      data-process={row.process}
                                      data-activity={row.activityName}
                                      data-category={currentCategory}
                                      data-dimension={dim}
                                      min="0" 
                                      max="5" 
                                      value={answer?.score || 0} 
                                      disabled={answer?.is_not_applicable}
onKeyDown={(e) => {
                                        if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
                                          e.preventDefault();
                                          return;
                                        }
                                        
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const currentInput = e.currentTarget;
                                          const currentDim = currentInput.getAttribute('data-dimension');
                                          
                                          // Trova tutti gli input della stessa dimensione (colonna)
                                          const allInputs = Array.from(
document.querySelectorAll(`input[data-dimension="${currentDim}"]:not([disabled])`)

                                          ) as HTMLInputElement[];
                                          
                                          const currentIndex = allInputs.indexOf(currentInput);
                                          
                                          if (e.shiftKey && currentIndex > 0) {
                                            allInputs[currentIndex - 1].focus();
                                            allInputs[currentIndex - 1].select();
                                          } else if (!e.shiftKey && currentIndex < allInputs.length - 1) {
                                            allInputs[currentIndex + 1].focus();
                                            allInputs[currentIndex + 1].select();
                                          }
                                        }
                                      }}
	                                      onInput={(e) => {
                                        const input = e.target as HTMLInputElement;
                                        const val = parseInt(input.value);
                                        if (input.value !== '' && (isNaN(val) || val < 0 || val > 5)) {
                                          input.value = (answer?.score || 0).toString();
                                          alert('⚠️ Il valore deve essere compreso tra 0 e 5'); setTimeout(() => input.focus(), 50);
                                        }
                                      }}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val >= 0 && val <= 5) {
                                          if (floatingMenu) setFloatingMenu({ ...floatingMenu, score: val });
                                          handleScoreChange(row.process, row.activityName, currentCategory, dim, val);
                                        }
                                      }}
                                      className={`w-full max-w-[60px] mx-auto px-2 py-1 text-center ${answer?.is_not_applicable ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-800'} border border-gray-300 rounded focus:ring-2 focus:ring-blue-400`} 
                                    />
                                    <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                                      <input type="checkbox" checked={answer?.is_not_applicable || false}
                                        onChange={() => handleNotApplicableToggle(row.process, row.activityName, currentCategory, dim)} className="w-3 h-3" />
                                      N/A
                                    </label>
                                  </div>
                                  {floatingMenu && floatingMenu.dimension === dim && floatingMenu.activity === row.activityName && (
                                    <div style={{ position: "fixed", top: floatingMenu.y, left: floatingMenu.x, backgroundColor: "white", border: "2px solid #3b82f6", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 9999, padding: "8px", display: "flex", gap: "8px" }}>
                                      <button data-floating-button onMouseDown={(e) => e.preventDefault()} onClick={() => { const cs = floatingMenu.score; const pd = processesData.find(p => p.process === floatingMenu.process); if (pd) { const act = pd.activities.find(a => a.name === floatingMenu.activity); if (act?.categories[floatingMenu.category]) { const dims = Object.keys(act.categories[floatingMenu.category]); handleScoreChange(floatingMenu.process, floatingMenu.activity, floatingMenu.category, floatingMenu.dimension, cs); copyToRow(floatingMenu.process, floatingMenu.activity, floatingMenu.category, cs, floatingMenu.colIndex, dims); } } }} style={{ padding: "8px 12px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>→</button>
                                      <button data-floating-button onMouseDown={(e) => e.preventDefault()} onClick={() => { const cs = floatingMenu.score; handleScoreChange(floatingMenu.process, floatingMenu.activity, floatingMenu.category, floatingMenu.dimension, cs); copyToColumn(floatingMenu.process, floatingMenu.category, floatingMenu.dimension, cs, floatingMenu.rowIndex); }} style={{ padding: "8px 12px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>↓</button>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border border-gray-300 px-3 py-2 text-center bg-blue-50">
                              <span className="font-bold text-blue-800">
                                {rowAverage !== null ? rowAverage.toFixed(2) : ''}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-3 py-2 bg-white">
                              <textarea placeholder="Note..." rows={2}
                                value={answers.get(createKey(row.process, row.activityName, currentCategory, processDimensionsArray[0]))?.note || ''}
                                onChange={(e) => handleNoteChange(row.process, row.activityName, currentCategory, processDimensionsArray[0], e.target.value)}
                                className="w-full min-w-[200px] px-3 py-2 bg-gray-50 border border-gray-300 rounded text-gray-800 text-sm focus:ring-2 focus:ring-blue-400 resize-none" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}



          <div className="flex justify-between items-center">
            <button onClick={() => setCurrentCategoryIndex(Math.max(0, currentCategoryIndex - 1))} disabled={currentCategoryIndex === 0}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 rounded-lg font-semibold transition">
              Precedente
            </button>
            {currentCategoryIndex < CATEGORIES.length - 1 ? (
              <button onClick={() => setCurrentCategoryIndex(currentCategoryIndex + 1)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition">Successivo</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg font-semibold transition">
                {submitting ? 'Invio...' : 'Completa Assessment'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TestTableFormByCategory;
