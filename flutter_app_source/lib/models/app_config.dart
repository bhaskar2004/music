import 'package:flutter/material.dart';

class AppConfig {
  final ThemeMode themeMode;
  final int crossfadeDuration;
  final String? serverUrl;

  AppConfig({
    this.themeMode = ThemeMode.dark,
    this.crossfadeDuration = 0,
    this.serverUrl,
  });

  Map<String, dynamic> toMap() => {
        'themeMode': themeMode.index,
        'crossfadeDuration': crossfadeDuration,
        'serverUrl': serverUrl,
      };

  factory AppConfig.fromMap(Map<String, dynamic> map) {
    return AppConfig(
      themeMode: ThemeMode.values[map['themeMode'] ?? ThemeMode.dark.index],
      crossfadeDuration: map['crossfadeDuration'] ?? 0,
      serverUrl: map['serverUrl'],
    );
  }

  AppConfig copyWith({
    ThemeMode? themeMode,
    int? crossfadeDuration,
    String? serverUrl,
  }) {
    return AppConfig(
      themeMode: themeMode ?? this.themeMode,
      crossfadeDuration: crossfadeDuration ?? this.crossfadeDuration,
      serverUrl: serverUrl ?? this.serverUrl,
    );
  }
}
