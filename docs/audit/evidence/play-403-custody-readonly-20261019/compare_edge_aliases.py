exec(compile(open('/tmp/medveda-catalog-custody-readonly-20261019/check_supabase.py').read().split("run('function-current'")[0],'/tmp/custody-readonly-helpers','exec'))
try:
 secrets=c.management('/secrets');catalog=[s for s in secrets if s.get('name')=='PLAY_CATALOG_CRON_SECRET']
 assert len(catalog)==1 and isinstance(catalog[0].get('value'),str) and re.fullmatch(r'[0-9a-fA-F]{64}',catalog[0]['value'])
 same=[s['name'] for s in secrets if s.get('name')!='PLAY_CATALOG_CRON_SECRET' and isinstance(s.get('value'),str) and s['value'].lower()==catalog[0]['value'].lower()]
 save('edge-value-alias-check',{'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'catalog_secret_exists':True,'other_edge_secret_names_with_identical_digest':same,'secret_values_and_digests_omitted':True,'vault_read_not_attempted':True})
except Exception as e:save('edge-value-alias-check-error',error(e))
