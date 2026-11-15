# React Native and dependencies supply consumer rules for bridge/reflection/JNI.
# PdfiumAndroidKt loads this class and its native entry points by name. Keep
# only that JNI surface, rather than all PDF viewer, BlobUtil and Sentry code.
-keep,includedescriptorclasses class io.legere.pdfiumandroid.PdfiumCore {
    native <methods>;
}
-keepclasseswithmembernames,includedescriptorclasses class io.legere.pdfiumandroid.** {
    native <methods>;
}
