import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Loader2, Download, ExternalLink, Store, Calendar, Barcode, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Cash Payment Component
 * 
 * Generates OXXO payment ticket via Checkout API.
 * Displays ticket information and download link.
 * 
 * Props:
 * - raffle: Raffle object
 * - selectedTickets: Array of ticket numbers
 * - buyerInfo: Object with name, email, phone
 * - onSuccess: Callback when ticket generated
 * - onError: Callback on error
 */
const CashPaymentDisplay = ({ raffle, selectedTickets, buyerInfo, onSuccess, onError }) => {
    const [loading, setLoading] = useState(false);
    const [ticketData, setTicketData] = useState(null);
    const [error, setError] = useState(null);

    const totalAmount = raffle.ticket_price * selectedTickets.length;

    const generateTicket = async () => {
        if (!buyerInfo.name || !buyerInfo.email) {
            toast.error('Por favor completa tu nombre y email');
            return;
        }

        setLoading(true);
        setError(null);  // Limpiar errores previos

        try {
            const response = await axios.post(`${API}/payments/cash/generate`, {
                raffle_id: raffle.id,
                ticket_numbers: selectedTickets,
                buyer_name: buyerInfo.name,
                buyer_email: buyerInfo.email,
                buyer_phone: buyerInfo.phone || ''
            });

            // Verify the response has the expected data
            if (!response.data) {
                throw new Error('Respuesta vacía del servidor');
            }

            // Check all required fields
            const requiredFields = ['transaction_id', 'payment_id', 'amount'];
            const missingFields = requiredFields.filter(field => !(field in response.data));
            if (missingFields.length > 0) {
                console.warn('Missing fields in response:', missingFields);
            }

            setTicketData(response.data);
            toast.success('¡Ticket generado! Descárgalo y paga en OXXO');

            if (onSuccess) onSuccess(response.data);

        } catch (error) {
            console.error('Error generating cash payment ticket:', error);
            const message = 'Error generando el ticket. Intenta de nuevo más tarde.';
            setError(message);
            toast.error(message);
            if (onError) onError(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No especificada';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-900">
                            <p className="font-medium mb-1">Error al generar el ticket</p>
                            <p className="text-red-800">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {!ticketData ? (
                // Generate Ticket View
                <>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <Store className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-orange-900">
                                <p className="font-medium mb-2">¿Cómo pagar en efectivo?</p>
                                <ol className="list-decimal list-inside space-y-1 text-orange-800">
                                    <li>Genera tu ticket de pago</li>
                                    <li>Descarga o guarda el código de barras</li>
                                    <li>Ve a cualquier OXXO</li>
                                    <li>Menciona que pagarás un servicio de MercadoPago</li>
                                    <li>Proporciona el código o escanea el código de barras</li>
                                    <li>Realiza el pago en efectivo</li>
                                    <li>¡Recibirás tu confirmación por email!</li>
                                    <li>El limite de pago es de un 1 dia</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Amount Summary */}
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-600">Total a pagar:</span>
                            <span className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)} MXN</span>
                        </div>
                        <p className="text-xs text-slate-500">
                            {selectedTickets.length} boleto{selectedTickets.length > 1 ? 's' : ''} × ${raffle.ticket_price.toFixed(2)}
                        </p>
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={generateTicket}
                        disabled={loading}
                        className="w-full btn-primary text-lg py-6"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Generando ticket...
                            </>
                        ) : (
                            <>
                                <Store className="w-5 h-5 mr-2" />
                                Generar ticket para OXXO
                            </>
                        )}
                    </Button>

                    <div className="text-xs text-center text-slate-500">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Tendrás 3 días para completar el pago
                    </div>
                </>
            ) : (
                // Ticket Generated View
                <div className="space-y-4">
                    {/* Success Banner */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Store className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-green-900 mb-1">¡Ticket generado exitosamente!</p>
                                <p className="text-sm text-green-800">
                                    {ticketData.message}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Ticket Info Card */}
                    <div className="border-2 border-orange-200 rounded-lg p-6 space-y-4">
                        <div className="text-center pb-4 border-b border-orange-200">
                            <p className="text-sm text-slate-600 mb-1">Monto a pagar</p>
                            <p className="text-3xl font-bold text-orange-600">${ticketData.amount.toFixed(2)}</p>
                            <p className="text-xs text-slate-500 mt-1">MXN</p>
                        </div>

                        {ticketData.barcode && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Barcode className="w-4 h-4" />
                                    <span className="text-sm font-medium">Código de referencia:</span>
                                </div>
                                <div className="bg-slate-100 p-3 rounded text-center">
                                    <p className="text-lg font-mono font-bold text-slate-900">{ticketData.barcode}</p>
                                </div>
                            </div>
                        )}

                        {ticketData.expiration_date && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm font-medium">Fecha de expiración:</span>
                                </div>
                                <p className="text-sm text-slate-900 pl-6">{formatDate(ticketData.expiration_date)}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-4">
                            {ticketData.ticket_url && (
                                <Button
                                    onClick={() => window.open(ticketData.ticket_url, '_blank')}
                                    className="w-full bg-orange-500 hover:bg-orange-600"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Descargar ticket PDF
                                </Button>
                            )}

                            {ticketData.external_resource_url && (
                                <Button
                                    onClick={() => window.open(ticketData.external_resource_url, '_blank')}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Ver en MercadoPago
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-900">
                                <p className="font-medium mb-2">Importante:</p>
                                <ul className="list-disc list-inside space-y-1 text-blue-800">
                                    <li>Guarda tu código de referencia</li>
                                    <li>Paga antes de la fecha de expiración</li>
                                    <li>Recibirás confirmación por email una vez que pagues</li>
                                    <li>Tus boletos se reservarán después del pago</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashPaymentDisplay;