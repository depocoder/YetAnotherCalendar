import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import reportWebVitals from "./reportWebVitals";
import ReactDOM from "react-dom/client";

import LoginRoute from "./pages/LoginRoute";
import CalendarRoute from "./pages/CalendarRoute";

import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
const router = createBrowserRouter([
    //Todo: если не авторизаван тогда перекидывать на авторизацию
    {
     path: "/",
     element: <CalendarRoute />,
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
  </React.StrictMode>
);

reportWebVitals();
