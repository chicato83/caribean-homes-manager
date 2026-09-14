
import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { StorageService } from '../services/storageService';

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(','))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'apartments',
    label: 'Apartamentos',
    description: 'Exportar lista de apartamentos con detalles y precios',
    icon: <FileSpreadsheet className="w-6 h-6" />,
  },
  {
    id: 'cleaning',
    label: 'Bitácora de Limpieza',
    description: 'Exportar registros de limpieza con estados y pagos',
    icon: <FileSpreadsheet className="w-6 h-6" />,
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Exportar artículos de inventario con cantidades y umbrales',
    icon: <FileSpreadsheet className="w-6 h-6" />,
  },
  {
    id: 'maintenance',
    label: 'Mantenimiento',
    description: 'Exportar ítems de mantenimiento con fechas y frecuencias',
    icon: <FileSpreadsheet className="w-6 h-6" />,
  },
];

export const ExportManager: React.FC = () => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      const dateStr = new Date().toISOString().split('T')[0];

      switch (type) {
        case 'apartments': {
          const apartments = await StorageService.getApartments();
          const data = apartments.map(apt => ({
            ID: apt.id,
            Nombre: apt.name,
            Dirección: apt.address,
            PrecioPorNoche: apt.pricePerNight,
            Habitaciones: apt.bedrooms,
            Baños: apt.bathrooms,
            MaxHuespedes: apt.maxGuests || '',
            Wifi: apt.wifiSSID || '',
            PasswordWifi: apt.wifiPassword || '',
            CodigoAcceso: apt.accessCode || '',
            CheckIn: apt.checkInTime || '',
            CheckOut: apt.checkOutTime || '',
            Reglas: apt.houseRules || '',
            Notas: apt.notes,
          }));
          downloadCSV(data, `apartamentos_${dateStr}.csv`);
          break;
        }
        case 'cleaning': {
          const logs = await StorageService.getCleaningLogs();
          const apartments = await StorageService.getApartments();
          const aptMap = new Map(apartments.map(a => [a.id, a.name]));
          const data = logs.map(log => ({
            ID: log.id,
            Fecha: log.date,
            Apartamento: aptMap.get(log.apartmentId) || log.apartmentId,
            Limpiador: log.cleanerName,
            EstadoPago: log.paymentStatus,
            Notas: log.notes,
            ItemsCount: log.items.length,
          }));
          downloadCSV(data, `limpieza_${dateStr}.csv`);
          break;
        }
        case 'inventory': {
          const inventory = await StorageService.getInventory();
          const data = inventory.map(item => ({
            ID: item.id,
            Nombre: item.name,
            Categoría: item.category,
            CantidadTotal: item.totalQuantity,
            UmbralMínimo: item.minThreshold,
            Estado: item.totalQuantity <= item.minThreshold ? 'Bajo Stock' : 'OK',
          }));
          downloadCSV(data, `inventario_${dateStr}.csv`);
          break;
        }
        case 'maintenance': {
          const maintenance = await StorageService.getMaintenance();
          const apartments = await StorageService.getApartments();
          const aptMap = new Map(apartments.map(a => [a.id, a.name]));
          const today = new Date();
          const data = maintenance.map(item => {
            const lastDate = new Date(item.lastMaintenanceDate);
            const nextDue = new Date(lastDate);
            nextDue.setDate(nextDue.getDate() + item.frequencyDays);
            const isOverdue = nextDue <= today;
            return {
              ID: item.id,
              Nombre: item.name,
              Apartamento: aptMap.get(item.apartmentId || '') || 'General',
              Área: item.areaName || '',
              ÚltimaFecha: item.lastMaintenanceDate,
              FrecuenciaDías: item.frequencyDays,
              PróximaFecha: nextDue.toISOString().split('T')[0],
              Estado: isOverdue ? 'Vencido' : 'Al día',
              Notas: item.notes,
              Técnico: item.technicianContact || '',
            };
          });
          downloadCSV(data, `mantenimiento_${dateStr}.csv`);
          break;
        }
      }
      setLastExport(type);
      setTimeout(() => setLastExport(null), 2000);
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Download className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          Exportar Datos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Descarga los datos del sistema en formato CSV para análisis externo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORT_OPTIONS.map(option => (
          <button
            key={option.id}
            onClick={() => handleExport(option.id)}
            disabled={exporting !== null}
            className="flex items-start gap-4 p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-colors">
              {exporting === option.id ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                option.icon
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {option.label}
                </h3>
                {lastExport === option.id && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    Descargado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {option.description}
              </p>
            </div>
            <Download className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
          </button>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <strong>Nota:</strong> Los archivos CSV se descargan directamente en tu navegador.
          Los archivos incluyen una marca BOM (Byte Order Mark) para compatibilidad con Excel.
        </p>
      </div>
    </div>
  );
};
