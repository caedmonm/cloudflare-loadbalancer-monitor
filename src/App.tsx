import { useMemo, useState } from "react";
import {
  Container,
  CssBaseline,
  createTheme,
  ThemeProvider,
} from "@mui/material";

import type { Credentials } from "./components/CredentialsForm";
import CredentialsForm from "./components/CredentialsForm";
import Dashboard from "./pages/Dashboard";

/* ================================
   Tiny cookie helpers
================================ */

const getCookie = (name: string): string | undefined => {
  const pair = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  return pair?.split("=")[1];
};

const setCookie = (name: string, value: string, days = 365): void => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/;`;
};

const delCookie = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`;
};

/* ================================
   UI
================================ */

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
  },
});

export default function App() {
  const [creds, setCreds] = useState<Credentials>(() => ({
    token: getCookie("cf_api_token") ?? "",
    accountId: getCookie("cf_account_id") ?? "",
  }));

  const haveCreds = useMemo<boolean>(
    () => Boolean(creds.token && creds.accountId),
    [creds]
  );

  const handleSave = ({ token, accountId }: Credentials): void => {
    setCookie("cf_api_token", token);
    setCookie("cf_account_id", accountId);
    setCreds({ token, accountId });
  };

  const handleLogout = (): void => {
    delCookie("cf_api_token");
    delCookie("cf_account_id");
    setCreds({ token: "", accountId: "" });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {haveCreds ? (
          <Dashboard
            token={creds.token}
            accountId={creds.accountId}
            onLogout={handleLogout}
          />
        ) : (
          <CredentialsForm
            onSave={handleSave}
            initialToken={creds.token}
            initialAccount={creds.accountId}
          />
        )}
      </Container>
    </ThemeProvider>
  );
}
