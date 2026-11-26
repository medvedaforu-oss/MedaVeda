import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
/** Export only free Question Papers; never enters Notes or the Downloads subsystem. */
export async function downloadPaper(url: string, id: string, isCurrent: () => boolean): Promise<string> {
  const check = () => { if (!isCurrent()) throw new Error('Account or course changed. Download cancelled.'); };
  check();
  if (!FileSystem.cacheDirectory) throw new Error('Download storage is unavailable.');
  const filename = `question-paper-${id}-${Date.now()}.pdf`;
  const temporary = `${FileSystem.cacheDirectory}${filename}`;
  let retainForMenu = false;
  let destination: string | undefined;
  let completed = false;
  try {
    const response = await FileSystem.downloadAsync(url,temporary);
    check();
    if (response.status !== 200) throw new Error('PDF download failed or the link expired. Retry with a fresh link.');
    const headers = Object.fromEntries(Object.entries(response.headers ?? {}).map(([key,value]) => [key.toLowerCase(),value]));
    const info = await FileSystem.getInfoAsync(temporary);
    check();
    const declared = headers['content-length'];
    if (headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/pdf' ||
        !info.exists || info.isDirectory || !Number.isSafeInteger(info.size) || info.size < 5 || info.size > 50*1024*1024 ||
        (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) !== info.size))) {
      throw new Error('The downloaded file is not a valid Question Paper PDF.');
    }
    const signature = await FileSystem.readAsStringAsync(temporary, {
      encoding:FileSystem.EncodingType.Base64,position:0,length:5,
    });
    check();
    if (signature !== 'JVBERi0=') throw new Error('The downloaded file is not a valid Question Paper PDF.');
    if (Platform.OS === 'android') {
      const access = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      check();
      if (!access.granted) return 'Download cancelled.';
      const base64 = await FileSystem.readAsStringAsync(temporary,{encoding:FileSystem.EncodingType.Base64});
      check();
      destination = await FileSystem.StorageAccessFramework.createFileAsync(access.directoryUri,filename,'application/pdf');
      check();
      await FileSystem.writeAsStringAsync(destination,base64,{encoding:FileSystem.EncodingType.Base64});
      check();
      completed = true;
      return 'PDF saved to the folder you selected.';
    }
    if (Platform.OS === 'ios') {
      check();
      ReactNativeBlobUtil.ios.presentOptionsMenu(temporary.replace(/^file:\/\//,''));
      // iOS reads the file asynchronously while its export menu remains open.
      retainForMenu = true;
      return 'PDF ready. Use the menu to save or share it.';
    }
    throw new Error('PDF downloads are supported on Android, iOS and web.');
  } finally {
    if (destination && !completed) await FileSystem.deleteAsync(destination,{idempotent:true}).catch(()=>{});
    if (!retainForMenu) await FileSystem.deleteAsync(temporary,{idempotent:true}).catch(()=>{});
  }
}
