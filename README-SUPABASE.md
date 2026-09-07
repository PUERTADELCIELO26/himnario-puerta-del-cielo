## Conectar Supabase

1. En Supabase abre **SQL Editor**, pega `supabase-schema.sql` y pulsa Run.
2. En Supabase entra en **Project Settings > API** y copia la Project URL y la clave `anon` public.
3. Copia `.env.example` como `.env.local` y completa:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

4. En Supabase > Authentication > Users crea un usuario separado para la persona encargada de editar el himnario. Ese usuario tendrá acceso al botón `Panel administrativo`, donde puede crear, editar y borrar alabanzas.
5. Si el proyecto ya tenía tablas creadas, vuelve a ejecutar `supabase-schema.sql` para habilitar la categoría `ninos` (Alabanzas de niños).
6. Ejecuta `npm run dev` y abre `http://localhost:5173/`.

Nunca uses la clave `service_role` en React ni la publiques en GitHub.
