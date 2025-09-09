import React from 'react';
import { Truck } from 'lucide-react';

interface DashboardCardProps {
  icon?: React.ReactNode;
  title: string;
  value: string | number;
  color?: string;
  className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon = <Truck size={32} />,
  title,
  value,
  color = 'text-gray-900',
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm flex flex-col items-center ${className}`}>
      <div className={`${color} flex items-center justify-center`}>
        {icon}
      </div>
      <div className="text-3xl font-bold mb-1 mt-2">{value}</div>
      <div className="text-gray-600">{title}</div>
    </div>
  );
};

export default DashboardCard;