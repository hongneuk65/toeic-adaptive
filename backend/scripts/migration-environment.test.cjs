const {test}=require('node:test');const assert=require('node:assert/strict');
const {migrationEnvironment}=require('./migration-environment.cjs');
test('Neon migrations bypass pooler while preserving TLS, credentials and runtime environment',()=>{
 const env={DATABASE_URL:'postgresql://demo:secret@ep-demo-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true',OTHER:'kept'};
 const actual=migrationEnvironment(env);const url=new URL(actual.DATABASE_URL);
 assert.equal(url.hostname,'ep-demo.c-2.ap-southeast-1.aws.neon.tech');assert.equal(url.password,'secret');assert.equal(url.searchParams.get('sslmode'),'require');assert.equal(url.searchParams.has('pgbouncer'),false);assert.equal(actual.OTHER,'kept');assert.equal(env.DATABASE_URL.includes('-pooler.'),true);
});
test('explicit direct connection takes precedence without modifying application URL',()=>{
 const env={DATABASE_URL:'postgresql://pool/app',DATABASE_URL_UNPOOLED:'postgresql://direct/app',DIRECT_DATABASE_URL:'postgresql://other/app'};
 assert.equal(migrationEnvironment(env).DATABASE_URL,env.DATABASE_URL_UNPOOLED);assert.equal(env.DATABASE_URL,'postgresql://pool/app');
});
test('other hosts and direct Neon connections remain unchanged',()=>{
 for(const value of ['postgresql://demo:secret@localhost/app','postgresql://demo:secret@ep-demo.neon.tech/app','postgresql://demo:secret@ep-pooler.example.com/app']){const env={DATABASE_URL:value};assert.equal(migrationEnvironment(env),env);}
});
