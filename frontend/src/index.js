import React from "react";
import reportWebVitals from "./reportWebVitals";
import ReactDOM from "react-dom/client";


import "./index.scss";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);

reportWebVitals();
