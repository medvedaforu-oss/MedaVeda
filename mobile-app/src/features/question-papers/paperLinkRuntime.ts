import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, subscribeAuthUser } from '../../services/authState';
import { parseContentLink } from './questionPaperLinks';
import { PaperLinkQueue } from './paperLinkQueue';
import { readDeferredPaperLink } from './deferredPaperLink';

import type { ContentDestination } from '../sharing/contentDestination';
export const paperLinkQueue = new PaperLinkQueue<ContentDestination>();
const REFERRER_MARKER = 'medveda.question-paper.install-referrer.v1';
/** Mount above app initialization, update and maintenance gates so warm URLs are never lost. */
export function capturePaperLinks(): () => void {
  let live = true, directRevision = 0, accountRevision = 0;
  let owner = getCurrentUser()?.id ?? null;
  paperLinkQueue.accountChanged(owner);
  const unsubscribeAuth = subscribeAuthUser(() => {
    const next = getCurrentUser()?.id ?? null;
    if (owner && next !== owner) accountRevision++;
    owner = next;
    paperLinkQueue.accountChanged(next);
  });
  const receive = (url: string | null) => {
    if (!live) return;
    const intent = parseContentLink(url);
    if (!intent) return;
    directRevision++;
    paperLinkQueue.receive(intent, getCurrentUser()?.id ?? null);
  };
  const subscription = Linking.addEventListener('url', event => receive(event.url));
  const initialRevision = directRevision;
  const initialAccountRevision = accountRevision;
  const initialRead = Linking.getInitialURL().then(url => {
    if (directRevision === initialRevision && accountRevision === initialAccountRevision) receive(url);
    return true;
  }).catch(() => false);
  // expo-application already bundles Google's Install Referrer 2.2 client. No new bridge or SDK.
  if (Platform.OS === 'android' && Application.applicationId === 'in.medveda.app') {
    const deadline = Date.now() + 10000;
    // A slow initial direct URL still takes precedence over install attribution. Failure/timeout
    // suppresses deferred delivery without blocking app startup; the original share can be reopened.
    void initialRead.then(initialResolved => {
      if (!initialResolved || !live || Date.now() > deadline) return;
      return readDeferredPaperLink({
        now: Date.now,
        installedAt: Application.getInstallationTimeAsync,
        referrer: Application.getInstallReferrerAsync,
        getMarker: () => AsyncStorage.getItem(REFERRER_MARKER),
        setMarker: value => AsyncStorage.setItem(REFERRER_MARKER, value),
        isCurrent: () => live && directRevision === 0 && accountRevision === initialAccountRevision && Date.now() <= deadline,
        receive: (id, type) => paperLinkQueue.receive({ id, type }, getCurrentUser()?.id ?? null),
      });
    });
  }
  return () => { live = false; subscription.remove(); unsubscribeAuth(); };
}
