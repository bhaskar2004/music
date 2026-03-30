import 'dart:io';
import 'package:permission_handler/permission_handler.dart';

class PermissionService {
  static Future<bool> requestStoragePermissions() async {
    if (!Platform.isAndroid) return true;

    // 1. Try for All Files Access (Android 11+)
    if (await Permission.manageExternalStorage.isGranted) return true;

    // 2. Request for Android 13+ Media permissions or legacy storage
    final statuses = await [
      Permission.audio,
      Permission.storage,
      Permission.manageExternalStorage,
    ].request();

    // If MANAGE_EXTERNAL_STORAGE was requested but still denied, 
    // we check if we have enough with just audio.
    if (statuses[Permission.manageExternalStorage] == PermissionStatus.granted) return true;
    if (statuses[Permission.audio] == PermissionStatus.granted) return true;
    if (statuses[Permission.storage] == PermissionStatus.granted) return true;

    return false;
  }

  static Future<bool> checkPermissions() async {
    if (!Platform.isAndroid) return true;
    if (await Permission.manageExternalStorage.isGranted) return true;
    if (await Permission.audio.isGranted) return true;
    if (await Permission.storage.isGranted) return true;
    return false;
  }

  static Future<void> openAppInfo() async {
    await openAppSettings();
  }
}
