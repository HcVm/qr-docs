// app/auth/callback/page.tsx
"use client";

import { useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('Usuario ha iniciado sesión:', session.user);

        // *** MODIFICACION AQUI: Verificar el fragmento de la URL ***
        const fragment = window.location.hash.substring(1); // Obtener el fragmento sin '#'
        const params = new URLSearchParams(fragment);
        const type = params.get('type');
        // *** FIN MODIFICACION ***


        // Redirigir a la página de configuración de contraseña si es una invitación,
        // o al dashboard por defecto.
        if (type === 'invite') {
           console.log('Redirigiendo a establecer contraseña después de invitación.');
           router.push('/auth/set-password');
        } else {
           console.log('Redirigiendo al dashboard.');
           router.push('/dashboard');
        }


      } else if (event === 'SIGNED_OUT') {
        router.push('/auth/login');
      }
       // Puedes añadir manejo para otros eventos si es necesario
       // else if (event === 'PASSWORD_RECOVERY') { ... }
       // else if (event === 'EMAIL_CHANGE_CONFIRMATION') { ... }
    });

    // Limpiar la suscripción al desmontar el componente
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]); // Asegúrate de incluir 'supabase' y 'router' como dependencias

  // Mostrar un mensaje o spinner mientras se procesa la autenticación
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Cargando...</p>
    </div>
  );
}
