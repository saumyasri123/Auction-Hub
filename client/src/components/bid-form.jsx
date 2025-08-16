import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { authManager } from "@/lib/auth";
import { wsManager } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";

export function BidForm({
  auctionId,
  currentBid,
  bidIncrement,
  startingPrice,
  auctionStatus,
  onBidPlaced,
}) {
  const [bidAmount, setBidAmount] = useState("");
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const { toast } = useToast();
  const user = authManager.getCurrentUser();

  const minBid = currentBid
    ? (parseFloat(currentBid.amount) + parseFloat(bidIncrement)).toFixed(2)
    : parseFloat(startingPrice).toFixed(2);

  const handleBidSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to place bids.",
        variant: "destructive",
      });
      return;
    }

    if (auctionStatus !== "live") {
      toast({
        title: "Auction Not Active",
        description: "This auction is not currently accepting bids.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(bidAmount);
    const minBidAmount = parseFloat(minBid);

    if (amount < minBidAmount) {
      toast({
        title: "Bid Too Low",
        description: `Minimum bid is $${minBidAmount.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    setIsPlacingBid(true);

    try {
      wsManager.placeBid(auctionId, amount, user.id);
      setBidAmount("");

      toast({
        title: "Bid Placed!",
        description: `Your bid of $${amount.toLocaleString()} has been submitted.`,
      });

      onBidPlaced?.();
    } catch (error) {
      console.error("Bid placement error:", error);
      toast({
        title: "Bid Failed",
        description: "Unable to place bid. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPlacingBid(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sign in to Bid
            </h3>
            <p className="text-gray-600 mb-4">
              You must be logged in to place bids on this auction.
            </p>
            <Button onClick={() => (window.location.href = "/login")}>
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (auctionStatus === "ended") {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Auction Ended
            </h3>
            <p className="text-gray-600">This auction has concluded.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (auctionStatus === "scheduled") {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Auction Not Started
            </h3>
            <p className="text-gray-600">
              This auction hasn't started yet. Check back later!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Place Your Bid
        </h3>

        <form onSubmit={handleBidSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bidAmount">Bid Amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="bidAmount"
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={minBid}
                min={minBid}
                step="0.01"
                className="pl-8 bid-input"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum bid: ${parseFloat(minBid).toLocaleString()}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isPlacingBid} size="lg">
            {isPlacingBid ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Placing Bid...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Place Bid
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
