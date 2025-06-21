import AdminUsersManager from '../components/AdminUsersManager';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Администраторы CRM</h1>
        <p className="mt-1 text-sm text-gray-600">
          Управление доступом к панели администрирования Spody
        </p>
      </div>
      
      <AdminUsersManager />
    </div>
  );
} 