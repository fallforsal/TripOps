import 'package:flutter/material.dart';

const ink = Color(0xFF17324D);
const muted = Color(0xFF66798A);

abstract final class TripOpsTheme {
  static ThemeData get light => ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF087D82),
        primary: const Color(0xFF087D82),
        surface: const Color(0xFFF7FAFC),
      ),
      scaffoldBackgroundColor: const Color(0xFFF7FAFC),
      useMaterial3: true,
      appBarTheme: const AppBarTheme(backgroundColor: Color(0xFFF7FAFC)),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(13)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      ),
    );
}
