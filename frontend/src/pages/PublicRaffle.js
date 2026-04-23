import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import axios from 'axios';
import TicketGrid from '../components/TicketGrid';
import { copyToClipboard } from '../utils/helpers';
import {
  Share2,
  Trophy,
  Loader2,
  Calendar,
  Ticket,
  User,
  Mail,
  Phone,
  CreditCard,
  Gift,
  Banknote,
  Clock,
  CheckCircle
} from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID || '';
const MERCADOPAGO_PUBLIC_KEY = process.env.REACT_APP_MERCADOPAGO_PUBLIC_KEY || '';

const PublicRaffle = () => {
  const { shareCode } = useParams();
  const [raffle, setRaffle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [cashOrderSuccess, setCashOrderSuccess] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mercadopago');
  const [buyerInfo, setBuyerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [processing, setProcessing] = useState(false);



  const fetchRaffle = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/public/raffle/${shareCode}`);
      setRaffle(response.data);
    } catch (error) {
      toast.error('Rifa no encontrada');
    } finally {
      setLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    fetchRaffle();
  }, [fetchRaffle]);

  const handleTicketClick = (number) => {
    if (selectedTickets.includes(number)) {
      setSelectedTickets(selectedTickets.filter(n => n !== number));
    } else {
      setSelectedTickets([...selectedTickets, number]);
    }
  };

  const handlePurchase = () => {
    if (selectedTickets.length === 0) {
      toast.error('Selecciona al menos un boleto');
      return;
    }
    setCashOrderSuccess(null);
    setPurchaseDialogOpen(true);
  };

  const handleCashPayment = async () => {
    if (!buyerInfo.name || !buyerInfo.email) {
      toast.error('Por favor completa tu nombre y email');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/payments/cash/create-order`, {
        raffle_id: raffle.id,
        ticket_numbers: selectedTickets,
        buyer_name: buyerInfo.name,
        buyer_email: buyerInfo.email,
        buyer_phone: buyerInfo.phone
      });

      setCashOrderSuccess({
        orderId: response.data.order_id,
        expiresAt: response.data.expires_at,
        message: response.data.message
      });
      toast.success('¡Orden creada! Tus boletos están reservados.');
      setSelectedTickets([]);
      fetchRaffle();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al crear la orden';
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  // const handleStripePayment = async () => {
  //   if (!buyerInfo.name || !buyerInfo.email) {
  //     toast.error('Por favor completa tu nombre y email');
  //     return;
  //   }

  //   setProcessing(true);
  //   try {
  //     const response = await axios.post(`${API}/payments/stripe/checkout`, {
  //       raffle_id: raffle.id,
  //       ticket_numbers: selectedTickets,
  //       buyer_name: buyerInfo.name,
  //       buyer_email: buyerInfo.email,
  //       buyer_phone: buyerInfo.phone,
  //       origin_url: window.location.origin
  //     });

  //     window.location.href = response.data.checkout_url;
  //   } catch (error) {
  //     const message = error.response?.data?.detail || 'Error al procesar el pago';
  //     toast.error(message);
  //     setProcessing(false);
  //   }
  // };

  const handlePayPalCreateOrder = async () => {
    try {
      const response = await axios.post(`${API}/payments/paypal/create-order`, {
        raffle_id: raffle.id,
        ticket_numbers: selectedTickets,
        buyer_name: buyerInfo.name,
        buyer_email: buyerInfo.email,
        buyer_phone: buyerInfo.phone,
        origin_url: window.location.origin
      });
      return response.data.order_id;
    } catch (error) {
      toast.error('Error al crear orden de PayPal');
      throw error;
    }
  };

  const handlePayPalApprove = async (data) => {
    try {
      const response = await axios.post(`${API}/payments/paypal/capture-order/${data.orderID}`);
      if (response.data.status === 'paid') {
        toast.success('¡Pago completado! Tus boletos han sido reservados.');
        setPurchaseDialogOpen(false);
        setSelectedTickets([]);
        fetchRaffle();
      }
    } catch (error) {
      toast.error('Error al capturar el pago');
    }
  };

  const handleMercadoPagoPayment = async () => {
    if (!buyerInfo.name || !buyerInfo.email) {
      toast.error('Por favor completa tu nombre y email');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/payments/mercadopago/create-preference`, {
        raffle_id: raffle.id,
        ticket_numbers: selectedTickets,
        buyer_name: buyerInfo.name,
        buyer_email: buyerInfo.email,
        buyer_phone: buyerInfo.phone,
        origin_url: window.location.origin
      });
      console.log('Preferencia de MercadoPago creada:', response);

      // Use sandbox_init_point for testing, init_point for production
      const checkoutUrl = response.data.init_point || response.data.sandbox_init_point;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error('No se pudo obtener el enlace de pago');
        setProcessing(false);
      }
    } catch (error) {
      console.error('Error al crear preferencia de MercadoPago:', error);
      const message = error.response?.data?.detail || 'Error al procesar el pago';
      toast.error(message);
      setProcessing(false);
    }
  };

  const copyShareLink = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      toast.success('Link copiado');
    } else {
      toast.info(`Link: ${window.location.href}`, { duration: 10000 });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-slate-600">Rifa no encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ticketsWithWinner = raffle.tickets?.map(t => ({
    ...t,
    isWinner: t.number === raffle.winning_number
  })) || [];

  const availableCount = raffle.tickets?.filter(t => t.status === 'available').length || 0;
  const soldCount = raffle.tickets?.filter(t => t.status === 'sold').length || 0;
  const totalAmount = selectedTickets.length * raffle.ticket_price;
  const isCompleted = raffle.status === 'completed' || raffle.winning_number;

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="public-raffle-page">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <Card className="border-0 shadow-lg mb-8 overflow-hidden">
          {raffle.prize_image && (
            <div className="h-64 bg-slate-200">
              <img
                src={raffle.prize_image}
                alt={raffle.prize}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Badge className={isCompleted ? 'bg-slate-100 text-slate-700' : 'bg-green-100 text-green-700'}>
                    {isCompleted ? 'Finalizada' : 'Activa'}
                  </Badge>
                  <span className="text-sm text-slate-500">por {raffle.owner_name}</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{raffle.title}</h1>
                <p className="text-slate-600 mb-4">{raffle.description}</p>

                <div className="flex items-center gap-2 text-lg">
                  <Gift className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-slate-900">Premio: {raffle.prize}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <p className="text-3xl font-bold text-orange-500">${raffle.ticket_price} MXN</p>
                  <p className="text-sm text-slate-500">por boleto</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyShareLink} data-testid="share-btn">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir
                </Button>
              </div>
            </div>

            {/* Winner Announcement */}
            {raffle.winning_number && (
              <div className="mt-6 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-900" />
                  </div>
                  <div>
                    <p className="font-bold text-yellow-900 text-lg">¡Tenemos ganador!</p>
                    <p className="text-yellow-800">Boleto ganador: <span className="font-mono font-bold">#{raffle.winning_number}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{soldCount}/{raffle.total_tickets}</p>
                <p className="text-sm text-slate-600">Vendidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{availableCount}</p>
                <p className="text-sm text-slate-600">Disponibles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{new Date(raffle.draw_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                <p className="text-sm text-slate-600">Sorteo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Selection */}
        <Card className="border-0 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Selecciona tus boletos
            </CardTitle>
            <CardDescription>
              <div className="flex flex-wrap gap-4 mt-2">
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-50 border-2 border-slate-200 rounded" />
                  Disponible
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 border-2 border-orange-600 rounded" />
                  Seleccionado
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-100 border-2 border-amber-300 rounded" />
                  Reservado
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded" />
                  Vendido
                </span>
                {raffle.winning_number && (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-400 border-2 border-yellow-500 rounded" />
                    Ganador
                  </span>
                )}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TicketGrid
              tickets={ticketsWithWinner}
              selectedTickets={selectedTickets}
              onTicketClick={handleTicketClick}
              disabled={isCompleted}
            />
          </CardContent>
        </Card>

        {/* Purchase Summary */}
        {!isCompleted && selectedTickets.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-slate-600">
                  {selectedTickets.length} boleto{selectedTickets.length > 1 ? 's' : ''} seleccionado{selectedTickets.length > 1 ? 's' : ''}
                </p>
                <p className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)} MXN</p>
              </div>
              <Button className="btn-primary text-lg px-8" onClick={handlePurchase} data-testid="buy-tickets-btn">
                <CreditCard className="w-5 h-5 mr-2" />
                Comprar Boletos
              </Button>
            </div>
          </div>
        )}

        {/* Purchase Dialog */}
        <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
          <DialogContent className="max-w-md">
            {cashOrderSuccess ? (
              // Cash order success view
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    ¡Orden Creada!
                  </DialogTitle>
                </DialogHeader>
                <div className="py-6 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Boletos Reservados</h3>
                  <p className="text-slate-600 mb-4">{cashOrderSuccess.message}</p>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                    <p className="text-sm text-amber-800">
                      <strong>Importante:</strong> Tu reserva expira en 48 horas.
                      Contacta al organizador para coordinar el pago en efectivo.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => { setPurchaseDialogOpen(false); setCashOrderSuccess(null); }} className="w-full">
                    Entendido
                  </Button>
                </DialogFooter>
              </>
            ) : (
              // Normal purchase form
              <>
                <DialogHeader>
                  <DialogTitle>Completa tu compra</DialogTitle>
                  <DialogDescription>
                    {selectedTickets.length} boleto{selectedTickets.length > 1 ? 's' : ''}: #{selectedTickets.sort((a, b) => a - b).join(', #')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Buyer Info */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="buyer-name" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nombre completo *
                      </Label>
                      <Input
                        id="buyer-name"
                        placeholder="Juan Pérez"
                        value={buyerInfo.name}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, name: e.target.value })}
                        data-testid="buyer-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buyer-email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Correo electrónico *
                      </Label>
                      <Input
                        id="buyer-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={buyerInfo.email}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, email: e.target.value })}
                        data-testid="buyer-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buyer-phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Teléfono (opcional)
                      </Label>
                      <Input
                        id="buyer-phone"
                        placeholder="55 1234 5678"
                        value={buyerInfo.phone}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, phone: e.target.value })}
                        data-testid="buyer-phone-input"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label>Método de pago</Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                        <RadioGroupItem value="mercadopago" id="mercadopago" data-testid="radio-mercadopago" />
                        <Label htmlFor="mercadopago" className="flex items-center gap-2 cursor-pointer flex-1">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          <div>
                            <span>MercadoPago</span>
                            <p className="text-xs text-slate-500 font-normal">Tarjeta, OXXO, SPEI y más</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                        <RadioGroupItem value="cash" id="cash" data-testid="radio-cash" />
                        <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Banknote className="w-4 h-4" />
                          <div>
                            <span>Efectivo</span>
                            <p className="text-xs text-slate-500 font-normal">Reserva por 48h mientras pagas</p>
                          </div>
                        </Label>
                      </div>
                      {/* <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                        <RadioGroupItem value="stripe" id="stripe" data-testid="radio-stripe" />
                        <Label htmlFor="stripe" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="w-4 h-4" />
                          Stripe (Internacional)
                        </Label>
                      </div> */}
                      {PAYPAL_CLIENT_ID && (
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                          <RadioGroupItem value="paypal" id="paypal" data-testid="radio-paypal" />
                          <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer">
                            PayPal
                          </Label>
                        </div>
                      )}
                    </RadioGroup>
                  </div>

                  {/* Total */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total a pagar:</span>
                      <span className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)} MXN</span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex-col gap-2">
                  {paymentMethod === 'mercadopago' ? (
                    <Button
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={handleMercadoPagoPayment}
                      disabled={processing || !buyerInfo.name || !buyerInfo.email}
                      data-testid="pay-mercadopago-btn"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redirigiendo a MercadoPago...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pagar con MercadoPago
                        </>
                      )}
                    </Button>
                  ) : paymentMethod === 'cash' ? (
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={handleCashPayment}
                      disabled={processing || !buyerInfo.name || !buyerInfo.email}
                      data-testid="pay-cash-btn"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando reserva...
                        </>
                      ) : (
                        <>
                          <Banknote className="w-4 h-4 mr-2" />
                          Reservar boletos (pago en efectivo)
                        </>
                      )}
                    </Button>
                  )
                    // : paymentMethod === 'stripe' ? (
                    //   <Button
                    //     className="w-full btn-primary"
                    //     onClick={handleStripePayment}
                    //     disabled={processing || !buyerInfo.name || !buyerInfo.email}
                    //     data-testid="pay-stripe-btn"
                    //   >
                    //     {processing ? (
                    //       <>
                    //         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    //         Procesando...
                    //       </>
                    //     ) : (
                    //       <>
                    //         <CreditCard className="w-4 h-4 mr-2" />
                    //         Pagar con Stripe
                    //       </>
                    //     )}
                    //   </Button>
                    // ) 
                    : (
                      PAYPAL_CLIENT_ID && buyerInfo.name && buyerInfo.email ? (
                        <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: "MXN" }}>
                          <PayPalButtons
                            createOrder={handlePayPalCreateOrder}
                            onApprove={handlePayPalApprove}
                            style={{ layout: "horizontal" }}
                          />
                        </PayPalScriptProvider>
                      ) : (
                        <p className="text-sm text-slate-500 text-center">Completa tu información para ver opciones de PayPal</p>
                      )
                    )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PublicRaffle;
