import { useState, useEffect } from 'react';
import { useBeforeUnload } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Edit2, ChevronUp, ChevronDown, Download } from 'lucide-react';
import axios from 'axios';

interface StandardQuestions {
  Governance: string[];
  'Monitoring & Control': string[];
  Technology: string[];
  Organization: string[];
}

interface Activity {
  name: string;
}

interface Process {
  process: string;
  activities: Activity[];
}

const AdminQuestions = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'processes'>('questions');
  const [activeCategory, setActiveCategory] = useState<keyof StandardQuestions>('Governance');
  
  // Domande standard (uguali per tutti)
  const [standardQuestions, setStandardQuestions] = useState<StandardQuestions>({
    Governance: [
      'Presenza di Best Practices / Procedure / Metodi',
      'Livello di standardizzazione del processo',
      "L'informazione è tracciata e usata all'interno del processo?",
      'Livello di integrazione con gli altri processi',
      'Ottimizzazione del processo dal punto di vista operativo'
    ],
    'Monitoring & Control': [
      'Quanto il processo tende verso il miglioramento continuo?',
      'Quanto il processo ha la capacità di riconfigurarsi a seguito di un cambiamento?',
      'Qual è il livello di feed-back sulle performance utilizzato per le analisi?',
      'Quanto le decisioni sono guidate e supportate dai feed-back?'
    ],
    Technology: [
      'Quanto i sistemi di supporto al processo sono standardizzati e integrati?',
      'Quanto il processo è automatizzato?',
      'Quanta parte dei dati di processo è archiviata ed elaborata in modo digitale?'
    ],
    Organization: [
      'Qual è ilvello di consapevolezza sulle responsabilità del processo?',
      'Qual è il livello di collaborazione tra i processi?'
    ]
  });

  // Processi e attività (senza domande ripetute)
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<number | null>(null);
  const [filename, setFilename] = useState('nuovo_modello');
  const [sourceModel, setSourceModel] = useState('i40_assessment_fto');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  useEffect(() => {
    if (sourceModel) {
      loadModel();
    }
  }, [sourceModel]);

  // ⚠️ BLOCCA CHIUSURA FINESTRA/TAB CON MODIFICHE NON SALVATE
  useBeforeUnload((e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ⚠️ BLOCCA NAVIGAZIONE BROWSER (frecce avanti/indietro)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome richiede questo
      }
    };

    const handlePopState = () => {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm(
          'HAI MODIFICHE NON SALVATE! Se esci ora perderai tutte le modifiche. Vuoi davvero uscire?'
        );
        
        if (!confirmLeave) {
          // Rimane sulla pagina - ripristina history
          window.history.pushState(null, '', window.location.href);
        } else {
          // Utente vuole uscire - rimuovo listener e resetto flag per permettere navigazione
          window.removeEventListener('popstate', handlePopState);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          setHasUnsavedChanges(false);
          setTimeout(() => window.history.back(), 0);
        }
      }
    };

    if (hasUnsavedChanges) {
      // Aggiungi entry per intercettare back
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // ⚠️ BLOCCA CLICK SU LINK/BOTTONI CON MODIFICHE NON SALVATE
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a, button[type="button"]');
      
      if (link && hasUnsavedChanges) {
        // Escludo il bottone salva
        if (link.textContent?.includes('Salva')) return;
        
        const confirmLeave = window.confirm(
          '⚠️ HAI MODIFICHE NON SALVATE!\n\n' +
          'Se esci ora perderai tutte le modifiche.\n\n' +
          'Vuoi davvero uscire?'
        );
        
        if (!confirmLeave) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [hasUnsavedChanges]);

  // Warning quando si tenta di lasciare la pagina con modifiche non salvate
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);



  const loadAvailableModels = async () => {
    try {
      const res = await axios.get('/api/admin/list-models');
      const modelNames = res.data.models.map((m: any) => m.filename.replace('.json', ''));
      setAvailableModels(modelNames);
    } catch (err) {
      console.error('Errore caricamento lista modelli:', err);
    }
  };

  const loadModel = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/${sourceModel}.json`);
      const data = await response.json();
      
      // Estrai le domande standard dalla prima attività del primo processo
      if (data.length > 0 && data[0].activities.length > 0) {
        const firstActivity = data[0].activities[0];
        const newStandardQuestions: StandardQuestions = {
          Governance: [],
          'Monitoring & Control': [],
          Technology: [],
          Organization: []
        };
        
        Object.keys(firstActivity.categories).forEach((category) => {
          if (category in newStandardQuestions) {
            newStandardQuestions[category as keyof StandardQuestions] = 
              Object.keys(firstActivity.categories[category]);
          }
        });
        
        setStandardQuestions(newStandardQuestions);
      }
      
      // Estrai solo processi e attività (nomi)
      const processesData: Process[] = data.map((p: any) => ({
        process: p.process,
        activities: p.activities.map((a: any) => ({ name: a.name }))
      }));
      
      setProcesses(processesData);
      setFilename(sourceModel);
    } catch (error) {
      console.error('Errore caricamento modello:', error);
      alert('Errore nel caricamento del modello');
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  // Gestione domande standard
  const addStandardQuestion = (category: keyof StandardQuestions) => {
    const question = prompt('Inserisci il testo della domanda:');
    if (question) {
      setHasUnsavedChanges(true);
      setStandardQuestions({
        ...standardQuestions,
        [category]: [...standardQuestions[category], question]
      });
    }
  };

  const editStandardQuestion = (category: keyof StandardQuestions, index: number) => {
    const oldQuestion = standardQuestions[category][index];
    const newQuestion = prompt('Modifica il testo della domanda:', oldQuestion);
    if (newQuestion && newQuestion !== oldQuestion) {
      setHasUnsavedChanges(true);
      const updated = [...standardQuestions[category]];
      updated[index] = newQuestion;
      setStandardQuestions({
        ...standardQuestions,
        [category]: updated
      });
    }
  };

  const removeStandardQuestion = (category: keyof StandardQuestions, index: number) => {
    if (confirm('Sei sicuro di voler eliminare questa domanda?')) {
      setHasUnsavedChanges(true);
      setStandardQuestions({
        ...standardQuestions,
        [category]: standardQuestions[category].filter((_, i) => i !== index)
      });
    }
  };

  // Gestione processi
  const addProcess = () => {
    const name = prompt('Nome del nuovo processo:');
    if (name) {
      setProcesses([...processes, { process: name, activities: [] }]);
      setHasUnsavedChanges(true);
    }
  };

  const removeProcess = (index: number) => {
    if (confirm('Sei sicuro di voler eliminare questo processo?')) {
      setHasUnsavedChanges(true);
      setProcesses(processes.filter((_, i) => i !== index));
      if (selectedProcess === index) {
        setSelectedProcess(null);
      }
    }
  };

  const updateProcessName = (index: number, name: string) => {
    setHasUnsavedChanges(true);
    const updated = [...processes];
    updated[index].process = name;
    setProcesses(updated);
  };

  // Gestione attività
  const addActivity = (processIndex: number) => {
    const name = prompt('Nome della nuova attività:');
    if (name) {
      const updated = [...processes];
      updated[processIndex].activities.push({ name });
      setProcesses(updated);
      setHasUnsavedChanges(true);
    }
  };

  const removeActivity = (processIndex: number, activityIndex: number) => {
    if (confirm('Sei sicuro di voler eliminare questa attività?')) {
      const updated = [...processes];
      updated[processIndex].activities = updated[processIndex].activities.filter((_, i) => i !== activityIndex);
      setProcesses(updated);
      setHasUnsavedChanges(true);
    }
  };

  const updateActivityName = (processIndex: number, activityIndex: number, name: string) => {
    setHasUnsavedChanges(true);
    const updated = [...processes];
    updated[processIndex].activities[activityIndex].name = name;
    setProcesses(updated);
  };

  const moveActivityUp = (processIndex: number, activityIndex: number) => {
    if (activityIndex === 0) return;
    const updated = [...processes];
    const activities = updated[processIndex].activities;
    [activities[activityIndex - 1], activities[activityIndex]] = [activities[activityIndex], activities[activityIndex - 1]];
    setProcesses(updated);
    setHasUnsavedChanges(true);
  };

  const moveActivityDown = (processIndex: number, activityIndex: number) => {
    const updated = [...processes];
    const activities = updated[processIndex].activities;
    if (activityIndex >= activities.length - 1) return;
    [activities[activityIndex], activities[activityIndex + 1]] = [activities[activityIndex + 1], activities[activityIndex]];
    setProcesses(updated);
    setHasUnsavedChanges(true);
  };

  const moveProcessUp = (index: number) => {
    if (index === 0) return;
    const updated = [...processes];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setProcesses(updated);
    setHasUnsavedChanges(true);
    // Aggiusta selectedProcess se necessario
    if (selectedProcess === index) {
      setSelectedProcess(index - 1);
    } else if (selectedProcess === index - 1) {
      setSelectedProcess(index);
    }
  };

  const moveProcessDown = (index: number) => {
    if (index >= processes.length - 1) return;
    const updated = [...processes];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setProcesses(updated);
    setHasUnsavedChanges(true);
    // Aggiusta selectedProcess se necessario
    if (selectedProcess === index) {
      setSelectedProcess(index + 1);
    } else if (selectedProcess === index + 1) {
      setSelectedProcess(index);
    }
  };

  const moveQuestionUp = (category: keyof StandardQuestions, index: number) => {
    if (index === 0) return;
    const updated = [...standardQuestions[category]];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setStandardQuestions({
      ...standardQuestions,
      [category]: updated
    });
    setHasUnsavedChanges(true);
  };

  const moveQuestionDown = (category: keyof StandardQuestions, index: number) => {
    const questions = standardQuestions[category];
    if (index >= questions.length - 1) return;
    const updated = [...questions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setStandardQuestions({
      ...standardQuestions,
      [category]: updated
    });
    setHasUnsavedChanges(true);
  };

  // Salvataggio - genera JSON completo
  const saveModel = async () => {
    if (!filename.trim()) {
      alert('Inserisci un nome per il file');
      return;
    }

    setSaving(true);
    try {
      // Genera il JSON completo combinando domande standard e struttura processi
      const fullModel = processes.map(proc => ({
        process: proc.process,
        activities: proc.activities.map(act => ({
          name: act.name,
          categories: {
            Governance: Object.fromEntries(standardQuestions.Governance.map(q => [q, 1.0])),
            'Monitoring & Control': Object.fromEntries(standardQuestions['Monitoring & Control'].map(q => [q, 1.0])),
            Technology: Object.fromEntries(standardQuestions.Technology.map(q => [q, 1.0])),
            Organization: Object.fromEntries(standardQuestions.Organization.map(q => [q, 1.0]))
          }
        }))
      }));

      const response = await axios.post('/api/admin/save-model', {
        filename: filename.trim(),
        model_data: fullModel
      });

      alert(response.data.message);
      setHasUnsavedChanges(false);
      loadAvailableModels();
    } catch (error: any) {
      console.error('Errore salvataggio:', error);
      alert(`Errore durante il salvataggio: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Download Excel del modello corrente
  const downloadExcel = async () => {
    try {
      const modelName = sourceModel || filename.trim();
      if (!modelName) {
        alert('Seleziona un modello da scaricare');
        return;
      }

      const response = await axios.get(`/api/excel/export-model-excel/${modelName}`, {
        responseType: 'blob'
      });

      // Crea link per download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${modelName}_assessment.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore download Excel:', error);
      alert(`Errore durante il download: ${error.response?.data?.detail || error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Caricamento modello...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (confirm('Hai modifiche non salvate. Sei sicuro di voler uscire?')) {
                      window.history.back();
                    }
                  } else {
                    window.history.back();
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Editor Assessment {hasUnsavedChanges && <span className="text-red-500">*</span>}
              </h1>
            </div>
            <div className="flex gap-3 items-center">
              <select
                value={sourceModel}
                onChange={(e) => setSourceModel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {availableModels.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="nome_file"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={saveModel}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
              <button
                onClick={downloadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Download Excel
              </button>
            </div>
          </div>

          <div className="flex gap-4 mt-4 border-b">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'questions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dominii
            </button>
            <button
              onClick={() => setActiveTab('processes')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'processes'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Processi e Attività
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'questions' ? (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="flex gap-2 p-4 border-b">
              {(Object.keys(standardQuestions) as Array<keyof StandardQuestions>).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{activeCategory}</h3>
                <button
                  onClick={() => addStandardQuestion(activeCategory)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Domanda
                </button>
              </div>

              <div className="space-y-2">
                {standardQuestions[activeCategory].map((question, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 group"
                  >
                    <span className="flex-1 text-gray-700">{question}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveQuestionUp(activeCategory, index)}
                        disabled={index === 0}
                        className="p-2 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveQuestionDown(activeCategory, index)}
                        disabled={index === standardQuestions[activeCategory].length - 1}
                        className="p-2 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => editStandardQuestion(activeCategory, index)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeStandardQuestion(activeCategory, index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Processi</h2>
                <button
                  onClick={addProcess}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Aggiungi processo"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {processes.map((process, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedProcess === index
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedProcess(index)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{process.process}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveProcessUp(index);
                          }}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                        >
                          <ChevronUp className="w-3 h-3 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveProcessDown(index);
                          }}
                          disabled={index === processes.length - 1}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                        >
                          <ChevronDown className="w-3 h-3 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProcess(index);
                          }}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {process.activities.length} attività
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-8">
              {selectedProcess !== null ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Processo
                    </label>
                    <input
                      type="text"
                      value={processes[selectedProcess].process}
                      onChange={(e) => updateProcessName(selectedProcess, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Attività</h3>
                      <button
                        onClick={() => addActivity(selectedProcess)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4" />
                        Aggiungi Attività
                      </button>
                    </div>

                    <div className="space-y-2">
                      {processes[selectedProcess].activities.map((activity, actIndex) => (
                        <div
                          key={actIndex}
                          className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                        >
                          <input
                            type="text"
                            value={activity.name}
                            onChange={(e) =>
                              updateActivityName(selectedProcess, actIndex, e.target.value)
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => moveActivityUp(selectedProcess, actIndex)}
                            disabled={actIndex === 0}
                            className="p-2 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => moveActivityDown(selectedProcess, actIndex)}
                            disabled={actIndex === processes[selectedProcess].activities.length - 1}
                            className="p-2 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                                      </button>
                          <button
                            onClick={() => removeActivity(selectedProcess, actIndex)}
                            className="p-2 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                  Seleziona un processo per modificarne le attività
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuestions;
