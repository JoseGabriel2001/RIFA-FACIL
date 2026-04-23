import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { copyToClipboard } from '../utils/helpers';
import {
  Plus,
  Ticket,
  Trophy,
  DollarSign,
  TrendingUp,
  Eye,
  Share2,
  MoreVertical,
  Edit,
  Trash2,
  Crown,
  Loader2,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import MercadoPagoConnect from '../components/MercadoPagoConnect';


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteRaffleId, setDeleteRaffleId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rafflesRes, statsRes] = await Promise.all([
        axios.get(`${API}/raffles`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setRaffles(rafflesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRaffleId) return;
    try {
      await axios.delete(`${API}/raffles/${deleteRaffleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Rifa eliminada');
      setRaffles(raffles.filter(r => r.id !== deleteRaffleId));
    } catch (error) {
      toast.error('Error al eliminar rifa');
    } finally {
      setDeleteRaffleId(null);
    }
  };

  const copyShareLink = async (shareCode) => {
    const link = `${window.location.origin}/raffle/${shareCode}`;
    const success = await copyToClipboard(link);
    if (success) {
      toast.success('Link copiado al portapapeles');
    } else {
      toast.info(`Link: ${link}`, { duration: 10000 });
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: { label: 'Activa', className: 'bg-green-100 text-green-700' },
      completed: { label: 'Finalizada', className: 'bg-slate-100 text-slate-700' },
      paused: { label: 'Pausada', className: 'bg-yellow-100 text-yellow-700' }
    };
    const variant = variants[status] || variants.active;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Hola, {user?.name}!</h1>
            <p className="text-slate-600 mt-1">
              Plan: <span className="font-medium">{user?.plan === 'premium' ? 'Premium' : 'Gratuito'}</span>
              {user?.plan === 'free' && (
                <Link to="/pricing" className="ml-2 text-orange-500 hover:text-orange-600">
                  <Crown className="w-4 h-4 inline mr-1" />
                  Actualizar
                </Link>
              )}
            </p>
          </div>
          <Link to="/create-raffle" data-testid="create-raffle-btn">
            <Button className="btn-primary">
              <Plus className="w-5 h-5 mr-2" />
              Nueva Rifa
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-sm" data-testid="stat-total-raffles">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.total_raffles}</p>
                    <p className="text-sm text-slate-600">Rifas Totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm" data-testid="stat-active-raffles">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.active_raffles}</p>
                    <p className="text-sm text-slate-600">Rifas Activas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm" data-testid="stat-tickets-sold">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.total_tickets_sold}</p>
                    <p className="text-sm text-slate-600">Boletos Vendidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm" data-testid="stat-revenue">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">${stats.total_revenue.toFixed(2)}</p>
                    <p className="text-sm text-slate-600">Ingresos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Raffles List */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Mis Rifas</h2>
          {raffles.length === 0 ? (
            <Card className="border-0 shadow-sm" data-testid="no-raffles-card">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No tienes rifas aún</h3>
                <p className="text-slate-600 mb-6">Crea tu primera rifa y comienza a vender boletos</p>
                <Link to="/create-raffle">
                  <Button className="btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Crear mi primera rifa
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {raffles.map((raffle) => (
                <Card key={raffle.id} className="border-0 shadow-sm card-hover" data-testid={`raffle-card-${raffle.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{raffle.title}</h3>
                          {getStatusBadge(raffle.status)}
                          {raffle.winning_number && (
                            <Badge className="winner-badge text-slate-900">
                              <Trophy className="w-3 h-3 mr-1" />
                              Ganador: #{raffle.winning_number}
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-600 mb-3">{raffle.prize}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Ticket className="w-4 h-4" />
                            {raffle.sold_tickets || 0}/{raffle.total_tickets} vendidos
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${raffle.ticket_price} MXN
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(raffle.draw_date).toLocaleDateString('es-MX')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyShareLink(raffle.share_code)}
                          data-testid={`share-btn-${raffle.id}`}
                        >
                          <Share2 className="w-4 h-4 mr-1" />
                          Compartir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/raffle/${raffle.share_code}`)}
                          data-testid={`view-btn-${raffle.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`menu-btn-${raffle.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/manage-raffle/${raffle.id}`)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Administrar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteRaffleId(raffle.id)}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        {/* MercadoPago Connection */}
        <div className="mb-8">
          <MercadoPagoConnect token={token} />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRaffleId} onOpenChange={() => setDeleteRaffleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta rifa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos de la rifa incluyendo los boletos vendidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
