# Configuración de accesos por comunidad

## 1. Base de datos
Ejecuta `setup.sql` en el SQL Editor de Supabase. Si ya ejecutaste la migración inicial, ejecuta solo `migrations/20261030000000_community_users.sql`.

## 2. Edge Function
La función `functions/create-community-user/index.ts` crea/invita el usuario de Supabase asociado al correo de cada comunidad y vincula su `community_id`.

Con Supabase CLI:

```bash
supabase functions deploy create-community-user
```

La función utiliza las variables administradas por Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`). No pongas la service role key en Angular.

## 3. Funcionamiento
- Administrador: ve todas las comunidades y puede gestionarlas.
- Al crear o editar una comunidad, se intenta crear/invitar su usuario automáticamente usando el correo de `comunidad.email`.
- Usuario de comunidad: al iniciar sesión, `profiles.community_id` determina su comunidad.
- RLS garantiza que un usuario estándar solo pueda leer su propia comunidad.
- La pantalla del usuario no utiliza tabla: muestra una ficha visual profesional con vecinos, cuota, próxima junta, contacto y estado.
- El botón `Sincronizar accesos` permite provisionar los usuarios de comunidades existentes.

## Fotografías manuales de los portales

La fotografía se carga desde la edición de cada comunidad (cuenta administradora). Los archivos se guardan en el bucket privado `community-photos` de Supabase Storage y en `public.comunidad.portal_image_path` solo se almacena la ruta del archivo. La aplicación genera enlaces firmados de una hora para mostrar la imagen. Las políticas de Storage permiten subir, sustituir y eliminar fotos solo a administradores; para lectura, el usuario estándar solo puede obtener la foto de su propia comunidad.

### Activación

1. En Supabase abre **SQL Editor**.
2. Ejecuta el archivo `migrations/20261030010000_community_portal_photos.sql`.
3. En la aplicación entra como administrador.
4. Abre **Comunidades**, pulsa editar (icono del lápiz) en la comunidad deseada.
5. En **Fotografía del portal**, elige una imagen JPG, PNG o WEBP de hasta 5 MB y pulsa **Subir fotografía**.
6. El usuario de esa comunidad verá la imagen en la cabecera de su portal privado.

No se necesita Google Maps API ni clave de Google.
