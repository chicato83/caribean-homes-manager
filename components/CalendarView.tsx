import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storageService';
import { CalendarEvent } from '../types';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const CalendarView: React.FC = () => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { theme } = useTheme();
  const { addToast } = useToast();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await StorageService.getCalendarEvents(currentMonth, currentYear);
      setEvents(data);
    } catch (error) {
      addToast('error', 'Error al cargar eventos del calendario');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday = 0
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const prevMonthDays = getDaysInMonth(currentMonth === 0 ? 11 : currentMonth - 1, currentMonth === 0 ? currentYear - 1 : currentYear);

  const formatDateKey = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getEventsForDate = (day: number) => {
    const dateKey = formatDateKey(day);
    return events.filter(e => e.date === dateKey);
  };

  const calendarDays: { day: number; isCurrentMonth: boolean; dateKey: string }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const pm = currentMonth === 0 ? 11 : currentMonth - 1;
    const py = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({
      day,
      isCurrentMonth: false,
      dateKey: `${py}-${String(pm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, isCurrentMonth: true, dateKey: formatDateKey(d) });
  }

  // Next month leading days
  const remaining = 42 - calendarDays.length; // 6 rows
  for (let d = 1; d <= remaining; d++) {
    const nm = currentMonth === 11 ? 0 : currentMonth + 1;
    const ny = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      dateKey: `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  const selectedDateEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];
  const isToday = (day: number) => day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-brand-500" /> Calendario
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={goToPrevMonth}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={goToToday}
                className="text-xs px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors font-medium"
              >
                Hoy
              </button>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
            {DAYS.map(day => (
              <div key={day} className="p-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((cell, idx) => {
                const dayEvents = cell.isCurrentMonth ? getEventsForDate(cell.day) : [];
                const maxShow = 3;
                const visibleEvents = dayEvents.slice(0, maxShow);
                const extraCount = dayEvents.length - maxShow;
                const todayCell = isToday(cell.day) && cell.isCurrentMonth;
                const selected = cell.dateKey === selectedDate;

                return (
                  <div
                    key={idx}
                    onClick={() => cell.isCurrentMonth && setSelectedDate(cell.dateKey)}
                    className={`min-h-[80px] p-1.5 border-b border-r border-slate-100 dark:border-slate-700/50 transition-colors ${
                      cell.isCurrentMonth
                        ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        : 'bg-slate-50/50 dark:bg-slate-900/30'
                    } ${selected ? 'bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-500 ring-inset' : ''}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                        todayCell
                          ? 'bg-brand-600 text-white'
                          : cell.isCurrentMonth
                            ? 'text-slate-900 dark:text-slate-200'
                            : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {cell.day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {visibleEvents.map(event => (
                        <div
                          key={event.id}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${
                            event.type === 'cleaning'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                          }`}
                          title={`${event.title} - ${event.apartmentName}`}
                        >
                          {event.type === 'cleaning' ? '🧹' : '🔧'} {event.apartmentName}
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          +{extraCount} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 p-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500" /> Limpieza
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-orange-500" /> Mantenimiento
            </span>
          </div>
        </div>

        {/* Event Details Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                : 'Selecciona una fecha'}
            </h3>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
              <Calendar className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Haz clic en un día para ver los eventos</p>
            </div>
          ) : selectedDateEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
              <p className="text-sm">No hay eventos programados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateEvents.map(event => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    event.type === 'cleaning'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{event.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{event.apartmentName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{event.details}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        event.type === 'cleaning'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                      }`}
                    >
                      {event.type === 'cleaning' ? 'Limpieza' : 'Mantenimiento'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
