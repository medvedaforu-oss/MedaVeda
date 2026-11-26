import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCurrentUser, subscribeAuthUser } from '../../services/authState';
/** Never reuse a response across route scopes or signed-in accounts. Reload on focus. */
export default function usePaperResource<T>(scope: string, load: () => Promise<T>) {
  const [account, setAccount] = useState(getCurrentUser()?.id ?? '');
  const run = useRef(0);
  const [appState,setAppState] = useState(AppState.currentState);
  useEffect(() => { const subscription=AppState.addEventListener('change',next=>{run.current++;setAppState(next);}); return ()=>subscription.remove(); },[]);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{key: string; request?: number; value?: T; error?: string; loading: boolean}>({key:'',loading:true});
  const key = JSON.stringify([account, scope, revision]);
  useEffect(() => subscribeAuthUser(() => setAccount(getCurrentUser()?.id ?? '')), []);
  useFocusEffect(useCallback(() => {
    let active = true; const request=++run.current;
    if (appState !== 'active') { setState({key,loading:false}); return ()=>{run.current++;}; }
    setState({ key, loading: true });
    if (!account) { setState({key,loading:false,error:'Sign in to view Question Papers.'}); return; }
    load().then(value => {
      if (active && run.current===request && getCurrentUser()?.id === account) setState({key,request,value,loading:false});
    }).catch(e => {
      if (active && run.current===request && getCurrentUser()?.id === account) setState({key,error:e instanceof Error ? e.message : 'Could not load Question Papers.',loading:false});
    });
    return () => { active = false; run.current++; };
  }, [key, load, account, appState]));
  return { ...(state.key === key && appState==='active' ? state : {loading:true,value:undefined,error:undefined}),
    isCurrent: () => state.key===key && state.request===run.current && AppState.currentState==='active' && getCurrentUser()?.id===account,
    retry: useCallback(() => setRevision(n=>n+1), []) };
}
