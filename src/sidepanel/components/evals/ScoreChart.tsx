import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import type { IterationResult } from '@/lib/types';

interface Props {
  iterations: IterationResult[];
}

export function ScoreChart({ iterations }: Props) {
  const data = iterations.map(iter => ({
    name: `Iter ${iter.iteration}`,
    'With Skill': Math.round(iter.avgScore * 100),
    'Baseline': Math.round(iter.avgBaseline * 100),
  }));

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(216, 211, 197, 0.08)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#908c80' }}
            axisLine={{ stroke: 'rgba(216, 211, 197, 0.12)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#908c80' }}
            unit="%"
            axisLine={{ stroke: 'rgba(216, 211, 197, 0.12)' }}
            tickLine={false}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#b8b4a8' }} />
          <Bar dataKey="With Skill" fill="#c96442" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Baseline" fill="#908c80" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
