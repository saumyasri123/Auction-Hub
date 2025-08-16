import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authManager } from "@/lib/auth";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const user = authManager.getCurrentUser();

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: authManager.getAuthHeader(),
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
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
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500">
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="px-3 py-3 cursor-pointer"
                onClick={() =>
                  !notification.readAt && handleMarkAsRead(notification.id)
                }
              >
                <div className="flex items-start space-x-2 w-full">
                  {!notification.readAt && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-1 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {notification.type === "new_bid" && "New Bid"}
                      {notification.type === "outbid" && "Outbid"}
                      {notification.type === "auction_won" && "Auction Won"}
                      {notification.type === "auction_ended" && "Auction Ended"}
                      {notification.type === "bid_accepted" && "Bid Accepted"}
                      {notification.type === "bid_rejected" && "Bid Rejected"}
                      {notification.type === "counter_offer" && "Counter Offer"}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
