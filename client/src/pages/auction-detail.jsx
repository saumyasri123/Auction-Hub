import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { BidForm } from "@/components/bid-form";
import { wsManager } from "@/lib/websocket";
import { Gavel, Clock, User, DollarSign } from "lucide-react";

export default function AuctionDetail() {
  const { id: auctionId } = useParams();
  const [auctionState, setAuctionState] = useState(null);
  const [recentBids, setRecentBids] = useState([]);

  const { data: auctionData, isLoading } = useQuery({
    queryKey: ["/api/auctions", auctionId],
  });

  const { data: bidData } = useQuery({
    queryKey: ["/api/auctions", auctionId, "bids"],
  });

  useEffect(() => {
    if (!auctionId) return;

    wsManager.connect().then(() => {
      wsManager.joinAuction(auctionId);
    });

    const unsubscribeState = wsManager.on("auction_state", (data) => {
      setAuctionState(data);
    });

    const unsubscribeBid = wsManager.on("bid_placed", (data) => {
      setRecentBids((prev) => [data.bid, ...prev.slice(0, 9)]);
    });

    const unsubscribeOutbid = wsManager.on("outbid", (data) => {
      console.log("You have been outbid!", data);
    });

    const unsubscribeEnd = wsManager.on("auction_ended", (data) => {
      console.log("Auction ended:", data);
    });

    return () => {
      unsubscribeState();
      unsubscribeBid();
      unsubscribeOutbid();
      unsubscribeEnd();
    };
  }, [auctionId]);

  useEffect(() => {
    if (bidData?.bids) {
      setRecentBids(bidData.bids);
    }
  }, [bidData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auctionData?.auction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Auction Not Found</h1>
          <p className="text-gray-600">The auction you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const { auction, highestBid } = auctionData;
  const currentBid = auctionState?.currentHighestBid || highestBid;
  const status = auctionState?.status || auction.status;
  const endTime = new Date(new Date(auction.goLiveAt).getTime() + auction.durationMinutes * 60 * 1000);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Item Details */}
          <div className="space-y-6">
            <Card>
              <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center">
                <Gavel className="w-24 h-24 text-gray-400" />
              </div>

              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge
                    className={
                      status === "live"
                        ? "bg-secondary text-secondary-foreground live-indicator"
                        : "bg-gray-500 text-white"
                    }
                  >
                    {status === "live" ? "Live" : status}
                  </Badge>

                  {status === "live" && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      Live Now
                    </div>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {auction.itemName}
                </h1>

                <p className="text-gray-600 mb-6">{auction.description}</p>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                  <div>
                    <span className="text-sm text-gray-500">Starting Price</span>
                    <p className="text-lg font-semibold">
                      ${parseFloat(auction.startingPrice).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">Bid Increment</span>
                    <p className="text-lg font-semibold">
                      ${parseFloat(auction.bidIncrement).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">Total Bids</span>
                    <p className="text-lg font-semibold">{recentBids.length}</p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">Duration</span>
                    <p className="text-lg font-semibold">{auction.durationMinutes} minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Bidding */}
          <div className="space-y-6">
            {/* Countdown Timer */}
            {status === "live" && (
              <CountdownTimer endTime={endTime} onExpire={() => console.log("Auction expired")} />
            )}

            {/* Current Highest Bid */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Highest Bid</h3>
                  <div className="text-3xl font-bold text-secondary mb-2">
                    $
                    {currentBid
                      ? parseFloat(currentBid.amount).toLocaleString()
                      : parseFloat(auction.startingPrice).toLocaleString()}
                  </div>
                  {currentBid && (
                    <>
                      <p className="text-sm text-gray-600 mb-1">
                        by Bidder #{currentBid.bidderId?.slice(-6)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(currentBid.createdAt || Date.now()).toLocaleString()}
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bid Form */}
            <BidForm
              auctionId={auctionId}
              currentBid={currentBid}
              bidIncrement={auction.bidIncrement}
              startingPrice={auction.startingPrice}
              auctionStatus={status}
            />

            {/* Recent Bids */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bids</h3>

                {recentBids.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No bids yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {recentBids.map((bid, index) => (
                      <div
                        key={bid.id || index}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              Bidder #{bid.bidderId?.slice(-6) || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(bid.createdAt || Date.now()).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-secondary">
                          ${parseFloat(bid.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
