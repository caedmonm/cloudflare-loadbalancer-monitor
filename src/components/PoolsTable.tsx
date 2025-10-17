import {
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Chip,
} from "@mui/material";

// Import interfaces and components from App.tsx
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

interface PoolsTableProps {
  pools: CFPool[];
}

interface StatusChipProps {
  value?: boolean;
}

function StatusChip({ value }: StatusChipProps) {
  if (value === true) return <Chip label="Online" color="success" />;
  if (value === false) return <Chip label="Offline" color="error" />;
  return <Chip label="Unknown" variant="outlined" />;
}

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

export default PoolsTable;
