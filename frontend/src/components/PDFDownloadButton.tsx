import React, { useState } from 'react';
import { Download, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface PDFDownloadButtonProps {
  sessionId: string;
  companyName?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({ 
  sessionId, 
  companyName = 'Assessment',
  className = '',
  variant = 'primary',
  size = 'md'
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Stili basati su variant e size
  const getButtonStyles = () => {
    const baseStyles = 'flex items-center space-x-2 font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
    
    const variantStyles = {
      primary: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700',
      secondary: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700',
      outline: 'border-2 border-blue-500 text-blue-500 hover:bg-blue-50 hover:border-blue-600'
    };
    
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg'
    };
    
    return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`;
  };

  const downloadPDF = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Avvio download PDF per sessione:', sessionId);
      
      // Chiamata API per generare e scaricare PDF
      const response = await fetch(`/api/assessment/${sessionId}/pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Errore ${response.status}: ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          // Se non è JSON, usa il testo plain
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Verifica che sia effettivamente un PDF
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/pdf')) {
        throw new Error('La risposta del server non è un PDF valido');
      }

      // Converti response in blob
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Il PDF generato è vuoto');
      }

      // Crea URL temporaneo e scarica
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nome file pulito
      const cleanCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
      const shortSessionId = sessionId.slice(0, 8);
      link.download = `Assessment_Report_${cleanCompanyName}_${shortSessionId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup URL
      window.URL.revokeObjectURL(url);
      
      // Mostra successo
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      console.log('Download PDF completato con successo');

    } catch (err) {
      console.error('Errore durante il download del PDF:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto durante il download';
      setError(errorMessage);
      
      // Auto-hide error dopo 10 secondi
      setTimeout(() => setError(null), 10000);
      
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    downloadPDF();
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Pulsante principale */}
      <button
        onClick={downloadPDF}
        disabled={isDownloading}
        className={`${getButtonStyles()} ${className}`}
        aria-label="Scarica report PDF"
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Generando PDF...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>PDF Scaricato!</span>
          </>
        ) : (
          <>
            <FileText className="h-5 w-5" />
            <Download className="h-4 w-4" />
            <span>Scarica Report PDF</span>
          </>
        )}
      </button>

      {/* Progress indicator durante download */}
      {isDownloading && (
        <div className="w-full max-w-md">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full animate-pulse"></div>
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            Elaborazione report in corso...
          </p>
        </div>
      )}

      {/* Messaggio di successo */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Download completato!</p>
            <p className="text-green-600">Il report PDF è stato scaricato sul tuo dispositivo.</p>
          </div>
        </div>
      )}

      {/* Messaggio di errore */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 mb-1">
                Errore durante il download
              </p>
              <p className="text-sm text-red-700 break-words">
                {error}
              </p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={handleRetry}
                  className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
                >
                  Riprova
                </button>
                <button
                  onClick={() => setError(null)}
                  className="text-sm text-red-600 hover:text-red-800 px-3 py-1 transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info aggiuntive */}
      <div className="text-xs text-gray-500 text-center max-w-md">
        <p>Il report include analisi dettagliate, grafici e raccomandazioni personalizzate</p>
        <p className="mt-1">Formato: PDF • Dimensione: ~500KB-2MB</p>
      </div>
    </div>
  );
};

export default PDFDownloadButton;
