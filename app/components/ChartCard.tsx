'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  AreaChart,
  Area
} from 'recharts';
import { ReactElement } from 'react';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { ChartDataPoint } from '../utils/analytics';

interface ChartCardProps {
  title: string;
  description?: string;
  data: ChartDataPoint[] | Array<Record<string, string | number>>;
  type: 'line' | 'bar' | 'area';
  dataKey: string;
  colors?: {
    stroke: string;
    fill: string;
  };
}

// Пользовательский компонент подсказки для графиков
const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 rounded-lg shadow-md text-sm">
        <p className="font-medium text-gray-700">{`${label}`}</p>
        <p className="text-indigo-600 font-semibold">
          {`${payload[0].value}`}
        </p>
      </div>
    );
  }

  return null;
};

export default function ChartCard({
  title,
  description,
  data,
  type,
  dataKey,
  colors = { stroke: '#4f46e5', fill: 'rgba(79, 70, 229, 0.1)' }
}: ChartCardProps) {
  const renderChart = (): ReactElement => {
    if (type === 'line') {
      return (
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.2} />
              <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={colors.stroke} 
            strokeWidth={3}
            dot={{ stroke: colors.stroke, strokeWidth: 2, r: 4, fill: 'white' }}
            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
          />
        </LineChart>
      );
    } else if (type === 'area') {
      return (
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={colors.stroke} 
            strokeWidth={3}
            fill="url(#colorGradient)"
            dot={{ stroke: colors.stroke, strokeWidth: 2, r: 4, fill: 'white' }}
            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
          />
        </AreaChart>
      );
    }
    
    // По умолчанию возвращаем bar chart
    return (
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity={1} />
            <stop offset="95%" stopColor={colors.stroke} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis 
          dataKey="name" 
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis 
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey={dataKey} 
          fill="url(#barGradient)" 
          radius={[4, 4, 0, 0]}
          barSize={30}
        />
      </BarChart>
    );
  };
  
  return (
    <div className="card">
      <div className="mb-5">
        <h3 className="text-lg font-medium text-gray-700">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}