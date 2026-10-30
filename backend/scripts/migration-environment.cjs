// Migrate needs session affinity; application requests keep the pooled URL.
function migrationEnvironment(env) {
  let connection = env.DATABASE_URL_UNPOOLED || env.DIRECT_DATABASE_URL;
  if (!connection && env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    if (url.hostname.endsWith('.neon.tech') && url.hostname.includes('-pooler.')) {
      url.hostname = url.hostname.replace('-pooler.', '.');
      url.searchParams.delete('pgbouncer');
      connection = url.toString();
    }
  }
  return connection ? { ...env, DATABASE_URL: connection } : env;
}
module.exports = { migrationEnvironment };
