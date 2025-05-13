// app/auth/set-password/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientSupabaseClient();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar si el usuario ya tiene una sesión activa
    // Si ya tiene sesión (por ejemplo, vino del callback), nos aseguramos de que esté en el estado correcto.
    // Si no tiene sesión, algo salió mal (no vino del enlace de invitación validado).
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Si no hay sesión, redirigir al login (o a una página de error)
        toast({
          title: "Error de autenticación",
          description: "Parece que no has llegado aquí desde un enlace de invitación válido.",
          variant: "destructive",
        });
        router.push('/auth/login'); // O donde consideres adecuado
      }
       // Podrías añadir lógica aquí para verificar si el usuario ya tiene password si tu esquema lo permite
    };

    checkUserSession();

  }, [router, supabase, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) { // Ejemplo de validación básica de longitud
       toast({
         title: "Error",
         description: "La contraseña debe tener al menos 6 caracteres.",
         variant: "destructive",
       });
       return;
    }

    setLoading(true);
    try {
      // Actualizar la contraseña del usuario actualmente autenticado
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Contraseña establecida",
        description: "Tu contraseña ha sido actualizada exitosamente.",
      });

      // Redirigir al dashboard o a la página de inicio después de establecer la contraseña
      router.push('/dashboard'); // O a donde quieras redirigir

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al establecer la contraseña.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Establecer Contraseña</CardTitle>
          <CardDescription>Por favor, establece una contraseña para tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirma tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : "Establecer Contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
