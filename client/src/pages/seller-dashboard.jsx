import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { authManager } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import {
  Gavel,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  MessageCircle,
  Plus,
  TrendingUp,
  Eye,
} from "lucide-react";

function CounterOfferForm({ auctionId, highestBid, onSubmit, onCancel, isLoading }) {
  const [amount, setAmount] = useState("");
  const minAmount = highestBid ? parseFloat(highestBid.amount) + 0.01 : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount <= minAmount) {
      return;
    }
    onSubmit(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Make Counter Offer</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="counterAmount">Your Counter Offer</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                id="counterAmount"
                type="number"
                step="0.01"
                min={minAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Minimum: ${minAmount.toFixed(2)}`}
                className="pl-8"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be higher than current bid of ${highestBid?.amount || "0"}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Sending..." : "Send Counter"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SellerDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = authManager.getCurrentUser();
  const [showCounterForm, setShowCounterForm] = useState(null);

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["/api/auctions"],
  });

  const sellerAuctions = auctions.filter((auction) => auction.sellerId === user?.id);
  const liveAuctions = sellerAuctions.filter((auction) => auction.status === "live");
  const endedAuctions = sellerAuctions.filter((auction) => auction.status === "ended");
  const acceptedAuctions = sellerAuctions.filter((auction) => auction.status === "accepted");

  const acceptBidMutation = useMutation({
    mutationFn: async (auctionId) => {
      const response = await apiRequest("POST", `/api/seller/${auctionId}/accept`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid Accepted!",
        description: "The highest bid has been accepted. Invoice and emails have been sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
    },
    onError: (error) => {
      toast({
        title: "Accept Failed",
        description: error.message || "Failed to accept bid. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectBidMutation = useMutation({
    mutationFn: async (auctionId) => {
      const response = await apiRequest("POST", `/api/seller/${auctionId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid Rejected",
        description: "The highest bid has been rejected. The bidder has been notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
    },
    onError: (error) => {
      toast({
        title: "Reject Failed",
        description: error.message || "Failed to reject bid. Please try again.",
        variant: "destructive",
      });
    },
  });

  const counterOfferMutation = useMutation({
    mutationFn: async ({ auctionId, amount }) => {
      const response = await apiRequest("POST", `/api/seller/${auctionId}/counter`, {
        amount: parseFloat(amount),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Counter Offer Sent!",
        description: "Your counter offer has been sent to the highest bidder.",
      });
      setShowCounterForm(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
    },
    onError: (error) => {
      toast({
        title: "Counter Offer Failed",
        description: error.message || "Failed to send counter offer. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!user || user.role !== "seller") {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user || user.role !== "seller") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You must be a seller to access this dashboard.</p>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "live":
        return <Badge className="bg-secondary text-secondary-foreground">Live</Badge>;
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      case "ended":
        return <Badge className="bg-accent text-accent-foreground">Ended</Badge>;
      case "accepted":
        return <Badge className="bg-secondary text-secondary-foreground">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "counter_pending":
        return <Badge className="bg-accent text-accent-foreground">Counter Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCounterOffer = (auctionId, amount) => {
    counterOfferMutation.mutate({ auctionId, amount });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-600">Manage your auctions and review bids</p>
          </div>
          <Link href="/create-auction">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Auction
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Auctions</p>
                  <p className="text-2xl font-bold text-gray-900">{sellerAuctions.length}</p>
                </div>
                <Gavel className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Live Now</p>
                  <p className="text-2xl font-bold text-secondary">{liveAuctions.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Awaiting Decision</p>
                  <p className="text-2xl font-bold text-accent">{endedAuctions.length}</p>
                </div>
                <Clock className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-secondary">{acceptedAuctions.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Auctions Tabs */}
        <Tabs defaultValue="ended" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ended">Awaiting Decision ({endedAuctions.length})</TabsTrigger>
            <TabsTrigger value="live">Live ({liveAuctions.length})</TabsTrigger>
            <TabsTrigger value="all">All Auctions ({sellerAuctions.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({acceptedAuctions.length})</TabsTrigger>
          </TabsList>

          {/* Ended Auctions - Requiring Decision */}
          <TabsContent value="ended" className="space-y-6">
            {endedAuctions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Auctions Awaiting Decision</h3>
                  <p className="text-gray-600">
                    When your auctions end, they'll appear here for you to accept, reject, or make counter offers.
                  </p>
                </CardContent>
              </Card>
            ) : (
              endedAuctions.map((auction) => (
                <Card key={auction.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{auction.itemName}</h3>
                        <p className="text-gray-600 mb-3 line-clamp-2">{auction.description}</p>
                        {getStatusBadge(auction.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Auction Summary */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Auction Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Starting Price:</span>
                            <span className="font-medium">${parseFloat(auction.startingPrice).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-medium">{auction.durationMinutes} minutes</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ended:</span>
                            <span className="font-medium">
                              {new Date(
                                new Date(auction.goLiveAt).getTime() + auction.durationMinutes * 60 * 1000
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Decision Panel */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Make Your Decision</h4>
                        <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4 mb-4">
                          <h5 className="font-medium text-gray-900 mb-1">Highest Bid</h5>
                          <div className="text-2xl font-bold text-secondary mb-1">
                            ${auction.highestBid ? parseFloat(auction.highestBid).toLocaleString() : "No bids"}
                          </div>
                        </div>

                        {auction.highestBid ? (
                          <>
                            {showCounterForm === auction.id ? (
                              <CounterOfferForm
                                auctionId={auction.id}
                                highestBid={{ amount: auction.highestBid }}
                                onSubmit={(amount) => handleCounterOffer(auction.id, amount)}
                                onCancel={() => setShowCounterForm(null)}
                                isLoading={counterOfferMutation.isPending}
                              />
                            ) : (
                              <div className="space-y-2">
                                <Button
                                  onClick={() => acceptBidMutation.mutate(auction.id)}
                                  disabled={acceptBidMutation.isPending}
                                  className="w-full bg-secondary hover:bg-secondary/90"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Accept Bid
                                </Button>

                                <Button onClick={() => setShowCounterForm(auction.id)} variant="outline" className="w-full">
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Make Counter Offer
                                </Button>

                                <Button
                                  onClick={() => rejectBidMutation.mutate(auction.id)}
                                  disabled={rejectBidMutation.isPending}
                                  variant="destructive"
                                  className="w-full"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject Bid
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-600">No bids were placed on this auction.</p>
                            <Button
                              onClick={() => rejectBidMutation.mutate(auction.id)}
                              disabled={rejectBidMutation.isPending}
                              variant="outline"
                              className="mt-2"
                            >
                              Close Auction
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Live Auctions */}
          <TabsContent value="live" className="space-y-6">
            {liveAuctions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Live Auctions</h3>
                  <p className="text-gray-600">Your active auctions will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveAuctions.map((auction) => (
                  <Card key={auction.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{auction.itemName}</h3>
                        {getStatusBadge(auction.status)}
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2">{auction.description}</p>

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Starting Price:</span>
                          <span className="font-medium">${parseFloat(auction.startingPrice).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Bid:</span>
                          <span className="font-medium text-secondary">
                            ${auction.highestBid ? parseFloat(auction.highestBid).toLocaleString() : "No bids"}
                          </span>
                        </div>
                      </div>

                      <Link href={`/auction/${auction.id}`}>
                        <Button variant="outline" className="w-full">
                          <Eye className="w-4 h-4 mr-2" />
                          View Auction
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Auctions */}
          <TabsContent value="all" className="space-y-6">
            {sellerAuctions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Gavel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Auctions Yet</h3>
                  <p className="text-gray-600 mb-4">Start by creating your first auction listing.</p>
                  <Link href="/create-auction">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Auction
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sellerAuctions.map((auction) => (
                  <Card key={auction.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{auction.itemName}</h3>
                        {getStatusBadge(auction.status)}
                      </div>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{auction.description}</p>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Starting:</span>
                          <span>${parseFloat(auction.startingPrice).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Duration:</span>
                          <span>{auction.durationMinutes}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Go Live:</span>
                          <span>{new Date(auction.goLiveAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed Auctions */}
          <TabsContent value="completed" className="space-y-6">
            {acceptedAuctions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Completed Sales</h3>
                  <p className="text-gray-600">Your successful auction sales will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {acceptedAuctions.map((auction) => (
                  <Card key={auction.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{auction.itemName}</h3>
                          <p className="text-gray-600 text-sm">
                            Sold for ${auction.highestBid ? parseFloat(auction.highestBid).toLocaleString() : "0"}
                          </p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(auction.status)}
                          <p className="text-xs text-gray-500 mt-1">{new Date(auction.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
