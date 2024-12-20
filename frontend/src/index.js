import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://b26784c2e393379cbb1fc5968025098a@o4508498426200064.ingest.us.sentry.io/4508498434981888",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
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