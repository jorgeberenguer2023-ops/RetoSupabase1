# Nexo — gestión de comunidades

Aplicación Ionic Angular conectada al proyecto Supabase `qvnsbjrwrohhdfdziuiu`. Usa la tabla existente `public.comunidad` para consultar, buscar, editar y exportar comunidades.

## Conexión con Supabase

La URL y la clave publicable del proyecto están configuradas en `src/environments/environment.ts` y `src/environments/environment.prod.ts`. La clave `sb_publishable` está diseñada para usarse en el cliente; el acceso a los datos depende de las políticas RLS de PostgreSQL. **No añadas nunca una clave `service_role` o una clave secreta al frontend.**

La tabla que ya existía en el proyecto debe contener estos campos: `id`, `created_at`, `comunidad`, `numero`, `email`, `coste_mensual`, `junta` y `cancelada`. El formulario genera registros con estos campos, mientras que PostgreSQL asigna el identificador y la fecha de creación.

### Preparar los permisos y la autenticación

1. Abre el SQL Editor del proyecto Supabase y ejecuta, en orden, `supabase/migrations/20261027000000_initial_schema.sql`, `supabase/migrations/20261030000000_community_users.sql` y `supabase/migrations/20261031000001_admin_community_writes.sql`. Estas migraciones crean perfiles, limitan las lecturas por comunidad y permiten insertar, actualizar y borrar comunidades solo a administradores. La migración inicial también habilita Realtime.
2. Desde Authentication, crea las cuentas de prueba. Un trigger genera el perfil como usuario estándar.
3. Promociona al administrador desde el SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id from auth.users where email = 'admin@tu-dominio.example'
   );
   ```

4. Ejecuta también `supabase/migrations/20261030010000_community_portal_photos.sql` para configurar el bucket privado de imágenes. Comprueba en **Table Editor → comunidad → RLS policies** que los usuarios estándar solo leen su comunidad y que las escrituras están reservadas a administradores.
5. Ejecuta `npm ci`, `npm start` y abre la URL indicada por Angular CLI.

Las rutas muestran un formulario de inicio de sesión. El dashboard requiere rol de administrador; el rol estándar puede consultar las comunidades. Las escrituras se validan también en RLS, no solo en el navegador.

## Funcionalidades

- Dashboard con total de comunidades, cuota mensual activa, cancelaciones y próxima junta.
- Búsqueda por nombre o correo y filtro de comunidades activas/canceladas.
- CRUD para administradores, con validación asíncrona de correo.
- Actualizaciones Realtime de la tabla `comunidad`.
- Exportación de informes CSV y PDF.
- Interfaz en español, diseño responsive y controles con etiquetas accesibles.

## Aplicación Android

La app móvil se genera con Capacitor y conserva la conexión online con Supabase. Necesitas Node.js, Android Studio con Android SDK, y JDK 21. En Windows, configura `ANDROID_HOME` apuntando a tu SDK (por ejemplo, `%LOCALAPPDATA%\Android\Sdk`) y añade `%ANDROID_HOME%\platform-tools` al `PATH`.

1. Instala dependencias con `npm ci`.
2. Sincroniza el código web y los plugins nativos con `npm run android:sync`.
3. Abre Android Studio con `npm run android:open`.
4. Selecciona un emulador o dispositivo Android con depuración USB y pulsa **Run**.

El identificador Android es `es.proyecto.nexocomunidades`, separado del identificador de la otra app. Las exportaciones CSV y PDF en Android abren la hoja nativa para compartir/guardar; en el navegador se conserva la descarga. Para publicar la app, crea y protege una clave de firma en Android Studio; no la guardes en el repositorio. La app móvil requiere conexión a Internet para autenticarse y leer/escribir datos en Supabase.

## Desarrollo y entrega

- Memoria del proyecto: [`documentation/memoria-proyecto.pdf`](./documentation/memoria-proyecto.pdf).
- `npm run lint`: analiza TypeScript y plantillas.
- `npm test -- --watch=false`: ejecuta las pruebas unitarias.
- `npm run build`: genera la aplicación en `www`.
- `npm run docs`: genera la documentación técnica en `documentation`.
- `npm run android:sync`: compila la app web y sincroniza los cambios con Android.
- `npm run android:open`: abre el proyecto nativo en Android Studio.

Vercel puede desplegar el contenido de `www` con `vercel.json` para la navegación SPA. La auditoría Lighthouse debe realizarse sobre la versión desplegada y adjuntarse como evidencia; el workflow de GitHub Actions ejecuta lint, pruebas y build.
