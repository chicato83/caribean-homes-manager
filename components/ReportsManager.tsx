import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, FileText, Plus, Trash2, Eye, Printer, Download, ArrowLeft, CheckCircle, AlertCircle, Edit2 } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Apartment, SavedReport, ReportData } from '../types';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

// Logo URLs
const AIRBNB_LOGO = '/assets/airbnb-logo.png';
const CARIBEAN_LOGO = '/assets/caribean-homes-logo.png';

type ReportStep = 'list' | 'select-apartment' | 'upload' | 'preview' | 'view';

const INITIAL_REPORT_DATA: ReportData = {
  period: '',
  reportDate: new Date().toISOString().split('T')[0],
  host_name: '',
  host_id: '',
  summary: {
    ingresos_brutos: '',
    ajustes: '',
    tarifas_servicio: '',
    impuestos_retenidos: '',
    total_usd: '',
  },
  extra_income: '',
  stats: {
    noches_reservadas: '',
    noches_promedio: '',
  },
  accommodations: {},
  payment_methods: [],
  tasa_banco_cibao: '58.00',
  conversion_result: '',
  percent_25_result: '',
  extra_nights: '',
  extra_nights_amount: '',
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
  const [rateLoading, setRateLoading] = useState(false);
  const [rateSource, setRateSource] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Auto-fetch Banco Cibao exchange rate
  const fetchBancoCibaoRate = async () => {
    const apiKey = import.meta.env.VITE_TASAREAL_API_KEY;
    if (!apiKey) return;

    setRateLoading(true);
    try {
      const response = await fetch('https://tasareal.com/api/v1/rates?institution=cibao&currency=USD', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const cibaoRate = data.rates?.find((r: any) => r.institution === 'cibao');
      if (cibaoRate) {
        const rate = cibaoRate.sell || cibaoRate.buy;
        if (rate) {
          setReportData(prev => ({ ...prev, tasa_banco_cibao: rate.toString() }));
          setRateSource(`TasaReal.com • ${data.date}`);
        }
      }
    } catch (err) {
      console.error('Error fetching rate:', err);
    }
    setRateLoading(false);
  };

  useEffect(() => {
    loadData();
    fetchBancoCibaoRate();
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
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }

      const parsedData = parseAirbnbReport(fullText, selectedApartment);
      setReportData(parsedData);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing PDF:', err);
      setError('Error al leer el PDF. Asegúrese de que sea un informe de Airbnb válido.');
    }
    setUploading(false);
  };

  const parseAirbnbReport = (text: string, apartment: Apartment): ReportData => {
    const data: ReportData = { ...INITIAL_REPORT_DATA };

    // Extract period
    const periodMatch = text.match(/(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{4}/i)
      || text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i);
    if (periodMatch) data.period = periodMatch[0];

    // Extract host name
    const hostMatch = text.match(/Nombre del anfitri[oó]n\s*[:\n]?\s*(.+?)(?:\n|ID)/i);
    if (hostMatch) data.host_name = hostMatch[1].trim();

    // Extract host ID
    const idMatch = text.match(/ID de usuario\s*[:\n]?\s*(\d+)/i);
    if (idMatch) data.host_id = idMatch[1];

    // Extract report date
    const dateMatch = text.match(/Fecha del informe\s*[:\n]?\s*(.+?)(?:\n|Resumen)/i);
    if (dateMatch) data.reportDate = dateMatch[1].trim();

    // Extract amounts
    const amounts = text.match(/\$[\d,]+\.?\d*/g) || [];
    const numbers = amounts.map(a => parseFloat(a.replace(/[$,]/g, '')));

    // Parse summary based on Airbnb format
    const ingresosMatch = text.match(/Ingresos brutos\s*\$?([\d,.]+)/i);
    const ajustesMatch = text.match(/Ajustes\s*\$?([\d,.]+)/i);
    const tarifasMatch = text.match(/Tarifas de servicio\s*-?\$?([\d,.]+)/i);
    const impuestosMatch = text.match(/Impuestos retenidos\s*\$?([\d,.]+)/i);
    const totalMatch = text.match(/Total\s*\(USD\)\s*\$?([\d,.]+)/i);

    if (ingresosMatch) data.summary.ingresos_brutos = ingresosMatch[1].replace(/,/g, '');
    if (ajustesMatch) data.summary.ajustes = ajustesMatch[1].replace(/,/g, '');
    if (tarifasMatch) data.summary.tarifas_servicio = tarifasMatch[1].replace(/,/g, '');
    if (impuestosMatch) data.summary.impuestos_retenidos = impuestosMatch[1].replace(/,/g, '');

    // Extra income
    const extraIncomeMatch = text.match(/Ingresos Adicionales.*?\+?\$?([\d,.]+)/i);
    if (extraIncomeMatch) data.extra_income = extraIncomeMatch[1].replace(/,/g, '');

    // Total
    if (totalMatch) {
      data.summary.total_usd = totalMatch[1].replace(/,/g, '');
    } else if (numbers.length > 0) {
      data.summary.total_usd = numbers[numbers.length - 1].toFixed(2);
    }

    // Nights
    const nightsMatch = text.match(/(\d+)\s*Noches?\s*totales?/i)
      || text.match(/(\d+)\s*noche/i);
    if (nightsMatch) data.stats.noches_reservadas = nightsMatch[1];

    const avgNightsMatch = text.match(/Promedio de noches\s*(\d+)/i);
    if (avgNightsMatch) data.stats.noches_promedio = avgNightsMatch[1];

    // Payment methods
    const paypalMatch = text.match(/PayPal.*?\(USD\)\s*\$?([\d,.]+)/i);
    if (paypalMatch) {
      data.payment_methods = [{
        method: 'PayPal',
        amount_usd: paypalMatch[1].replace(/,/g, ''),
      }];
    }

    // Add accommodation entry
    data.accommodations[apartment.name] = {
      name: apartment.name,
      avg_nights: data.stats.noches_promedio || '1',
      ingresos_brutos: data.summary.ingresos_brutos,
      ajustes: data.summary.ajustes,
      tarifas_servicio: data.summary.tarifas_servicio,
      impuestos_retenidos: data.summary.impuestos_retenidos,
      total_usd: data.summary.total_usd,
    };

    // Calculate
    const total = parseFloat(data.summary.total_usd) || 0;
    const tasa = parseFloat(data.tasa_banco_cibao) || 58;
    data.percent_25_result = (total * 0.25).toFixed(2);
    data.conversion_result = (total * 0.25 * tasa).toFixed(2);

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
    const report: SavedReport = {
      id: editingReportId || `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      apartmentId: selectedApartment?.id || viewingReport?.apartmentId || '',
      apartmentName: selectedApartment?.name || viewingReport?.apartmentName || '',
      period: reportData.period || 'Sin periodo',
      generatedAt: editingReportId ? (viewingReport?.generatedAt || new Date().toISOString()) : new Date().toISOString(),
      reportData,
    };

    await StorageService.saveReport(report);

    if (editingReportId) {
      setReports(reports.map(r => r.id === editingReportId ? report : r));
    } else {
      setReports([report, ...reports]);
    }

    setStep('list');
    setSelectedApartment(null);
    setReportData(INITIAL_REPORT_DATA);
    setEditingReportId(null);
    setViewingReport(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este informe?')) return;
    await StorageService.deleteReport(id);
    setReports(reports.filter(r => r.id !== id));
  };

  const handleEdit = (report: SavedReport) => {
    const apt = apartments.find(a => a.id === report.apartmentId);
    setSelectedApartment(apt || null);
    setReportData(report.reportData);
    setEditingReportId(report.id);
    setViewingReport(report);
    setStep('preview');
  };

  const handleView = (report: SavedReport) => {
    setViewingReport(report);
    setSelectedApartment(apartments.find(a => a.id === report.apartmentId) || null);
    setReportData(report.reportData);
    setStep('view');
  };

  const handlePrint = () => {
    const content = reportRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Informe</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #1f2937; padding: 30px; font-size: 13px; }
        .header { border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { font-size: 20px; color: #1f2937; }
        .header p { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; padding: 12px; background: #f9fafb; border-radius: 6px; }
        .info-item label { font-size: 11px; color: #6b7280; text-transform: uppercase; display: block; }
        .info-item span { font-size: 13px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 12px; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .total-row { font-weight: bold; background: #f0fdf4; }
        .total-row td { border-bottom: 2px solid #0284c7; }
        .section-title { font-size: 14px; font-weight: bold; color: #374151; margin: 20px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .payment { padding: 10px; background: #f9fafb; border-radius: 6px; margin-bottom: 10px; }
        .settlement { padding: 15px; background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 6px; margin-top: 20px; }
        .conversion { padding: 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; margin-top: 15px; }
        .conversion-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
        .conversion-item label { font-size: 11px; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .conversion-item .value { font-size: 18px; font-weight: bold; color: #1f2937; }
        .conversion-item .value.highlight { color: #0284c7; }
        @media print { body { padding: 15px; } }
      </style></head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    handlePrint(); // Same as print - user can Save as PDF
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  // Report Content Component
  const ReportContent = () => (
    <div>
      {/* Header */}
      <div className="header">
        <h1>Informe de ingresos — {viewingReport?.apartmentName || selectedApartment?.name || ''} - {reportData.period}</h1>
        <p>Caribean Home Management - {viewingReport?.apartmentName || selectedApartment?.name || ''}</p>
      </div>

      {/* Host Info */}
      <div className="info-grid">
        <div className="info-item">
          <label>Nombre del anfitrión</label>
          <span>{reportData.host_name || '—'}</span>
        </div>
        <div className="info-item">
          <label>ID de usuario</label>
          <span>{reportData.host_id || '—'}</span>
        </div>
        <div className="info-item">
          <label>Fecha del informe</label>
          <span>{reportData.reportDate}</span>
        </div>
      </div>

      {/* Resumen */}
      <div className="section-title">Resumen</div>
      <table>
        <thead>
          <tr><th>Concepto</th><th style={{textAlign: 'right'}}>Total (USD)</th></tr>
        </thead>
        <tbody>
          <tr><td>Ingresos brutos</td><td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.ingresos_brutos)}</td></tr>
          <tr><td>Ajustes</td><td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.ajustes)}</td></tr>
          {reportData.extra_income && (
            <tr><td>Ingresos Adicionales (Manual)</td><td style={{textAlign: 'right', color: '#059669'}}>+{formatCurrency(reportData.extra_income)}</td></tr>
          )}
          <tr><td>Tarifas de servicio</td><td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.tarifas_servicio)}</td></tr>
          <tr><td>Impuestos retenidos</td><td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.impuestos_retenidos)}</td></tr>
          <tr className="total-row"><td>Total (USD)</td><td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.total_usd)}</td></tr>
        </tbody>
      </table>

      {/* Stats */}
      <div className="info-grid">
        <div className="info-item">
          <label>Noches totales</label>
          <span>{reportData.stats.noches_reservadas || '0'}</span>
        </div>
        <div className="info-item">
          <label>Promedio de noches</label>
          <span>{reportData.stats.noches_promedio || '—'}</span>
        </div>
      </div>

      {/* Alojamientos */}
      <div className="section-title">Alojamientos</div>
      <table>
        <thead>
          <tr>
            <th>Alojamiento</th><th style={{textAlign: 'right'}}>Ingresos brutos</th><th style={{textAlign: 'right'}}>Ajustes</th>
            <th style={{textAlign: 'right'}}>Tarifas</th><th style={{textAlign: 'right'}}>Impuestos</th><th style={{textAlign: 'right'}}>Total (USD)</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(reportData.accommodations).map((acc: any, i: number) => (
            <tr key={i}>
              <td>{acc.name}</td>
              <td style={{textAlign: 'right'}}>{formatCurrency(acc.ingresos_brutos)}</td>
              <td style={{textAlign: 'right'}}>{formatCurrency(acc.ajustes)}</td>
              <td style={{textAlign: 'right'}}>{formatCurrency(acc.tarifas_servicio)}</td>
              <td style={{textAlign: 'right'}}>{formatCurrency(acc.impuestos_retenidos)}</td>
              <td style={{textAlign: 'right'}}>{formatCurrency(acc.total_usd)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td>Total</td>
            <td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.ingresos_brutos)}</td>
            <td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.ajustes)}</td>
            <td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.tarifas_servicio)}</td>
            <td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.impuestos_retenidos)}</td>
            <td style={{textAlign: 'right'}}>{formatCurrency(reportData.summary.total_usd)}</td>
          </tr>
        </tbody>
      </table>

      {/* Formas de cobro */}
      {reportData.payment_methods.length > 0 && (
        <>
          <div className="section-title">Formas de cobro</div>
          {reportData.payment_methods.map((pm, i) => (
            <div key={i} className="payment">
              <span>{pm.method}{pm.email ? `: ${pm.email}` : ''} (USD) </span>
              <strong>{formatCurrency(pm.amount_usd)}</strong>
            </div>
          ))}
        </>
      )}

      {/* Liquidación y Pago */}
      <div className="settlement">
        <div className="section-title" style={{marginTop: 0, border: 'none', margin: 0}}>Liquidación y Pago</div>
        <div style={{fontSize: '16px', fontWeight: 'bold', marginTop: '8px'}}>Total (USD) {formatCurrency(reportData.summary.total_usd)}</div>
      </div>

      {/* Conversión */}
      <div className="conversion">
        <div className="conversion-grid">
          <div className="conversion-item">
            <label>Tasa Banco Cibao RD$</label>
            <div className="value">{reportData.tasa_banco_cibao}</div>
          </div>
          <div className="conversion-item">
            <label>25% del Total</label>
            <div className="value">{reportData.percent_25_result ? formatCurrency(reportData.percent_25_result) : '—'}</div>
          </div>
          <div className="conversion-item">
            <label>A Pagar (RD$)</label>
            <div className="value highlight">{reportData.conversion_result ? `RD$ ${parseFloat(reportData.conversion_result).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );

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
          <button onClick={() => setStep('select-apartment')} className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all hover:scale-105 flex items-center">
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
              <button onClick={() => setStep('select-apartment')} className="mt-6 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition-all">
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
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2">
                        <p className="text-lg font-bold text-green-600">{formatCurrency(report.reportData.summary.total_usd)}</p>
                        <p className="text-xs text-gray-400">{report.reportData.stats.noches_reservadas || '0'} noches</p>
                      </div>
                      <button onClick={() => handleView(report)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleEdit(report)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(report.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
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
              <button key={apt.id} onClick={() => { setSelectedApartment(apt); setStep('upload'); }}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all text-left group">
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
              <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* PREVIEW / EDIT */}
      {step === 'preview' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => { setStep('list'); setEditingReportId(null); setViewingReport(null); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">{editingReportId ? 'Editar Informe' : 'Vista Previa del Informe'}</h2>
          </div>

          {/* Edit Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Datos del Anfitrión</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Anfitrión</label>
                <input type="text" value={reportData.host_name || ''} onChange={e => setReportData({ ...reportData, host_name: e.target.value })} className="w-full p-2 border rounded-lg" placeholder="Nombre" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID de Usuario</label>
                <input type="text" value={reportData.host_id || ''} onChange={e => setReportData({ ...reportData, host_id: e.target.value })} className="w-full p-2 border rounded-lg" placeholder="ID" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Período</label>
                <input type="text" value={reportData.period} onChange={e => setReportData({ ...reportData, period: e.target.value })} className="w-full p-2 border rounded-lg" placeholder="Ej: Julio 2026" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha del Informe</label>
                <input type="date" value={reportData.reportDate} onChange={e => setReportData({ ...reportData, reportDate: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Resumen Financiero (USD)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ingresos Brutos</label>
                  <input type="number" value={reportData.summary.ingresos_brutos} onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, ingresos_brutos: e.target.value } })} className="w-full p-2 border rounded-lg bg-green-50 border-green-200" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ajustes</label>
                  <input type="number" value={reportData.summary.ajustes} onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, ajustes: e.target.value } })} className="w-full p-2 border rounded-lg bg-blue-50 border-blue-200" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ingresos Adicionales</label>
                  <input type="number" value={reportData.extra_income || ''} onChange={e => setReportData({ ...reportData, extra_income: e.target.value })} className="w-full p-2 border rounded-lg bg-green-50 border-green-200" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tarifas de Servicio</label>
                  <input type="number" value={reportData.summary.tarifas_servicio} onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, tarifas_servicio: e.target.value } })} className="w-full p-2 border rounded-lg bg-orange-50 border-orange-200" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Impuestos Retenidos</label>
                  <input type="number" value={reportData.summary.impuestos_retenidos} onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, impuestos_retenidos: e.target.value } })} className="w-full p-2 border rounded-lg bg-red-50 border-red-200" step="0.01" />
                </div>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total USD</label>
                <div className="text-2xl font-bold text-gray-800">{formatCurrency(reportData.summary.total_usd)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Estadísticas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Noches Reservadas</label>
                  <input type="number" value={reportData.stats.noches_reservadas} onChange={e => setReportData({ ...reportData, stats: { ...reportData.stats, noches_reservadas: e.target.value } })} className="w-full p-2 border rounded-lg bg-blue-50 border-blue-200" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Promedio Noches</label>
                  <input type="number" value={reportData.stats.noches_promedio || ''} onChange={e => setReportData({ ...reportData, stats: { ...reportData.stats, noches_promedio: e.target.value } })} className="w-full p-2 border rounded-lg bg-blue-50 border-blue-200" placeholder="0" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Conversión</h3>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tasa Banco Cibao (RD$)</label>
                  <div className="flex gap-2">
                    <input type="number" value={reportData.tasa_banco_cibao} onChange={e => setReportData({ ...reportData, tasa_banco_cibao: e.target.value })} className="flex-1 p-2 border rounded-lg border-green-300" step="0.01" />
                    <button onClick={fetchBancoCibaoRate} disabled={rateLoading} className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50" title="Actualizar tasa">
                      {rateLoading ? <span className="animate-spin">⟳</span> : <span>🔄</span>}
                    </button>
                  </div>
                  {rateSource && <p className="text-xs text-green-600 mt-1">✓ {rateSource}</p>}
                </div>
                <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500">25% del Total (RD$)</div>
                  <div className="text-xl font-bold text-gray-800">{reportData.conversion_result ? `RD$ ${parseFloat(reportData.conversion_result).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '---'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button onClick={() => { setStep('list'); setEditingReportId(null); setViewingReport(null); }} className="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all hover:scale-105 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" /> {editingReportId ? 'Guardar Cambios' : 'Guardar Informe'}
            </button>
          </div>
        </div>
      )}

      {/* VIEW REPORT */}
      {step === 'view' && viewingReport && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setStep('list'); setViewingReport(null); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 flex-1">Informe: {viewingReport.apartmentName}</h2>
            <button onClick={() => handleEdit(viewingReport)} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2 font-medium">
              <Edit2 className="w-4 h-4" /> Editar
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2 font-medium">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={handleDownloadPDF} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 font-medium">
              <Download className="w-4 h-4" /> Descargar PDF
            </button>
            <button onClick={() => handleDelete(viewingReport.id)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 font-medium">
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
          <div ref={reportRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <ReportContent />
          </div>
        </div>
      )}
    </div>
  );
};
