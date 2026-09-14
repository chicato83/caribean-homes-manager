
import React, { useState } from 'react';
import { LayoutDashboard, Home, ClipboardCheck, Wrench, Package, LogOut, Settings, Globe, FileText, Sun, Moon, Calendar } from 'lucide-react';
import { ApartmentsManager } from './ApartmentsManager';
import { CleaningManager } from './CleaningManager';
import { MaintenanceManager } from './MaintenanceManager';
import { InventoryManager } from './InventoryManager';
import { SettingsManager } from './SettingsManager';
import { GlobalRecommendationsManager } from './GlobalRecommendationsManager';
import { ReportsManager } from './ReportsManager';
import { DashboardOverview } from './DashboardOverview';
import { CalendarView } from './CalendarView';
import { User, Role } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { SearchBar } from './SearchBar';

interface AdminDashboardProps {
  user: User;
  role: Role;
  onLogout: () => void;
}

type Tab = 'overview' | 'calendar' | 'apartments' | 'recommendations' | 'cleaning' | 'maintenance' | 'inventory' | 'settings' | 'reports';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, role, onLogout }) => {
  // Default to overview tab
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const hasPerm = (p: string) => role.permissions.includes(p as any);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Caribean<span className="text-brand-500">Homes</span></h2>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500"></div>
             <p className="text-slate-300 text-xs">Hola, {user.name}</p>
          </div>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar..."
            className="mt-4"
          />
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavButton icon={<LayoutDashboard />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavButton icon={<Calendar />} label="Calendario" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
          {hasPerm('manage_apartments') && (
            <>
                <NavButton icon={<Home />} label="Apartamentos" active={activeTab === 'apartments'} onClick={() => setActiveTab('apartments')} />
                <NavButton icon={<Globe />} label="Recomendaciones" active={activeTab === 'recommendations'} onClick={() => setActiveTab('recommendations')} />
                <NavButton icon={<FileText />} label="Informes" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
            </>
          )}
          {(hasPerm('manage_cleaning') || hasPerm('perform_cleaning')) && (
            <NavButton icon={<ClipboardCheck />} label="Limpieza" active={activeTab === 'cleaning'} onClick={() => setActiveTab('cleaning')} />
          )}
          {hasPerm('manage_maintenance') && (
            <NavButton icon={<Wrench />} label="Mantenimiento" active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} />
          )}
          {hasPerm('manage_inventory') && (
            <NavButton icon={<Package />} label="Inventario General" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          )}
          {hasPerm('manage_settings') && (
             <div className="pt-4 border-t border-slate-800 mt-4">
                 <NavButton icon={<Settings />} label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
             </div>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="flex items-center w-full px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors">
            <LogOut className="w-5 h-5 mr-3" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Nav Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white z-50 px-4 py-3 flex justify-between items-center shadow-lg">
         <span className="font-bold text-lg truncate w-1/4">CHomes</span>
         <div className="flex space-x-2 items-center justify-end w-3/4 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === 'overview' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('calendar')} 
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === 'calendar' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Calendar className="w-5 h-5" />
            </button>
            {hasPerm('manage_apartments') && (
                <>
                    <button 
                    onClick={() => setActiveTab('apartments')} 
                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === 'apartments' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                    <Home className="w-5 h-5" />
                    </button>
                    <button 
                    onClick={() => setActiveTab('recommendations')} 
                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === 'recommendations' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                    <Globe className="w-5 h-5" />
                    </button>
                    <button 
                    onClick={() => setActiveTab('reports')} 
                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === 'reports' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                    <FileText className="w-5 h-5" />
                    </button>
                </>
            )}
            {(hasPerm('manage_cleaning') || hasPerm('perform_cleaning')) && (
                <button 
                  onClick={() => setActiveTab('cleaning')} 
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === 'cleaning' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <ClipboardCheck className="w-5 h-5" />
                </button>
            )}
            {hasPerm('manage_maintenance') && (
                <button 
                  onClick={() => setActiveTab('maintenance')} 
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === 'maintenance' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Wrench className="w-5 h-5" />
                </button>
            )}
            {hasPerm('manage_inventory') && (
                <button 
                  onClick={() => setActiveTab('inventory')} 
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === 'inventory' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Package className="w-5 h-5" />
                </button>
            )}
            {hasPerm('manage_settings') && (
                <button 
                  onClick={() => setActiveTab('settings')} 
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === 'settings' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Settings className="w-5 h-5" />
                </button>
            )}
            <div className="w-px h-6 bg-slate-700 mx-1 flex-shrink-0"></div>
            <button 
              onClick={onLogout} 
              className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg flex-shrink-0"
            >
              <LogOut className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-0 bg-gray-100 dark:bg-slate-950">
        {activeTab === 'overview' && <DashboardOverview />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'apartments' && hasPerm('manage_apartments') && <ApartmentsManager />}
        {activeTab === 'recommendations' && hasPerm('manage_apartments') && <GlobalRecommendationsManager />}
        {activeTab === 'reports' && hasPerm('manage_apartments') && <ReportsManager />}
        {activeTab === 'cleaning' && (hasPerm('manage_cleaning') || hasPerm('perform_cleaning')) && <CleaningManager role={role} />}
        {activeTab === 'maintenance' && hasPerm('manage_maintenance') && <MaintenanceManager />}
        {activeTab === 'inventory' && hasPerm('manage_inventory') && <InventoryManager />}
        {activeTab === 'settings' && hasPerm('manage_settings') && <SettingsManager />}
      </main>
    </div>
  );
};

const NavButton: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 rounded-lg transition-all ${
      active ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
    }`}
  >
    <div className="w-5 h-5 mr-3">{icon}</div>
    <span className="font-medium dark:text-slate-200">{label}</span>
  </button>
);