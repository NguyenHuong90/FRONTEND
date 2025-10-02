import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Box, useTheme, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useLightState } from "../../hooks/useLightState";
import React, { useMemo, useRef, useEffect, useState } from "react";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const Geography = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { lightStates } = useLightState();
  const mapRef = useRef(null);
  const [weatherData, setWeatherData] = useState({});
  const [error, setError] = useState("");

  // Tính toán bounds để hiển thị tất cả các marker
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
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [lightStates]);

  // Điều chỉnh bản đồ để hiển thị tất cả marker
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds]);

  // Fetch dữ liệu thời tiết từ Open-Meteo
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const newWeatherData = {};
        for (const [lightId, light] of Object.entries(lightStates)) {
          if (typeof light.lat !== "number" || typeof light.lng !== "number") continue;
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${light.lat}&longitude=${light.lng}&daily=sunset,precipitation_probability_max&timezone=Asia/Bangkok`
          );
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const data = await response.json();
          newWeatherData[lightId] = {
            sunset: data.daily?.sunset?.[0],
            precipitationProb: data.daily?.precipitation_probability_max?.[0] || 0,
          };
        }
        setWeatherData(newWeatherData);
        setError("");
      } catch (e) {
        console.error("Error fetching weather:", e);
        setError("Không thể lấy dữ liệu thời tiết. Vui lòng thử lại sau.");
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 3600000); // Cập nhật mỗi giờ
    return () => clearInterval(interval);
  }, [lightStates]);

  return (
    <Box m="20px">
      {isDashboard ? null : <Header title="Bản đồ đèn" subtitle="Hiển thị vị trí, trạng thái và thông tin thời tiết" />}
      {isDashboard ? null : (
        <Box mt="10px" mb="20px">
          <Typography color={colors.grey[100]}>
            Tổng số bóng đèn: {Object.keys(lightStates).length}
          </Typography>
          {error && (
            <Typography color={colors.redAccent[500]} mt="10px">
              {error}
            </Typography>
          )}
        </Box>
      )}
      <Box
        height={isDashboard ? "100%" : "75vh"}
        width="100%"
        position="relative"
      >
        <MapContainer
          bounds={bounds}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(map) => { mapRef.current = map; }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {Object.entries(lightStates)
            .filter(([_, light]) => typeof light.lat === "number" && typeof light.lng === "number")
            .map(([lightId, light]) => (
              <Marker key={lightId} position={[light.lat, light.lng]}>
                <Popup>
                  <Typography>
                    <strong>Đèn:</strong> {lightId}
                  </Typography>
                  <Typography>
                    <strong>Trạng thái:</strong> {light.isOn ? "Bật" : "Tắt"}
                  </Typography>
                  <Typography>
                    <strong>Công suất:</strong> {light.power || 0}W
                  </Typography>
                  <Typography>
                    <strong>Độ sáng:</strong> {light.brightness || 100}%
                  </Typography>
                  <Typography>
                    <strong>Vị trí:</strong> ({light.lat.toFixed(4)}, {light.lng.toFixed(4)})
                  </Typography>
                  <Typography>
                    <strong>Cảm biến dòng:</strong> {light.currentSensor || 0} mA
                  </Typography>
                  <Typography>
                    <strong>Cảm biến ánh sáng:</strong> {light.lightSensor || 0} lux
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
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </Box>
      {isDashboard ? null : (
        <Box mt="20px">
          <Typography variant="h5" color={colors.grey[100]} mb="10px">
            Thông tin thời tiết
          </Typography>
          {error ? (
            <Typography color={colors.redAccent[500]}>Không có dữ liệu thời tiết.</Typography>
          ) : (
            <TableContainer component={Paper} sx={{ backgroundColor: colors.primary[400] }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Đèn</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Vị trí (lat, lng)</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Trạng thái</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Công suất</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Độ sáng</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Cảm biến dòng</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Cảm biến ánh sáng</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Giờ hoàng hôn</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Xác suất mưa</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(lightStates)
                    .filter(([_, light]) => typeof light.lat === "number" && typeof light.lng === "number")
                    .map(([lightId, light]) => (
                      <TableRow key={lightId}>
                        <TableCell sx={{ color: colors.grey[100] }}>{lightId}</TableCell>
                        <TableCell sx={{ color: colors.grey[100] }}>
                          ({light.lat.toFixed(4)}, {light.lng.toFixed(4)})
                        </TableCell>
                        <TableCell sx={{ color: light.isOn ? colors.greenAccent[500] : colors.redAccent[500] }}>
                          {light.isOn ? "Bật" : "Tắt"}
                        </TableCell>
                        <TableCell sx={{ color: colors.grey[100] }}>{light.power || 0}W</TableCell>
                        <TableCell sx={{ color: colors.grey[100] }}>{light.brightness || 100}%</TableCell>
                        <TableCell sx={{ color: colors.grey[100] }}>{light.currentSensor || 0} mA</TableCell>
                        <TableCell sx={{ color: colors.grey[100] }}>{light.lightSensor || 0} lux</TableCell>
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
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Geography;