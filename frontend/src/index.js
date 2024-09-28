import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Routes,
  Route,
  Router,
} from "react-router-dom";
import reportWebVitals from "./reportWebVitals";
import LoginRoute from "./routes/LoginRoute";
import CalendarRoute from "./routes/CalendarRoute";

import Header from "./components/Header/Header";
import "./index.css";
import ModeusLoginForm from "./components/Login/ModeusLoginForm";

import Header from "./components/Header/Header";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <div className="wrapper">
        <Header />
      </div>
    ),
  },
  {
    path: "/login",
    element: <LoginRoute />,
  },
  {
    path: "/calendar",
    element: <CalendarRoute />,
  },
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

const App = () => {
  return (
    <dev>
      <Router>
        <Routes>
          <Route path="/" element={<LoginRoute />} />
        </Routes>
      </Router>
    </dev>
  );
};

reportWebVitals();
