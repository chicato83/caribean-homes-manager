
import React, { useState, lazy, Suspense } from 'react';
import { LayoutDashboard, Home, ClipboardCheck, Wrench, Package, LogOut, Settings, Globe, FileText, Sun, Moon, Calendar, Download } from 'lucide-react';
import { User, Role } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { SearchBar } from './SearchBar';

const DashboardOverview = lazy(() => import('./DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const ApartmentsManager = lazy(() => import('./ApartmentsManager').then(m => ({ default: m.ApartmentsManager })));
const GlobalRecommendationsManager = lazy(() => import('./GlobalRecommendationsManager').then(m => ({ default: m.GlobalRecommendationsManager })));
const ReportsManager = lazy(() => import('./ReportsManager').then(m => ({ default: m.ReportsManager })));
const CleaningManager = lazy(() => import('./CleaningManager').then(m => ({ default: m.CleaningManager })));
const MaintenanceManager = lazy(() => import('./MaintenanceManager').then(m => ({ default: m.MaintenanceManager })));
const InventoryManager = lazy(() => import('./InventoryManager').then(m => ({ default: m.InventoryManager })));
const SettingsManager = lazy(() => import('./SettingsManager').then(m => ({ default: m.SettingsManager })));
const ExportManager = lazy(() => import('./ExportManager').then(m => ({ default: m.ExportManager })));
const CalendarView = lazy(() => import('./CalendarView').then(m => ({ default: m.CalendarView })));

interface AdminDashboardProps {
  user: User;
  role: Role;
  onLogout: () => void;
}

type Tab = 'overview' | 'calendar' | 'apartments' | 'recommendations' | 'cleaning' | 'maintenance' | 'inventory' | 'settings' | 'reports' | 'export';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, role, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const hasPerm = (p: string) => role.permissions.includes(p as any);

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-950">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-surface-900 dark:bg-surface-900/80 backdrop-blur-xl text-white flex flex-col hidden md:flex border-r border-surface-800/50">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-surface-800/60">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              Caribean<span className="text-brand-400">Homes</span>
            </h2>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/60 transition-all duration-200 hover:scale-105"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-brand-300" />
              )}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-green" />
            <p className="text-surface-300 text-xs font-medium">Hola, {user.name}</p>
          </div>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar..."
            className="mt-3"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="mb-3">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-surface-500">Principal</p>
          </div>
          <NavButton icon={<LayoutDashboard />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavButton icon={<Calendar />} label="Calendario" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
          
          {hasPerm('manage_apartments') && (
            <>
              <div className="pt-4 mb-3">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-surface-500">Gestión</p>
              </div>
              <NavButton icon={<Home />} label="Apartamentos" active={activeTab === 'apartments'} onClick={() => setActiveTab('apartments')} />
              <NavButton icon={<Globe />} label="Recomendaciones" active={activeTab === 'recommendations'} onClick={() => setActiveTab('recommendations')} />
              <NavButton icon={<FileText />} label="Informes" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
              <NavButton icon={<Download />} label="Exportar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} />
            </>
          )}
          
          {(hasPerm('manage_cleaning') || hasPerm('perform_cleaning')) && (
            <NavButton icon={<ClipboardCheck />} label="Limpieza" active={activeTab === 'cleaning'} onClick={() => setActiveTab('cleaning')} />
          )}
          {hasPerm('manage_maintenance') && (
            <NavButton icon={<Wrench />} label="Mantenimiento" active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} />
          )}
          {hasPerm('manage_inventory') && (
            <NavButton icon={<Package />} label="Inventario" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          )}
          
          {hasPerm('manage_settings') && (
            <div className="pt-4 mt-auto border-t border-surface-800/60">
              <NavButton icon={<Settings />} label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-surface-800/60">
          <button 
            onClick={onLogout} 
            className="flex items-center w-full px-4 py-2.5 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 group"
          >
            <LogOut className="w-4 h-4 mr-3 group-hover:translate-x-[-2px] transition-transform" /> 
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Nav Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-surface-900/95 backdrop-blur-xl text-white z-50 px-4 py-3 flex justify-between items-center border-b border-surface-800/50">
        <span className="font-bold text-lg truncate w-1/4">CHomes</span>
        <div className="flex space-x-1 items-center justify-end w-3/4 overflow-x-auto no-scrollbar">
          <MobileNavButton icon={<LayoutDashboard />} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <MobileNavButton icon={<Calendar />} active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
          {hasPerm('manage_apartments') && (
            <>
              <MobileNavButton icon={<Home />} active={activeTab === 'apartments'} onClick={() => setActiveTab('apartments')} />
              <MobileNavButton icon={<Globe />} active={activeTab === 'recommendations'} onClick={() => setActiveTab('recommendations')} />
              <MobileNavButton icon={<FileText />} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
              <MobileNavButton icon={<Download />} active={activeTab === 'export'} onClick={() => setActiveTab('export')} />
            </>
          )}
          {(hasPerm('manage_cleaning') || hasPerm('perform_cleaning')) && (
            <MobileNavButton icon={<ClipboardCheck />} active={activeTab === 'cleaning'} onClick={() => setActiveTab('cleaning')} />
          )}
          {hasPerm('manage_maintenance') && (
            <MobileNavButton icon={<Wrench />} active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} />
          )}
          {hasPerm('manage_inventory') && (
            <MobileNavButton icon={<Package />} active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          )}
          {hasPerm('manage_settings') && (
            <MobileNavButton icon={<Settings />} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          )}
          <div className="w-px h-5 bg-surface-700 mx-1 flex-shrink-0" />
          <button 
            onClick={onLogout} 
            className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg flex-shrink-0 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 mt-14 md:mt-0">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-surface-200 dark:border-surface-700 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-sm text-surface-500 dark:text-surface-400">Cargando...</p>
            </div>
          </div>
        }>
          {activeTab === 'overview' && <DashboardOverview />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'apartments' && hasPerm('manage_apartments') && <ApartmentsManager />}
          {activeTab === 'recommendations' && hasPerm('manage_apartments') && <GlobalRecommendationsManager />}
          {activeTab === 'reports' && hasPerm('manage_apartments') && <ReportsManager />}
          {activeTab === 'export' && hasPerm('manage_apartments') && <ExportManager />}
          {activeTab === 'cleaning' && (hasPerm('manage_cleaning') || hasPerm('perform_cleaning')) && <CleaningManager role={role} />}
          {activeTab === 'maintenance' && hasPerm('manage_maintenance') && <MaintenanceManager />}
          {activeTab === 'inventory' && hasPerm('manage_inventory') && <InventoryManager />}
          {activeTab === 'settings' && hasPerm('manage_settings') && <SettingsManager />}
        </Suspense>
      </main>
    </div>
  );
};

/* Desktop Nav Button */
const NavButton: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`relative flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-200 group ${
      active 
        ? 'bg-brand-600 text-white shadow-glow-blue' 
        : 'text-surface-400 hover:bg-surface-800/60 hover:text-white'
    }`}
  >
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
    )}
    <div className={`w-5 h-5 mr-3 transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

/* Mobile Nav Button */
const MobileNavButton: React.FC<{ icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
      active 
        ? 'bg-brand-600 text-white shadow-glow-blue' 
        : 'text-surface-400 hover:text-white hover:bg-surface-800/60'
    }`}
  >
    {icon}
  </button>
);
