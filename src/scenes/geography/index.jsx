import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Box,
  useTheme,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useLightState } from "../../hooks/useLightState";
import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import L from "leaflet";

// Sửa lỗi biểu tượng mặc định của Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Component để điều khiển bản đồ
const MapController = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds[0][0] !== bounds[1][0]) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

const Geography = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { lightStates, updateLightState } = useLightState();
  const mapRef = useRef(null);
  const [weatherData, setWeatherData] = useState({});
  const [error, setError] = useState("");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedLight, setSelectedLight] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "node_id", direction: "asc" });

  // Tạo biểu tượng tùy chỉnh cho marker
  const createCustomIcon = (lamp_state) => {
    return new L.Icon({
      iconUrl:
        lamp_state === "ON"
          ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png"
          : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      shadowSize: [41, 41],
    });
  };

  // Tính toán bounds cho bản đồ
  const bounds = useMemo(() => {
    const validLights = Object.entries(lightStates).filter(
      ([_, light]) => typeof light.lat === "number" && typeof light.lng === "number"
    );
    if (validLights.length === 0) {
      return [[10.7769, 106.7009], [10.7769, 106.7009]]; // Mặc định TP.HCM
    }
    const lats = validLights.map(([_, light]) => light.lat);
    const lngs = validLights.map(([_, light]) => light.lng);
    return [
      [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
      [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01],
    ];
  }, [lightStates]);

  // Lấy dữ liệu thời tiết
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const newWeatherData = {};
        const validLights = Object.entries(lightStates).filter(
          ([_, light]) => typeof light.lat === "number" && typeof light.lng === "number"
        );
        for (const [lightId, light] of validLights) {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${light.lat}&longitude=${light.lng}&daily=sunset,precipitation_probability_max&timezone=Asia/Bangkok`
          );
          if (!response.ok) throw new Error(`Lỗi HTTP ${response.status}`);
          const data = await response.json();
          newWeatherData[lightId] = {
            sunset: data.daily?.sunset?.[0],
            precipitationProb: data.daily?.precipitation_probability_max?.[0] || 0,
          };
        }
        setWeatherData(newWeatherData);
        setError("");
      } catch (e) {
        setError(`Không thể lấy dữ liệu thời tiết: ${e.message}. Vui lòng thử lại sau.`);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 3600000); // Cập nhật mỗi giờ
    return () => clearInterval(interval);
  }, [lightStates]);

  // Tự động xóa lỗi sau 5 giây
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Xử lý chỉnh sửa vị trí đèn
  const handleEditLight = useCallback(async () => {
    const latNum = parseFloat(selectedLight.lat);
    const lngNum = parseFloat(selectedLight.lng);

    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setError("Tọa độ không hợp lệ (lat: -90 đến 90, lng: -180 đến 180)!");
      return;
    }

    try {
      await updateLightState(selectedLight.node_id, {
        lat: latNum,
        lng: lngNum,
      });
      setOpenEditDialog(false);
      setSelectedLight(null);
      setError("");
    } catch (err) {
      const message =
        err.response?.status === 401
          ? "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại"
          : err.response?.status === 429
          ? "Quá nhiều yêu cầu, vui lòng thử lại sau vài phút"
          : err.response?.data?.message || "Không thể cập nhật vị trí đèn";
      setError(message);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    }
  }, [selectedLight, updateLightState]);

  // Xử lý nhấp chuột trên bản đồ để chọn tọa độ
  const handleMapClick = useCallback(
    (e) => {
      if (!openEditDialog) return;
      const lat = e.latlng.lat.toFixed(4);
      const lng = e.latlng.lng.toFixed(4);
      setSelectedLight((prev) => ({ ...prev, lat, lng }));
    },
    [openEditDialog]
  );

  // Xử lý sắp xếp bảng
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Sắp xếp danh sách đèn
  const sortedLights = useMemo(() => {
    const lightsArray = Object.entries(lightStates)
      .filter(([_, light]) => typeof light.lat === "number" && typeof light.lng === "number")
      .map(([lightId, light]) => ({ lightId, ...light }));
    return lightsArray.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [lightStates, sortConfig]);

  // Định tâm bản đồ vào một đèn
  const centerOnLight = (lat, lng) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
    }
  };

  return (
    <Box m="20px">
      {!isDashboard && (
        <Header title="Bản đồ đèn" subtitle="Hiển thị vị trí, trạng thái và thông tin thời tiết" />
      )}
      {error && (
        <Alert severity="error" sx={{ mb: "10px" }}>
          {error}
          <Button onClick={() => window.location.reload()} sx={{ ml: "10px" }}>
            Thử lại
          </Button>
        </Alert>
      )}
      <Box
        height={isDashboard ? "300px" : "75vh"}
        width="100%"
        position="relative"
      >
        <MapContainer
          bounds={bounds}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(map) => {
            mapRef.current = map;
            map.on("click", handleMapClick);
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController bounds={bounds} />
          {Object.entries(lightStates)
            .filter(([_, light]) => typeof light.lat === "number" && typeof light.lng === "number")
            .map(([lightId, light]) => (
              <Marker
                key={lightId}
                position={[light.lat, light.lng]}
                icon={createCustomIcon(light.lamp_state)}
              >
                <Popup>
                  <Typography>
                    <strong>Đèn:</strong> {lightId}
                  </Typography>
                  <Typography>
                    <strong>Trạng thái:</strong> {light.lamp_state === "ON" ? "Bật" : "Tắt"}
                  </Typography>
                  <Typography>
                    <strong>Độ sáng:</strong> {light.lamp_dim || 0}%
                  </Typography>
                  <Typography>
                    <strong>Vị trí:</strong> ({light.lat.toFixed(4)}, {light.lng.toFixed(4)})
                  </Typography>
                  <Typography>
                    <strong>Cảm biến dòng:</strong> {light.current_a || 0} mA
                  </Typography>
                  <Typography>
                    <strong>Cảm biến ánh sáng:</strong> {light.lux || 0} lux
                  </Typography>
                  {weatherData[lightId] && (
                    <>
                      <Typography>
                        <strong>Giờ hoàng hôn:</strong>{" "}
                        {new Date(weatherData[lightId].sunset).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </Typography>
                      <Typography>
                        <strong>Xác suất mưa:</strong> {weatherData[lightId].precipitationProb}%
                      </Typography>
                    </>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => {
                      setSelectedLight({ node_id: lightId, lat: light.lat, lng: light.lng });
                      setOpenEditDialog(true);
                    }}
                    sx={{ mt: "10px" }}
                  >
                    Sửa vị trí
                  </Button>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </Box>
      {!isDashboard && (
        <Box mt="20px">
          <Typography variant="h5" color={colors.grey[100]} mb="10px">
            Thông tin thời tiết và trạng thái đèn
          </Typography>
          {error ? (
            <Typography color={colors.redAccent[500]}>Không có dữ liệu thời tiết.</Typography>
          ) : (
            <TableContainer component={Paper} sx={{ backgroundColor: colors.primary[400] }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("node_id")}>
                      Đèn {sortConfig.key === "node_id" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("lat")}>
                      Vị trí (lat, lng) {sortConfig.key === "lat" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("lamp_state")}>
                      Trạng thái {sortConfig.key === "lamp_state" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("lamp_dim")}>
                      Độ sáng {sortConfig.key === "lamp_dim" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Cảm biến dòng</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Cảm biến ánh sáng</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Giờ hoàng hôn</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Xác suất mưa</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedLights.map(({ lightId, ...light }) => (
                    <TableRow key={lightId}>
                      <TableCell sx={{ color: colors.grey[100] }}>{lightId}</TableCell>
                      <TableCell sx={{ color: colors.grey[100] }}>
                        ({light.lat.toFixed(4)}, {light.lng.toFixed(4)})
                      </TableCell>
                      <TableCell sx={{ color: light.lamp_state === "ON" ? colors.greenAccent[500] : colors.redAccent[500] }}>
                        {light.lamp_state === "ON" ? "Bật" : "Tắt"}
                      </TableCell>
                      <TableCell sx={{ color: colors.grey[100] }}>{light.lamp_dim || 0}%</TableCell>
                      <TableCell sx={{ color: colors.grey[100] }}>{light.current_a || 0} mA</TableCell>
                      <TableCell sx={{ color: colors.grey[100] }}>{light.lux || 0} lux</TableCell>
                      <TableCell sx={{ color: colors.grey[100] }}>
                        {weatherData[lightId]?.sunset
                          ? new Date(weatherData[lightId].sunset).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : "N/A"}
                      </TableCell>
                      <TableCell sx={{ color: colors.grey[100] }}>
                        {weatherData[lightId]?.precipitationProb ?? "N/A"}%
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => centerOnLight(light.lat, light.lng)}
                        >
                          Xem trên bản đồ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle sx={{ color: colors.grey[100], backgroundColor: colors.primary[400] }}>
          Sửa vị trí bóng đèn
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: colors.primary[400] }}>
          {selectedLight && (
            <>
              <Typography sx={{ mb: "10px", color: colors.grey[100] }}>
                Đèn: {selectedLight.node_id}
              </Typography>
              <TextField
                label="Vĩ độ (-90 đến 90)"
                value={selectedLight.lat}
                onChange={(e) => setSelectedLight({ ...selectedLight, lat: e.target.value })}
                type="number"
                inputProps={{ step: 0.0001 }}
                fullWidth
                sx={{ mb: "10px", input: { color: colors.grey[100] }, label: { color: colors.grey[300] } }}
              />
              <TextField
                label="Kinh độ (-180 đến 180)"
                value={selectedLight.lng}
                onChange={(e) => setSelectedLight({ ...selectedLight, lng: e.target.value })}
                type="number"
                inputProps={{ step: 0.0001 }}
                fullWidth
                sx={{ mb: "10px", input: { color: colors.grey[100] }, label: { color: colors.grey[300] } }}
              />
              <Alert severity="info" sx={{ mt: "10px" }}>
                Nhấp vào bản đồ để chọn tọa độ mới hoặc nhập thủ công.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ backgroundColor: colors.primary[400], p: "10px" }}>
          <Button onClick={() => setOpenEditDialog(false)} color="secondary">
            Hủy
          </Button>
          <Button onClick={handleEditLight} color="success" disabled={!selectedLight?.lat || !selectedLight?.lng}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Geography;