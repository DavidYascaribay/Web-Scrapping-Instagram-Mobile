# Instagram Scraper Mobile

Aplicación móvil con **React Native + Expo** y backend en **Node.js + Express + Playwright** para consultar perfiles públicos de Instagram mediante **web scraping con sesión autenticada usando cookies**.

## Qué hace

La app permite:

- buscar un perfil público de Instagram
- mostrar información general del perfil
- visualizar sus primeras publicaciones
- abrir publicaciones en detalle
- mostrar imágenes
- ampliar la foto de perfil
- cambiar entre tema claro, oscuro o sistema

## Stack

### Backend
- Node.js
- TypeScript
- Express
- Playwright

### Mobile
- React Native
- Expo
- Expo Router
- TypeScript
- expo-video
- react-native-safe-area-context
- expo-linear-gradient

---

## Estructura del proyecto

```bash
Web-Scrapping-Instagram-Mobile/
  backend/
    src/
      app.ts
      services/
        browser.ts
        instagramScraper.ts
        postDetailScraper.ts
      scripts/
        saveSession.ts
    cookies/
      instagram-state.json
    package.json
    tsconfig.json

  mobile/
    app/
      _layout.tsx
      (tabs)/
        _layout.tsx
        index.tsx
    context/
      ThemeContext.tsx
    services/
      api.ts
    package.json