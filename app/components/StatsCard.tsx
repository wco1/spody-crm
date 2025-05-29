'use client';

import React, { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

type ColorOptions = 'indigo' | 'sky' | 'emerald' | 'amber';

interface StatsCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  percentChange?: number;
  icon?: ReactNode;
  isLoading?: boolean;
  description?: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  showTrend?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: ColorOptions;
}

export default function StatsCard({
  title,
  value,
  previousValue,
  percentChange,
  icon,
  isLoading = false,
  description,
  secondaryValue,
  secondaryLabel,
  showTrend = false,
  trend,
  color = 'indigo'
}: StatsCardProps) {
  // Определяем, растет ли показатель или падает
  let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
  let trendValue = 0;
  
  if (percentChange !== undefined) {
    trendDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
    trendValue = Math.abs(percentChange);
  } else if (trend) {
    trendDirection = trend.isPositive ? 'up' : 'down';
    trendValue = trend.value;
  }

  // Определяем цвет для тренда
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500'
  };

  // Определяем иконку для тренда
  const trendIcons = {
    up: <ArrowUp className="h-3 w-3" />,
    down: <ArrowDown className="h-3 w-3" />,
    neutral: <Minus className="h-3 w-3" />
  };

  // Создаем класс для цвета иконки
  const colorClasses: Record<ColorOptions, string> = {
    indigo: 'bg-indigo-50 text-indigo-500',
    sky: 'bg-sky-50 text-sky-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    amber: 'bg-amber-50 text-amber-500',
  };

  return (
    <div className="bg-white rounded-lg shadow p-5 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="animate-spin w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            
            {(showTrend || trend) && (
              <span className={`ml-2 text-sm font-medium flex items-center ${trendColors[trendDirection]}`}>
                {trendIcons[trendDirection]}
                <span className="ml-0.5">
                  {trendValue.toFixed(1)}%
                </span>
              </span>
            )}
      </div>
          
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
          
          {secondaryValue && secondaryLabel && (
            <div className="mt-3 flex items-center text-sm">
              <span className="text-gray-500">{secondaryLabel}:</span>
              <span className="ml-1 font-medium">{secondaryValue}</span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className={`p-2 rounded-full ${colorClasses[color] || colorClasses.indigo}`}>
            {icon}
          </div>
        )}
      </div>
      
      {previousValue !== undefined && (
        <div className="mt-3 text-xs text-gray-500">
          Предыдущий период: {previousValue}
        </div>
      )}
    </div>
  );
} 