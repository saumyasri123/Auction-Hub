import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authManager } from "@/lib/auth";
import { Play, Pause, RotateCcw } from "lucide-react";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const user = authManager.getCurrentUser();

  // Fetch all auctions
  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["/api/admin/auctions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/auctions", {
        headers: authManager.getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to fetch auctions");
      return response.json();
    },
  });

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        headers: authManager.getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Manual auction control
  const startAuction = async (auctionId) => {
    try {
      const response = await fetch(`/api/admin/auctions/${auctionId}/start`, {
        method: "POST",
        headers: authManager.getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to start auction");
      queryClient.invalidateQueries(["/api/admin/auctions"]);
    } catch (error) {
      console.error("Error starting auction:", error);
    }
  };

  const resetAuction = async (auctionId) => {
    try {
      const response = await fetch(`/api/admin/auctions/${auctionId}/reset`, {
        method: "POST",
        headers: authManager.getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to reset auction");
      queryClient.invalidateQueries(["/api/admin/auctions"]);
    } catch (error) {
      console.error("Error resetting auction:", error);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage auctions and monitor activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Auctions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auctions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Auctions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {auctions.filter((a) => a.status === "live").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Auctions Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>All Auctions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auctions.map((auction) => (
                    <TableRow key={auction.id}>
                      <TableCell className="font-medium">{auction.itemName}</TableCell>
                      <TableCell>
                        {auction.seller?.firstName} {auction.seller?.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            auction.status === "live"
                              ? "bg-green-100 text-green-800"
                              : auction.status === "scheduled"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {auction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(auction.goLiveAt).toLocaleString()}</TableCell>
                      <TableCell>{auction.durationMinutes} min</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startAuction(auction.id)}
                            disabled={auction.status === "live"}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetAuction(auction.id)}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Reset
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}