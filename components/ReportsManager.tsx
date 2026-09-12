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

  // Auto-fetch Banco Cibao exchange rate from TasaReal API
  const fetchBancoCibaoRate = async () => {
    const apiKey = import.meta.env.VITE_TASAREAL_API_KEY;
    if (!apiKey) return;

    setRateLoading(true);
    try {
      const response = await fetch(
        'https://tasareal.com/api/v1/rates?institution=cibao&currency=USD',
        {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        }
      );

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
      console.error('Error fetching Banco Cibao rate:', err);
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
        // Join with space but also keep newlines for better parsing
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      console.log('PDF full text:', fullText); // Debug: see what text we extract

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

    // Extract period - try multiple formats
    const periodMatch = text.match(/(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{4}/i)
      || text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i);
    if (periodMatch) {
      data.period = periodMatch[0];
    }

    // Extract nights reserved - try multiple patterns
    // Pattern 1: "Noches reservadas: X" or "X noches reservadas"
    const nightsPatterns = [
      /noches?\s+reservadas?\s*[:=]?\s*(\d+)/i,
      /(\d+)\s+noches?\s+reservadas?/i,
      /reserved?\s+nights?\s*[:=]?\s*(\d+)/i,
      /(\d+)\s+reserved?\s+nights?/i,
      /night(?:s)?\s+(?:booked|reserved)\s*[:=]?\s*(\d+)/i,
      /(\d+)\s+night(?:s)?\s+(?:booked|reserved)/i,
      // Airbnb specific: often appears as "Noche(s)" with number nearby
      /noche\s*\(?s?\)?\s*[:=]?\s*(\d+)/i,
      /(\d+)\s*noche\s*\(?s?\)?/i,
    ];

    for (const pattern of nightsPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.stats.noches_reservadas = match[1];
        console.log('Nights matched:', match[1], 'with pattern:', pattern.source);
        break;
      }
    }

    // Extract amounts (USD) - handle various formats
    const amounts = text.match(/\$[\d,]+\.?\d*/g) || [];
    const numbers = amounts.map(a => parseFloat(a.replace(/[$,]/g, '')));

    console.log('Extracted amounts:', numbers); // Debug

    // Typical Airbnb report structure
    if (numbers.length >= 4) {
      data.summary.ingresos_brutos = numbers[0].toFixed(2);
      data.summary.ajustes = numbers[1]?.toFixed(2) || '0.00';
      data.summary.tarifas_servicio = numbers[2]?.toFixed(2) || '0.00';
      data.summary.impuestos_retenidos = numbers[3]?.toFixed(2) || '0.00';
      data.summary.total_usd = numbers[4]?.toFixed(2) || numbers[0].toFixed(2);
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
    const summaryTotal = parseFloat(reportData.summary.total_usd) || 0;
    const extraIncome = parseFloat(reportData.extra_income) || 0;
    const total = summaryTotal + extraIncome;
    const tasa = parseFloat(reportData.tasa_banco_cibao) || 58;
    // Restar $28 fijos y luego calcular 25%
    const base = total - 28;
    const percent25 = base * 0.25;

    setReportData({
      ...reportData,
      percent_25_result: percent25.toFixed(2),
      conversion_result: (percent25 * tasa).toFixed(2),
    });
  };

  useEffect(() => {
    calculateConversions();
  }, [reportData.summary.total_usd, reportData.summary.ingresos_brutos, reportData.summary.ajustes, reportData.summary.tarifas_servicio, reportData.summary.impuestos_retenidos, reportData.extra_income, reportData.tasa_banco_cibao]);

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
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Informe ${viewingReport?.apartmentName || ''} - ${reportData.period}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1f2937; padding: 20px; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
          .logos { display: flex; align-items: center; gap: 20px; }
          .logo { height: 50px; }
          .title { text-align: right; }
          .title h1 { font-size: 22px; color: #0284c7; }
          .title p { font-size: 12px; color: #6b7280; }
          .section { margin-bottom: 20px; }
          .section h3 { font-size: 14px; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .item { display: flex; justify-content: space-between; padding: 6px 10px; background: #f9fafb; border-radius: 4px; }
          .item-label { color: #6b7280; font-size: 13px; }
          .item-value { font-weight: 600; font-size: 13px; }
          .total { background: #ecfdf5; border: 1px solid #bbf7d0; }
          .total .item-value { color: #059669; font-size: 16px; }
          .conversion { background: #eff6ff; border: 1px solid #bfdbfe; }
          .conversion .item-value { color: #2563eb; font-size: 16px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = async () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    // Use html2canvas approach - open print dialog which allows Save as PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Informe ${viewingReport?.apartmentName || ''} - ${reportData.period}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1f2937; padding: 20px; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
          .logos { display: flex; align-items: center; gap: 20px; }
          .logo { height: 50px; }
          .title { text-align: right; }
          .title h1 { font-size: 22px; color: #0284c7; }
          .title p { font-size: 12px; color: #6b7280; }
          .section { margin-bottom: 20px; }
          .section h3 { font-size: 14px; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .item { display: flex; justify-content: space-between; padding: 6px 10px; background: #f9fafb; border-radius: 4px; }
          .item-label { color: #6b7280; font-size: 13px; }
          .item-value { font-weight: 600; font-size: 13px; }
          .total { background: #ecfdf5; border: 1px solid #bbf7d0; }
          .total .item-value { color: #059669; font-size: 16px; }
          .conversion { background: #eff6ff; border: 1px solid #bfdbfe; }
          .conversion .item-value { color: #2563eb; font-size: 16px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() { window.print(); }
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatCurrencyRD = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(num);
  };

  // Report content component (reused in preview, view, and print)
  const ReportContent = () => (
    <div>
      {/* Header */}
      <div className="border-b-4 border-brand-600 pb-4 mb-6">
        <h1 className="text-xl font-bold text-gray-800">
          Informe de ingresos — {viewingReport?.apartmentName || selectedApartment?.name || ''} - {reportData.period}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Caribean Home Management - {viewingReport?.apartmentName || selectedApartment?.name || ''}</p>
      </div>

      {/* Resumen */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Resumen</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600 text-sm">Ingresos brutos</span>
            <span className="font-semibold text-sm">{formatCurrency(reportData.summary.ingresos_brutos)}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600 text-sm">Ajustes</span>
            <span className="font-semibold text-sm">{formatCurrency(reportData.summary.ajustes)}</span>
          </div>
          {reportData.extra_income && (
            <div className="flex justify-between p-2 bg-green-50 rounded">
              <span className="text-green-700 text-sm">Ingresos Adicionales (Manual)</span>
              <span className="font-semibold text-green-700 text-sm">+{formatCurrency(reportData.extra_income)}</span>
            </div>
          )}
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600 text-sm">Tarifas de servicio</span>
            <span className="font-semibold text-sm">{formatCurrency(reportData.summary.tarifas_servicio)}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600 text-sm">Impuestos retenidos</span>
            <span className="font-semibold text-sm">{formatCurrency(reportData.summary.impuestos_retenidos)}</span>
          </div>
          <div className="flex justify-between p-3 bg-green-50 border border-green-200 rounded">
            <span className="font-bold text-gray-800">Total (USD)</span>
            <span className="font-bold text-green-600 text-lg">{formatCurrency(reportData.summary.total_usd)}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Estadísticas</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600 text-sm">Noches totales</span>
            <span className="font-semibold text-sm">{reportData.stats.noches_reservadas || '0'}</span>
          </div>
          {reportData.extra_nights && (
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600 text-sm">Noches Extra</span>
              <span className="font-semibold text-sm">{reportData.extra_nights}</span>
            </div>
          )}
          {reportData.extra_nights_amount && (
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600 text-sm">Noches Extra (USD)</span>
              <span className="font-semibold text-sm">{formatCurrency(reportData.extra_nights_amount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Alojamientos */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Alojamientos</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-gray-500 font-semibold">Alojamiento</th>
              <th className="text-right py-2 text-gray-500 font-semibold">Ingresos brutos</th>
              <th className="text-right py-2 text-gray-500 font-semibold">Ajustes</th>
              <th className="text-right py-2 text-gray-500 font-semibold">Tarifas</th>
              <th className="text-right py-2 text-gray-500 font-semibold">Impuestos</th>
              <th className="text-right py-2 text-gray-500 font-semibold">Total (USD)</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(reportData.accommodations).map((acc: any, i: number) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2">{acc.name}</td>
                <td className="text-right py-2">{formatCurrency(acc.ingresos_brutos)}</td>
                <td className="text-right py-2">{formatCurrency(acc.ajustes)}</td>
                <td className="text-right py-2">{formatCurrency(acc.tarifas_servicio)}</td>
                <td className="text-right py-2">{formatCurrency(acc.impuestos_retenidos)}</td>
                <td className="text-right py-2 font-semibold">{formatCurrency(acc.total_usd)}</td>
              </tr>
            ))}
            <tr className="font-bold border-t-2 border-gray-300">
              <td className="py-2">Total</td>
              <td className="text-right py-2">{formatCurrency(reportData.summary.ingresos_brutos)}</td>
              <td className="text-right py-2">{formatCurrency(reportData.summary.ajustes)}</td>
              <td className="text-right py-2">{formatCurrency(reportData.summary.tarifas_servicio)}</td>
              <td className="text-right py-2">{formatCurrency(reportData.summary.impuestos_retenidos)}</td>
              <td className="text-right py-2">{formatCurrency(reportData.summary.total_usd)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Formas de cobro */}
      {reportData.payment_methods.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Formas de cobro</h3>
          {reportData.payment_methods.map((pm, i) => (
            <div key={i} className="flex justify-between p-2 bg-gray-50 rounded mb-1">
              <span className="text-gray-600 text-sm">{pm.method} (USD)</span>
              <span className="font-semibold text-sm">{formatCurrency(pm.amount_usd)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Liquidación y Pago */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Liquidación y Pago</h3>
        <div className="flex justify-between">
          <span className="font-bold text-gray-800">Total (USD)</span>
          <span className="font-bold text-green-600 text-lg">{formatCurrency(reportData.summary.total_usd)}</span>
        </div>
      </div>

      {/* Conversión */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Conversión a RD$</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Tasa Banco Cibao</p>
            <p className="text-lg font-bold text-gray-800">RD$ {reportData.tasa_banco_cibao}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Base (Total - $28)</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency((parseFloat(reportData.summary.total_usd) - 28).toString())}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">25% de (Total - $28) en RD$</p>
            <p className="text-lg font-bold text-blue-600">{reportData.conversion_result ? `RD$ ${reportData.conversion_result}` : '---'}</p>
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
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2">
                        <p className="text-lg font-bold text-green-600">{formatCurrency(report.reportData.summary.total_usd)}</p>
                        <p className="text-xs text-gray-400">{report.reportData.stats.noches_reservadas || '0'} noches</p>
                      </div>
                      {/* Action buttons */}
                      <button
                        onClick={() => handleView(report)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver informe"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(report)}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Editar informe"
                      >
                        <Edit2 className="w-5 h-5" />
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
                onClick={() => { setSelectedApartment(apt); setStep('upload'); }}
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
              <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* PREVIEW / EDIT (new report or edit existing) */}
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
              <h3 className="font-bold text-gray-700 border-b pb-2">Datos del Período</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Período</label>
                <input type="text" value={reportData.period} onChange={e => setReportData({ ...reportData, period: e.target.value })} className="w-full p-2 border rounded-lg" placeholder="Ej: Octubre 2024" />
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
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tarifas de Servicio</label>
                  <input type="number" value={reportData.summary.tarifas_servicio} onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, tarifas_servicio: e.target.value } })} className="w-full p-2 border rounded-lg bg-orange-50 border-orange-200" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Impuestos Retenidos</label>
                  <input type="number" value={reportData.summary.impuestos_retenidos} onChange={e => setReportData({ ...reportData, summary: { ...reportData.summary, impuestos_retenidos: e.target.value } })} className="w-full p-2 border rounded-lg bg-red-50 border-red-200" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ingresos Adicionales</label>
                  <input type="number" value={reportData.extra_income} onChange={e => setReportData({ ...reportData, extra_income: e.target.value })} className="w-full p-2 border rounded-lg bg-green-50 border-green-200" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total USD</label>
                <div className="text-2xl font-bold text-gray-800">{formatCurrency(reportData.summary.total_usd)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Estadísticas</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Noches Reservadas</label>
                  <input type="number" value={reportData.stats.noches_reservadas} onChange={e => setReportData({ ...reportData, stats: { ...reportData.stats, noches_reservadas: e.target.value } })} className="w-full p-2 border rounded-lg bg-blue-50 border-blue-200" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Noches Extra (cant.)</label>
                  <input type="number" value={reportData.extra_nights} onChange={e => setReportData({ ...reportData, extra_nights: e.target.value })} className="w-full p-2 border rounded-lg bg-blue-50 border-blue-200" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Noches Extra (USD)</label>
                  <input type="number" value={reportData.extra_nights_amount} onChange={e => setReportData({ ...reportData, extra_nights_amount: e.target.value })} className="w-full p-2 border rounded-lg bg-green-50 border-green-200" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Conversión</h3>
              {/* Resumen en tiempo real */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ingresos brutos:</span>
                  <span className="font-medium">{formatCurrency(reportData.summary.ingresos_brutos)}</span>
                </div>
                {reportData.extra_income && parseFloat(reportData.extra_income) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">+ Ingresos adicionales:</span>
                    <span className="font-medium text-green-700">+{formatCurrency(reportData.extra_income)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="text-gray-600">Total ingresos:</span>
                  <span className="font-bold">{formatCurrency(((parseFloat(reportData.summary.total_usd) || 0) + (parseFloat(reportData.extra_income) || 0)).toString())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">- Costo fijo:</span>
                  <span className="font-medium text-red-600">-$28.00</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="text-gray-600">Base (Total - $28):</span>
                  <span className="font-bold">{formatCurrency((((parseFloat(reportData.summary.total_usd) || 0) + (parseFloat(reportData.extra_income) || 0)) - 28).toString())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">25% de base:</span>
                  <span className="font-bold text-blue-600">{reportData.percent_25_result ? formatCurrency(reportData.percent_25_result) : '---'}</span>
                </div>
              </div>
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
                <div className="flex-1 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-600 font-bold uppercase mb-1">25% de (Total - $28) en RD$</div>
                  <div className="text-2xl font-bold text-blue-700">{reportData.conversion_result ? `RD$ ${reportData.conversion_result}` : '---'}</div>
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

      {/* VIEW REPORT (read-only with actions) */}
      {step === 'view' && viewingReport && (
        <div>
          {/* Action bar */}
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

          {/* Report content */}
          <div ref={reportRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <ReportContent />
          </div>
        </div>
      )}
    </div>
  );
};
