
// src/components/SummaryRadar.tsx - UI RINNOVATA
import React, { useEffect, useState } from 'react';

interface SummaryRadarProps {
  sessionId: string;
}

const SummaryRadar: React.FC<SummaryRadarProps> = ({ sessionId }) => {
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
      <div className="bg-white border rounded-lg p-6 shadow-sm text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Caricamento radar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center">
        <p className="text-red-700 font-medium mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-danger"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">📊 Radar Riassuntivo</h2>
          <p className="text-sm text-gray-500">Modello 4.0 - Politecnico di Milano</p>
        </div>
        {useFallback && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">Compatibilità</span>
        )}
      </div>
      <div className="text-center relative bg-gray-50 rounded-lg p-4">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <p className="text-sm text-gray-500">Generazione grafico...</p>
          </div>
        )}
        <img
          key={imageUrl}
          src={imageUrl}
          alt="Radar chart"
          className={`max-w-full h-auto mx-auto rounded transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ maxHeight: '500px' }}
        />
      </div>
    </div>
  );
};

export default SummaryRadar;
