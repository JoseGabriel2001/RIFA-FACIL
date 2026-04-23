import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

/**
 * OAuth Error Page
 * 
 * Displayed when MercadoPago OAuth connection fails.
 * Shows error details and allows user to retry.
 */
const OAuthError = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = () => {
    switch (error) {
      case 'invalid_state':
        return 'El estado de la sesión no es válido. Por favor, intenta nuevamente.';
      case 'validation_failed':
        return 'No se pudieron validar las credenciales. Por favor, intenta nuevamente.';
      case 'unexpected_error':
        return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
      default:
        return 'No se pudo completar la conexión con MercadoPago.';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Error de Conexión</CardTitle>
          <CardDescription className="text-base mt-2">
            {getErrorMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Si el problema persiste, por favor contacta a soporte técnico.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="btn-primary w-full"
            >
              Volver al Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
            >
              Intentar de Nuevo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthError;