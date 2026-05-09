import DogFlightScene from './components/DogFlightScene';
import { useState } from 'react';

function App() {
  const [height, setHeight] = useState<number>(10);
  const [isRaining, setIsRaining] = useState<boolean>(false);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <DogFlightScene
        onHeightChange={setHeight}
        onWeatherChange={setIsRaining}
      />

      {/* UI 信息面板 */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        background: 'rgba(0,0,0,0.6)',
        padding: '15px 20px',
        borderRadius: '10px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        zIndex: 1000,
        minWidth: '200px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>✈️ 小狗飞行记</h3>
        <div style={{ marginBottom: '8px' }}>
          <strong>飞行高度：</strong>
          <span style={{ color: height < 7 ? '#ff6b6b' : height > 20 ? '#ffd93d' : '#6bcb77' }}>
            {height.toFixed(1)} 米
          </span>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>天气：</strong>
          <span>{isRaining ? '🌧️ 下雨' : '☀️ 晴天'}</span>
        </div>
        <div style={{ fontSize: '12px', marginTop: '10px', color: '#aaa' }}>
          移动鼠标/手指控制方向
        </div>
      </div>

      {/* 高度指示器 */}
      <div style={{
        position: 'absolute',
        right: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '30px',
        height: '200px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '15px',
        padding: '5px',
        zIndex: 1000
      }}>
        <div style={{
          position: 'absolute',
          bottom: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '20px',
          height: `${Math.min(100, (height / 25) * 100)}%`,
          background: height < 7 ? '#ff6b6b' : height > 20 ? '#ffd93d' : '#6bcb77',
          borderRadius: '10px',
          transition: 'all 0.3s ease'
        }} />
        <div style={{
          position: 'absolute',
          top: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '10px'
        }}>高</div>
        <div style={{
          position: 'absolute',
          bottom: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '10px'
        }}>低</div>
      </div>
    </div>
  );
}

export default App;
