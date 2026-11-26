import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { handleAccess } from './handler.ts';
Deno.serve((request: Request) => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const user = createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{
    global:{headers:{Authorization:request.headers.get('Authorization') ?? ''}},
    auth:{persistSession:false,autoRefreshToken:false},
  });
  const server = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
  return handleAccess(request,user,server);
});
