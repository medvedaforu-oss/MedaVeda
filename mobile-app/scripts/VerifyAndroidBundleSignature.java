import java.util.*;
import java.util.jar.*;
import java.nio.file.*;
import java.security.*;
import java.security.cert.Certificate;
public class VerifyAndroidBundleSignature {
  public static void main(String[] args) throws Exception {
    int signed=0, unsigned=0, duplicate=0; Set<String> names=new HashSet<>(), fingerprints=new TreeSet<>();
    try(JarFile jar=new JarFile(args[0],true)) {
      var entries=jar.entries(); byte[] buffer=new byte[65536];
      while(entries.hasMoreElements()) {
        JarEntry entry=entries.nextElement();
        if(!names.add(entry.getName())) duplicate++;
        if(entry.isDirectory()) continue;
        try(var stream=jar.getInputStream(entry)) { while(stream.read(buffer)!=-1) {} }
        String name=entry.getName().toUpperCase(Locale.ROOT);
        if(name.equals("META-INF/MANIFEST.MF") || (name.startsWith("META-INF/") && (name.endsWith(".SF") || name.endsWith(".RSA") || name.endsWith(".EC") || name.endsWith(".DSA")))) continue;
        Certificate[] certs=entry.getCertificates();
        if(certs==null || certs.length==0) {unsigned++;System.out.println("Unsigned entry: "+entry.getName());}
        else {signed++;fingerprints.add(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(certs[0].getEncoded())));}
      }
    }
    System.out.println("Verified signed payload entries: "+signed);
    System.out.println("Unsigned payload entries: "+unsigned);
    System.out.println("Duplicate ZIP entries: "+duplicate);
    System.out.println("Signer SHA-256: "+fingerprints);
    if(unsigned!=0 || duplicate!=0 || fingerprints.size()!=1)throw new IllegalStateException("JarFile verification failed");
  }
}
