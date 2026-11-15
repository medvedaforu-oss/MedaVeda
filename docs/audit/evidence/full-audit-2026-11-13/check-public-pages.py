"""GET public pages only; retain status/security metadata, not credentials or bodies."""
import concurrent.futures, json, pathlib, urllib.request, re
out=pathlib.Path(__file__).resolve().parent
urls=[origin+path for origin in ['https://www.medveda.in','https://medveda-website.vercel.app'] for path in ['/','/reset-password','/reset-password.html','/account-verified','/privacy-policy','/delete-account']]
def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'MedVeda-readonly-audit/1.0'}),timeout=20) as r:
            body=r.read(300000).decode(errors='replace')
            return dict(url=url,final_url=r.url,status=r.status,headers={k:r.headers.get(k) for k in ['Content-Security-Policy','Strict-Transport-Security','X-Frame-Options','X-Content-Type-Options','Referrer-Policy','Cache-Control']},title=re.findall(r'<title>(.*?)</title>',body,re.S)[:1],legacy_scheme='ayurpulse://' in body,modern_scheme='medveda://' in body,contains_legacy_error_html='errorDescription.replace' in body)
    except Exception as e:return dict(url=url,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:results=list(ex.map(get,urls))
(out/'public-pages.json').write_text(json.dumps(results,indent=2)+'\n')
for x in results:print(x['url'],x.get('status',x.get('error')), 'legacy_scheme='+str(x.get('legacy_scheme')))
