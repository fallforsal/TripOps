import 'package:flutter/material.dart';

/// Colors follow the TripOps Guide interactive mobile prototype.
const ink = Color(0xFF172B46);
const muted = Color(0xFF8697AC);
const teal = Color(0xFF009F98);
const deepTeal = Color(0xFF137C79);
const canvas = Color(0xFFF4F7FB);
const line = Color(0xFFE5ECF2);
const paleTeal = Color(0xFFE6F6F2);
const alertOrange = Color(0xFFF49A55);

abstract final class TripOpsTheme {
  static ThemeData get light {
    const radius = 16.0;
    const shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(radius)),
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: teal,
        brightness: Brightness.light,
        primary: teal,
        surface: Colors.white,
      ),
      scaffoldBackgroundColor: canvas,
      appBarTheme: const AppBarTheme(
        backgroundColor: canvas,
        foregroundColor: ink,
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(
          fontSize: 18, fontWeight: FontWeight.w800, color: ink,
        ),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        margin: EdgeInsets.zero,
        elevation: 0,
        shape: shape.copyWith(
          side: const BorderSide(color: line),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        hintStyle: const TextStyle(fontSize: 13, color: muted),
        labelStyle: const TextStyle(fontSize: 13, color: muted),
        prefixIconColor: muted,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16, vertical: 16,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: teal, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: Colors.redAccent),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: Colors.redAccent),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: teal,
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: ink,
          side: const BorderSide(color: line),
          minimumSize: const Size(0, 45),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: teal),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.white,
        selectedColor: paleTeal,
        side: const BorderSide(color: line),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(9),
        ),
        labelStyle: const TextStyle(
          fontSize: 12, fontWeight: FontWeight.w700, color: muted,
        ),
      ),
      dividerTheme: const DividerThemeData(color: line, thickness: 1),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: teal),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
