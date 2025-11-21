// src/components/InlineRadar.tsx - VERSIONE CORRETTA
import React, { useEffect, useState } from 'react';

interface InlineRadarProps {
  sessionId: string;
}

const InlineRadar: React.FC<InlineRadarProps> = ({ sessionId }) => {
  const [radarSvg, setRadarSvg] = useState<string>('');
  const [categoryScores, setCategoryScores] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadRadarData = async () => {
      try {
        setLoading(true);
        
        // ✅ CORRETTO: Carica il radar SVG (endpoint corretto)
        const svgResponse = await fetch(`/api/assessment/${sessionId}/summary-radar-svg`);
        if (svgResponse.ok) {
          const svg = await svgResponse.text();
          setRadarSvg(svg);
        }
        
        // ✅ Carica i punteggi delle categorie (se questo endpoint esiste)
        try {
          const scoresResponse = await fetch(`/api/assessment/${sessionId}/processes-radar`);
          if (scoresResponse.ok) {
            const scores = await scoresResponse.json();
            setCategoryScores(scores);
          }
        } catch (scoresErr) {
          console.warn('Endpoint category-scores non disponibile:', scoresErr);
          // Non è un errore critico, continua senza punteggi dettagliati
        }
        
      } catch (err) {
        console.error('Errore nel caricamento radar:', err);
        setError('Errore nel caricamento del radar chart');
      } finally {
        setLoading(false);
      }
    };

    loadRadarData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4">Caricamento radar...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <p className="text-red-800">{error}</p>
        <p className="text-sm text-gray-600 mt-2">
          Endpoint testato: /api/assessment/{sessionId}/summary-radar-svg
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        🎯 Radar Assessment Digitale
      </h2>
      <p className="text-center text-gray-600 mb-6">
        Modello di valutazione Politecnico di Milano - 4 Dimensioni di Maturità
      </p>
      
      {/* Radar Chart Inline */}
      <div className="flex justify-center mb-6">
        {radarSvg ? (
          <div 
            dangerouslySetInnerHTML={{ __html: radarSvg }}
            className="border rounded-lg bg-gray-50 p-4"
          />
        ) : (
          <div className="border rounded-lg bg-gray-100 p-8 text-center">
            <p className="text-gray-500">Radar SVG non disponibile</p>
            <p className="text-sm text-gray-400 mt-2">
              Prova a usare il componente SummaryRadar per il fallback matplotlib
            </p>
          </div>
        )}
      </div>
      
      {/* Dettagli Punteggi */}
      {categoryScores && categoryScores.processes && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {categoryScores.processes.slice(0, 4).map((process: any, idx: number) => (
            <div key={idx} className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 text-sm">
                {process.process.length > 15 ? process.process.slice(0, 15) + '...' : process.process}
              </h4>
              <p className="text-2xl font-bold text-blue-600">
                {process.overall_score?.toFixed(1) || '0.0'}
              </p>
              <p className="text-sm text-gray-600">{process.status || 'N/A'}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Legenda Livelli di Maturità */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-3">Livelli di Maturità Digitale</h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
          <div className="text-center">
            <span className="font-bold text-red-600">1 - Initial</span>
            <br />
            <span className="text-gray-600">Processi poco controllati</span>
          </div>
          <div className="text-center">
            <span className="font-bold text-orange-600">2 - Managed</span>
            <br />
            <span className="text-gray-600">Processi parzialmente pianificati</span>
          </div>
          <div className="text-center">
            <span className="font-bold text-yellow-600">3 - Defined</span>
            <br />
            <span className="text-gray-600">Implementazione best practices</span>
          </div>
          <div className="text-center">
            <span className="font-bold text-blue-600">4 - Integrated</span>
            <br />
            <span className="text-gray-600">Processi integrati e standardizzati</span>
          </div>
          <div className="text-center">
            <span className="font-bold text-green-600">5 - Digital</span>
            <br />
            <span className="text-gray-600">Processi digitali orientati</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InlineRadar;
