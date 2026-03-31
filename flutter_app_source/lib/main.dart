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
        const SnackBar(
          content: Text(
              '⚠ No server found. Downloads won\'t work until a server is reachable.'),
          backgroundColor: Color(0xFFE53935),
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 5),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      scaffoldMessengerKey: _messengerKey,
      title: 'Wavelength',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF000000),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFFFFFF),
          secondary: Color(0xFF06C167),
          surface: Color(0xFF121212),
        ),
        textTheme: GoogleFonts.interTextTheme(
          Theme.of(context).textTheme.apply(
                bodyColor: Colors.white,
                displayColor: Colors.white,
              ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF000000),
          elevation: 0,
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(0xFF000000),
          selectedItemColor: Colors.white,
          unselectedItemColor: Color(0xFF535353),
          elevation: 0,
          type: BottomNavigationBarType.fixed,
        ),
      ),
      home: const MainWrapper(),
    );
  }
}
