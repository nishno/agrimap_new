# Weather Station & Plantation Camera Modernization

## 1. Hardware Integration
- **Weather Stations:** Ambient temperature, relative humidity, precipitation, wind speed, and solar irradiance telemetry.
- **Plantation PTZ Cameras:**
  - RTSP video streaming support.
  - Pan-Tilt-Zoom (PTZ) direction and zoom controls in Hardware Labs.
  - Optical disease scanning integration with Gemini 2.5 vision diagnostics.

## 2. Telemetry Processing & Cache
- Telemetry feeds stream into `AppEventEngine` and are cached locally.
- Weather data correlates directly with irrigation recommendations in Agronomy and Harvest planning.
