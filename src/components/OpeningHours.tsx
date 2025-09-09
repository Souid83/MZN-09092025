import React from 'react';
import { Copy } from 'lucide-react';

export interface DaySchedule {
  start: string;
  end: string;
  closed?: boolean;
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface OpeningHoursProps {
  value: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
}

const DAYS = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche'
} as const;

const DEFAULT_SCHEDULE: DaySchedule = {
  start: '09:00',
  end: '17:00',
  closed: false
};

const OpeningHours: React.FC<OpeningHoursProps> = ({ value = {} as WeekSchedule, onChange }) => {
  const handleDayChange = (
    day: keyof WeekSchedule,
    field: keyof DaySchedule,
    newValue: string | boolean
  ) => {
    const currentDaySchedule = value[day] || { ...DEFAULT_SCHEDULE };
    
    onChange({
      ...value,
      [day]: {
        ...currentDaySchedule,
        [field]: newValue
      }
    });
  };

  const copyMondaySchedule = () => {
    const mondaySchedule = value.monday || { ...DEFAULT_SCHEDULE };
    const newSchedule = { ...value };
    
    (Object.keys(DAYS) as Array<keyof WeekSchedule>).forEach(day => {
      if (day !== 'monday') {
        newSchedule[day] = { ...mondaySchedule };
      }
    });
    
    onChange(newSchedule);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Horaires d'ouverture</h3>
        <button
          type="button"
          onClick={copyMondaySchedule}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Copy size={16} />
          Copier les horaires du lundi
        </button>
      </div>

      <div className="space-y-2">
        {(Object.entries(DAYS) as Array<[keyof WeekSchedule, string]>).map(([day, label]) => {
          const schedule = value[day] || { ...DEFAULT_SCHEDULE };

          return (
            <div key={day} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={!schedule.closed}
                    onChange={(e) => handleDayChange(day, 'closed', !e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2">{label}</span>
                </label>
              </div>
              <div className="col-span-4">
                <input
                  type="time"
                  value={schedule.start || '09:00'}
                  onChange={(e) => handleDayChange(day, 'start', e.target.value)}
                  disabled={schedule.closed}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div className="col-span-1 text-center">à</div>
              <div className="col-span-4">
                <input
                  type="time"
                  value={schedule.end || '17:00'}
                  onChange={(e) => handleDayChange(day, 'end', e.target.value)}
                  disabled={schedule.closed}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OpeningHours;