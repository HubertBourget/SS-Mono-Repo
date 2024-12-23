import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://b26784c2e393379cbb1fc5968025098a@o4508498426200064.ingest.us.sentry.io/4508498434981888",
  integrations: [],
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

document.body.style.minHeight = '98vh';
document.body.style.backgroundColor = 'rgb(248, 248, 248)';
document.body.style.margin = "0px";