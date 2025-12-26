# Sistema de Comisiones — Repo listo para ejecutar

Este repositorio contiene la app "Sistema de Comisiones" (archivo `index.html`) — una aplicación web offline para gestionar ventas y prospectos.

Resumen:
- Interfaz y estilos originales preservados.
- Funciona como una app estática (HTML + JS). Usa LocalStorage para persistencia.
- Service Worker se registra desde el propio `index.html` (se crea como Blob). Para que el Service Worker funcione necesitas servir en `http://localhost` o en HTTPS.
- Incluyo dos archivos de ejemplo para importar (ventas y clientes) en la carpeta `samples/`.

Cómo ejecutar (local):
1. Clona este repositorio o copia los archivos al directorio deseado.
2. Abre un servidor estático en la carpeta raíz. Por ejemplo:

   - Con Python 3:
     ```
     python -m http.server 8000
     ```
     Luego abre: http://localhost:8000

   - Con Node (serve):
     ```
     npx serve .
     ```
     o instala `serve` globalmente:
     ```
     npm i -g serve
     serve .
     ```

   - Usar extensión Live Server en VSCode también funciona.

Notas importantes:
- El Service Worker requiere HTTPS o `http://localhost`. Usa `localhost` para pruebas en desarrollo.
- Para importar clientes en Excel `.xlsx` la app muestra un aviso (no incluye SheetJS). Convierte a CSV o añade SheetJS si quieres soporte directo a `.xlsx`.
- Formato CSV ventas esperado (para la importación manual con "Subir Archivo CSV"):
  Cabecera: `Fecha/Hora, Monto con IVA, Neto sin IVA, Comisión, Fecha, Mes`
  Ejemplo en `samples/sample_sales.csv`.
- Formato CSV clientes esperado (para importar prospectos):
  Cabecera: `NombreApellido, Telefono, Producto, Estado, ObservacionInicial, ProximoContacto, Etiqueta`
  Ejemplo en `samples/sample_clients.csv`.

Archivos incluidos:
- `index.html` — la app completa (UI + lógica).
- `README.md` — este archivo.
- `samples/sample_sales.csv` — ejemplo de ventas para importar.
- `samples/sample_clients.csv` — ejemplo de clientes para importar.

Sugerencias:
- Si quieres que el SW y el manifest sean archivos separados en el repo (en lugar de crearse como Blob), puedo ayudarte a extraerlos y ajustar `index.html`. No lo hice para mantener exactamente el comportamiento original.
- Si quieres agregar tests, pipeline o CI para desplegar, dime el servicio de hosting (Netlify, Vercel, GitHub Pages) y preparo instrucciones o archivos de configuración.

¡Listo! Si quieres que haga el commit directamente en un repo específico, indícame el owner/repo y los permisos (o usa la interfaz de GitHub), y puedo preparar un PR / branch con estos archivos.