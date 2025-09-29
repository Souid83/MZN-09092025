import React from 'react';

interface StatusBadgeProps {
  status: 'loaded' | 'waiting' | 'delivered' | 'dispute';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'loaded':
        return 'bg-blue-100 text-blue-800';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'dispute':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'loaded':
        return 'Chargé';
      case 'waiting':
        return 'En attente';
      case 'delivered':
        return 'Livré';
      case 'dispute':
        return 'Litige';
      default:
        return status;
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
      {getStatusText()}
    </span>
  );
};

export default StatusBadge;