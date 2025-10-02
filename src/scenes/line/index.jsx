import { useState, useEffect, useMemo } from "react";
import { Box, Typography, Select, MenuItem, TextField, Alert, useTheme } from "@mui/material";
import Header from "../../components/Header";
import LineChart from "../../components/LineChart";
import { useLightState } from "../../hooks/useLightState";
import { tokens } from "../../theme";

const Line = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { lightStates, lightHistory } = useLightState();
  const [selectedLight, setSelectedLight] = useState(Object.keys(lightStates)[0] || "");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  // Tự động xóa thông báo lỗi sau 5 giây
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Lọc và xử lý dữ liệu lịch sử cho biểu đồ
  const chartData = useMemo(() => {
    if (!selectedLight || !lightStates[selectedLight]) return { labels: [], datasets: [] };

    const filteredHistory = lightHistory
      .filter((entry) => entry.lightId === selectedLight)
      .filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Bao gồm cả ngày kết thúc
        return entryDate >= start && entryDate <= end;
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = filteredHistory.map((entry) =>
      new Date(entry.timestamp).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );
    const data = filteredHistory.map((entry) => {
      if (entry.action.includes("brightness")) {
        return parseInt(entry.action.split(" ")[1]);
      } else if (entry.action === "on") {
        return lightStates[selectedLight]?.lamp_dim || 50; // Giá trị mặc định khi bật
      } else if (entry.action === "off") {
        return 0;
      }
      return lightStates[selectedLight]?.lamp_dim || 0; // Giá trị mặc định nếu không khớp
    });

    return {
      labels,
      datasets: [
        {
          label: `Độ sáng đèn ${selectedLight} (%)`,
          data,
          borderColor: colors.greenAccent[500],
          backgroundColor: colors.greenAccent[300],
          fill: false,
          tension: 0.1,
        },
      ],
    };
  }, [lightHistory, selectedLight, startDate, endDate, lightStates, colors]);

  // Cập nhật lỗi khi không có dữ liệu
  useEffect(() => {
    if (selectedLight && chartData.labels.length === 0) {
      setError("Không có dữ liệu lịch sử cho bóng đèn này trong khoảng thời gian đã chọn!");
    } else if (!selectedLight && Object.keys(lightStates).length > 0) {
      setError("Vui lòng chọn một bóng đèn để xem biểu đồ.");
    } else {
      setError("");
    }
  }, [chartData, selectedLight, lightStates]);

  return (
    <Box m="20px">
      <Header title="Biểu đồ Đường" subtitle="Lịch sử độ sáng của bóng đèn" />
      <Box mb="20px" display="flex" alignItems="center" gap="10px">
        <Select
          value={selectedLight}
          onChange={(e) => setSelectedLight(e.target.value)}
          displayEmpty
          sx={{ minWidth: "150px", color: colors.grey[100] }}
        >
          <MenuItem value="" disabled>
            Chọn bóng đèn
          </MenuItem>
          {Object.keys(lightStates).map((light) => (
            <MenuItem key={light} value={light}>
              Đèn {light}
            </MenuItem>
          ))}
        </Select>
        <TextField
          label="Từ ngày"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ input: { color: colors.grey[100] }, label: { color: colors.grey[300] } }}
        />
        <TextField
          label="Đến ngày"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ input: { color: colors.grey[100] }, label: { color: colors.grey[300] } }}
        />
      </Box>
      {error && <Alert severity="warning" sx={{ mb: "10px" }}>{error}</Alert>}
      {Object.keys(lightStates).length === 0 && (
        <Alert severity="info" sx={{ mb: "10px" }}>
          Hiện tại chưa có bóng đèn nào được thêm. Vui lòng thêm bóng đèn trong trang Điều khiển đèn.
        </Alert>
      )}
      <Box height="75vh" sx={{ position: "relative" }}>
        {selectedLight && chartData.labels.length > 0 ? (
          <LineChart chartData={chartData} />
        ) : (
          <Typography color={colors.grey[100]} sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
            {selectedLight ? "Không có dữ liệu để hiển thị." : "Vui lòng chọn một bóng đèn."}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Line;