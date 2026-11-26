import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
let sharing = false;
export async function copyLink(url: string) {
  try { await Clipboard.setStringAsync(url); Alert.alert('Link copied'); }
  catch { Alert.alert('Could not copy link'); }
}
/** One native sheet at a time, across every content type; no files or access credentials. */
export async function shareLink(title: string, message: string, url: string) {
  if (sharing) return;
  sharing = true;
  try {
    if (Platform.OS === 'web' && (typeof navigator === 'undefined' || !navigator.share)) await copyLink(url);
    else await Share.share(Platform.OS === 'ios' ? { title, message, url } : { title, message });
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) Alert.alert('Sharing unavailable');
  } finally { sharing = false; }
}
