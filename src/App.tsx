import { Routes, Route } from 'react-router-dom';
import SoloApp                from './SoloApp';
import RoomGameHub            from './components/RoomGameHub';
import RoomScoreboardScreen   from './components/RoomScoreboardScreen';
import RoomFinalScreen        from './components/RoomFinalScreen';

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/"                               element={<SoloApp />} />
        <Route path="/room/:roomCode"                 element={<RoomGameHub />} />
        <Route path="/room/:roomCode/scoreboard"      element={<RoomScoreboardScreen />} />
        <Route path="/room/:roomCode/final"           element={<RoomFinalScreen />} />
        {/* Fallback */}
        <Route path="*"                               element={<SoloApp />} />
      </Routes>
    </div>
  );
}
