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
      // Obtener la sesión. El cliente Supabase leerá el fragmento de la URL.
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        console.log('Sesión encontrada en callback:', session.user);
        // Si hay sesión (ej: confirmación de email, etc.), redirigir al login.
        // El usuario usará la contraseña temporal para loguearse allí.
        router.push('/auth/login');

      } else {
        // Si no hay sesión después del callback, redirigir al login.
        router.push('/auth/login');
      }
      // Nota: Eliminamos la lógica de verificar el 'type' del fragmento,
      // ya que todos los flujos (excepto login/register directos) que pasan por aquí
      // ahora deben terminar en el login.
    };

    handleCallback();

    // No necesitamos el listener onAuthStateChange para esta lógica simplificada de redirección inicial

  }, [supabase, router]); // Dependencias del useEffect


  // Mostrar un mensaje o spinner mientras se procesa la autenticación
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Procesando autenticación y redirigiendo...</p>
    </div>
  );
}
