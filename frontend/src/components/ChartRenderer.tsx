import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ChartProps {
  type: "bar" | "pie";
  title: string;
  data: { label: string; value: number }[];
}

const colors = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#818cf8"];

export const ChartRenderer: React.FC<ChartProps> = ({ type, title, data }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-md w-full max-w-xl mt-2">
      <h3 className="text-white text-md font-semibold mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === "bar" ? (
          <BarChart data={data}>
            <XAxis dataKey="label" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip />
            <Bar dataKey="value" fill="#60a5fa" />
          </BarChart>
        ) : (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100}>
              {data.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};