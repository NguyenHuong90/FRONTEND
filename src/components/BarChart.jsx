import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Đăng ký các thành phần cần thiết cho Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BarChart = ({ isDashboard = false, dataType, lightStates }) => {
  const chartRef = useRef(null);

  console.log('BarChart received lightStates:', lightStates, 'dataType:', dataType);

  // Tạo dữ liệu cho biểu đồ
  const getChartData = () => {
    // Kiểm tra nếu lightStates là undefined hoặc null
    if (!lightStates || Object.keys(lightStates).length === 0) {
      console.warn('lightStates is empty or undefined, returning empty chart data');
      return {
        labels: [],
        datasets: [
          {
            label: dataType === "isOn" ? "Trạng thái (Bật/Tắt)" : dataType === "brightness" ? "Độ sáng (%)" : "Công suất (A)",
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 1,
          },
        ],
      };
    }

    const labels = Object.keys(lightStates).map((nodeId) => `Đèn ${nodeId}`);
    let data = [];

    if (dataType === "isOn") {
      data = Object.values(lightStates).map((state) => (state.lamp_state === "ON" ? 1 : 0));
    } else if (dataType === "brightness") {
      data = Object.values(lightStates).map((state) => (state.lamp_state === "ON" ? state.lamp_dim || 0 : 0));
    } else if (dataType === "power") {
      data = Object.values(lightStates).map((state) => state.current_a || 0);
    }

    return {
      labels,
      datasets: [
        {
          label: dataType === "isOn" ? "Trạng thái (Bật/Tắt)" : dataType === "brightness" ? "Độ sáng (%)" : "Công suất (A)",
          data,
          backgroundColor: dataType === "isOn" 
            ? data.map((value) => (value === 1 ? "#00C49F" : "#FF5555")) // Xanh cho ON, đỏ cho OFF
            : dataType === "brightness" ? "#00C49F" : "#FFBB28", // Xanh cho độ sáng, vàng cho công suất
          borderColor: dataType === "isOn" 
            ? data.map((value) => (value === 1 ? "#008573" : "#CC0000"))
            : dataType === "brightness" ? "#008573" : "#CC8E12",
          borderWidth: 1,
        },
      ],
    };
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#ffffff",
        },
      },
      title: {
        display: true,
        text: dataType === "isOn" ? "Trạng thái bật/tắt của bóng đèn" : dataType === "brightness" ? "Độ sáng của bóng đèn" : "Công suất của bóng đèn",
        color: "#ffffff",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            if (dataType === "isOn") {
              return context.raw === 1 ? "Bật" : "Tắt";
            }
            return `${context.raw}${dataType === "brightness" ? "%" : " A"}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#ffffff",
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        max: dataType === "isOn" ? 1 : dataType === "brightness" ? 100 : undefined,
        ticks: {
          color: "#ffffff",
          stepSize: dataType === "isOn" ? 1 : undefined, // Chỉ hiển thị 0 và 1 cho trạng thái
          callback: function (value) {
            if (dataType === "isOn") {
              return value === 1 ? "Bật" : "Tắt";
            }
            return value + (dataType === "brightness" ? "%" : " A");
          },
        },
        grid: {
          color: "#444444",
        },
      },
    },
  };

  return (
    <Box sx={{ height: isDashboard ? "400px" : "100%", width: "100%" }}>
      <Bar ref={chartRef} data={getChartData()} options={options} />
    </Box>
  );
};

export default BarChart;