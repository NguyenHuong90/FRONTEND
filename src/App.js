import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import Dashboard from "./scenes/dashboard";
import Team from "./scenes/team";
import Bar from "./scenes/bar";
import Form from "./scenes/form";
import Line from "./scenes/line";
import Pie from "./scenes/pie";
import Geography from "./scenes/geography";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Calendar from "./scenes/calendar/calendar";
import Login from "./scenes/login/Login";
import LightControl from "./scenes/lightcontrol/LightControl";
import ProtectedRoute from "./components/ProtectedRoute";
import { LightStateProvider } from "./hooks/useLightState";
import History from "./scenes/history/History";

function App() {
  const [theme, colorMode] = useMode();

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LightStateProvider>
          <div style={{ display: "flex" }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <Dashboard />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <Team />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/form"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <Form />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bar"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <Bar />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pie"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <Pie />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/line"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <Line />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <Calendar />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/geography"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <Geography />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/light-control"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <LightControl />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <div className="app">
                      <Sidebar />
                      <main className="content">
                        <Topbar />
                        <History />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </LightStateProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;