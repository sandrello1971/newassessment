import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Model {
  name: string;
  filename: string;
  processes_count: number;
  is_default: boolean;
}

const AdminModels = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const res = await axios.get('/api/admin/list-models');
      setModels(res.data.models);
    } catch (err) {
      console.error('Errore caricamento modelli:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadStatus('');

    try {
      const res = await axios.post('/api/admin/upload-excel-model', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadStatus(`✅ ${res.data.message}`);
      loadModels();
    } catch (err: any) {
      setUploadStatus(`❌ Errore: ${err.response?.data?.detail || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">🔧 Gestione Modelli Assessment</h1>
              <p className="text-gray-600">Carica nuovi file Excel per creare modelli personalizzati</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin/questions')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                📝 Editor Domande
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all"
              >
                ← Torna alla Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📤 Carica Nuovo Modello</h2>
          
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 bg-blue-50 hover:bg-blue-100 transition-all">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-700
                file:mr-4 file:py-3 file:px-6
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                file:cursor-pointer cursor-pointer
                disabled:opacity-50"
            />
            
            {uploading && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Caricamento in corso...</p>
              </div>
            )}
            
            {uploadStatus && (
              <div className={`mt-4 p-4 rounded-lg ${
                uploadStatus.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {uploadStatus}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-bold text-yellow-800 mb-2">📋 Requisiti File Excel:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Formato: .xlsx o .xls</li>
              <li>• Struttura: uguale al modello di riferimento del Politecnico</li>
              <li>• Riga 1: Nome modello</li>
              <li>• Riga 2: Categorie (Governance, Monitoring & Control, Technology, Organization)</li>
              <li>• Riga 3: Domande per ogni dimensione</li>
              <li>• Righe successive: Processi e sottoprocessi con valutazioni</li>
            </ul>
          </div>
        </div>

        {/* Models List */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 Modelli Disponibili</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <div
                key={model.name}
                className={`p-6 rounded-xl border-2 ${
                  model.is_default
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                } hover:shadow-lg transition-all`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{model.name}</h3>
                  {model.is_default && (
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p>📄 File: <span className="font-mono">{model.filename}</span></p>
                  <p>📊 Processi: {model.processes_count}</p>
                </div>
              </div>
            ))}
          </div>

          {models.length === 0 && (
            <p className="text-center text-gray-500 py-8">Nessun modello disponibile</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminModels;
