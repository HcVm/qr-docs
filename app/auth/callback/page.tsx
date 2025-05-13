// app/auth/callback/page.tsx
"use client";

import { useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    const handleCallback = async () => {
      // Obtener la sesión inmediatamente. El cliente Supabase leerá el fragmento de la URL.
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        console.log('Sesión encontrada en callback:', session.user);

        // Verificar el fragmento de la URL para determinar el tipo de evento
        const fragment = window.location.hash.substring(1); // Obtener el fragmento sin '#'
        const params = new URLSearchParams(fragment);
        const type = params.get('type'); // Buscar el parámetro 'type' (ej: 'invite', 'recovery', 'email_change')

        // Redirigir condicionalmente
        if (type === 'invite') {
           console.log('Redirigiendo a establecer contraseña después de invitación.');
           router.push('/auth/set-password');
        }
        // Puedes añadir lógica para otros tipos de eventos si los manejas en tu app
        // else if (type === 'recovery') { ... redirigir a resetear contraseña ... }
        // else if (type === 'email_change_confirmation') { ... mostrar mensaje ... }
        else {
           // Redirección por defecto si no es un tipo especial o si es un inicio de sesión normal
           console.log('Tipo de callback no reconocido o inicio de sesión, redirigiendo al dashboard.');
           router.push('/dashboard');
        }

      } else {
        // Si no hay sesión después del callback, algo salió mal o no era un callback de éxito
        console.log('No se encontró sesión después del callback. Redirigiendo al login.');
        // Esto podría pasar si el token era inválido o expiró
        router.push('/auth/login');
      }
    };

    handleCallback();

    // Nota: Ya no dependemos principalmente de onAuthStateChange para la redirección inicial
    // después de un callback. onAuthStateChange es útil para reaccionar a cambios
    // de estado de autenticación *después* de que la sesión inicial ha sido manejada.

  }, [supabase, router]); // Dependencias del useEffect


  // Mostrar un mensaje o spinner mientras se procesa la autenticación
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Procesando autenticación y redirigiendo...</p>
    </div>
  );
}
