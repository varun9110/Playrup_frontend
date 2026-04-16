import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notifications/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu, X, User, LogOut } from 'lucide-react';

interface NavbarProps {
  onLogout?: () => void;
}

export default function Navbar({ onLogout }: NavbarProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user?.role || 'user';

  // Safe extraction of user properties that might be encrypted objects
  const getUserName = () => {
    if (!user) return 'User';
    if (typeof user.name === 'string') return user.name;
    if (user.name?.content) return user.name.content;
    return 'User';
  };

  const getUserEmail = () => {
    if (!user) return '';
    if (typeof user.email === 'string') return user.email;
    if (user.email?.content) return user.email.content;
    return '';
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  const mainNavItems = [
    { label: 'Dashboard', path: '/dashboard', roles: ['user'] },
    { label: 'Browse Activities', path: '/activities', roles: ['user'] },
    { label: 'My Bookings', path: '/my-bookings', roles: ['user'] },
    { label: 'Host Activity', path: '/host-activity', roles: ['user'] },
    { label: 'Academy Dashboard', path: '/academy-dashboard', roles: ['academy'] },
    { label: 'Admin Panel', path: '/adminlanding', roles: ['superadmin'] },
  ];

  const filteredNavItems = mainNavItems.filter(item => item.roles.includes(userRole));

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
              P
            </div>
            <span className="hidden sm:inline text-slate-900">PlayrUp</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {filteredNavItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button variant="ghost" className="text-slate-700 hover:text-slate-900">
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <NotificationBell inline={true} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full w-10 h-10 hover:bg-slate-100"
                >
                  <User className="w-5 h-5 text-slate-700" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-semibold text-slate-900">{getUserName()}</p>
                  <p className="text-xs text-slate-500">{getUserEmail()}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            <NotificationBell inline={true} />

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-bold text-slate-900">Menu</h2>
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-2 mb-6">
                  {filteredNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                    >
                      <div className="p-3 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 font-medium">
                        {item.label}
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-sm font-semibold text-slate-900">{getUserName()}</p>
                    <p className="text-xs text-slate-500">{getUserEmail()}</p>
                  </div>

                  <Link to="/profile" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={() => {
                      setOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
