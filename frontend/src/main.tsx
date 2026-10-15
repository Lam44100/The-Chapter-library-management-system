import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LibraryProvider } from "./context";
import App from "./App";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LibraryProvider>
        <App />
      </LibraryProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
