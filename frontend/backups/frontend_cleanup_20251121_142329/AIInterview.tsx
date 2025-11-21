import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const AIInterview = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');

  // Upload audio e trascrivi
  const handleAudioUpload = async () => {
    if (!audioFile) return;
    
    setTranscribing(true);
    const formData = new FormData();
    formData.append('file', audioFile);
    
    try {
      const response = await axios.post('/api/ai-interview/transcribe', formData);
      setTranscript(response.data.transcript);
      setStep('review');
    } catch (error) {
      console.error('Errore trascrizione:', error);
      alert('Errore durante la trascrizione');
    } finally {
      setTranscribing(false);
    }
  };

  // Analizza trascrizione e compila assessment
  const handleAnalyze = async () => {
    if (!transcript || !sessionId) return;
    
    setAnalyzing(true);
    
    try {
      // 1. Analizza con AI
      const aiResponse = await axios.post(`/api/ai-interview/analyze/${sessionId}`, {
        text: transcript
      });
      
      const results = aiResponse.data.results;
      
      // 2. Salva i risultati nell'assessment
      await axios.post(`/api/assessment/${sessionId}/submit`, results);
      
      alert(`✅ Assessment compilato automaticamente! 
${results.length} risposte generate dall'AI.
Ora puoi revisionarle e modificarle.`);
      
      // 3. Vai all'assessment per la revisione
      navigate(`/assessment/${sessionId}`);
      
    } catch (error: any) {
      console.error('Errore analisi:', error);
      alert(`Errore: ${error.response?.data?.detail || error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                🎤 AI Interview Assistant
              </h1>
              <p className="text-gray-600">
                Compila automaticamente l'assessment basandoti su un'intervista
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl transition"
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex-1 text-center ${step === 'upload' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              1. Upload
            </div>
            <div className="flex-1 border-t-2 border-gray-300 mx-4" />
            <div className={`flex-1 text-center ${step === 'review' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              2. Review
            </div>
            <div className="flex-1 border-t-2 border-gray-300 mx-4" />
            <div className={`flex-1 text-center ${step === 'done' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              3. Completa
            </div>
          </div>
        </div>

        {/* Content */}
        {step === 'upload' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Carica Intervista</h2>
            
            {/* Opzione 1: Upload Audio */}
            <div className="mb-8 p-6 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>🎵</span> Opzione 1: Carica File Audio
              </h3>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-700 mb-4
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-500 file:text-white
                  hover:file:bg-blue-600"
              />
              <button
                onClick={handleAudioUpload}
                disabled={!audioFile || transcribing}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                {transcribing ? '🔄 Trascrizione in corso...' : '📝 Trascrivi Audio'}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Formati supportati: MP3, WAV, M4A, OGG
              </p>
            </div>

            {/* Opzione 2: Incolla Trascrizione */}
            <div className="p-6 border-2 border-dashed border-green-300 rounded-xl bg-green-50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>📄</span> Opzione 2: Incolla Trascrizione
              </h3>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Incolla qui la trascrizione dell'intervista..."
                rows={10}
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={() => transcript && setStep('review')}
                disabled={!transcript}
                className="w-full mt-4 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                Continua con Trascrizione →
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Trascrizione dell'Intervista</h2>
            
            <div className="mb-6 p-6 bg-gray-50 rounded-xl max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {transcript}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-blue-900 mb-2">ℹ️ Cosa succederà:</h3>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li>L'AI analizzerà l'intervista</li>
                <li>Verranno generati punteggi per ogni domanda (0-5)</li>
                <li>L'assessment verrà pre-compilato automaticamente</li>
                <li>Potrai revisionare e modificare tutte le risposte</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('upload')}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold"
              >
                ← Modifica Trascrizione
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-bold shadow-lg"
              >
                {analyzing ? '🤖 Analisi AI in corso...' : '🚀 Genera Assessment con AI'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInterview;
