import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Card Payment Brick Component
 * 
 * Integrates MercadoPago's Card Payment Brick for embedded card payment forms.
 * Uses Checkout API instead of Checkout Pro for a seamless in-app experience.
 * 
 * Props:
 * - raffle: Raffle object with pricing info
 * - selectedTickets: Array of ticket numbers
 * - buyerInfo: Object with name, email, phone
 * - onSuccess: Callback when payment succeeds
 * - onError: Callback when payment fails
 */
const CardPaymentBrick = ({ raffle, selectedTickets, buyerInfo, onSuccess, onError }) => {
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [mp, setMp] = useState(null);
    const brickController = useRef(null);
    const containerRef = useRef(null);
    const isInitializedRef = useRef(false);
    const isMountedRef = useRef(true);

    // Calculate total amount
    const totalAmount = raffle.ticket_price * selectedTickets.length;

    useEffect(() => {
        isMountedRef.current = true;

        // Prevent multiple initializations
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            initializeBrick();
        }

        return () => {
            isMountedRef.current = false;
            // Cleanup: unmount brick when component unmounts
            if (brickController.current) {
                try {
                    brickController.current.unmount();
                } catch (e) {
                    console.debug('Error unmounting brick:', e);
                }
            }
        };
    }, [raffle.id]); // Only re-initialize if raffle ID changes

    const initializeBrick = async () => {
        try {
            if (!isMountedRef.current) return;

            // Get public key from backend
            const response = await axios.get(`${API}/payments/mercadopago/public-key`, { params: { fle_id: raffle.id } });

            let publicKey = response.data.public_key;
            // publicKey = "TEST-b02ea34f-91ff-4b34-ae79-d8a2a6f48232"

            if (!publicKey) {
                throw new Error('No se pudo obtener la clave pública de MercadoPago');
            }

            // Verify SDK is loaded
            if (!window.MercadoPago) {
                throw new Error('SDK de MercadoPago no se cargó. Verifica que el script esté incluido en index.html');
            }

            // Initialize MercadoPago SDK
            const mercadopago = new window.MercadoPago(publicKey, {
                locale: 'es-MX'
            });

            if (!isMountedRef.current) return;
            setMp(mercadopago);

            // Wait for DOM to be ready
            await new Promise((resolve) => setTimeout(resolve, 100));

            if (!isMountedRef.current) return;

            // Unmount any existing brick before creating a new one
            if (brickController.current) {
                try {
                    brickController.current.unmount();
                } catch (e) {
                    console.debug('Error unmounting previous brick:', e);
                }
                brickController.current = null;
            }

            // Create Card Payment Brick
            const brickInstance = await mercadopago.bricks().create('cardPayment', 'cardPaymentBrick', {
                initialization: {
                    amount: totalAmount,
                    payer: {
                        email: buyerInfo.email,
                    }
                },
                customization: {
                    visual: {
                        style: {
                            theme: 'default'
                        }
                    },
                    paymentMethods: {
                        maxInstallments: 1
                    }
                },
                callbacks: {
                    onReady: () => {
                        if (isMountedRef.current) {
                            setLoading(false);
                        }
                    },
                    onSubmit: async (formData) => {
                        await handlePaymentSubmit(formData);
                    },
                    onError: (error) => {
                        console.error('Brick error:', error);
                        if (isMountedRef.current) {
                            let userMessage = 'Error en el formulario de pago';
                            if (error?.cause === 'secure_fields_card_token_creation_failed') {
                                userMessage = 'Error al procesar los datos de la tarjeta. Verifica que los datos sean correctos e intenta de nuevo.';
                            } else if (error?.message) {
                                userMessage = error.message;
                            }
                            toast.error(userMessage);
                        }
                    }
                }
            });

            if (isMountedRef.current) {
                brickController.current = brickInstance;
            } else {
                // Component was unmounted, clean up the brick
                try {
                    brickInstance.unmount();
                } catch (e) {
                    console.debug('Error unmounting brick during unmount:', e);
                }
            }

        } catch (error) {
            if (!isMountedRef.current) return;

            console.error('Error initializing brick:', error);
            const errorMsg = error?.message || 'Error al cargar el formulario de pago';
            toast.error(errorMsg);
            if (onError) onError(error);
        }
    };

    const handlePaymentSubmit = async (formData) => {
        setProcessing(true);


        try {
            const paymentData = {
                raffle_id: raffle.id,
                ticket_numbers: selectedTickets,
                buyer_name: buyerInfo.name,
                buyer_email: buyerInfo.email,
                buyer_phone: buyerInfo.phone || '',
                token: formData.token,
                payment_method_id: formData.payment_method_id,
                issuer_id: formData.issuer_id,
                installments: formData.installments,
                // Identification fields are optional for MercadoPago Checkout API
                identification_type: formData.payer?.identification?.type || null,
                identification_number: formData.payer?.identification?.number || null
            };

            const response = await axios.post(`${API}/payments/card/process`, paymentData);

            if (response.data.success) {
                const status = response.data.status;

                if (status === 'approved') {
                    toast.success('¡Pago aprobado! Tus boletos han sido reservados.');
                    if (onSuccess) onSuccess(response.data);
                } else if (status === 'in_process' || status === 'pending') {
                    toast.info('Pago en proceso. Te notificaremos cuando se confirme.');
                    if (onSuccess) onSuccess(response.data);
                } else if (status === 'rejected') {
                    toast.error(`Pago rechazado: ${response.data.status_detail}`);
                    setProcessing(false);
                } else {
                    toast.warning('Estado de pago desconocido. Verifica tu email.');
                    if (onSuccess) onSuccess(response.data);
                }
            } else {
                toast.error('Error procesando el pago');
                setProcessing(false);
            }

        } catch (error) {
            console.error('Payment processing error:', error);
            const message = error.response?.data?.detail || 'Error al procesar el pago';
            toast.error(message);
            setProcessing(false);
            if (onError) onError(error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <span className="ml-3 text-slate-600">Cargando formulario de pago...</span>
                </div>
            )}

            {/* Processing State Overlay */}
            {processing && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50 rounded-lg">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-slate-900">Procesando pago...</p>
                        <p className="text-sm text-slate-600 mt-2">Por favor espera, no cierres esta ventana</p>
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                        <p className="font-medium mb-1">Pago seguro con MercadoPago</p>
                        <p className="text-blue-800">
                            Tus datos están protegidos. Puedes pagar con tarjeta de crédito o débito.
                            {totalAmount >= 300 && ' Hasta 12 meses sin intereses con bancos participantes.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Card Payment Brick Container */}
            <div
                id="cardPaymentBrick"
                ref={containerRef}
                className="relative"
                style={{
                    minHeight: loading ? '200px' : 'auto',
                    opacity: loading ? 0.5 : 1,
                    transition: 'opacity 0.3s ease-in-out'
                }}
            ></div>

            {/* Amount Summary */}
            {!loading && (
                <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-600">Total a pagar:</span>
                        <span className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)} MXN</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {selectedTickets.length} boleto{selectedTickets.length > 1 ? 's' : ''} × ${raffle.ticket_price.toFixed(2)}
                    </p>
                </div>
            )}

            {/* Submit button is handled by the Brick itself */}
        </div>
    );
};

export default CardPaymentBrick;
