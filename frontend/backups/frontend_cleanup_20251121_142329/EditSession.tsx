import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import axios from 'axios';

interface SessionData {
  azienda_nome: string;
  settore: string;
  dimensione: string;
  referente: string;
  email: string;
  effettuato_da: string;
  data_chiusura: string;
  logo_path?: string;
}

const EditSession = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<SessionData>({
    azienda_nome: '',
    settore: '',
    dimensione: '',
    referente: '',
    email: '',
    effettuato_da: '',
    data_chiusura: '',
    logo_path: ''
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const response = await axios.get(`/api/assessment/session/${sessionId}`);
      const session = response.data;
      setFormData({
        azienda_nome: session.azienda_nome || '',
        settore: session.settore || '',
        dimensione: session.dimensione || '',
        referente: session.referente || '',
        email: session.email || '',
        effettuato_da: session.effettuato_da || '',
        data_chiusura: session.data_chiusura ? new Date(session.data_chiusura).toISOString().slice(0, 16) : '',
        logo_path: session.logo_path || ''
      });
      
      if (session.logo_path) {
        console.log('Logo path dal DB:', session.logo_path);
        setLogoPreview(session.logo_path);
        console.log('LogoPreview impostato a:', session.logo_path);
      }
    } catch (err: any) {
      setError('Errore nel caricamento della sessione');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(`/api/assessment/session/${sessionId}`, formData);
      setSuccess(response.data.message);
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Crea preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    const formData = new FormData();
    formData.append('file', logoFile);

    try {
      await axios.post(`/api/assessment/session/${sessionId}/upload-logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Logo caricato con successo');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore caricamento logo');
    }
  };

  const handleLogoDelete = async () => {
    try {
      await axios.delete(`/api/assessment/session/${sessionId}/logo`);
      setLogoFile(null);
      setLogoPreview('');
      setFormData({ ...formData, logo_path: '' });
      setSuccess('Logo eliminato');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore eliminazione logo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Caricamento dati sessione...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Modifica Dati Assessment</h1>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Azienda *
              </label>
              <input
                type="text"
                name="azienda_nome"
                value={formData.azienda_nome}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            

            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">

                Logo Aziendale

              </label>

              <div className="space-y-3">

                {logoPreview && (

                  <div className="flex items-center gap-4">

                    <img 

                      src={logoPreview} 

                      alt="Logo preview" 

                      className="h-20 w-20 object-contain border border-gray-300 rounded p-2"

                    />

                    <button

                      type="button"

                      onClick={handleLogoDelete}

                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"

                    >

                      Rimuovi

                    </button>

                  </div>

                )}

                <input

                  type="file"

                  accept="image/*"

                  onChange={handleLogoChange}

                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                />

                {logoFile && (

                  <button

                    type="button"

                    onClick={handleLogoUpload}

                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"

                  >

                    Carica Logo

                  </button>

                )}

                <p className="text-sm text-gray-500">

                  Formati supportati: PNG, JPG, JPEG, GIF, SVG

                </p>

              </div>

            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Settore
              </label>
              <input
                type="text"
                name="settore"
                value={formData.settore}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimensione Azienda
              </label>
              <select
                name="dimensione"
                value={formData.dimensione}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleziona...</option>
                <option value="Micro (1-9 dipendenti)">Micro (1-9 dipendenti)</option>
                <option value="Piccola (10-49 dipendenti)">Piccola (10-49 dipendenti)</option>
                <option value="Media (50-249 dipendenti)">Media (50-249 dipendenti)</option>
                <option value="Grande (250+ dipendenti)">Grande (250+ dipendenti)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referente
              </label>
              <input
                type="text"
                name="referente"
                value={formData.referente}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Effettuato da */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effettuato da
              </label>
              <input
                type="text"
                name="effettuato_da"
                value={formData.effettuato_da}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome di chi esegue l'assessment"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Chiusura Assessment
              </label>
              <input
                type="datetime-local"
                name="data_chiusura"
                value={formData.data_chiusura}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Data di completamento dell'assessment (lasciare vuoto se non ancora completato)
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Salvataggio...' : 'Salva Modifiche'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditSession;
