import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Result {
  process: string;
  activity: string;
  category: string;
  dimension: string;
  score: number;
  note?: string;
  is_not_applicable?: boolean;
}

interface ProcessResults {
  [process: string]: {
    [category: string]: {
      [activity: string]: {
        [dimension: string]: {
          score: number;
          note?: string;
          is_not_applicable?: boolean;
        };
      };
    };
  };
}

// interface ActivitySummary {
//   process: string;
//   activity: string;
//   category: string;
//   average: number;
//   note: string;
// }

interface CriticalPoint {
  process: string;
  subprocess: string;
  governance: number | null;
  monitoring_control: number | null;
  technology: number | null;
  organization: number | null;
  process_rating: number | null;
  notes: string;
  is_critical: boolean;
}


interface AISuggestions {
  critical_count: number;
  suggestions: string;
}

const CATEGORIES_ORDER = ["Governance", "Monitoring & Control", "Technology", "Organization"];

const ResultsTablePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [processResults, setProcessResults] = useState<ProcessResults>({});
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    axios.get(`/api/assessment/${id}/results`)
      .then(res => {
        organizeResults(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Carica suggerimenti AI
    setAiLoading(true);
    axios.get(`/api/assessment/${id}/ai-suggestions-enhanced?include_roadmap=true`)
      .then(res => {
        setSuggestions(res.data);
        setAiLoading(false);
      })
      .catch(() => {
        setAiLoading(false);
      });
  }, [id]);

  
  const calculateCriticalPoints = (): CriticalPoint[] => {
    const criticalPoints: CriticalPoint[] = [];
    
    Object.entries(processResults).forEach(([process, categories]) => {
      const activitiesMap: {
        [activity: string]: {
          dimensions: { [dim: string]: number[] };
          notes: string[];
        }
      } = {};
      
      Object.entries(categories).forEach(([category, activities]) => {
        Object.entries(activities).forEach(([activity, dimensions]) => {
          if (!activitiesMap[activity]) {
            activitiesMap[activity] = {
              dimensions: {
                'Governance': [],
                'Monitoring & Control': [],
                'Technology': [],
                'Organization': []
              },
              notes: []
            };
          }
          
          Object.entries(dimensions).forEach(([_dim, data]) => {
            if (!data.is_not_applicable && activitiesMap[activity].dimensions[category]) {
              activitiesMap[activity].dimensions[category].push(data.score);
            }
            if (data.note) {
              activitiesMap[activity].notes.push(data.note);
            }
          });
        });
      });
      
      Object.entries(activitiesMap).forEach(([activity, data]) => {
        const dimAverages: { [key: string]: number | null } = {};
        
        Object.entries(data.dimensions).forEach(([dimName, scores]) => {
          dimAverages[dimName] = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : null;
        });
        
        const validAvgs = Object.values(dimAverages).filter(v => v !== null) as number[];
        const processRating = validAvgs.length > 0
          ? validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length
          : null;
        
        const isCritical = validAvgs.some(v => v <= 1.5);
        
        criticalPoints.push({
          process,
          subprocess: activity,
          governance: dimAverages['Governance'],
          monitoring_control: dimAverages['Monitoring & Control'],
          technology: dimAverages['Technology'],
          organization: dimAverages['Organization'],
          process_rating: processRating,
          notes: data.notes.join('; '),
          is_critical: isCritical
        });
      });
    });
    
    return criticalPoints.sort((a, b) => {
      if (a.is_critical !== b.is_critical) return a.is_critical ? -1 : 1;
      return (a.process_rating || 5) - (b.process_rating || 5);
    });
  };

  const getScoreIcon = (score: number | null) => {
    if (score === null) return <span className="text-gray-400">N/A</span>;
    
    if (score <= 1.0) {
      return <span className="text-red-600 text-xl">❌</span>;
    } else if (score <= 2.0) {
      return <span className="text-orange-500 text-xl">⭕</span>;
    } else if (score <= 3.0) {
      return <span className="text-yellow-500 text-xl">⚠️</span>;
    } else {
      return <span className="text-green-600 text-xl">✅</span>;
    }
  };


  const calculateProcessAverages = () => {
    const averages: { [process: string]: { [category: string]: number } } = {};
    
    Object.entries(processResults).forEach(([process, categories]) => {
      averages[process] = {};
      
      Object.entries(categories).forEach(([category, activities]) => {
        const rowAverages: number[] = [];
        
        Object.values(activities).forEach(dimensions => {
          const rowAvg = calculateRowAverage(dimensions);
          if (rowAvg !== null) {
            rowAverages.push(rowAvg);
          }
        });
        
        averages[process][category] = rowAverages.length > 0 
          ? rowAverages.reduce((sum, avg) => sum + avg, 0) / rowAverages.length 
          : 0;
      });
    });
    
    return averages;
  };

  const calculateCategoryAverage = (activities: any) => {
    const rowAverages: number[] = [];
    
    Object.values(activities).forEach((dimensions: any) => {
      const rowAvg = calculateRowAverage(dimensions);
      if (rowAvg !== null) {
        rowAverages.push(rowAvg);
      }
    });
    
    if (rowAverages.length === 0) return 'N/A';
    
    const total = rowAverages.reduce((sum, avg) => sum + avg, 0);
    return (total / rowAverages.length).toFixed(2);
  };

  const calculateFinalRate = () => {
    const processAverages = calculateProcessAverages();
    const allCategoryAverages: number[] = [];
    
    Object.values(processAverages).forEach(categories => {
      Object.values(categories).forEach(avg => {
        if (avg > 0) {
          allCategoryAverages.push(avg);
        }
      });
    });
    
    if (allCategoryAverages.length === 0) return 'N/A';
    
    const total = allCategoryAverages.reduce((sum, avg) => sum + avg, 0);
    return (total / allCategoryAverages.length).toFixed(2);
  };

  const calculateProcessRating = (process: string) => {
    const categories = processResults[process];
    if (!categories) return 'N/A';
    
    const categoryAverages: number[] = [];
    
    Object.values(categories).forEach(activities => {
      const rowAverages: number[] = [];
      
      Object.values(activities).forEach(dimensions => {
        const rowAvg = calculateRowAverage(dimensions);
        if (rowAvg !== null) {
          rowAverages.push(rowAvg);
        }
      });
      
      if (rowAverages.length > 0) {
        const catAvg = rowAverages.reduce((sum, avg) => sum + avg, 0) / rowAverages.length;
        categoryAverages.push(catAvg);
      }
    });
    
    if (categoryAverages.length === 0) return 'N/A';
    
    const total = categoryAverages.reduce((sum, avg) => sum + avg, 0);
    return (total / categoryAverages.length).toFixed(2);
  };

  const calculateRowAverage = (dimensions: { [dim: string]: { score: number; is_not_applicable?: boolean } }) => {
    let total = 0;
    let count = 0;
    
    Object.values(dimensions).forEach(dimData => {
      if (!dimData.is_not_applicable) {
        total += dimData.score;
        count++;
      }
    });
    
    return count > 0 ? total / count : null;
  };

  //   const getAllActivitiesSummary = (): ActivitySummary[] => {
  //     const summaries: ActivitySummary[] = [];
  //     
  //     Object.entries(processResults).forEach(([process, categories]) => {
  //       Object.entries(categories).forEach(([category, activities]) => {
  //         Object.entries(activities).forEach(([activity, dimensions]) => {
  //           const avg = calculateRowAverage(dimensions);
  //           if (avg !== null) {
  //             const firstDim = Object.values(dimensions)[0];
  //             summaries.push({
  //               process,
  //               activity,
  //               category,
  //               average: avg,
  //               note: firstDim?.note || ''
  //             });
  //           }
  //         });
  //       });
  //     });
  //     
  //     return summaries;
  //   };

  const organizeResults = (data: Result[]) => {
    const organized: ProcessResults = {};
    
    data.forEach(result => {
      if (!organized[result.process]) {
        organized[result.process] = {};
      }
      if (!organized[result.process][result.category]) {
        organized[result.process][result.category] = {};
      }
      if (!organized[result.process][result.category][result.activity]) {
        organized[result.process][result.category][result.activity] = {};
      }
      organized[result.process][result.category][result.activity][result.dimension] = {
        score: result.score,
        note: result.note,
        is_not_applicable: result.is_not_applicable
      };
    });
    
    setProcessResults(organized);
  };

  if (loading) return <div className="p-8">Caricamento risultati...</div>;

  const processAverages = calculateProcessAverages();
  const finalRate = calculateFinalRate();
  //   const allActivities = getAllActivitiesSummary();
  const criticalPointsData = calculateCriticalPoints();
  
  //   const puntiForza = allActivities.filter(a => a.average >= 3.00).sort((a, b) => b.average - a.average);
  //   const puntiDebolezza = allActivities.filter(a => a.average < 2.00 && a.average >= 1.00).sort((a, b) => a.average - b.average);
  //   const puntiCritici = allActivities.filter(a => a.average < 1.00).sort((a, b) => a.average - b.average);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Risultati Assessment Digitale 4.0
            </h1>
            <div className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg inline-block">
              <span className="text-sm font-semibold uppercase">FINAL RATE:</span>
              <span className="text-2xl font-bold ml-3">{finalRate}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.open(`/api/assessment/${id}/pdf`, '_blank')}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2"
            >
              <span>📄</span>
              Scarica PDF
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold"
            >
              Torna alla Dashboard
            </button>
          </div>
        </div>

        {Object.entries(processResults).map(([process, categories]) => {
          const processRating = calculateProcessRating(process);
          
          return (
            <div key={process} className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{process}</h2>
                <div className="bg-green-500 text-white px-4 py-2 rounded-lg">
                  <span className="text-sm font-semibold">PROCESS RATING:</span>
                  <span className="text-xl font-bold ml-2">{processRating}</span>
                </div>
              </div>
            
            {processAverages[process] && (
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Radar Chart - {process}</h3>
                <p className="text-sm text-gray-600 mb-6">Media per categoria del processo {process}</p>
                
                <div className="flex justify-center">
                  <div className="relative" style={{ width: '600px', height: '600px' }}>
                    <svg viewBox="0 0 600 600" className="w-full h-full">
                      {[0, 1, 2, 3, 4, 5].map(level => {
                        const categoryNames = Object.keys(processAverages[process]);
                        return (
                          <polygon
                            key={level}
                            points={categoryNames.map((_, i) => {
                              const angle = (Math.PI * 2 * i) / categoryNames.length - Math.PI / 2;
                              const radius = (level / 5) * 150;
                              const x = 300 + radius * Math.cos(angle);
                              const y = 300 + radius * Math.sin(angle);
                              return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                        );
                      })}
                      
                      {Object.keys(processAverages[process]).map((_, i) => {
                        const categoryNames = Object.keys(processAverages[process]);
                        const angle = (Math.PI * 2 * i) / categoryNames.length - Math.PI / 2;
                        const x = 300 + 200 * Math.cos(angle);
                        const y = 300 + 200 * Math.sin(angle);
                        return (
                          <line
                            key={i}
                            x1="300"
                            y1="300"
                            x2={x}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                        );
                      })}
                      
                      <polygon
                        points={Object.values(processAverages[process]).map((score, i) => {
                          const categoryNames = Object.keys(processAverages[process]);
                          const angle = (Math.PI * 2 * i) / categoryNames.length - Math.PI / 2;
                          const radius = (score / 5) * 150;
                          const x = 300 + radius * Math.cos(angle);
                          const y = 300 + radius * Math.sin(angle);
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="rgba(59, 130, 246, 0.3)"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="2"
                      />
                      
                      {Object.keys(processAverages[process]).map((name, i) => {
                        const categoryNames = Object.keys(processAverages[process]);
                        const angle = (Math.PI * 2 * i) / categoryNames.length - Math.PI / 2;
                        const x = 300 + 240 * Math.cos(angle);
                        const y = 300 + 240 * Math.sin(angle);
                        return (
                          <text
                            key={name}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            className="text-xs font-semibold fill-gray-700"
                          >
                            {name}
                          </text>
                        );
                      })}
                      
                      {Object.values(processAverages[process]).map((score, i) => {
                        const categoryNames = Object.keys(processAverages[process]);
                        const angle = (Math.PI * 2 * i) / categoryNames.length - Math.PI / 2;
                        const radius = (score / 5) * 150;
                        const x = 300 + radius * Math.cos(angle);
                        const y = 300 + radius * Math.sin(angle);
                        return (
                          <text
                            key={`score-${i}`}
                            x={x}
                            y={y - 10}
                            textAnchor="middle"
                            className="text-sm font-bold fill-blue-600"
                          >
                            {score.toFixed(2)}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            )}
            
            {CATEGORIES_ORDER.filter(cat => categories[cat]).map(category => { const activities = categories[category];
              const allActivities = Object.keys(activities);
              const allDimensions = allActivities.length > 0 
                ? Object.keys(activities[allActivities[0]])
                : [];
              const categoryAverage = calculateCategoryAverage(activities);

              return (
                <div key={category} className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 mb-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">{category}</h3>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-blue-500">
                          <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold sticky left-0 bg-blue-500 min-w-[150px]">
                            Attività
                          </th>
                          {allDimensions.map(dim => (
                            <th key={dim} className="border border-gray-300 px-2 py-2 text-center text-white font-semibold min-w-[100px]">
                              <div className="text-xs leading-tight">{dim.substring(0, 50)}</div>
                            </th>
                          ))}
                          <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold min-w-[80px]">
                            Media
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold min-w-[250px]">
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(activities).map(([activity, dimensions]) => {
                          const firstDimension = Object.values(dimensions)[0];
                          const note = firstDimension?.note || '';
                          const rowAvg = calculateRowAverage(dimensions);
                          const rowAverage = rowAvg !== null ? rowAvg.toFixed(2) : 'N/A';
                          
                          return (
                            <tr key={activity} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-3 py-2 text-gray-800 font-medium sticky left-0 bg-white">
                                {activity}
                              </td>
                              {allDimensions.map(dim => {
                                const dimData = dimensions[dim];
                                const score = dimData?.score ?? 0;
                                const isNA = dimData?.is_not_applicable;
                                
                                return (
                                  <td key={dim} className="border border-gray-300 px-2 py-2 text-center bg-white">
                                    {isNA ? (
                                      <span className="inline-block px-3 py-1 rounded font-semibold bg-gray-200 text-gray-600">
                                        N/A
                                      </span>
                                    ) : (
                                      <span className={`inline-block px-3 py-1 rounded font-semibold ${
                                        score === 0 ? 'bg-red-100 text-red-800' :
                                        score === 1 ? 'bg-orange-100 text-orange-800' :
                                        score === 2 ? 'bg-yellow-100 text-yellow-800' :
                                        score === 3 ? 'bg-yellow-100 text-yellow-700' :
                                        score === 4 ? 'bg-green-100 text-green-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {score}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border border-gray-300 px-3 py-2 text-center bg-blue-50">
                                <span className="font-bold text-blue-800">{rowAverage}</span>
                              </td>
                              <td className="border border-gray-300 px-3 py-2 bg-white text-gray-600 text-sm">
                                {note || '-'}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Riga totale categoria */}
                        <tr className="bg-blue-100 font-bold">
                          <td className="border border-gray-300 px-3 py-2 text-gray-800 uppercase sticky left-0 bg-blue-100">
                            {category}
                          </td>
                          {allDimensions.map(dim => (
                            <td key={dim} className="border border-gray-300 px-2 py-2 text-center bg-blue-100">
                              -
                            </td>
                          ))}
                          <td className="border border-gray-300 px-3 py-2 text-center bg-blue-200">
                            <span className="font-bold text-blue-900 text-lg">{categoryAverage}</span>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 bg-blue-100">
                            -
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )})}

        {/* Tabelle Riassuntive */}
        <div className="mt-12 space-y-8">
          {/* Punti di Forza - Tabella Completa Stile Excel */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg">
                <span className="font-bold">&gt;= 3.00</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">PUNTI DI FORZA - Dettaglio 4 Dimensioni</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-green-600">
                    <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold">Processo</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold">Sottoprocesso</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Governance</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Monitoring & Control</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Technology</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Organization</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold bg-amber-100">PROCESS RATING</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalPointsData.filter(p => (p.process_rating || 0) >= 3.0).map((point, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 bg-green-50">
                      <td className="border border-gray-300 px-3 py-2 text-gray-800 font-semibold">{point.process}</td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-800">{point.subprocess}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.governance)}
                          <span className="font-mono font-bold">
                            {point.governance !== null ? point.governance.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.monitoring_control)}
                          <span className="font-mono font-bold">
                            {point.monitoring_control !== null ? point.monitoring_control.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.technology)}
                          <span className="font-mono font-bold">
                            {point.technology !== null ? point.technology.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.organization)}
                          <span className="font-mono font-bold">
                            {point.organization !== null ? point.organization.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center bg-amber-50">
                        <span className="font-bold text-lg text-green-700">
                          {point.process_rating !== null ? point.process_rating.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs max-w-md">
                        {point.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Punti di Debolezza - Tabella Completa Stile Excel */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg">
                <span className="font-bold">2.00 - 2.99</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">PUNTI DI DEBOLEZZA - Dettaglio 4 Dimensioni</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-yellow-500">
                    <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold">Processo</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold">Sottoprocesso</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Governance</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Monitoring & Control</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Technology</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Organization</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold bg-amber-100">PROCESS RATING</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalPointsData.filter(p => {
                    const rating = p.process_rating || 0;
                    return rating >= 2.0 && rating < 3.0;
                  }).map((point, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 bg-yellow-50">
                      <td className="border border-gray-300 px-3 py-2 text-gray-800 font-semibold">{point.process}</td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-800">{point.subprocess}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.governance)}
                          <span className="font-mono font-bold">
                            {point.governance !== null ? point.governance.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.monitoring_control)}
                          <span className="font-mono font-bold">
                            {point.monitoring_control !== null ? point.monitoring_control.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.technology)}
                          <span className="font-mono font-bold">
                            {point.technology !== null ? point.technology.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.organization)}
                          <span className="font-mono font-bold">
                            {point.organization !== null ? point.organization.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center bg-amber-50">
                        <span className="font-bold text-lg text-yellow-700">
                          {point.process_rating !== null ? point.process_rating.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs max-w-md">
                        {point.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Punti Critici - Tabella Completa Stile Excel */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-600 text-white px-4 py-2 rounded-lg">
                <span className="font-bold">ANALISI COMPLETA</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">PUNTI CRITICI - Dettaglio 4 Dimensioni</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-red-600">
                    <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold">Processo</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold">Sottoprocesso</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Governance</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Monitoring & Control</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Technology</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold">Organization</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-white font-semibold bg-amber-100">PROCESS RATING</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-white font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalPointsData.map((point, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 ${point.is_critical ? 'bg-red-50' : ''}`}>
                      <td className="border border-gray-300 px-3 py-2 text-gray-800 font-semibold">{point.process}</td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-800">{point.subprocess}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.governance)}
                          <span className="font-mono font-bold">
                            {point.governance !== null ? point.governance.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.monitoring_control)}
                          <span className="font-mono font-bold">
                            {point.monitoring_control !== null ? point.monitoring_control.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.technology)}
                          <span className="font-mono font-bold">
                            {point.technology !== null ? point.technology.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(point.organization)}
                          <span className="font-mono font-bold">
                            {point.organization !== null ? point.organization.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center bg-amber-50">
                        <span className="font-bold text-lg text-amber-700">
                          {point.process_rating !== null ? point.process_rating.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs max-w-md">
                        {point.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Legenda */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-bold text-gray-800 mb-3">📖 Legenda Icone:</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 text-xl">❌</span>
                  <span className="text-gray-700">&lt;= 1.0 (Critico)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500 text-xl">⭕</span>
                  <span className="text-gray-700">1.0 - 2.0 (Basso)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 text-xl">⚠️</span>
                  <span className="text-gray-700">2.0 - 3.0 (Medio)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-xl">✅</span>
                  <span className="text-gray-700">&gt; 3.0 (Buono)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggestions Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>🤖</span>
            <span>Suggerimenti AI Personalizzati</span>
          </h3>
          
          {aiLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-lg font-semibold text-gray-700">Generazione raccomandazioni AI...</p>
              <p className="text-sm text-gray-500 mt-2">Analisi approfondita in corso (fino a 30 secondi)</p>
            </div>
          )}
          
          {!aiLoading && !suggestions && (
            <div className="text-center py-8">
              <p className="text-gray-500">⚠️ Suggerimenti AI non disponibili</p>
            </div>
          )}
          
          {!aiLoading && suggestions && (
            <div>
              {suggestions.critical_count > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-semibold text-center">
                    ⚠️ {suggestions.critical_count} aree critiche identificate che richiedono attenzione
                  </p>
                </div>
              )}
              <div 
                className="prose max-w-none space-y-4"
                dangerouslySetInnerHTML={{ 
                  __html: suggestions.suggestions
                    .replace(/###\s*(.*)/g, '<h3 class="text-xl font-bold mt-6 mb-3 text-gray-800 border-b-2 border-blue-200 pb-2">$1</h3>')
                    .replace(/🎯\s*\*\*(.*)\*\*/g, '<div class="p-4 bg-blue-50 border-l-4 border-blue-400 rounded mb-3"><strong class="text-blue-800">🎯 $1</strong></div>')
                    .replace(/💰\s*\*\*(.*)\*\*/g, '<div class="p-4 bg-green-50 border-l-4 border-green-400 rounded mb-3"><strong class="text-green-800">💰 $1</strong></div>')
                    .replace(/📈\s*\*\*(.*)\*\*/g, '<div class="p-4 bg-purple-50 border-l-4 border-purple-400 rounded mb-3"><strong class="text-purple-800">📈 $1</strong></div>')
                    .replace(/⏱️\s*\*\*(.*)\*\*/g, '<div class="p-4 bg-orange-50 border-l-4 border-orange-400 rounded mb-3"><strong class="text-orange-800">⏱️ $1</strong></div>')
                    .replace(/🔧\s*\*\*(.*)\*\*/g, '<div class="p-4 bg-gray-50 border-l-4 border-gray-400 rounded mb-3"><strong class="text-gray-800">🔧 $1</strong></div>')
                    .replace(/🏆\s*\*\*(.*)\*\*/g, '<div class="p-5 bg-yellow-50 border-l-4 border-yellow-500 rounded mb-4"><strong class="text-yellow-900 text-lg">🏆 $1</strong></div>')
                    .replace(/⚠️\s*\*\*(.*)\*\*/g, '<div class="p-5 bg-red-50 border-l-4 border-red-500 rounded mb-4"><strong class="text-red-900 text-lg">⚠️ $1</strong></div>')
                    .replace(/🚀\s*\*\*(.*)\*\*/g, '<div class="p-5 bg-indigo-50 border-l-4 border-indigo-500 rounded mb-4"><strong class="text-indigo-900 text-lg">🚀 $1</strong></div>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
                    .replace(/\n\n/g, '<br><br>')
                    .replace(/\n/g, ' ')
                }} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsTablePage;
