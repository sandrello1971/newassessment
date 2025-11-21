import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Template {
  id: string;
  code: string;
  name: string;
  description: string;
  sector: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  is_active: boolean;
  is_deprecated: boolean;
  created_at: string;
}

const AdminTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // New template form
  const [newTemplate, setNewTemplate] = useState({
    code: '',
    name: '',
    description: '',
    sector: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/templates/');
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Errore caricamento template:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (templateId: string) => {
    try {
      const res = await axios.get(`/api/admin/templates/${templateId}/versions`);
      setVersions(res.data || []);
    } catch (err) {
      console.error('Errore caricamento versioni:', err);
    }
  };

  const handleTemplateClick = async (template: Template) => {
    setSelectedTemplate(template);
    await loadVersions(template.id);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/templates/', newTemplate);
      setShowCreateModal(false);
      setNewTemplate({ code: '', name: '', description: '', sector: '' });
      loadTemplates();
      alert('✅ Template creato con successo!');
    } catch (err: any) {
      alert(`❌ Errore: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadStatus('');

    try {
      const res = await axios.post('/api/admin/upload-template-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus(`✅ ${res.data.message || 'Template importato con successo!'}`);
      loadTemplates();
    } catch (err: any) {
      setUploadStatus(`❌ ${err.response?.data?.detail || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleTemplateActive = async (templateId: string, currentStatus: boolean) => {
    try {
      await axios.patch(`/api/admin/templates/${templateId}`, {
        is_active: !currentStatus
      });
      loadTemplates();
    } catch (err: any) {
      alert(`❌ Errore: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 Gestione Template</h1>
              <p className="text-gray-600">Gestisci i template di assessment versionati</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ➕ Nuovo Template
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                ← Dashboard Admin
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Templates List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Template Disponibili</h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : templates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nessun template</p>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">{template.name}</h3>
                      {template.is_active && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Attivo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{template.sector}</p>
                    <p className="text-xs text-gray-400 mt-2">{template.code}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Details & Versions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">📤 Importa da Excel</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUploadExcel}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-700
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700
                    disabled:opacity-50"
                />
                {uploading && <p className="mt-2 text-sm text-gray-600">Caricamento...</p>}
                {uploadStatus && (
                  <p className={`mt-2 text-sm ${uploadStatus.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {uploadStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Selected Template Details */}
            {selectedTemplate && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{selectedTemplate.name}</h2>
                  <button
                    onClick={() => toggleTemplateActive(selectedTemplate.id, selectedTemplate.is_active)}
                    className={`px-4 py-2 rounded-lg ${
                      selectedTemplate.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {selectedTemplate.is_active ? '🔴 Disattiva' : '🟢 Attiva'}
                  </button>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-6">
                  <p><strong>Codice:</strong> {selectedTemplate.code}</p>
                  <p><strong>Settore:</strong> {selectedTemplate.sector}</p>
                  <p><strong>Descrizione:</strong> {selectedTemplate.description}</p>
                  <p><strong>Creato:</strong> {new Date(selectedTemplate.created_at).toLocaleDateString()}</p>
                </div>

                <h3 className="text-lg font-bold mb-3">Versioni</h3>
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span className="font-semibold">Versione {version.version}</span>
                        {version.is_active && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            Attiva
                          </span>
                        )}
                        {version.is_deprecated && (
                          <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            Deprecata
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {versions.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nessuna versione</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">Nuovo Template</h2>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Codice *</label>
                  <input
                    type="text"
                    value={newTemplate.code}
                    onChange={(e) => setNewTemplate({...newTemplate, code: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nome *</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Descrizione</label>
                  <textarea
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Settore *</label>
                  <input
                    type="text"
                    value={newTemplate.sector}
                    onChange={(e) => setNewTemplate({...newTemplate, sector: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Crea
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTemplates;
