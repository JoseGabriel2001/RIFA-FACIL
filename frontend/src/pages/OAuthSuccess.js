import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

/**
 * OAuth Success Page
 * 
 * Displayed after successful MercadoPago account connection.
 * Automatically redirects to dashboard after a few seconds.
 */
const OAuthSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl">¡Conexión Exitosa!</CardTitle>
          <CardDescription className="text-base mt-2">
            Tu cuenta de MercadoPago ha sido conectada correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              Ahora puedes crear rifas y recibir pagos directamente en tu cuenta de MercadoPago.
              La plataforma cobrará automáticamente una comisión del 10% por cada venta.
            </p>
          </div>
          
          <div className="text-sm text-slate-600">
            Serás redirigido al dashboard en unos segundos...
          </div>

          <Button 
            onClick={() => navigate('/dashboard')}
            className="btn-primary w-full"
          >
            Ir al Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthSuccess;

