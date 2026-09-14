import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { DashboardMetrics } from '../types';
import { Home, DollarSign, ClipboardCheck, Wrench, Package, TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

export const DashboardOverview: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { addToast } = useToast();

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await StorageService.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      addToast('error', 'Error al cargar métricas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-surface-200 dark:border-surface-700 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-surface-500 dark:text-surface-400">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  const metricCards = [
    { 
      icon: <Home className="w-5 h-5" />, 
      value: metrics.totalApartments, 
      label: 'Apartamentos', 
      gradient: 'from-brand-500 to-brand-600',
      iconBg: 'bg-brand-500/20',
      trend: null,
    },
    { 
      icon: <DollarSign className="w-5 h-5" />, 
      value: `$${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
      label: 'Ingresos Totales', 
      gradient: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500/20',
      trend: { value: '+12%', up: true },
    },
    { 
      icon: <ClipboardCheck className="w-5 h-5" />, 
      value: metrics.pendingCleanings, 
      label: 'Limpiezas Pendientes', 
      gradient: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-500/20',
      trend: null,
    },
    { 
      icon: <Wrench className="w-5 h-5" />, 
      value: metrics.maintenanceAlerts, 
      label: 'Alertas Mantto.', 
      gradient: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-500/20',
      trend: null,
    },
    { 
      icon: <Package className="w-5 h-5" />, 
      value: metrics.lowInventoryItems, 
      label: 'Inventario Bajo', 
      gradient: 'from-red-500 to-red-600',
      iconBg: 'bg-red-500/20',
      trend: null,
    },
  ];

  const maxRevenue = Math.max(...metrics.monthlyRevenue.map(m => m.amount), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Resumen de tu negocio</p>
        </div>
        <button
          onClick={loadMetrics}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-750 transition-all duration-200 text-surface-700 dark:text-surface-300 shadow-card dark:shadow-card-dark hover:shadow-card-hover dark:hover:shadow-card-dark-hover hover:scale-[1.02]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
          Actualizar
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((card, i) => (
          <div
            key={i}
            className="group bg-white dark:bg-surface-800/80 rounded-xl p-4 border border-surface-200/80 dark:border-surface-700/50 shadow-card dark:shadow-card-dark hover:shadow-card-hover dark:hover:shadow-card-dark-hover transition-all duration-300 hover:scale-[1.02] animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${card.iconBg} p-2.5 rounded-lg`}>
                <div className={`bg-gradient-to-br ${card.gradient} bg-clip-text`}>
                  {card.icon}
                </div>
                <div className={`text-white`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                    {card.icon}
                  </div>
                </div>
              </div>
              {card.trend && (
                <div className={`flex items-center gap-0.5 text-xs font-medium ${card.trend.up ? 'text-emerald-500' : 'text-red-500'}`}>
                  {card.trend.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {card.trend.value}
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">{card.value}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Bar Chart */}
        <div className="bg-white dark:bg-surface-800/80 rounded-xl p-6 border border-surface-200/80 dark:border-surface-700/50 shadow-card dark:shadow-card-dark">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-brand-500" />
            </div>
            Ingresos Mensuales
          </h2>
          <div className="flex items-end gap-2 h-48">
            {metrics.monthlyRevenue.map((m, i) => {
              const heightPercent = maxRevenue > 0 ? (m.amount / maxRevenue) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
                  <span className="text-[10px] font-semibold text-surface-600 dark:text-surface-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                    ${m.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <div className="w-full relative" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-md transition-all duration-500 hover:from-brand-700 hover:to-brand-500 cursor-pointer"
                      style={{ height: `${Math.max(heightPercent, 3)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-surface-500 dark:text-surface-400">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-surface-800/80 rounded-xl p-6 border border-surface-200/80 dark:border-surface-700/50 shadow-card dark:shadow-card-dark">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4 text-emerald-500" />
            </div>
            Actividad Reciente
          </h2>
          {metrics.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-surface-400">
              <ClipboardCheck className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No hay actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.recentActivity.map((log, idx) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-700/30 border border-surface-100 dark:border-surface-700/50 hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-100 dark:bg-brand-500/15 rounded-full flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{log.cleanerName}</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">{log.date}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      log.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    }`}
                  >
                    {log.paymentStatus === 'Paid' ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-surface-800/80 rounded-xl p-6 border border-surface-200/80 dark:border-surface-700/50 shadow-card dark:shadow-card-dark">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={<Home className="w-4 h-4" />} label="Apartamentos" color="brand" />
          <QuickAction icon={<ClipboardCheck className="w-4 h-4" />} label="Nueva Limpieza" color="emerald" />
          <QuickAction icon={<Wrench className="w-4 h-4" />} label="Mantenimiento" color="orange" />
          <QuickAction icon={<Package className="w-4 h-4" />} label="Inventario" color="purple" />
        </div>
      </div>
    </div>
  );
};

/* Quick Action Button */
const QuickAction: React.FC<{ icon: React.ReactNode, label: string, color: string }> = ({ icon, label, color }) => {
  const colorMap: Record<string, string> = {
    brand: 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 border-brand-200/50 dark:border-brand-500/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-emerald-200/50 dark:border-emerald-500/20',
    orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 border-orange-200/50 dark:border-orange-500/20',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 border-purple-200/50 dark:border-purple-500/20',
  };
  
  return (
    <button className={`flex items-center gap-2.5 p-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-md text-sm font-medium ${colorMap[color] || colorMap.brand}`}>
      {icon}
      {label}
    </button>
  );
};
