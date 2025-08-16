import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, LogOut } from "lucide-react";
import { authManager } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export function Navigation() {
  const [location] = useLocation();
  const [user, setUser] = useState(authManager.getCurrentUser());

  useEffect(() => {
    const unsubscribe = authManager.subscribe((state) => {
      setUser(state.user);
    });
    return unsubscribe;
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const unreadCount = notifications?.filter((n) => !n.readAt).length || 0;

  const handleLogout = () => {
    authManager.logout();
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary">AuctionHub</h1>
            </Link>

            {user && (
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link
                    href="/"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location === "/"
                        ? "text-primary"
                        : "text-gray-700 hover:text-primary"
                    }`}
                  >
                    Auctions
                  </Link>

                  {user.role === "seller" && (
                    <Link
                      href="/create-auction"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location === "/create-auction"
                          ? "text-primary"
                          : "text-gray-700 hover:text-primary"
                      }`}
                    >
                      Create Auction
                    </Link>
                  )}

                  {user.role === "seller" && (
                    <Link
                      href="/seller-dashboard"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location === "/seller-dashboard"
                          ? "text-primary"
                          : "text-gray-700 hover:text-primary"
                      }`}
                    >
                      My Auctions
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <Button variant="ghost" size="sm" className="p-2">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* User Menu */}
                <div className="flex items-center space-x-2">
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
