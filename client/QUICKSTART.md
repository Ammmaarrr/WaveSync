# WaveSync Client Quick Start

Your Flutter app is now running with DevicePreview for iPhone emulation.

## Current Status
✅ Server scaffolding complete  
✅ Flutter client with clock sync, drift correction, and Spotify integration  
✅ Web client with Spotify Web Playback SDK  
✅ Privacy docs and minimal EULA  
✅ DevicePreview integration for device emulation  

## Running the App

### Web (with iPhone emulation)
```powershell
cd d:\WaveSync\client
flutter build web --debug
cd build\web
python -m http.server 9002
```
Then open: http://localhost:9002/

**Device Emulation**: In the app UI, use the DevicePreview toolbar to select iPhone 15 Pro or any device preset.

### Dev Mode (Hot Reload)
```powershell
cd d:\WaveSync\client
flutter run -d chrome
```

### Desktop (Windows)
```powershell
cd d:\WaveSync\client
flutter run -d windows
```

## Server
```powershell
cd d:\WaveSync\server
npm run dev
```
Server runs on http://localhost:4000

## What You Can Do Now
1. **Create/Join Sessions**: Use the session controls in the app
2. **Clock Sync**: Hit "Sync Now (10x)" to establish server offset
3. **Test Sync**: Use "Test Sync: Start in 3s" for beep synchronization
4. **Spotify Integration**: Add track URIs and use "Start Spotify in 3s"
5. **Device Testing**: Switch between iPhone, Android, desktop sizes in DevicePreview

## Next Steps
- Add real Spotify credentials to native Android/iOS
- Set up server telemetry collection
- Test across multiple devices/networks

The project is functionally complete! 🎉
