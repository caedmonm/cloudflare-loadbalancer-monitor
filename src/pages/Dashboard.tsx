import { useState, useEffect, useRef } from "react";
import {
  Stack,
  Typography,
  Button,
  IconButton,
  Box,
  CircularProgress,
  Card,
  CardContent,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  getAudioCtx,
  playOnlineSound,
  playOfflineSound,
} from "../helpers/audio";
import PoolsTable from "../components/PoolsTable";

// Interfaces
interface CFOrigin {
  name?: string;
  address?: string;
  enabled?: boolean;
  healthy?: boolean;
}

interface CFPool {
  id: string;
  name: string;
  description?: string;
  origins: CFOrigin[];
  healthy?: boolean;
}

interface CFResultInfo {
  total_pages?: number;
}

interface CFListResponse<T> {
  success: boolean;
  result: T[];
  result_info?: CFResultInfo;
  errors?: unknown;
}

interface FetchAllPoolsArgs {
  token: string;
  accountId: string;
  signal?: AbortSignal;
}

interface DashboardProps {
  token: string;
  accountId: string;
  onLogout: () => void;
}

// Constants and helpers
const CF_BASE = import.meta.env.DEV
  ? "/cf"
  : "https://api.cloudflare.com/client/v4";

const isAbortError = (e: unknown): boolean =>
  (e instanceof DOMException && e.name === "AbortError") ||
  (!!e &&
    typeof e === "object" &&
    "name" in e &&
    (e as { name: string }).name === "AbortError");

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
    const url = `${CF_BASE}/accounts/${accountId}/load_balancers/pools?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data: CFListResponse<CFPool> = await res.json();
    if (!data.success) {
      throw new Error(`API error: ${JSON.stringify(data.errors || {})}`);
    }

    all.push(...data.result);

    const totalPages = data.result_info?.total_pages || 1;
    if (page >= totalPages) break;
    page++;
  }

  return all;
}

const Dashboard = ({ token, accountId, onLogout }: DashboardProps) => {
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
    </Stack>
  );
};

export default Dashboard;
