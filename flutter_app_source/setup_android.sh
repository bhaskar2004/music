#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")" || exit

echo "🚀 Preparing Flutter Android environment..."

# 1. Generate the android/ and ios/ folders if they don't exist
# This ensures we have a base to patch
flutter create --org com.wavelength --project-name wavelength_app .

echo "📝 Injecting Android Manifest configurations..."

# 2. Patch AndroidManifest.xml using Python (stolen from build-apk.yml)
python3 -c '
import xml.etree.ElementTree as ET
import os

manifest_path = "android/app/src/main/AndroidManifest.xml"
if not os.path.exists(manifest_path):
    print(f"❌ Error: {manifest_path} not found!")
    exit(1)

# Register namespace to keep android: prefixes
ET.register_namespace("android", "http://schemas.android.com/apk/res/android")

tree = ET.parse(manifest_path)
root = tree.getroot()
ns = {"android": "http://schemas.android.com/apk/res/android"}

# Set the package attribute explicitly to ensure correct Activity linking
root.set("package", "com.wavelength.wavelength_app")

# 1. Add Permissions
permissions = [
    "android.permission.INTERNET",
    "android.permission.WAKE_LOCK",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.MANAGE_EXTERNAL_STORAGE",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
]

app_tag = root.find("application")
app_index = list(root).index(app_tag)

# Check if permissions already exist to avoid duplicates
existing_perms = [p.get("{http://schemas.android.com/apk/res/android}name") for p in root.findall("uses-permission")]

for p in reversed(permissions):
    if p not in existing_perms:
        perm = ET.Element("uses-permission")
        perm.set("{http://schemas.android.com/apk/res/android}name", p)
        root.insert(app_index, perm)

# 2. Configure MainActivity properly for just_audio_background
for activity in app_tag.findall("activity"):
    intent_filter = activity.find("intent-filter")
    if intent_filter is not None:
        action = intent_filter.find("action")
        if action is not None and action.get("{http://schemas.android.com/apk/res/android}name") == "android.intent.action.MAIN":
            activity.set("{http://schemas.android.com/apk/res/android}name", ".MainActivity")
            activity.set("{http://schemas.android.com/apk/res/android}launchMode", "singleTop")
            
            # Ensure Flutter 2.0+ embedding meta-data is present
            meta_names = [m.get("{http://schemas.android.com/apk/res/android}name") for m in activity.findall("meta-data")]
            if "io.flutter.embedding.android.NormalThemes" not in meta_names:
                meta = ET.SubElement(activity, "meta-data")
                meta.set("{http://schemas.android.com/apk/res/android}name", "io.flutter.embedding.android.NormalThemes")
                meta.set("{http://schemas.android.com/apk/res/android}resource", "@style/NormalTheme")

# 3. Add AudioService declaration inside <application>
# Check if service already exists
existing_services = [s.get("{http://schemas.android.com/apk/res/android}name") for s in app_tag.findall("service")]
if "com.ryanheise.audioservice.AudioService" not in existing_services:
    service = ET.SubElement(app_tag, "service")
    service.set("{http://schemas.android.com/apk/res/android}name", "com.ryanheise.audioservice.AudioService")
    service.set("{http://schemas.android.com/apk/res/android}foregroundServiceType", "mediaPlayback")
    service.set("{http://schemas.android.com/apk/res/android}exported", "true")

    intent_filter = ET.SubElement(service, "intent-filter")
    actions = [
        "android.intent.action.MAIN",
        "android.intent.action.VIEW",
        "com.ryanheise.audioservice.NOTIFICATION_CLICK"
    ]
    for a in actions:
        action_elem = ET.SubElement(intent_filter, "action")
        action_elem.set("{http://schemas.android.com/apk/res/android}name", a)
    
    categories = [
        "android.intent.category.DEFAULT",
        "android.intent.category.BROWSABLE"
    ]
    for c in categories:
        category_elem = ET.SubElement(intent_filter, "category")
        category_elem.set("{http://schemas.android.com/apk/res/android}name", c)

tree.write(manifest_path, xml_declaration=True, encoding="utf-8")
print("✅ AndroidManifest.xml patched successfully!")
'

echo "📦 Installing Flutter dependencies..."
flutter pub get

echo "✨ Done! All systems are go."
echo "To run the app, use:"
echo "  cd flutter_app_source && flutter run"
