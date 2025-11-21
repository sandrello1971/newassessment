import { Link } from 'react-router-dom';
import { Users, FileText, Settings, Database } from 'lucide-react';

export default function AdminDashboard() {
  const adminSections = [
    {
      title: 'Gestione Utenti',
      description: 'Gestisci utenti, ruoli e permessi',
      icon: Users,
      link: '/admin/users',
      color: 'bg-blue-500'
    },
    {
      title: 'Gestione Template',
      description: 'Crea e modifica template di assessment',
      icon: Database,
      link: '/admin/templates',
      color: 'bg-green-500'
    },
    {
      title: 'Gestione Files',
      description: 'Upload e gestione files aziendali',
      icon: FileText,
      link: '/admin/files',
      color: 'bg-purple-500'
    },
    {
      title: 'Impostazioni',
      description: 'Configurazione sistema',
      icon: Settings,
      link: '/admin/settings',
      color: 'bg-gray-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Pannello Amministrazione</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.link}
                to={section.link}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className={`${section.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{section.title}</h3>
                <p className="text-gray-600 text-sm">{section.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
