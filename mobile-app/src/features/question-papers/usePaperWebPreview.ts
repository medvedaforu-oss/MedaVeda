import {useEffect,useRef,useState} from 'react';
import {fetchPaperPdf} from './download.web';
/** Fetch errors are observable; cross-origin iframe error events are not. */
export default function usePaperWebPreview(url: string | undefined, onError: () => void) {
  const errorCallback=useRef(onError);errorCallback.current=onError;
  const [state,setState]=useState<{key?:string;value?:string;loading:boolean}>({loading:false});
  useEffect(()=>{
    let active=true,objectUrl: string | undefined;
    const controller=new AbortController();
    setState({key:url,loading:!!url});
    if (url) fetchPaperPdf(url,()=>active,controller.signal).then(blob=>{
      if (!active) return;
      objectUrl=URL.createObjectURL(blob);setState({key:url,value:objectUrl,loading:false});
    }).catch(()=>{
      if (active) {setState({key:url,loading:false});errorCallback.current();}
    });
    return ()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[url]);
  return state.key===url ? state : {loading:!!url,value:undefined};
}
