import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'providers/app_state.dart';
import 'services/audio_service.dart';
import 'services/download_manager.dart';
import 'services/server_config.dart';
import 'services/server_discovery.dart';
import 'ui/screens/main_wrapper.dart';

Future<void> main() async {
  try {
    WidgetsFlutterBinding.ensureInitialized();

    await JustAudioBackground.init(
      androidNotificationChannelId: 'com.wavelength.audio',
      androidNotificationChannelName: 'Audio playback',
      androidNotificationOngoing: true,
    );

    // Load saved server URL (for server-proxied downloads)
    await ServerConfig.init();

    final appState = AppState();
    await appState.initialize();

    // Wire download manager to app state
    DownloadManager().attach(appState);

    runApp(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AppState>.value(value: appState),
          Provider<AudioService>(
            create: (_) => AudioService(),
            dispose: (_, s) => s.dispose(),
          ),
        ],
        child: const WavelengthApp(),
      ),
    );
  } catch (e, st) {
    debugPrint('Init error: $e\n$st');
    runApp(MaterialApp(
      home: Scaffold(
        body: Center(child: Text('App failed to start: $e')),
      ),
    ));
  }
}

class WavelengthApp extends StatefulWidget {
  const WavelengthApp({super.key});

  @override
  State<WavelengthApp> createState() => _WavelengthAppState();
}

class _WavelengthAppState extends State<WavelengthApp> {
  final GlobalKey<ScaffoldMessengerState> _messengerKey =
      GlobalKey<ScaffoldMessengerState>();

  @override
  void initState() {
    super.initState();
    // Run server discovery in background after first frame renders
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _discoverServer();
    });
  }

  Future<void> _discoverServer() async {
    final result = await ServerDiscovery.discover();
    if (!mounted) return;

    if (result != null) {
      _messengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Text('✓ Connected to server at $result'),
          backgroundColor: const Color(0xFF06C167),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
    } else {
      _messengerKey.currentState?.showSnackBar(
        SnackBar(
          content: const Text(
              '⚠ No server found. Downloads won\'t work until a server is reachable.'),
          backgroundColor: const Color(0xFFE53935),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 10),
          action: SnackBarAction(
            label: 'RETRY',
            textColor: Colors.white,
            onPressed: _discoverServer,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final themeMode = appState.config.themeMode;

    return MaterialApp(
      scaffoldMessengerKey: _messengerKey,
      title: 'Wavelength',
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      theme: _buildTheme(Brightness.light),
      darkTheme: _buildTheme(Brightness.dark),
      home: const MainWrapper(),
    );
  }

  ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final baseTheme = isDark ? ThemeData.dark() : ThemeData.light();
    
    return baseTheme.copyWith(
      scaffoldBackgroundColor: isDark ? const Color(0xFF000000) : Colors.white,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF06C167),
        brightness: brightness,
        primary: isDark ? Colors.white : Colors.black,
        secondary: const Color(0xFF06C167),
        surface: isDark ? const Color(0xFF0D0D0D) : Colors.white,
        onSurface: isDark ? Colors.white : Colors.black87,
      ),
      textTheme: GoogleFonts.interTextTheme(baseTheme.textTheme).copyWith(
        displayLarge: GoogleFonts.outfit(textStyle: baseTheme.textTheme.displayLarge),
        displayMedium: GoogleFonts.outfit(textStyle: baseTheme.textTheme.displayMedium),
        displaySmall: GoogleFonts.outfit(textStyle: baseTheme.textTheme.displaySmall),
        headlineLarge: GoogleFonts.outfit(textStyle: baseTheme.textTheme.headlineLarge),
        titleLarge: GoogleFonts.outfit(textStyle: baseTheme.textTheme.titleLarge, fontWeight: FontWeight.bold),
      ).apply(
        bodyColor: isDark ? Colors.white : Colors.black87,
        displayColor: isDark ? Colors.white : Colors.black,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? Colors.transparent : Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.outfit(
          color: isDark ? Colors.white : Colors.black,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
        iconTheme: IconThemeData(color: isDark ? Colors.white : Colors.black87),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: isDark ? const Color(0xFF121212) : Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: isDark ? const Color(0xFF0D0D0D) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      dividerTheme: DividerThemeData(
        color: isDark ? const Color(0xFF1E1E1E) : const Color(0xFFE8E8E8),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }
}
