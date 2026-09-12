import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, FileText, Plus, Trash2, Eye, Printer, Download, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Apartment, SavedReport, ReportData } from '../types';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

type ReportStep = 'list' | 'select-apartment' | 'upload' | 'preview' | 'saved-reports';

const INITIAL_REPORT_DATA: ReportData = {
  period: '',
  reportDate: new Date().toISOString().split('T')[0],
  summary: {
    ingresos_brutos: '',
    ajustes: '',
    tarifas_servicio: '',
    impuestos_retenidos: '',
    total_usd: '',
  },
  stats: {
    noches_reservadas: '',
  },
  accommodations: {},
  payment_methods: [],
  tasa_banco_cibao: '58.00',
  conversion_result: '',
  percent_25_result: '',
  extra_income: '',
  extra_nights: '',
};

export const ReportsManager: React.FC = () => {
  const [step, setStep] = useState<ReportStep>('list');
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [reportData, setReportData] = useState<ReportData>(INITIAL_REPORT_DATA);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apts, savedReports] = await Promise.all([
        StorageService.getApartments(),
        StorageService.getReports()
      ]);
      setApartments(apts);
      setReports(savedReports);
    } catch (e) {
      console.error('Error loading data:', e);
    }
    setLoading(false);
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedApartment) return;

    setUploading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      const parsedData = parseAirbnbReport(fullText, selectedApartment.name);
      setReportData(parsedData);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing PDF:', err);
      setError('Error al leer el PDF. Asegúrese de que sea un informe de Airbnb válido.');
    }
    setUploading(false);
  };

  const parseAirbnbReport = (text: string, apartmentName: string): ReportData => {
    const data: ReportData = { ...INITIAL_REPORT_DATA };

    // Extract period
    const periodMatch = text.match(/(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{4}/i);
    if (periodMatch) {
      data.period = periodMatch[0];
    }

    // Extract amounts (USD)
    const amounts = text.match(/\$[\d,]+\.?\d*/g) || [];
    const numbers = amounts.map(a => parseFloat(a.replace(/[$,]/g, '')));

    // Typical Airbnb report structure
    if (numbers.length >= 4) {
      data.summary.ingresos_brutos = numbers[0].toFixed(2);
      data.summary.ajustes = numbers[1]?.toFixed(2) || '0.00';
      data.summary.tarifas_servicio = numbers[2]?.toFixed(2) || '0.00';
      data.summary.impuestos_retenidos = numbers[3]?.toFixed(2) || '0.00';
      data.summary.total_usd = numbers[4]?.toFixed(2) || '0.00';
    }

    // Extract nights
    const nightsMatch = text.match(/(\d+)\s*noche/i);
    if (nightsMatch) {
      data.stats.noches_reservadas = nightsMatch[1];
    }

    // Add accommodation entry
    data.accommodations[apartmentName] = {
      name: apartmentName,
      avg_nights: data.stats.noches_reservadas,
      ingresos_brutos: data.summary.ingresos_brutos,
      ajustes: data.summary.ajustes,
      tarifas_servicio: data.summary.tarifas_servicio,
      impuestos_retenidos: data.summary.impuestos_retenidos,
      total_usd: data.summary.total_usd,
    };

    // Calculate 25%
    const total = parseFloat(data.summary.total_usd) || 0;
    data.percent_25_result = (total * 0.25).toFixed(2);

    // Calculate conversion
    const tasa = parseFloat(data.tasa_banco_cibao) || 58;
    data.conversion_result = (total * tasa).toFixed(2);

    return data;
  };

  const calculateConversions = () => {
    const total = parseFloat(reportData.summary.total_usd) || 0;
    const tasa = parseFloat(reportData.tasa_banco_cibao) || 58;
    const percent25 = total * 0.25;

    setReportData({
      ...reportData,
      percent_25_result: percent25.toFixed(2),
      conversion_result: (percent25 * tasa).toFixed(2),
    });
  };

  useEffect(() => {
    calculateConversions();
  }, [reportData.summary.total_usd, reportData.tasa_banco_cibao]);

  const handleSave = async () => {
    const newReport: SavedReport = {
      id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      apartmentId: selectedApartment?.id || '',
      apartmentName: selectedApartment?.name || '',
      period: reportData.period || 'Sin periodo',
      generatedAt: new Date().toISOString(),
      reportData,
    };

    await StorageService.saveReport(newReport);
    setReports([newReport, ...reports]);
    setStep('list');
    setSelectedApartment(null);
    setReportData(INITIAL_REPORT_DATA);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este informe?')) return;
    await StorageService.deleteReport(id);
    setReports(reports.filter(r => r.id !== id));
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Informes Airbnb</h1>
          <p className="text-gray-500 mt-1">Suba informes de Airbnb y genere resúmenes personalizados</p>
        </div>
        {step === 'list' && (
          <button
            onClick={() => setStep('select-apartment')}
            className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all hover:scale-105 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" /> Nuevo Informe
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* LIST VIEW */}
      {step === 'list' && (
        <div>
          {reports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">No hay informes guardados</h3>
              <p className="text-gray-400 mt-2">Suba un informe de Airbnb para comenzar</p>
              <button
                onClick={() => setStep('select-apartment')}
                className="mt-6 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition-all"
              >
                Crear Primer Informe
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map(report => (
                <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-brand-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{report.apartmentName}</h3>
                        <p className="text-sm text-gray-500">{report.period} • {new Date(report.generatedAt).toLocaleDateString('es-DO')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{formatCurrency(report.reportData.summary.total_usd)}</p>
                        <p className="text-xs text-gray-400">{report.reportData.stats.noches_reservadas} noches</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedApartment(apartments.find(a => a.id === report.apartmentId) || null);
                          setReportData(report.reportData);
                          setStep('preview');
                        }}
                        className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Ver informe"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SELECT APARTMENT */}
      {step === 'select-apartment' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep('list')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">Seleccione Apartamento</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apartments.map(apt => (
              <button
                key={apt.id}
                onClick={() => {
                  setSelectedApartment(apt);
                  setStep('upload');
                }}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-200 transition-colors">
                  <FileText className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="font-bold text-gray-800 group-hover:text-brand-600 transition-colors">{apt.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{apt.address}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* UPLOAD PDF */}
      {step === 'upload' && selectedApartment && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep('select-apartment')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Subir Informe Airbnb</h2>
              <p className="text-gray-500">{selectedApartment.name}</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-brand-500 hover:bg-brand-50/50 transition-all">
            <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {uploading ? 'Procesando informe...' : 'Arrastre o seleccione el PDF de Airbnb'}
            </h3>
            <p className="text-gray-400 mb-6">El sistema extraerá automáticamente los datos del informe</p>
            <label className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all cursor-pointer">
              <Upload className="w-5 h-5" />
              {uploading ? 'Procesando...' : 'Seleccionar PDF'}
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* PREVIEW / EDIT */}
      {step === 'preview' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep('list')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">Vista Previa del Informe</h2>
          </div>

          {/* Report Header */}
          <div className="text-center mb-8 p-6 bg-gradient-to-r from-brand-50 to-blue-50 rounded-xl">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center p-2">
                <span className="text-2xl">🏠</span>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-800">Caribean<span className="text-brand-600">Homes</span></h1>
                <p className="text-sm text-gray-500">Property Management Report</p>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-700 mt-4">
              Informe de Ingresos {selectedApartment && `- ${selectedApartment.name}`}
            </h2>
            <p className="text-gray-500">Período: {reportData.period || 'No especificado'}</p>
          </div>

          {/* Edit Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Datos del Período</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Período</label>
                <input
                  type="text"
                  value={reportData.period}
                  onChange={e => setReportData({ ...reportData, period: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ej: Octubre 2024"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha del Informe</label>
                <input
                  type="date"
                  value={reportData.reportDate}
                  onChange={e => setReportData({ ...reportData, reportDate: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Resumen Financiero (USD)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ingresos Brutos</label>
                  <input
                    type="number"
                    value={reportData.summary.ingresos_brutos}
                    onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, ingresos_brutos: e.target.value } })}
                    className="w-full p-2 border rounded-lg bg-green-50 border-green-200"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ajustes</label>
                  <input
                    type="number"
                    value={reportData.summary.ajustes}
                    onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, ajustes: e.target.value } })}
                    className="w-full p-2 border rounded-lg bg-blue-50 border-blue-200"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tarifas de Servicio</label>
                  <input
                    type="number"
                    value={reportData.summary.tarifas_servicio}
                    onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, tarifas_servicio: e.target.value } })}
                    className="w-full p-2 border rounded-lg bg-orange-50 border-orange-200"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Impuestos Retenidos</label>
                  <input
                    type="number"
                    value={reportData.summary.impuestos_retenidos}
                    onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, impuestos_retenidos: e.target.value } })}
                    className="w-full p-2 border rounded-lg bg-red-50 border-red-200"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total USD</label>
                <div className="text-2xl font-bold text-gray-800">
                  {formatCurrency(reportData.summary.total_usd)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Estadísticas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Noches Reservadas</label>
                  <input
                    type="number"
                    value={reportData.stats.noches_reservadas}
                    onChange={e => setReportData({ ...reportData, stats: { ...reportData.stats, noches_reservadas: e.target.value } })}
                    className="w-full p-2 border rounded-lg bg-blue-50 border-blue-200"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Noches Extra</label>
                  <input
                    type="number"
                    value={reportData.extra_nights}
                    onChange={e => setReportData({ ...reportData, extra_nights: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-blue-50 border-blue-200"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Conversión</h3>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tasa Banco Cibao (RD$)</label>
                  <input
                    type="number"
                    value={reportData.tasa_banco_cibao}
                                      onChange={e => setReportData({ ...reportData, tasa_banco_cibao: e.target.value })}
                    className="w-full p-2 border rounded-lg border-green-300"
                    step="0.01"
                  />
                </div>
                <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500">Resultado 25% (RD$)</div>
                  <div className="text-xl font-bold text-gray-800">{reportData.conversion_result || '---'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Report */}
          <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-4">Vista Previa del Informe</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🏠</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">CaribeanHomes</h4>
                  <p className="text-sm text-gray-500">{selectedApartment?.name || 'Apartamento'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Período:</span>
                  <span className="ml-2 font-medium">{reportData.period || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Noches:</span>
                  <span className="ml-2 font-medium">{reportData.stats.noches_reservadas || '0'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total USD:</span>
                  <span className="ml-2 font-bold text-green-600">{formatCurrency(reportData.summary.total_usd)}</span>
                </div>
                <div>
                  <span className="text-gray-500">25% en RD$:</span>
                  <span className="ml-2 font-bold text-blue-600">{reportData.conversion_result ? `RD$ ${reportData.conversion_result}` : '---'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setStep('list')}
              className="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all hover:scale-105 flex items-center"
            >
              <CheckCircle className="w-5 h-5 mr-2" /> Guardar Informe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
