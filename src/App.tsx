import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  Link,
  OutlinedInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";

import {
  getAudioCtx,
  playOnlineSound,
  playOfflineSound,
} from "./helpers/audio";

/* ================================
   Types
================================ */

type CFOrigin = {
  name?: string;
  address?: string;
  enabled?: boolean;
  healthy?: boolean;
};

type CFPool = {
  id: string;
  name: string;
  description?: string;
  origins: CFOrigin[];
  healthy?: boolean;
};

type CFResultInfo = {
  total_pages?: number;
};

type CFListResponse<T> = {
  success: boolean;
  result: T[];
  result_info?: CFResultInfo;
  errors?: unknown;
};

type FetchAllPoolsArgs = {
  token: string;
  accountId: string;
  signal?: AbortSignal;
};

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
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
};

const delCookie = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`;
};

/* ================================
   API
================================ */

const CF_BASE = import.meta.env.DEV
  ? "/cf"
  : "https://api.cloudflare.com/client/v4";

/** Fetch ALL pools (handles pagination). */
async function fetchAllPools({
  token,
  accountId,
  signal,
}: FetchAllPoolsArgs): Promise<CFPool[]> {
  const perPage = 50;
  let page = 1;
  const all: CFPool[] = [];

  while (true) {
    const res = await fetch(
      `${CF_BASE}/accounts/${accountId}/load_balancers/pools`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal,
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Cloudflare API error (${res.status}): ${text || res.statusText}`
      );
    }

    const data = (await res.json()) as CFListResponse<CFPool>;
    if (!data?.success) {
      throw new Error(
        `Cloudflare API returned success=false: ${JSON.stringify(
          data?.errors || data
        )}`
      );
    }

    const items = data.result ?? [];
    all.push(...items);

    const info = data.result_info ?? {};
    const totalPages =
      info.total_pages ?? (items.length < perPage ? page : page + 1);
    if (page >= totalPages) break;
    page += 1;
  }

  return all;
}

/* ================================
   UI
================================ */

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
  },
});

type Credentials = { token: string; accountId: string };

type CredentialsFormProps = {
  onSave: (creds: Credentials) => void;
  initialToken?: string;
  initialAccount?: string;
};

function CredentialsForm({
  onSave,
  initialToken = "",
  initialAccount = "",
}: CredentialsFormProps) {
  const [token, setToken] = useState<string>(initialToken);
  const [accountId, setAccountId] = useState<string>(initialAccount);
  const [err, setErr] = useState<string>("");

  const onChangeToken = (e: ChangeEvent<HTMLInputElement>) =>
    setToken(e.target.value);
  const onChangeAccount = (e: ChangeEvent<HTMLInputElement>) =>
    setAccountId(e.target.value);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    if (!token.trim() || !accountId.trim()) {
      setErr("Both fields are required");
      return;
    }
    if (accountId.length < 10) {
      setErr("Account ID looks too short.");
      return;
    }

    onSave({ token: token.trim(), accountId: accountId.trim() });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5">Enter Cloudflare credentials</Typography>
          <Typography variant="body2" color="text.secondary">
            Paste an <strong>API Token</strong> with at least{" "}
            <em>Load Balancing: Monitors and Pools Read</em> permission, and
            your <strong>Account ID</strong>.{" "}
            <Link
              href="https://developers.cloudflare.com/fundamentals/api/get-started/create-token/"
              target="_blank"
              rel="noreferrer"
            >
              Docs
            </Link>
            .
          </Typography>

          <form onSubmit={submit}>
            <Grid container spacing={2}>
              <Grid>
                <FormControl fullWidth>
                  <InputLabel htmlFor="cf-token">API Token</InputLabel>
                  <OutlinedInput
                    id="cf-token"
                    type="password"
                    value={token}
                    onChange={onChangeToken}
                    label="API Token"
                    placeholder="cf-... (Bearer token)"
                    autoComplete="off"
                  />
                  <FormHelperText>
                    Stored locally as a cookie (SameSite=Lax).
                  </FormHelperText>
                </FormControl>
              </Grid>
              <Grid>
                <FormControl fullWidth>
                  <InputLabel htmlFor="cf-account">Account ID</InputLabel>
                  <OutlinedInput
                    id="cf-account"
                    value={accountId}
                    onChange={onChangeAccount}
                    label="Account ID"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    autoComplete="off"
                  />
                </FormControl>
              </Grid>
              {err && (
                <Grid>
                  <Typography color="error">{err}</Typography>
                </Grid>
              )}
              <Grid>
                <Button variant="contained" type="submit">
                  Save & Continue
                </Button>
              </Grid>
            </Grid>
          </form>
        </Stack>
      </CardContent>
    </Card>
  );
}

type StatusChipProps = { value?: boolean };

function StatusChip({ value }: StatusChipProps) {
  if (value === true) return <Chip label="Online" color="success" />;
  if (value === false) return <Chip label="Offline" color="error" />;
  return <Chip label="Unknown" variant="outlined" />;
}

type PoolsTableProps = { pools: CFPool[] };

function PoolsTable({ pools }: PoolsTableProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Load Balancer Pools
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="25%">Pool</TableCell>
              <TableCell>Pool Health</TableCell>
              <TableCell>Origins (server → status)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pools.map((p) => {
              const poolHealthy = p.healthy ?? undefined;
              const origins = Array.isArray(p.origins) ? p.origins : [];

              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1">{p.name}</Typography>
                      {p.description && (
                        <Typography variant="body2" color="text.secondary">
                          {p.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {p.id}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <StatusChip value={poolHealthy} />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      {origins.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No origins defined
                        </Typography>
                      )}
                      {origins.map((o, i) => (
                        <Stack
                          key={`${o.name || o.address || i}-${i}`}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <Typography sx={{ minWidth: 220 }}>
                            {(o.name || o.address || "origin") +
                              (o.address ? ` (${o.address})` : "")}
                          </Typography>
                          <StatusChip value={o.healthy} />
                          {o.enabled === false && (
                            <Chip
                              label="disabled"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      ))}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type DashboardProps = {
  token: string;
  accountId: string;
  onLogout: () => void;
};

// abort helper
const isAbortError = (e: unknown): boolean =>
  (e instanceof DOMException && e.name === "AbortError") ||
  (!!e &&
    typeof e === "object" &&
    "name" in e &&
    typeof (e as { name?: unknown }).name === "string" &&
    (e as { name?: unknown }).name === "AbortError");

function Dashboard({ token, accountId, onLogout }: DashboardProps) {
  const [pools, setPools] = useState<CFPool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Track previous per-origin health across polls
  const prevStatusRef = useRef<Map<string, boolean | undefined>>(new Map());
  const firstLoadRef = useRef<boolean>(true);

  useEffect(() => {
    let alive = true;
    let intervalId: number | null = null;
    const ctrl = new AbortController();

    const load = async () => {
      try {
        const items = await fetchAllPools({
          token,
          accountId,
          signal: ctrl.signal,
        });
        if (!alive) return;

        // ---- Diff origin statuses and collect transitions ----
        const changes: Array<"online" | "offline"> = [];
        const nextMap = new Map<string, boolean | undefined>();

        items.forEach((p) => {
          const origins = Array.isArray(p.origins) ? p.origins : [];
          origins.forEach((o, idx) => {
            const key = `${p.id}/${o.name || o.address || String(idx)}`;
            const cur = o.healthy; // boolean | undefined
            const prev = prevStatusRef.current.get(key);
            nextMap.set(key, cur);

            if (
              !firstLoadRef.current &&
              prev !== cur &&
              typeof cur === "boolean"
            ) {
              changes.push(cur ? "online" : "offline");
            }
          });
        });

        // swap snapshots
        prevStatusRef.current = nextMap;
        if (firstLoadRef.current) firstLoadRef.current = false;

        // play sounds (offline first so it stands out)
        if (soundEnabled && changes.length) {
          try {
            await getAudioCtx().resume();
          } catch (e) {
            console.error("Error resuming audio context:", e);
          }
          const offs = changes.filter((c) => c === "offline").length;
          const ons = changes.filter((c) => c === "online").length;
          for (let i = 0; i < offs; i++) await playOfflineSound();
          for (let i = 0; i < ons; i++) await playOnlineSound();
        }

        setPools(items);
      } catch (e) {
        if (!alive || isAbortError(e)) return;
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };

    setLoading(true);
    setErr("");
    firstLoadRef.current = true;
    prevStatusRef.current.clear();
    load(); // initial

    // poll every 10 seconds
    intervalId = window.setInterval(load, 10000);

    return () => {
      alive = false;
      ctrl.abort();
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [token, accountId, soundEnabled]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Cloudflare LB Dashboard</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Account: {accountId}
          </Typography>
          <Button
            size="small"
            variant={soundEnabled ? "contained" : "outlined"}
            onClick={async () => {
              setSoundEnabled((v) => !v);
              try {
                await getAudioCtx().resume(); // warm up on first click
              } catch (e) {
                console.error("Error resuming audio context:", e);
              }
            }}
          >
            {soundEnabled ? "Sound: On" : "Sound: Off"}
          </Button>
          <IconButton aria-label="logout" onClick={onLogout}>
            <LogoutIcon />
          </IconButton>
        </Stack>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {!loading && err && (
        <Card variant="outlined">
          <CardContent>
            <Typography color="error" gutterBottom>
              {err}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Ensure the token has “Load Balancing: Monitors and Pools Read”
              permissions.
              <br />
              • Double-check the Account ID.
              <br />• If this is running in a browser, you may need a dev proxy
              to avoid CORS.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !err && <PoolsTable pools={pools} />}

      <Typography variant="caption" color="text.secondary">
        Data source: Cloudflare API v4 — List Pools
      </Typography>
    </Stack>
  );
}

/* ================================
   App
================================ */

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
