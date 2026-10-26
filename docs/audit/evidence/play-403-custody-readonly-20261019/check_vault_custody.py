exec(compile(open('/tmp/medveda-catalog-custody-readonly-20261019/check_supabase.py').read().split("run('function-current'")[0],'/tmp/custody-readonly-helpers','exec'))
def checked(n,sql):
 try:save(n,c.database(sql))
 except urllib.error.HTTPError as e:
  # Inspect only SQLSTATE/known diagnostic flags; never print backend text or its SQL.
  body=e.read()
  try:obj=json.loads(body)
  except Exception:obj={}
  msg=str(obj.get('message',''))
  save(n+'-error',{'http_status':e.code,'sqlstate':obj.get('code') if re.fullmatch(r'[A-Z0-9]{5}',str(obj.get('code',''))) else None,'undefined_function':'does not exist' in msg,'permission_denied':'permission denied' in msg,'ambiguous_reference':'ambiguous' in msg,'syntax_error':'syntax error' in msg})
checked('vault-reference-metadata',"""select name,count(*) as entry_count,bool_and(length(decrypted_secret)>=32) as all_at_least_32_chars from vault.decrypted_secrets where lower(name) like '%catalog%' group by name;""")
checked('vault-potential-reader-roles',"""select r.rolname,has_schema_privilege(r.oid,'vault','USAGE') as vault_schema_usage,has_table_privilege(r.oid,'vault.decrypted_secrets','SELECT') as decrypted_view_select,has_table_privilege(r.oid,'vault.secrets','SELECT') as encrypted_table_select from pg_roles r where r.rolname in ('anon','authenticated','service_role','postgres','supabase_admin','supabase_read_only_user','supabase_auth_admin') order by r.rolname;""")
checked('vault-shared-value-aliases',"""select name from vault.decrypted_secrets where name<>'PLAY_CATALOG_CRON_SECRET' and decrypted_secret in (select decrypted_secret from vault.decrypted_secrets where name='PLAY_CATALOG_CRON_SECRET');""")
try:
 secrets=c.management('/secrets');rows=[{'name':s['name'],'digest':s['value']} for s in secrets if isinstance(s.get('name'),str) and isinstance(s.get('value'),str) and re.fullmatch(r'[0-9a-fA-F]{64}',s['value'])]
 assert len(rows)==len(secrets)
 payload=json.dumps(rows).replace("'","''")
 sql="""with edge as (select * from jsonb_to_recordset('PAYLOAD'::jsonb) as x(name text,digest text)) select name from edge where lower(digest) in (select encode(sha256(convert_to(decrypted_secret,'UTF8')),'hex') from vault.decrypted_secrets where name='PLAY_CATALOG_CRON_SECRET');""".replace('PAYLOAD',payload)
 checked('matching-edge-secret-names',sql)
except Exception as e:save('matching-edge-secret-names-error',error(e))
