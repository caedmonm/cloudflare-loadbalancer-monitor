import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Link,
  FormControl,
  InputLabel,
  OutlinedInput,
  FormHelperText,
  Button,
} from "@mui/material";

export interface Credentials {
  token: string;
  accountId: string;
}

export interface CredentialsFormProps {
  onSave: (creds: Credentials) => void;
  initialToken?: string;
  initialAccount?: string;
}

const CredentialsForm = ({
  onSave,
  initialToken = "",
  initialAccount = "",
}: CredentialsFormProps) => {
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
            <Stack gap={2}>
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
                <FormHelperText>Stored locally as a cookie.</FormHelperText>
              </FormControl>
              {err && <Typography color="error">{err}</Typography>}
              <Button variant="contained" type="submit">
                Save & Continue
              </Button>
            </Stack>
          </form>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default CredentialsForm;
