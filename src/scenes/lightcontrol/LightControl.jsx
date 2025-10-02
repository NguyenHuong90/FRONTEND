import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom'; // Thêm import này để detect route change
import { Box, Typography, useTheme, Button, TextField, Alert, Slider } from '@mui/material';
import { tokens } from '../../theme';
import { useLightState } from '../../hooks/useLightState';
import Header from '../../components/Header';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import axios from 'axios';

const LightControl = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const location = useLocation(); // Thêm để detect route change
  const { lightStates, setLightStates, syncLightStatesWithSchedule, fetchLightStates, updateLightState } = useLightState();
  const [localBrightness, setLocalBrightness] = useState({});
  const [newGwId, setNewGwId] = useState('gw-01');
  const [newNodeId, setNewNodeId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Fetching light states and syncing schedules on LightControl mount or route change');
    fetchLightStates();
    syncLightStatesWithSchedule(new Date()); // Đồng bộ ngay khi mount hoặc route change
  }, [location, fetchLightStates, syncLightStatesWithSchedule]); // Thêm location để gọi sync khi route change

  // Tự động xóa thông báo lỗi sau 5 giây
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleToggleLight = useCallback(async (nodeId) => {
    console.log('Toggling light:', nodeId, 'Current state:', lightStates[nodeId]?.lamp_state);
    const now = new Date();
    const newState = lightStates[nodeId]?.lamp_state === 'ON' ? 'OFF' : 'ON';
    try {
      await updateLightState(nodeId, { lamp_state: newState });
      if (newState === 'OFF') {
        setLocalBrightness((prev) => ({ ...prev, [nodeId]: 0 }));
      }
      await syncLightStatesWithSchedule(now);
      setError('');
      console.log('Light toggled successfully:', nodeId, 'New state:', newState);
    } catch (err) {
      const message = err.response?.status === 401
        ? 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'
        : err.response?.status === 429
        ? 'Quá nhiều yêu cầu, vui lòng thử lại sau vài phút'
        : err.response?.data?.message || 'Không thể bật/tắt đèn';
      setError(message);
      console.error('Error toggling light:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    }
  }, [lightStates, updateLightState, syncLightStatesWithSchedule]);

  const handleBrightnessChange = useCallback((nodeId, newValue) => {
    console.log('Brightness changing:', nodeId, 'New value:', newValue);
    setLocalBrightness((prev) => ({ ...prev, [nodeId]: newValue }));
  }, []);

  const handleBrightnessChangeCommitted = useCallback(async (nodeId, newValue) => {
    console.log('Brightness committed:', nodeId, 'New value:', newValue);
    const now = new Date();
    try {
      await updateLightState(nodeId, { lamp_dim: newValue });
      await syncLightStatesWithSchedule(now);
      setError('');
      console.log('Brightness updated successfully:', nodeId, newValue);
    } catch (err) {
      const message = err.response?.status === 401
        ? 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'
        : err.response?.status === 429
        ? 'Quá nhiều yêu cầu, vui lòng thử lại sau vài phút'
        : err.response?.data?.message || 'Không thể cập nhật độ sáng';
      setError(message);
      console.error('Error updating brightness:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    }
  }, [updateLightState, syncLightStatesWithSchedule]);

  const handleAddLight = useCallback(async () => {
    if (!newNodeId.trim()) {
      setError('Vui lòng nhập ID bóng đèn (số nguyên, ví dụ: 2)!');
      return;
    }
    if (!newGwId.trim()) {
      setError('Vui lòng nhập ID cổng kết nối!');
      return;
    }
    const nodeIdNum = parseInt(newNodeId);
    if (isNaN(nodeIdNum) || nodeIdNum < 1) {
      setError('ID bóng đèn phải là số nguyên dương!');
      return;
    }
    if (lightStates[nodeIdNum]) {
      setError(`Bóng đèn với ID ${nodeIdNum} đã tồn tại!`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/lamp/control',
        {
          gw_id: newGwId,
          node_id: nodeIdNum.toString(),
          lamp_state: 'OFF',
          lamp_dim: 50,
          lux: 0,
          current_a: 0,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const now = new Date();
      setLightStates((prev) => {
        const newState = {
          ...prev,
          [nodeIdNum]: {
            gw_id: newGwId,
            node_id: nodeIdNum.toString(),
            lamp_state: 'OFF',
            lamp_dim: 50,
            lux: 0,
            current_a: 0,
            manualOverride: false,
            lastManualAction: null,
          },
        };
        return JSON.stringify(newState) !== JSON.stringify(prev) ? newState : prev;
      });
      setNewNodeId('');
      setNewGwId('gw-01');
      setError('');
      console.log('Light added successfully:', nodeIdNum);
      await syncLightStatesWithSchedule(now);
    } catch (err) {
      const message = err.response?.status === 401
        ? 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'
        : err.response?.status === 429
        ? 'Quá nhiều yêu cầu, vui lòng thử lại sau vài phút'
        : err.response?.data?.message || 'Không thể thêm bóng đèn';
      setError(message);
      console.error('Error adding light:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    }
  }, [newNodeId, newGwId, lightStates, syncLightStatesWithSchedule]);

  const handleDeleteLight = useCallback(async (nodeId) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bóng đèn ${nodeId}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/lamp/delete`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { gw_id: lightStates[nodeId].gw_id, node_id: nodeId },
      });
      const now = new Date();
      setLightStates((prev) => {
        const newStates = { ...prev };
        delete newStates[nodeId];
        return JSON.stringify(newStates) !== JSON.stringify(prev) ? newStates : prev;
      });
      setLocalBrightness((prev) => {
        const newBrightness = { ...prev };
        delete newBrightness[nodeId];
        return JSON.stringify(newBrightness) !== JSON.stringify(prev) ? newBrightness : prev;
      });
      await syncLightStatesWithSchedule(now);
      fetchLightStates();
      setError('');
      console.log('Light deleted successfully:', nodeId);
    } catch (err) {
      const message = err.response?.status === 401
        ? 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'
        : err.response?.status === 429
        ? 'Quá nhiều yêu cầu, vui lòng thử lại sau vài phút'
        : err.response?.data?.message || 'Không thể xóa bóng đèn';
      setError(message);
      console.error('Error deleting light:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    }
  }, [lightStates, fetchLightStates, syncLightStatesWithSchedule]);

  return (
    <Box m="20px">
      <Header title="Điều khiển đèn" subtitle="Bật/tắt, điều chỉnh độ sáng và quản lý bóng đèn" />
      <Box mb="20px">
        <Box display="flex" alignItems="center" gap="10px">
          <TextField
            label="ID cổng kết nối (gw_id)"
            value={newGwId}
            onChange={(e) => setNewGwId(e.target.value)}
            sx={{ input: { color: colors.grey[100] }, label: { color: colors.grey[300] } }}
          />
          <TextField
            label="ID bóng đèn (số, ví dụ: 2)"
            value={newNodeId}
            onChange={(e) => setNewNodeId(e.target.value)}
            type="number"
            inputProps={{ min: 1 }}
            sx={{ input: { color: colors.grey[100] }, label: { color: colors.grey[300] } }}
          />
          <Button variant="contained" color="success" onClick={handleAddLight}>
            Thêm bóng đèn
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: '10px' }}>{error}</Alert>}
      </Box>
      {Object.keys(lightStates).length === 0 && (
        <Alert severity="info" sx={{ mt: '10px' }}>
          Hiện tại chưa có bóng đèn nào được thêm.
        </Alert>
      )}
      <Box
        display="flex"
        flexDirection="column"
        gap="10px"
        sx={{ maxHeight: '70vh', overflowY: 'auto', padding: '10px', backgroundColor: colors.primary[400], borderRadius: '8px' }}
      >
        {Object.keys(lightStates).map((nodeId) => (
          <Box
            key={nodeId}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px',
              backgroundColor: colors.grey[900],
              borderRadius: '12px',
            }}
          >
            <Box display="flex" alignItems="center" gap="10px">
              {lightStates[nodeId]?.lamp_state === 'ON' ? (
                <LightbulbIcon sx={{ color: colors.greenAccent[500], fontSize: '24px' }} />
              ) : (
                <LightbulbOutlinedIcon sx={{ color: colors.grey[500], fontSize: '24px' }} />
              )}
              <Box>
                <Typography color={colors.grey[100]} variant="h6">
                  Đèn {nodeId}
                </Typography>
                <Typography color={lightStates[nodeId]?.lamp_state === 'ON' ? colors.greenAccent[500] : colors.redAccent[500]} variant="body2">
                  {lightStates[nodeId]?.lamp_state === 'ON' ? 'Bật' : 'Tắt'}
                </Typography>
                <Typography variant="body2" color={colors.grey[300]}>
                  Cổng kết nối: {lightStates[nodeId]?.gw_id || 'N/A'}
                </Typography>
                <Typography variant="body2" color={colors.grey[300]}>
                  Cảm biến ánh sáng: {lightStates[nodeId]?.lux || 0} lux
                </Typography>
                <Typography variant="body2" color={colors.grey[300]}>
                  Dòng điện: {lightStates[nodeId]?.current_a || 0} A
                </Typography>
              </Box>
            </Box>
            <Box sx={{ width: '150px', ml: '20px' }}>
              <Slider
                value={lightStates[nodeId]?.lamp_state === 'ON' ? (localBrightness[nodeId] ?? lightStates[nodeId]?.lamp_dim) : 0}
                onChange={(e, newValue) => handleBrightnessChange(nodeId, newValue)}
                onChangeCommitted={(e, newValue) => handleBrightnessChangeCommitted(nodeId, newValue)}
                min={0}
                max={100}
                step={1}
                valueLabelDisplay="auto"
                disabled={lightStates[nodeId]?.lamp_state !== 'ON'}
                sx={{
                  color: colors.greenAccent[500],
                  '& .MuiSlider-thumb': { backgroundColor: colors.greenAccent[500] },
                  '& .MuiSlider-track': { backgroundColor: colors.greenAccent[500] },
                  '& .MuiSlider-rail': { backgroundColor: colors.grey[700] },
                  '& .MuiSlider-thumb.Mui-disabled': { backgroundColor: colors.grey[600] },
                  '& .MuiSlider-track.Mui-disabled': { backgroundColor: colors.grey[700] },
                }}
              />
              <Typography color={colors.grey[100]} variant="body2" textAlign="center">
                Độ sáng: {lightStates[nodeId]?.lamp_state === 'ON' ? (localBrightness[nodeId] ?? lightStates[nodeId]?.lamp_dim) : 0}%
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: lightStates[nodeId]?.lamp_state === 'ON' ? colors.redAccent[500] : colors.greenAccent[500],
                  '&:hover': { backgroundColor: lightStates[nodeId]?.lamp_state === 'ON' ? colors.redAccent[600] : colors.greenAccent[600] },
                }}
                onClick={() => handleToggleLight(nodeId)}
              >
                {lightStates[nodeId]?.lamp_state === 'ON' ? 'Tắt' : 'Bật'}
              </Button>
              <Button
                variant="contained"
                color="error"
                sx={{ ml: '10px' }}
                onClick={() => handleDeleteLight(nodeId)}
              >
                Xóa
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default LightControl;