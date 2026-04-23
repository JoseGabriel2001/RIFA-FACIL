import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { CheckCircle, Loader2, ArrowRight, Ticket } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, paid, pending, error
  const [attempts, setAttempts] = useState(0);
  
  // Support both Stripe and MercadoPago
  const sessionId = searchParams.get('session_id');
  const paymentMethod = searchParams.get('method');
  const transactionId = searchParams.get('transaction_id');
  
  // MercadoPago specific params
  const mpStatus = searchParams.get('status');
  const mpPaymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    // Handle MercadoPago redirect
    if (paymentMethod === 'mercadopago' || transactionId || externalReference) {
      handleMercadoPagoReturn();
    } else if (sessionId) {
      // Handle Stripe
      pollPaymentStatus();
    }
  }, [sessionId, transactionId, externalReference]);

  const handleMercadoPagoReturn = async () => {
    const txnId = transactionId || externalReference;
    if (!txnId) {
      setStatus('error');
      return;
    }

    try {
      const response = await axios.post(`${API}/payments/mercadopago/verify/${txnId}`);
      
      if (response.data.status === 'paid') {
        setStatus('paid');
        toast.success('¡Pago completado exitosamente!');
      } else {
        setStatus('pending');
      }
    } catch (error) {
      setStatus('error');
      toast.error('Error verificando el pago');
    }
  };

  const pollPaymentStatus = async () => {
    if (attempts >= 5) {
      setStatus('pending');
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/stripe/status/${sessionId}`);
      
      if (response.data.status === 'paid') {
        setStatus('paid');
        toast.success('¡Pago completado exitosamente!');
      } else if (response.data.status === 'expired') {
        setStatus('error');
        toast.error('La sesión de pago ha expirado');
      } else {
        // Continue polling
        setAttempts(prev => prev + 1);
        setTimeout(pollPaymentStatus, 2000);
      }
    } catch (error) {
      setStatus('error');
      toast.error('Error verificando el pago');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4" data-testid="payment-success-page">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="py-12 text-center">
          {status === 'checking' && (
            <>
              <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Verificando pago...</h1>
              <p className="text-slate-600">Por favor espera mientras confirmamos tu compra</p>
            </>
          )}

          {status === 'paid' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Pago Exitoso!</h1>
              <p className="text-slate-600 mb-8">
                Tus boletos han sido reservados. Recibirás un email de confirmación.
              </p>
              <div className="flex flex-col gap-3">
                <Button className="btn-primary" onClick={() => navigate('/my-tickets')} data-testid="go-to-tickets-btn">
                  <Ticket className="w-4 h-4 mr-2" />
                  Ver mis boletos
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Volver al inicio
                </Button>
              </div>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-12 h-12 text-yellow-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Procesando...</h1>
              <p className="text-slate-600 mb-8">
                Tu pago está siendo procesado. Recibirás un email cuando se confirme.
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Volver al inicio
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">❌</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Error en el pago</h1>
              <p className="text-slate-600 mb-8">
                No pudimos verificar tu pago. Por favor intenta nuevamente.
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Volver al inicio
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
