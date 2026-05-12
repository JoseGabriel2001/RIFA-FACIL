import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Unlink } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * MercadoPago OAuth Connection Component
 * 
 * Allows users to connect their MercadoPago account to receive payments directly.
 * Handles OAuth flow initiation, connection status display, and disconnection.
 */
const MercadoPagoConnect = ({ token }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

    useEffect(() => {
        fetchConnectionStatus();
    }, []);

    const fetchConnectionStatus = async () => {
        try {
            const response = await axios.get(`${API}/mercadopago/oauth/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus(response.data);
        } catch (error) {
            console.error('Error fetching MP connection status:', error);
            toast.error('Error al obtener estado de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const response = await axios.post(
                `${API}/mercadopago/oauth/connect`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const { authorization_url } = response.data;

            // Redirect to MercadoPago authorization page
            window.location.href = authorization_url;

        } catch (error) {
            console.error('Error initiating OAuth:', error);
            toast.error('Error al iniciar conexión con MercadoPago');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await axios.delete(`${API}/mercadopago/oauth/disconnect`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Cuenta de MercadoPago desconectada');
            setStatus({ connected: false, mp_user_id: null, connected_at: null });
            setShowDisconnectDialog(false);

        } catch (error) {
            console.error('Error disconnecting:', error);
            toast.error('Error al desconectar cuenta');
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <img
                                    src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.18.9/mercadopago/logo__large@2x.png"
                                    alt="MercadoPago"
                                    className="h-6"
                                />
                                Conexión MercadoPago
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Conecta tu cuenta para recibir pagos directamente
                            </CardDescription>
                        </div>
                        {status?.connected && (
                            <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Conectado
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {!status?.connected ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-2 text-sm text-blue-900">
                                        <p className="font-medium">¿Por qué conectar tu cuenta?</p>
                                        <ul className="list-disc list-inside space-y-1 text-blue-800">
                                            <li>Recibe pagos directamente en tu cuenta</li>
                                            <li>No necesitas manejar dinero manualmente</li>
                                            <li>Tus clientes pagan con tarjeta, OXXO, SPEI, etc.</li>
                                        </ul>
                                        <p className="font-medium">RifaFacil cobra una comisión automática del 10%</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleConnect}
                                disabled={connecting}
                                className="btn-primary w-full"
                            >
                                {connecting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Conectando...
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Conectar con MercadoPago
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-green-900">
                                            Cuenta conectada exitosamente
                                        </p>
                                        <p className="text-xs text-green-700 mt-1">
                                            Ahora puedes crear rifas y recibir pagos en línea
                                        </p>
                                        {status.mp_user_id && (
                                            <p className="text-xs text-green-600 mt-2">
                                                User ID: {status.mp_user_id}
                                            </p>
                                        )}
                                        {status.connected_at && (
                                            <p className="text-xs text-green-600">
                                                Conectado: {new Date(status.connected_at).toLocaleDateString('es-MX')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => setShowDisconnectDialog(true)}
                                variant="outline"
                                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                            >
                                <Unlink className="w-4 h-4 mr-2" />
                                Desconectar cuenta
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Disconnect Confirmation Dialog */}
            <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Desconectar cuenta de MercadoPago?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Si desconectas tu cuenta, no podrás recibir pagos en línea hasta que la vuelvas a conectar.
                            Tus rifas actuales no se verán afectadas, pero los nuevos compradores no podrán pagar con tarjeta.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDisconnect}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Desconectar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default MercadoPagoConnect;
