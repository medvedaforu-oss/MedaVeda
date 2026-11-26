import { validateQuestionPaperPdf } from "./validate.ts";
let validationInFlight = false;
// Clients are injected so the boundary can be exercised without hosted credentials.
// The user client carries the original JWT; the server client never receives it.
// deno-lint-ignore no-explicit-any
export async function handleAccess(request: Request, user: any, server: any): Promise<Response> {
  const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json','Cache-Control':'no-store'};
  const reply = (status: number, body: object) => new Response(JSON.stringify(body),{status,headers});
  if (request.method === 'OPTIONS') return reply(200,{});
  if (request.method !== 'POST') return reply(405,{error:'POST required'});
  try {
    if (!request.headers.get('Authorization')?.startsWith('Bearer ')) return reply(401,{error:'Sign in required'});
    const {data:auth,error:authError} = await user.auth.getUser();
    if (authError || !auth?.user || auth.user.is_anonymous) return reply(401,{error:'Sign in required'});
    const input = await request.json();
    if (input.action === 'validate') {
      const {data:admin,error} = await user.rpc('am_i_admin');
      if (error || admin !== true) return reply(403,{error:'Admin access required'});
      if (typeof input.object_path !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.pdf$/.test(input.object_path)) return reply(400,{error:'Invalid object path'});
      if (validationInFlight) return reply(503,{error:'Another PDF is being validated. Please retry.'});
      validationInFlight = true;
      try {
      const {data:file,error:downloadError} = await server.storage.from('question-papers').download(input.object_path);
      if (downloadError || !file || file.type.split(';')[0].trim().toLowerCase() !== 'application/pdf' || file.size<5 || file.size>52428800 || await file.slice(0,5).text() !== '%PDF-') return reply(422,{error:'Invalid Question Paper PDF'});
      try { await validateQuestionPaperPdf(new Uint8Array(await file.arrayBuffer())); }
      catch { return reply(422,{error:'Invalid, incomplete or unsupported Question Paper PDF. Please upload a complete PDF.'}); }
      const {error:receiptError} = await server.from('question_paper_validated_objects').insert({object_path:input.object_path,byte_size:file.size});
      // Revalidation is safe: immutable objects cannot be replaced through client APIs.
      if (receiptError && receiptError.code !== '23505') throw receiptError;
      return reply(200,{validated:true});
      } finally { validationInFlight = false; }
    }
    if (input.action !== 'sign' || typeof input.id !== 'string') return reply(400,{error:'Invalid request'});
    // Recheck visibility with the user's unchanged RLS, never a caller-supplied path.
    const {data:paper,error} = await user.from('question_papers').select('id,object_path').eq('id',input.id).single();
    if (error || !paper) return reply(403,{error:'Question Paper unavailable'});
    const {data:signed,error:signError} = await server.storage.from('question-papers').createSignedUrl(paper.object_path,120,
      input.download === true ? {download:`question-paper-${paper.id}.pdf`} : undefined);
    if (signError || !signed?.signedUrl) throw signError;
    return reply(200,{signedUrl:signed.signedUrl});
  } catch {
    return reply(400,{error:'Question Paper request failed. Retry with a fresh request.'});
  }
}
