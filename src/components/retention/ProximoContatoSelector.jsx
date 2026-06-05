import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProximoContatoSelector({ value, onChange, req }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDateValue = () => {
    if (!value) return '';
    const d = new Date(value);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTimeValue = () => {
    if (!value) return '';
    const d = new Date(value);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const handleDateChange = (e) => {
    const dateStr = e.target.value;
    if (!dateStr) return;
    const timeStr = getTimeValue() || '10:00';
    const dt = new Date(`${dateStr}T${timeStr}`);
    onChange(dt.toISOString());
  };

  const handleTimeChange = (e) => {
    const timeStr = e.target.value;
    if (!timeStr) return;
    const dateStr = getDateValue() || new Date().toISOString().split('T')[0];
    const dt = new Date(`${dateStr}T${timeStr}`);
    onChange(dt.toISOString());
  };

  const handleDateSelectFromCalendar = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeStr = getTimeValue() || '10:00';
    const dt = new Date(`${dateStr}T${timeStr}`);
    onChange(dt.toISOString());
    setShowCalendar(false);
  };

  const handleSyncToGoogle = () => {
    if (!value) return;
    const date = new Date(value);
    const title = `Contato - ${req.razao_social}`;
    const end = new Date(date.getTime() + 60*60*1000);
    const startStr = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endStr = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(`Cliente: ${req.razao_social}\nCNPJ: ${req.cnpj}`)}&location=${encodeURIComponent(req.email || '')}`;
    window.open(googleCalendarUrl, '_blank');
  };

  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysArray = [];

  for (let i = 0; i < firstDay; i++) daysArray.push(null);
  for (let i = 1; i <= daysInMonth; i++) daysArray.push(i);

  const isToday = (day) => {
    const today = new Date();
    return day && day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
  };

  const isSelected = (day) => {
    if (!value || !day) return false;
    const selectedDate = new Date(value);
    return selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  return (
    <div className="space-y-2 relative">
      <div className="flex gap-2">
        <Input
          type="date"
          value={getDateValue()}
          onChange={handleDateChange}
          onFocus={() => setShowCalendar(true)}
          className="h-8 text-sm flex-1"
        />
        <Input
          type="time"
          value={getTimeValue()}
          onChange={handleTimeChange}
          className="h-8 text-sm w-24"
        />
        <Button
          size="sm"
          onClick={handleSyncToGoogle}
          disabled={!value}
          variant="outline"
          className="h-8 text-xs"
        >
          📅
        </Button>
      </div>

      {showCalendar && (
        <div className="absolute top-full left-0 z-50 p-3 border border-slate-200 rounded-lg bg-white shadow-lg space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="h-6 px-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-semibold text-slate-700 capitalize">{monthName}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="h-6 px-1"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => (
              <div key={day} className="text-center text-[10px] font-semibold text-slate-400 w-6 h-6 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {daysArray.map((day, idx) => (
              day ? (
                <button
                  key={`day-${day}`}
                  onClick={() => handleDateSelectFromCalendar(day)}
                  className={`w-6 h-6 text-[10px] rounded transition-colors ${
                    isSelected(day) ? 'bg-blue-600 text-white font-bold' :
                    isToday(day) ? 'bg-blue-100 text-blue-700 font-semibold border border-blue-300' :
                    'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              ) : (
                <div key={`empty-${idx}`} className="w-6 h-6" />
              )
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => setShowCalendar(false)}
            className="w-full h-6 text-xs bg-slate-600 hover:bg-slate-700 text-white"
          >
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
}