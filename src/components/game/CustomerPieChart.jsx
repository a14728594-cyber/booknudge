// 入店客の属性を円グラフで表示
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// スコアから客の属性分布を決定論的に生成
function generateCustomerData(score, customerReaction) {
  // 入店者の属性は企画のターゲット精度に基づいて変動
  const ageData = [
    { name: '20代', value: 0, color: '#60A5FA' },
    { name: '30代', value: 0, color: '#34D399' },
    { name: '40代', value: 0, color: '#FBBF24' },
    { name: '50代以上', value: 0, color: '#F87171' },
  ];

  const genderData = [
    { name: '女性', value: 0, color: '#F9A8D4' },
    { name: '男性', value: 0, color: '#93C5FD' },
  ];

  const purposeData = [
    { name: '休憩目的', value: 0, color: '#A78BFA' },
    { name: '仕事・勉強', value: 0, color: '#6EE7B7' },
    { name: '待ち合わせ', value: 0, color: '#FCD34D' },
    { name: '食事目的', value: 0, color: '#FCA5A5' },
  ];

  // スコアに基づいてリアルな分布を生成
  if (score >= 70) {
    ageData[0].value = 18; ageData[1].value = 42; ageData[2].value = 25; ageData[3].value = 15;
    genderData[0].value = 58; genderData[1].value = 42;
    purposeData[0].value = 35; purposeData[1].value = 30; purposeData[2].value = 20; purposeData[3].value = 15;
  } else if (score >= 50) {
    ageData[0].value = 25; ageData[1].value = 35; ageData[2].value = 28; ageData[3].value = 12;
    genderData[0].value = 52; genderData[1].value = 48;
    purposeData[0].value = 40; purposeData[1].value = 25; purposeData[2].value = 22; purposeData[3].value = 13;
  } else {
    ageData[0].value = 35; ageData[1].value = 28; ageData[2].value = 22; ageData[3].value = 15;
    genderData[0].value = 48; genderData[1].value = 52;
    purposeData[0].value = 45; purposeData[1].value = 20; purposeData[2].value = 25; purposeData[3].value = 10;
  }

  return { ageData, genderData, purposeData };
}

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.08) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function MiniPie({ data, title }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-gray-600 text-center mb-1">{title}</p>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={48}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}%`, '']}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* 凡例 */}
      <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-[10px] text-gray-500">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomerPieChart({ score, customerReaction }) {
  const { ageData, genderData, purposeData } = generateCustomerData(score, customerReaction);
  const enterCount = Math.round((score / 100) * 100);

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <div>
          <p className="text-xs font-bold text-gray-800">入店客の属性分析</p>
          <p className="text-[11px] text-gray-400">100人中 <span className="font-bold text-amber-600">{enterCount}人</span> が入店</p>
        </div>
      </div>
      <div className="flex gap-2">
        <MiniPie data={ageData} title="年代別" />
        <MiniPie data={genderData} title="性別" />
        <MiniPie data={purposeData} title="来店目的" />
      </div>
    </div>
  );
}