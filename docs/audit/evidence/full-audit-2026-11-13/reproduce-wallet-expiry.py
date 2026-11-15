"""Run the actual wallet_balance_of definition against synthetic rows in disposable PG17."""
import pathlib, subprocess, tempfile, re, os
root=pathlib.Path(__file__).resolve().parents[4];out=pathlib.Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='medveda-wallet-audit-') as temp:
    work=pathlib.Path(temp);data=work/'data';sock=work/'socket';sock.mkdir()
    subprocess.run(['/usr/lib/postgresql/17/bin/initdb','-D',str(data),'-A','trust','--no-locale','-U','postgres'],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(['/usr/lib/postgresql/17/bin/pg_ctl','-D',str(data),'-l',str(work/'server.log'),'-o',f'-k {sock} -p 55449 -h ""','start'],check=True,stdout=subprocess.DEVNULL)
    try:
        text=(root/'supabase/migrations/20260925110000_phase2_wallet_ledger.sql').read_text()
        definition=re.search(r'create or replace function public.wallet_balance_of\(.*?\$\$;',text,re.S).group()
        sql="""begin;
create table wallet_ledger(user_id uuid,entry_type text,amount numeric,status text,expires_at timestamptz,available_at timestamptz,source text);
"""+definition+"""
insert into wallet_ledger values
('00000000-0000-0000-0000-000000000001','credit',100,'available',now()-interval '1 day',now()-interval '10 days','referral_reward'),
('00000000-0000-0000-0000-000000000001','debit',100,'available',null,null,'purchase'),
('00000000-0000-0000-0000-000000000001','credit',100,'available',now()+interval '1 day',now(),'referral_reward');
select jsonb_build_object('actual_available',available,'expected_available',100,'reproduced',available=0) from wallet_balance_of('00000000-0000-0000-0000-000000000001');
rollback;
"""
        env=os.environ.copy();env.update(PGHOST=str(sock),PGPORT='55449',PGUSER='postgres')
        result=subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d','postgres'],input=sql,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=env)
        (out/'wallet-expiry-repro.log').write_text(result.stdout+'\nEXIT_CODE='+str(result.returncode)+'\n')
        print(result.stdout);result.check_returncode()
    finally:subprocess.run(['/usr/lib/postgresql/17/bin/pg_ctl','-D',str(data),'-m','immediate','stop'],check=True,stdout=subprocess.DEVNULL)
