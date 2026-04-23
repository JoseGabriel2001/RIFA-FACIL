# RifaFacil - Guía de Compilación para App Store y Play Store

## Requisitos Previos

### Para iOS (App Store)
1. **Mac con macOS** - Obligatorio para compilar apps de iOS
2. **Xcode** - Versión 14 o superior (descarga gratuita desde Mac App Store)
3. **Cuenta de Desarrollador Apple** - $99 USD/año
   - Registrar en: https://developer.apple.com/programs/

### Para Android (Play Store)
1. **Android Studio** - https://developer.android.com/studio
2. **Cuenta de Desarrollador Google Play** - $25 USD (pago único)
   - Registrar en: https://play.google.com/console/signup

## Estructura del Proyecto

```
frontend/
├── ios/                    # Proyecto nativo iOS
│   └── App/
│       ├── App/
│       │   └── public/     # Assets web para iOS
│       └── App.xcworkspace # Abrir con Xcode
├── android/                # Proyecto nativo Android
│   └── app/
│       └── src/main/
│           └── assets/public/  # Assets web para Android
├── capacitor.config.json   # Configuración de Capacitor
└── build/                  # Build de la webapp
```

## Pasos para Compilar

### 1. Preparar el Build Web

```bash
cd frontend

# Instalar dependencias
yarn install

# Crear build de producción
yarn build

# Sincronizar con proyectos nativos
npx cap sync
```

### 2. Compilar para iOS (App Store)

```bash
# Abrir proyecto en Xcode
npx cap open ios
```

En Xcode:
1. Selecciona el dispositivo "Any iOS Device (arm64)"
2. Ve a **Signing & Capabilities**
3. Selecciona tu Team (cuenta de desarrollador)
4. Cambia el Bundle Identifier si es necesario: `com.tuempresa.rifafacil`
5. Ve a **Product > Archive**
6. Una vez archivado, haz clic en **Distribute App**
7. Selecciona **App Store Connect**
8. Sigue el asistente para subir a App Store Connect

### 3. Compilar para Android (Play Store)

```bash
# Abrir proyecto en Android Studio
npx cap open android
```

En Android Studio:
1. Ve a **Build > Generate Signed Bundle / APK**
2. Selecciona **Android App Bundle**
3. Crea o selecciona tu keystore
4. Configura la versión en `android/app/build.gradle`
5. Haz clic en **Finish**
6. El archivo `.aab` se genera en `android/app/release/`

### 4. Subir a las Tiendas

#### App Store (iOS)
1. Inicia sesión en https://appstoreconnect.apple.com
2. Crea una nueva app
3. Completa la información (nombre, descripción, capturas de pantalla)
4. Sube el build desde Xcode o Transporter
5. Envía para revisión

#### Play Store (Android)
1. Inicia sesión en https://play.google.com/console
2. Crea una nueva app
3. Completa la ficha de Play Store
4. Sube el archivo `.aab`
5. Configura precios y distribución
6. Envía para revisión

## Configuración de Producción

### Actualizar URL del servidor
Editar `capacitor.config.json`:
```json
{
  "server": {
    "url": "https://tu-dominio-produccion.com"
  }
}
```

### Cambiar App ID
```json
{
  "appId": "com.tuempresa.rifafacil"
}
```

## Iconos y Splash Screens

### Generar iconos automáticamente
1. Prepara una imagen de 1024x1024 px
2. Usa una herramienta como https://appicon.co
3. Reemplaza los iconos en:
   - iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Android: `android/app/src/main/res/mipmap-*/`

### Splash Screen
Configura en `capacitor.config.json`:
```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#f97316",
      "showSpinner": true,
      "spinnerColor": "#ffffff",
      "launchAutoHide": true
    }
  }
}
```

## Comandos Útiles

```bash
# Sincronizar cambios web con apps nativas
npx cap sync

# Copiar solo assets web
npx cap copy

# Actualizar plugins nativos
npx cap update

# Ejecutar en simulador iOS
npx cap run ios

# Ejecutar en emulador Android
npx cap run android
```

## Solución de Problemas

### iOS: "Signing requires a development team"
- Abre Xcode y selecciona tu cuenta de desarrollador en Signing & Capabilities

### Android: "SDK location not found"
- Crea el archivo `android/local.properties` con:
  ```
  sdk.dir=/Users/TU_USUARIO/Library/Android/sdk
  ```

### "Unable to load asset"
- Ejecuta `npx cap sync` después de cada `yarn build`

## Actualizaciones

Para actualizar la app después de cambios:
```bash
yarn build
npx cap sync
# Luego compilar nuevamente en Xcode/Android Studio
```

## Soporte

- Documentación Capacitor: https://capacitorjs.com/docs
- Guía iOS: https://capacitorjs.com/docs/ios
- Guía Android: https://capacitorjs.com/docs/android
