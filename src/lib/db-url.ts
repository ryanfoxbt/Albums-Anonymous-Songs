// pg-connection-string derives its own `ssl` object from a `sslmode` query
// param and that overwrites whatever `ssl` option we pass alongside
// `connectionString`, so strip it here to let our explicit ssl config apply.
export function connectionStringWithoutSslMode(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}
