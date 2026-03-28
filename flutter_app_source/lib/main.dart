import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'services/download_service.dart';
import 'services/audio_service.dart';
import 'ui/screens/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Background Audio Session
  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.wavelength.audio',
    androidNotificationChannelName: 'Audio playback',
    androidNotificationOngoing: true,
  );

  // Initialize Background Downloader
  DownloadService.init();

  runApp(
    MultiProvider(
      providers: [
        Provider<AudioService>(
          create: (_) => AudioService(),
          dispose: (_, service) => service.dispose(),
        ),
      ],
      child: const WavelengthApp(),
    ),
  );
}

class WavelengthApp extends StatelessWidget {
  const WavelengthApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Wavelength',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF000000), // True black like Spotify/Uber
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFFFFFF), // High contrast active text
          secondary: Color(0xFF06C167), // Uber-like brand accent
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
          backgroundColor: Color(0xCC121212), // Translucent
          selectedItemColor: Colors.white,
          unselectedItemColor: Colors.white54,
          elevation: 0,
        ),
      ),
      home: const HomeScreen(),
    );
  }
}
