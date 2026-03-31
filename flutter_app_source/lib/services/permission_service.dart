import 'dart:io';
import 'package:permission_handler/permission_handler.dart';

class PermissionService {
  static Future<bool> requestStoragePermissions() async {
    if (!Platform.isAndroid) return true;

    if (await Permission.manageExternalStorage.isGranted) return true;

    final statuses = await [
      Permission.audio,
      Permission.storage,
      Permission.manageExternalStorage,
    ].request();

    if (statuses[Permission.manageExternalStorage] == PermissionStatus.granted) {
      return true;
    }
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
