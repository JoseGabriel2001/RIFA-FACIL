import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import TicketGrid from '../components/TicketGrid';
import SpinningWheel from '../components/SpinningWheel';
import SpinningWheelPresentation from '../components/SpinningWheelPresentation';
import CashOrdersPanel from '../components/CashOrdersPanel';
import AssignTicketsDialog from '../components/AssignTicketsDialog';
import { copyToClipboard } from '../utils/helpers';
import {
  ArrowLeft,
  Trophy,
  Loader2,
  Copy,
  Users,
  DollarSign,
  Calendar,
  Ticket,
  ExternalLink,
  RotateCw,
  Banknote,
  Target,
  X,
  Check,
  RefreshCw,
  Maximize2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ManageRaffle = () => {
  const { raffleId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinDialogOpen, setSpinDialogOpen] = useState(false);
  const [preselectDialogOpen, setPreselectDialogOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [preselectNumber, setPreselectNumber] = useState('');
  const [preselectLoading, setPreselectLoading] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  
  // Spin state
  const [spinData, setSpinData] = useState(null);
  const [targetNumber, setTargetNumber] = useState(null);
  const [isWinnerSpin, setIsWinnerSpin] = useState(false);

  useEffect(() => {
    fetchRaffle();
  }, [raffleId]);

  const fetchRaffle = async () => {
    try {
      const response = await axios.get(`${API}/raffles/${raffleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRaffle(response.data);
    } catch (error) {
      toast.error('Error al cargar la rifa');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async () => {
    const link = `${window.location.origin}/raffle/${raffle.share_code}`;
    const success = await copyToClipboard(link);
    if (success) {
      toast.success('Link copiado al portapapeles');
    } else {
      // Show the link in a toast so user can copy manually
      toast.info(`Link: ${link}`, { duration: 10000 });
    }
  };

  const openSpinDialog = () => {
    const soldTickets = raffle.tickets?.filter(t => t.status === 'sold') || [];
    if (soldTickets.length === 0) {
      toast.error('No hay boletos vendidos para realizar el sorteo');
      return;
    }
    setSpinData(null);
    setTargetNumber(null);
    setIsWinnerSpin(false);
    setSpinDialogOpen(true);
  };

  const handlePreselectWinner = async () => {
    if (!preselectNumber) {
      toast.error('Ingresa un número válido');
      return;
    }
    
    setPreselectLoading(true);
    try {
      await axios.post(
        `${API}/raffles/${raffleId}/preselect-winner`,
        { winning_number: parseInt(preselectNumber) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Ganador preseleccionado secretamente.');
      setPreselectDialogOpen(false);
      setPreselectNumber('');
      fetchRaffle();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al preseleccionar ganador';
      toast.error(message);
    } finally {
      setPreselectLoading(false);
    }
  };

  const handleClearPreselection = async () => {
    try {
      await axios.delete(
        `${API}/raffles/${raffleId}/preselect-winner`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Preselección eliminada');
      fetchRaffle();
    } catch (error) {
      toast.error('Error al eliminar preselección');
    }
  };

  const handleResetSpins = async () => {
    try {
      await axios.post(
        `${API}/raffles/${raffleId}/reset-spins`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Contador de giros reiniciado');
      fetchRaffle();
    } catch (error) {
      toast.error('Error al reiniciar giros');
    }
  };

  // Call backend to get spin result, then start animation
  const startSpin = async () => {
    try {
      const response = await axios.post(
        `${API}/raffles/${raffleId}/spin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = response.data;
      setSpinData(data);
      
      // Set the target number the wheel should land on
      if (data.is_final_spin && data.show_winner) {
        setTargetNumber(data.winning_number);
        setIsWinnerSpin(true);
      } else {
        setTargetNumber(data.display_number);
        setIsWinnerSpin(false);
      }
      
      // Start the wheel animation
      setIsSpinning(true);
      
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al girar';
      toast.error(message);
    }
  };

  const handleSpinComplete = async (finalNumber, wasWinnerSpin) => {
    if (wasWinnerSpin) {
      // Save winner to backend
      try {
        await axios.post(
          `${API}/raffles/${raffleId}/set-winner`,
          { winning_number: finalNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(`¡El boleto #${finalNumber} es el ganador!`);
        
        // Wait a bit before closing to show celebration
        setTimeout(() => {
          setSpinDialogOpen(false);
          setPresentationMode(false);
          fetchRaffle();
        }, 3000);
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al guardar ganador';
        toast.error(message);
      }
    } else {
      // Not the winner spin - refresh raffle data to get updated spin count
      fetchRaffle();
    }
  };

  // Presentation mode functions
  const openPresentationMode = () => {
    const soldTickets = raffle.tickets?.filter(t => t.status === 'sold') || [];
    if (soldTickets.length === 0) {
      toast.error('No hay boletos vendidos para realizar el sorteo');
      return;
    }
    setSpinData(null);
    setTargetNumber(null);
    setIsWinnerSpin(false);
    setPresentationMode(true);
  };

  const closePresentationMode = () => {
    if (!isSpinning) {
      setPresentationMode(false);
      fetchRaffle();
    }
  };

  const startPresentationSpin = async () => {
    try {
      const response = await axios.post(
        `${API}/raffles/${raffleId}/spin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = response.data;
      setSpinData(data);
      
      if (data.is_final_spin && data.show_winner) {
        setTargetNumber(data.winning_number);
        setIsWinnerSpin(true);
      } else {
        setTargetNumber(data.display_number);
        setIsWinnerSpin(false);
      }
      
      setIsSpinning(true);
      
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al girar';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!raffle) return null;

  const soldTickets = raffle.tickets?.filter(t => t.status === 'sold') || [];
  const availableTickets = raffle.tickets?.filter(t => t.status === 'available') || [];
  const totalRevenue = soldTickets.length * raffle.ticket_price;
  const currentSpinCount = raffle.current_spin_count || 0;
  const spinsRequired = raffle.spins_before_winner || 3;
  const spinsRemaining = Math.max(0, spinsRequired - currentSpinCount);

  const ticketsWithWinner = raffle.tickets?.map(t => ({
    ...t,
    isWinner: t.number === raffle.winning_number
  })) || [];

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="manage-raffle-page">
      <div className="max-w-6xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Dashboard
        </Button>

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{raffle.title}</h1>
              <Badge className={raffle.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                {raffle.status === 'active' ? 'Activa' : 'Finalizada'}
              </Badge>
            </div>
            <p className="text-slate-600">{raffle.description}</p>
            {raffle.status === 'active' && !raffle.winning_number && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  <RotateCw className="w-3 h-3 mr-1" />
                  {currentSpinCount} / {spinsRequired} giros
                </Badge>
                {spinsRemaining > 0 && (
                  <span className="text-sm text-slate-500">
                    ({spinsRemaining} giro{spinsRemaining !== 1 ? 's' : ''} restante{spinsRemaining !== 1 ? 's' : ''} para el ganador)
                  </span>
                )}
                {spinsRemaining === 0 && currentSpinCount > 0 && (
                  <span className="text-sm text-green-600 font-medium">
                    ¡Próximo giro revela al ganador!
                  </span>
                )}
              </div>
            )}
            {raffle.winning_number && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Trophy className="w-5 h-5" />
                  <span className="font-bold">Ganador: Boleto #{raffle.winning_number}</span>
                </div>
                {soldTickets.find(t => t.number === raffle.winning_number) && (
                  <p className="text-yellow-700 mt-1">
                    {soldTickets.find(t => t.number === raffle.winning_number)?.buyer_name} - 
                    {soldTickets.find(t => t.number === raffle.winning_number)?.buyer_email}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={copyShareLink} data-testid="copy-link-btn">
              <Copy className="w-4 h-4 mr-2" />
              Copiar Link
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/raffle/${raffle.share_code}`, '_blank')}
              data-testid="view-public-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver página pública
            </Button>
            {raffle.status === 'active' && !raffle.winning_number && (
              <>
                <Button 
                  onClick={openSpinDialog} 
                  disabled={soldTickets.length === 0} 
                  variant="outline"
                  data-testid="spin-wheel-btn"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Girar Ruleta
                </Button>
                <Button 
                  onClick={openPresentationMode} 
                  disabled={soldTickets.length === 0} 
                  className="bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white"
                  data-testid="presentation-mode-btn"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Modo Presentación
                </Button>
                {/* Hidden preselect button - only visible to admin, discrete styling */}
                {/* <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setPreselectDialogOpen(true)} 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-50 hover:opacity-100 transition-opacity"
                  data-testid="preselect-winner-btn"
                  title="Preseleccionar ganador"
                >
                  <Target className="w-4 h-4" />
                </Button> */}
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">${raffle.ticket_price}</p>
                  <p className="text-xs text-slate-600">Por boleto</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{soldTickets.length}/{raffle.total_tickets}</p>
                  <p className="text-xs text-slate-600">Vendidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
                  <p className="text-xs text-slate-600">Recaudado</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{new Date(raffle.draw_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                  <p className="text-xs text-slate-600">Fecha sorteo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tickets" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tickets" data-testid="tab-tickets">Boletos</TabsTrigger>
            <TabsTrigger value="cash-orders" data-testid="tab-cash-orders">
              <Banknote className="w-4 h-4 mr-1" />
              Pagos en Efectivo
            </TabsTrigger>
            <TabsTrigger value="buyers" data-testid="tab-buyers">Compradores</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Estado de Boletos</CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-50 border-2 border-slate-200 rounded" />
                        Disponible
                      </span>
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-amber-100 border-2 border-amber-300 rounded" />
                        Reservado
                      </span>
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded" />
                        Vendido
                      </span>
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-400 border-2 border-yellow-500 rounded" />
                        Ganador
                      </span>
                    </div>
                  </CardDescription>
                </div>
                {raffle.status === 'active' && (
                  <AssignTicketsDialog
                    raffleId={raffleId}
                    token={token}
                    availableTickets={raffle.tickets || []}
                    onAssigned={fetchRaffle}
                  />
                )}
              </CardHeader>
              <CardContent>
                <TicketGrid 
                  tickets={ticketsWithWinner} 
                  disabled={true}
                  showBuyerName={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash-orders">
            <CashOrdersPanel
              raffleId={raffleId}
              token={token}
              onOrderProcessed={fetchRaffle}
            />
          </TabsContent>

          <TabsContent value="buyers">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Lista de Compradores</CardTitle>
                <CardDescription>{soldTickets.length} boletos vendidos</CardDescription>
              </CardHeader>
              <CardContent>
                {soldTickets.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay boletos vendidos aún</p>
                ) : (
                  <div className="space-y-3">
                    {soldTickets.map((ticket) => (
                      <div 
                        key={ticket.number}
                        className={`p-4 rounded-lg border ${ticket.number === raffle.winning_number ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200'}`}
                        data-testid={`buyer-${ticket.number}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-lg">#{ticket.number}</span>
                            <div>
                              <p className="font-medium text-slate-900">{ticket.buyer_name}</p>
                              <p className="text-sm text-slate-600">{ticket.buyer_email}</p>
                            </div>
                          </div>
                          {ticket.number === raffle.winning_number && (
                            <Badge className="winner-badge text-slate-900">
                              <Trophy className="w-3 h-3 mr-1" />
                              Ganador
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preselect Winner Dialog - Secret */}
        <Dialog open={preselectDialogOpen} onOpenChange={setPreselectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Preseleccionar Ganador
              </DialogTitle>
              <DialogDescription>
                Este número será el ganador cuando se complete el último giro. <strong>Esta información es secreta.</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {raffle.preselected_winner && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                  <span className="text-purple-700">
                    Ganador actual preseleccionado: <strong>#{raffle.preselected_winner}</strong>
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearPreselection}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="preselect-number">Número del boleto ganador</Label>
                <Input
                  id="preselect-number"
                  type="number"
                  placeholder="Ej: 42"
                  value={preselectNumber}
                  onChange={(e) => setPreselectNumber(e.target.value)}
                  data-testid="preselect-winner-input"
                />
                <p className="text-xs text-slate-500">
                  Puede ser cualquier número válido (no excluido). El ganador se revelará en el giro #{spinsRequired}.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreselectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handlePreselectWinner} 
                disabled={preselectLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="confirm-preselect-btn"
              >
                {preselectLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Spinning Wheel Dialog */}
        <Dialog open={spinDialogOpen} onOpenChange={(open) => !isSpinning && setSpinDialogOpen(open)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">
                🎰 Ruleta del Sorteo
              </DialogTitle>
              <DialogDescription className="text-center" asChild>
                <div>
                  <span className="mt-2 inline-block">
                    <Badge variant="outline" className="text-lg px-4 py-1">
                      Giro {currentSpinCount + (isSpinning ? 1 : 0)} de {spinsRequired}
                    </Badge>
                  </span>
                  {!isSpinning && spinData?.is_final_spin === false && (
                    <span className="mt-2 block text-orange-600">¡Sigue girando para encontrar al ganador!</span>
                  )}
                  {!isSpinning && !spinData && spinsRemaining === 1 && (
                    <span className="mt-2 block text-green-600 font-semibold">¡Este giro revela al ganador!</span>
                  )}
                  {!isSpinning && !spinData && spinsRemaining > 1 && (
                    <span className="mt-2 block text-slate-500">Faltan {spinsRemaining} giros para revelar al ganador</span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <SpinningWheel
              tickets={raffle.tickets || []}
              onSpinComplete={handleSpinComplete}
              isSpinning={isSpinning}
              setIsSpinning={setIsSpinning}
              targetNumber={targetNumber}
              isWinnerSpin={isWinnerSpin}
            />

            {!isSpinning && (
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {currentSpinCount > 0 && !raffle.winning_number && (
                  <Button 
                    variant="ghost"
                    onClick={handleResetSpins}
                    className="w-full sm:w-auto text-slate-500"
                    data-testid="reset-spins-btn"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reiniciar giros
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setSpinDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cerrar
                </Button>
                {!raffle.winning_number && (
                  <Button 
                    onClick={startSpin}
                    className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white"
                    data-testid="start-spin-btn"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    {spinsRemaining <= 1 ? '¡Giro Final!' : `Girar (${spinsRemaining} restantes)`}
                  </Button>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Presentation Mode */}
        {presentationMode && (
          <SpinningWheelPresentation
            tickets={raffle.tickets || []}
            onSpinComplete={handleSpinComplete}
            isSpinning={isSpinning}
            setIsSpinning={setIsSpinning}
            targetNumber={targetNumber}
            isWinnerSpin={isWinnerSpin}
            raffleName={raffle.title}
            prizeName={raffle.prize}
            onClose={closePresentationMode}
            onStartSpin={startPresentationSpin}
            spinNumber={currentSpinCount + 1}
            totalSpins={spinsRequired}
          />
        )}
      </div>
    </div>
  );
};

export default ManageRaffle;
