import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { DashboardMetrics } from '../types';
import { Home, DollarSign, ClipboardCheck, Wrench, Package, TrendingUp, RefreshCw } from 'lucide-react';
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
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const metricCards = [
    { icon: <Home className="w-6 h-6" />, value: metrics.totalApartments, label: 'Apartamentos', color: 'bg-brand-500' },
    { icon: <DollarSign className="w-6 h-6" />, value: `$${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, label: 'Ingresos Totales', color: 'bg-green-500' },
    { icon: <ClipboardCheck className="w-6 h-6" />, value: metrics.pendingCleanings, label: 'Limpiezas Pendientes', color: 'bg-yellow-500' },
    { icon: <Wrench className="w-6 h-6" />, value: metrics.maintenanceAlerts, label: 'Alertas Mantenimiento', color: 'bg-orange-500' },
    { icon: <Package className="w-6 h-6" />, value: metrics.lowInventoryItems, label: 'Inventario Bajo', color: 'bg-red-500' },
  ];

  const maxRevenue = Math.max(...metrics.monthlyRevenue.map(m => m.amount), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <button
          onClick={loadMetrics}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((card, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`${card.color} text-white p-3 rounded-lg`}>
                {card.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-500" /> Ingresos Mensuales
          </h2>
          <div className="flex items-end gap-3 h-48">
            {metrics.monthlyRevenue.map((m, i) => {
              const heightPercent = maxRevenue > 0 ? (m.amount / maxRevenue) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    ${m.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <div className="w-full relative" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-brand-500 rounded-t-md transition-all duration-500 hover:bg-brand-600"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-brand-500" /> Actividad Reciente
          </h2>
          {metrics.recentActivity.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No hay actividad reciente.</p>
          ) : (
            <div className="space-y-3">
              {metrics.recentActivity.map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{log.cleanerName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{log.date}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      log.paymentStatus === 'Paid'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
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
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button className="flex items-center gap-2 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors text-sm font-medium">
            <Home className="w-4 h-4" /> Ver Apartamentos
          </button>
          <button className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-sm font-medium">
            <ClipboardCheck className="w-4 h-4" /> Nueva Limpieza
          </button>
          <button className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors text-sm font-medium">
            <Wrench className="w-4 h-4" /> Mantenimiento
          </button>
          <button className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-sm font-medium">
            <Package className="w-4 h-4" /> Inventario
          </button>
        </div>
      </div>
    </div>
  );
};
