// ピクセルアート風カフェ街の背景（サイドビュー）
export default function CafeStreetBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* 空グラデーション */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 55%, #FDE68A 85%, #FCA5A5 100%)' }} />

      {/* 太陽 */}
      <div className="absolute" style={{ top: 28, right: 80, width: 44, height: 44, borderRadius: '50%', background: '#FDE047', boxShadow: '0 0 0 8px rgba(253,224,71,0.3), 0 0 0 16px rgba(253,224,71,0.15)' }} />

      {/* 雲1 */}
      <CloudPixel x={60} y={18} scale={1} />
      {/* 雲2 */}
      <CloudPixel x={15} y={12} scale={0.75} />
      {/* 雲3 */}
      <CloudPixel x={82} y={28} scale={0.6} />

      {/* 遠景の山/丘 */}
      <div className="absolute" style={{ bottom: 108, left: 0, right: 0, height: 60, background: '#86EFAC', borderRadius: '60% 80% 0 0 / 40% 40% 0 0' }} />
      <div className="absolute" style={{ bottom: 108, right: -20, width: '40%', height: 50, background: '#6EE7B7', borderRadius: '80% 60% 0 0 / 40% 40% 0 0' }} />

      {/* 地面 */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 110, background: '#D97706' }} />
      {/* 歩道 */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 68, background: '#E5E7EB' }} />
      {/* 歩道タイル目地 */}
      {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
        <div key={i} className="absolute bottom-0" style={{ left: `${i * 10}%`, width: 2, height: 68, background: '#D1D5DB' }} />
      ))}
      {/* 道路 */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 36, background: '#374151' }} />
      {/* 車道白線 */}
      {[0,1,2,3,4,5].map(i => (
        <div key={i} className="absolute bottom-3" style={{ left: `${i * 20 + 5}%`, width: 48, height: 6, background: '#FDE047', borderRadius: 3 }} />
      ))}

      {/* ===== 建物群 ===== */}

      {/* 左：本屋 */}
      <Building x={-10} color="#A78BFA" roofColor="#7C3AED" width={90} height={130} label="📚" windows={[[14,30],[50,30],[14,70],[50,70]]} doorX={35} />

      {/* 中央左：花屋 */}
      <Building x={95} color="#34D399" roofColor="#059669" width={80} height={110} label="🌸" windows={[[12,28],[44,28]]} doorX={28} signText="FLOWER" signColor="#ECFDF5" />

      {/* 中央：★カフェ（メイン建物・大きめ） */}
      <CafeBuilding x={195} />

      {/* 中央右：パン屋 */}
      <Building x={355} color="#FCD34D" roofColor="#D97706" width={85} height={115} label="🍞" windows={[[12,32],[48,32]]} doorX={30} signText="BAKERY" signColor="#451A03" />

      {/* 右：美容院 */}
      <Building x={460} color="#F9A8D4" roofColor="#DB2777" width={80} height={100} label="💇" windows={[[12,25],[44,25]]} doorX={28} />

      {/* 右端：電柱 */}
      <div className="absolute" style={{ bottom: 68, right: 48, width: 8, height: 160, background: '#4B5563', borderRadius: 2 }} />
      <div className="absolute" style={{ bottom: 210, right: 32, width: 48, height: 4, background: '#4B5563', borderRadius: 2 }} />

      {/* 街灯 */}
      <StreetLamp x={160} />
      <StreetLamp x={340} />

      {/* 木 */}
      <Tree x={72} />
      <Tree x={430} />
    </div>
  );
}

function CloudPixel({ x, y, scale }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${scale})`, transformOrigin: 'left top' }}>
      <div style={{ position: 'relative', width: 80, height: 36 }}>
        <div style={{ position: 'absolute', top: 14, left: 0, width: 80, height: 20, background: 'white', borderRadius: 10, opacity: 0.9 }} />
        <div style={{ position: 'absolute', top: 4, left: 16, width: 28, height: 28, background: 'white', borderRadius: '50%', opacity: 0.9 }} />
        <div style={{ position: 'absolute', top: 8, left: 36, width: 22, height: 22, background: 'white', borderRadius: '50%', opacity: 0.9 }} />
      </div>
    </div>
  );
}

function Building({ x, color, roofColor, width, height, label, windows, doorX, signText, signColor }) {
  return (
    <div className="absolute" style={{ bottom: 68, left: x, width, height }}>
      {/* 屋根 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24, background: roofColor, borderRadius: '4px 4px 0 0' }} />
      {/* 煙突 */}
      <div style={{ position: 'absolute', top: -16, left: 16, width: 12, height: 20, background: roofColor }} />
      {/* 壁 */}
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0, background: color }} />
      {/* 窓 */}
      {windows.map(([wx, wy], i) => (
        <div key={i} style={{ position: 'absolute', top: wy, left: wx, width: 22, height: 24, background: '#BFDBFE', border: '3px solid white', borderRadius: 2, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'white' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'white' }} />
        </div>
      ))}
      {/* ドア */}
      <div style={{ position: 'absolute', bottom: 0, left: doorX, width: 20, height: 36, background: roofColor, borderRadius: '3px 3px 0 0' }}>
        <div style={{ position: 'absolute', top: 14, right: 4, width: 4, height: 4, borderRadius: '50%', background: '#FDE047' }} />
      </div>
      {/* ラベル絵文字 */}
      <div style={{ position: 'absolute', top: 26, left: '50%', transform: 'translateX(-50%)', fontSize: 18, lineHeight: 1 }}>{label}</div>
      {/* サインボード */}
      {signText && (
        <div style={{ position: 'absolute', top: 50, left: 8, right: 8, background: signColor || roofColor, borderRadius: 3, padding: '1px 4px', textAlign: 'center', fontSize: 8, fontWeight: 'bold', color: color, border: `2px solid ${roofColor}` }}>
          {signText}
        </div>
      )}
    </div>
  );
}

function CafeBuilding({ x }) {
  return (
    <div className="absolute" style={{ bottom: 68, left: x, width: 140, height: 170 }}>
      {/* 屋根 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, background: '#B45309', borderRadius: '6px 6px 0 0' }} />
      {/* 屋根装飾ライン */}
      <div style={{ position: 'absolute', top: 28, left: 0, right: 0, height: 8, background: '#D97706' }} />
      {/* 壁 */}
      <div style={{ position: 'absolute', top: 34, left: 0, right: 0, bottom: 0, background: '#FEF3C7' }} />
      {/* レンガ模様 */}
      {[0,1,2,3].map(row => (
        [0,1,2].map(col => (
          <div key={`${row}-${col}`} style={{ position: 'absolute', top: 40 + row * 18, left: (col * 46) + (row % 2 === 0 ? 0 : 23), width: 40, height: 14, border: '2px solid #FDE68A', borderRadius: 2 }} />
        ))
      ))}
      {/* 窓 大 */}
      <div style={{ position: 'absolute', top: 44, left: 10, width: 46, height: 52, background: '#BAE6FD', border: '4px solid #B45309', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: '#B45309' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 3, background: '#B45309' }} />
        {/* カーテン */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 8, height: '100%', background: 'rgba(252,211,77,0.5)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', background: 'rgba(252,211,77,0.5)' }} />
      </div>
      {/* 窓 小 */}
      <div style={{ position: 'absolute', top: 44, right: 10, width: 32, height: 32, background: '#BAE6FD', border: '3px solid #B45309', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#B45309' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#B45309' }} />
      </div>
      {/* カフェ看板 */}
      <div style={{ position: 'absolute', top: 106, left: 8, right: 8, background: '#B45309', borderRadius: 4, padding: '4px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#FDE047', letterSpacing: 2 }}>CAFÉ</div>
      </div>
      {/* ドア */}
      <div style={{ position: 'absolute', bottom: 0, left: 56, width: 28, height: 48, background: '#B45309', borderRadius: '4px 4px 0 0', border: '2px solid #92400E' }}>
        <div style={{ position: 'absolute', top: 18, right: 5, width: 5, height: 5, borderRadius: '50%', background: '#FDE047' }} />
        <div style={{ position: 'absolute', top: 6, left: 4, right: 4, height: 22, background: '#BAE6FD', borderRadius: 2, border: '1.5px solid #92400E' }} />
      </div>
      {/* テラステーブル */}
      <div style={{ position: 'absolute', bottom: -4, left: -36, width: 34, height: 4, background: '#D97706', borderRadius: 2 }} />
      <div style={{ position: 'absolute', bottom: -4, left: -30, width: 4, height: 28, background: '#D97706' }} />
      <div style={{ position: 'absolute', bottom: -4, left: -18, width: 4, height: 28, background: '#D97706' }} />
      {/* テラス椅子 */}
      <div style={{ position: 'absolute', bottom: -4, left: -40, width: 14, height: 14, background: '#F59E0B', borderRadius: 2 }} />
      {/* のれん/日よけ */}
      <div style={{ position: 'absolute', top: 130, left: 0, right: 0, height: 18, background: '#F59E0B', borderRadius: '0 0 4px 4px' }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display: 'inline-block', width: '20%', height: '100%', borderRight: i < 4 ? '2px solid #D97706' : 'none', verticalAlign: 'top' }} />
        ))}
      </div>
    </div>
  );
}

function StreetLamp({ x }) {
  return (
    <div className="absolute" style={{ bottom: 68, left: x }}>
      <div style={{ width: 6, height: 80, background: '#6B7280', margin: '0 auto', borderRadius: 3 }} />
      <div style={{ width: 28, height: 12, background: '#FDE047', borderRadius: '4px 4px 0 0', marginLeft: -11, marginTop: -6, boxShadow: '0 4px 12px rgba(253,224,71,0.6)' }} />
    </div>
  );
}

function Tree({ x }) {
  return (
    <div className="absolute" style={{ bottom: 68, left: x }}>
      <div style={{ width: 8, height: 30, background: '#92400E', margin: '0 auto', borderRadius: 2 }} />
      <div style={{ width: 40, height: 40, background: '#22C55E', borderRadius: '50% 50% 40% 40%', marginLeft: -16, marginTop: -20, boxShadow: '0 -8px 0 #16A34A' }} />
    </div>
  );
}