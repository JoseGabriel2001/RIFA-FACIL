import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Menu, X, Ticket, User, LogOut, LayoutDashboard, Plus, Crown } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="navbar-logo">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">RifaFacil</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/dashboard') ? 'text-orange-500' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  data-testid="nav-dashboard"
                >
                  Dashboard
                </Link>
                <Link
                  to="/my-tickets"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/my-tickets') ? 'text-orange-500' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  data-testid="nav-my-tickets"
                >
                  Mis Boletos
                </Link>
                <Link
                  to="/create-raffle"
                  className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                  data-testid="nav-create-raffle"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Rifa
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-trigger">
                      <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{user.name}</span>
                      {user.plan === 'premium' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} data-testid="menu-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/my-tickets')} data-testid="menu-my-tickets">
                      <Ticket className="w-4 h-4 mr-2" />
                      Mis Boletos
                    </DropdownMenuItem>
                    {user.plan === 'free' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/pricing')} className="text-orange-500" data-testid="menu-upgrade">
                          <Crown className="w-4 h-4 mr-2" />
                          Actualizar a Premium
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500" data-testid="menu-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link
                  to="/pricing"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  data-testid="nav-pricing"
                >
                  Precios
                </Link>
                <Link to="/login" data-testid="nav-login">
                  <Button variant="ghost" className="font-medium">Iniciar Sesión</Button>
                </Link>
                <Link to="/register" data-testid="nav-register">
                  <Button className="btn-primary">Comenzar Gratis</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-button"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            {user ? (
              <div className="flex flex-col gap-3">
                <Link
                  to="/dashboard"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/my-tickets"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mis Boletos
                </Link>
                <Link
                  to="/create-raffle"
                  className="px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Nueva Rifa
                </Link>
                {user.plan === 'free' && (
                  <Link
                    to="/pricing"
                    className="px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Actualizar a Premium
                  </Link>
                )}
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg text-left"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  to="/pricing"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Precios
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Comenzar Gratis
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
